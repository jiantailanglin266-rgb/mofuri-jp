// REALPORT — 全国全市区町村の成約価格集計（不動産情報ライブラリ XIT001）
// 47都道府県×4四半期を取得し、市区町村名×種別ごとに 平均/中央値/㎡単価/件数 を集計して
// tools/market-all.json に保存する。gen-data がこれを読み、データのある自治体を
// カタログ層から個別ページへ昇格させる。
// 実行: node tools/import-seiyaku-all.mjs  （約4-5分。YEAR更新時は再実行）
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const YEAR = 2025, QUARTERS = [1, 2, 3, 4], PRICE_CLASS = "02"; // 成約価格
const MIN_COUNT = 5; // 件数未満は統計として掲載しない
const TYPE_MAP = { "中古マンション等": "mansion", "宅地(土地と建物)": "house", "宅地(土地)": "land" };

const keyFile = join(ROOT, "tools", ".reinfolib-key");
const KEY = process.env.REINFOLIB_API_KEY || (existsSync(keyFile) ? readFileSync(keyFile, "utf-8").trim() : "");
if (!KEY) { console.error("APIキーがありません（tools/.reinfolib-key）"); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = v => { const n = +String(v ?? "").replace(/[^\d.]/g, ""); return isFinite(n) && n > 0 ? n : null; };
const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

async function fetchQ(pref, quarter, attempt = 1) {
  const url = `https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?priceClassification=${PRICE_CLASS}&year=${YEAR}&quarter=${quarter}&area=${pref}`;
  const r = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": KEY } });
  if ((r.status === 429 || r.status >= 500) && attempt <= 4) { await sleep(3000 * attempt); return fetchQ(pref, quarter, attempt + 1); }
  if (!r.ok) throw new Error(r.status + " pref" + pref + "Q" + quarter);
  return (await r.json()).data || [];
}

// 集計バケツ: prefCode|Municipality|type → {prices[], units[]}
const bucket = new Map();
let totalRows = 0;
for (let p = 1; p <= 47; p++) {
  const pref = String(p).padStart(2, "0");
  let cnt = 0;
  for (const q of QUARTERS) {
    try {
      const rows = await fetchQ(pref, q);
      cnt += rows.length;
      for (const row of rows) {
        const type = TYPE_MAP[row.Type]; if (!type) continue;
        const name = String(row.Municipality || "").trim(); if (!name) continue;
        const price = num(row.TradePrice); if (!price) continue;
        const k = pref + "|" + name + "|" + type;
        let b = bucket.get(k); if (!b) { b = { prices: [], units: [] }; bucket.set(k, b); }
        b.prices.push(price);
        const area = num(row.Area); if (area) b.units.push(Math.round(price / area));
      }
    } catch (e) { console.error("FAIL", pref, "Q" + q, String(e.message || e)); }
    await sleep(500);
  }
  totalRows += cnt;
  console.log("pref" + pref, cnt + "件");
}

const out = [];
for (const [k, b] of bucket) {
  if (b.prices.length < MIN_COUNT) continue;
  const [pref, name, type] = k.split("|");
  out.push({ pref, name, type,
    avg: Math.round(b.prices.reduce((s, v) => s + v, 0) / b.prices.length),
    med: median(b.prices),
    ppsm: b.units.length >= MIN_COUNT ? median(b.units) : null,
    n: b.prices.length });
}
writeFileSync(join(ROOT, "tools", "market-all.json"), JSON.stringify({
  year: YEAR, priceClass: "成約価格", minCount: MIN_COUNT,
  sourceName: `国土交通省 不動産情報ライブラリ（不動産価格情報 XIT001・成約価格・${YEAR}年）`,
  sourceUrl: "https://www.reinfolib.mlit.go.jp/", sourceDate: `${YEAR}-12-31`,
  fetchedAt: new Date().toISOString().slice(0, 10), rows: out
}));
const munis = new Set(out.map(o => o.pref + o.name));
console.log(`\ndone: 取得${totalRows.toLocaleString()}件 → 集計${out.length}行 / ${munis.size}市区町村（${MIN_COUNT}件以上のみ）`);
