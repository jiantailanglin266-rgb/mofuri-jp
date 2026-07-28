// REALPORT — 成約価格インポータ（国土交通省 不動産情報ライブラリ API XIT001）
// 主要18エリア（curated）の成約価格情報を四半期ごとに取得し、種別別に集計して
// tools/market-data.json にマージする。実行後は gen-data → v=N バンプ → build。
//
// 事前準備: APIキー（本人申請: https://www.reinfolib.mlit.go.jp/api/request/）を
//   ① 環境変数 REINFOLIB_API_KEY、または ② tools/.reinfolib-key ファイル（git管理外）に置く
// 実行: node tools/import-seiyaku.mjs
//
// API仕様: https://www.reinfolib.mlit.go.jp/help/apiManual/xit001/
//   GET /ex-api/external/XIT001?priceClassification=02&year=YYYY&quarter=N&area=NN|city=NNNNN
//   ヘッダー Ocp-Apim-Subscription-Key: <キー>
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- 設定 ---- */
const YEAR = 2025;                    // 集計対象年（4四半期分）。翌年データが揃ったら更新
const QUARTERS = [1, 2, 3, 4];
const PRICE_CLASS = "02";             // 02=成約価格情報（2021Q1以降）。01=取引価格(アンケート)
const LABEL = `成約価格集計（${YEAR}年・年間）`;
const MIN_COUNT = 5;                  // 件数が少なすぎる集計は掲載しない（統計として不安定なため）

// curatedエリア: slug → { pref:都道府県コード, codes:[市区町村コード範囲], names:[Municipality一致用] }
const TARGETS = {
  "shinjuku-ku":   { pref: "13", min: 13104, max: 13104, name: "新宿区" },
  "shibuya-ku":    { pref: "13", min: 13113, max: 13113, name: "渋谷区" },
  "minato-ku":     { pref: "13", min: 13103, max: 13103, name: "港区" },
  "setagaya-ku":   { pref: "13", min: 13112, max: 13112, name: "世田谷区" },
  "koto-ku":       { pref: "13", min: 13108, max: 13108, name: "江東区" },
  "nerima-ku":     { pref: "13", min: 13120, max: 13120, name: "練馬区" },
  "yokohama":      { pref: "14", min: 14101, max: 14118, name: "横浜市" },
  "kawasaki":      { pref: "14", min: 14131, max: 14137, name: "川崎市" },
  "saitama-shi":   { pref: "11", min: 11101, max: 11110, name: "さいたま市" },
  "chiba-shi":     { pref: "12", min: 12101, max: 12106, name: "千葉市" },
  "osaka-shi":     { pref: "27", min: 27102, max: 27128, name: "大阪市" },
  "kyoto-shi":     { pref: "26", min: 26101, max: 26111, name: "京都市" },
  "kobe-shi":      { pref: "28", min: 28101, max: 28111, name: "神戸市" },
  "nagoya":        { pref: "23", min: 23101, max: 23116, name: "名古屋市" },
  "sapporo":       { pref: "01", min: 1101,  max: 1110,  name: "札幌市" },
  "fukuoka-shi":   { pref: "40", min: 40131, max: 40137, name: "福岡市" },
  "sendai":        { pref: "04", min: 4101,  max: 4105,  name: "仙台市" },
  "hiroshima-shi": { pref: "34", min: 34101, max: 34108, name: "広島市" }
};
// Type → REALPORT種別
const TYPE_MAP = { "中古マンション等": "mansion", "宅地(土地と建物)": "house", "宅地(土地)": "land" };

/* ---- キー取得 ---- */
const keyFile = join(ROOT, "tools", ".reinfolib-key");
const KEY = process.env.REINFOLIB_API_KEY || (existsSync(keyFile) ? readFileSync(keyFile, "utf-8").trim() : "");
if (!KEY) {
  console.error(`APIキーが見つかりません。
  1. https://www.reinfolib.mlit.go.jp/api/request/ から利用申請（本人登録・無料）
  2. 発行されたキーを ${keyFile} に保存（このファイルはgit管理外）
     または環境変数 REINFOLIB_API_KEY に設定して再実行してください。`);
  process.exit(1);
}

/* ---- 取得（都道府県×四半期でまとめて取得しローカルで絞り込み） ---- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchQ(pref, year, quarter, attempt = 1) {
  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?priceClassification=${PRICE_CLASS}&year=${year}&quarter=${quarter}&area=${pref}`;
  const r = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": KEY } });
  if (r.status === 429 && attempt <= 3) { await sleep(2500 * attempt); return fetchQ(pref, year, quarter, attempt + 1); }
  if (r.status === 401 || r.status === 403) throw new Error("APIキーが無効です（" + r.status + "）。キーを確認してください。");
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const j = await r.json();
  return j.data || [];
}

const PREFS = [...new Set(Object.values(TARGETS).map(t => t.pref))];
const rowsByPref = {};
for (const p of PREFS) {
  rowsByPref[p] = [];
  for (const q of QUARTERS) {
    try { const d = await fetchQ(p, YEAR, q); rowsByPref[p].push(...d); console.log(`pref${p} ${YEAR}Q${q}: ${d.length}件`); }
    catch (e) { console.error(`FAIL pref${p} Q${q}:`, String(e.message || e)); }
    await sleep(600);
  }
}

/* ---- 集計 ---- */
const num = v => { const n = +String(v ?? "").replace(/[^\d.]/g, ""); return isFinite(n) && n > 0 ? n : null; };
const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const inCity = (row, t) => {
  const code = num(row.MunicipalityCode ?? row.CityCode ?? row.DistrictCode);
  if (code) return code >= t.min && code <= t.max;
  return String(row.Municipality || "").startsWith(t.name); // コードが無い場合は名称で判定
};

const outPath = join(ROOT, "tools", "market-data.json");
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : [];
const today = new Date().toISOString().slice(0, 10);
let added = 0, updated = 0, skipped = 0;

for (const [slug, t] of Object.entries(TARGETS)) {
  const rows = rowsByPref[t.pref].filter(r => inCity(r, t));
  for (const [typeName, propertyType] of Object.entries(TYPE_MAP)) {
    const prices = [], unitPrices = [];
    for (const r of rows) {
      if (r.Type !== typeName) continue;
      const price = num(r.TradePrice); if (!price) continue;
      prices.push(price);
      const area = num(r.Area);
      if (area) unitPrices.push(Math.round(price / area));
    }
    if (prices.length < MIN_COUNT) { skipped++; continue; }
    const rec = {
      areaSlug: slug, propertyType, period: `${YEAR}年（成約）`,
      avgPrice: Math.round(prices.reduce((s, v) => s + v, 0) / prices.length),
      medianPrice: median(prices),
      pricePerSqm: unitPrices.length >= MIN_COUNT ? median(unitPrices) : null,
      txCount: prices.length, label: LABEL, unit: "件",
      sourceName: "国土交通省 不動産情報ライブラリ（不動産価格情報 XIT001・成約価格）",
      sourceUrl: "https://www.reinfolib.mlit.go.jp/",
      sourceDate: `${YEAR}-12-31`, updatedAt: today
    };
    const i = out.findIndex(m => m.areaSlug === slug && m.propertyType === propertyType && m.period === rec.period && m.label === LABEL);
    if (i >= 0) { out[i] = rec; updated++; } else { out.push(rec); added++; }
    console.log(slug, propertyType, `${prices.length}件 中央値${(rec.medianPrice / 10000).toLocaleString()}万円`);
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`OK: market-data.json 追加${added}/更新${updated}/件数不足スキップ${skipped}`);
console.log("次: node tools/gen-data.mjs → data.js?v=N バンプ → node build.mjs → 確認 → デプロイ");
