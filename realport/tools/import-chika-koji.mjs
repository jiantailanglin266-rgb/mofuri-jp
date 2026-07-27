// REALPORT — 地価公示インポータ（国土交通省 国土数値情報 L01・2025年）
// 主要18エリア（curated）の「住宅地（用途区分000）」公示価格を集計し、
// tools/market-data.json にマージする。実行後は gen-data → v=N バンプ → build。
// 実行: node tools/import-chika-koji.mjs   （要: unzip コマンド / Git Bash 環境）
// 出典: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-2025.html
//       地価公示の価格時点は各年1月1日。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const YEAR = 2025, YY = "25";
const CACHE = join(ROOT, "tools", ".cache-l01"); // git管理外の作業ディレクトリ
const UA = { "User-Agent": "REALPORT-site-builder/1.0 (contact: jiantailanglin266@gmail.com)" };

// curatedエリア slug → [都道府県コード, 市区町村コード範囲(min,max)]
const TARGETS = {
  "shinjuku-ku": ["13", 13104, 13104], "shibuya-ku": ["13", 13113, 13113],
  "minato-ku": ["13", 13103, 13103], "setagaya-ku": ["13", 13112, 13112],
  "koto-ku": ["13", 13108, 13108], "nerima-ku": ["13", 13120, 13120],
  "yokohama": ["14", 14101, 14118], "kawasaki": ["14", 14131, 14137],
  "saitama-shi": ["11", 11101, 11110], "chiba-shi": ["12", 12101, 12106],
  "osaka-shi": ["27", 27102, 27128], "kyoto-shi": ["26", 26101, 26111],
  "kobe-shi": ["28", 28101, 28111], "nagoya": ["23", 23101, 23116],
  "sapporo": ["01", 1101, 1110], "fukuoka-shi": ["40", 40131, 40137],
  "sendai": ["04", 4101, 4105], "hiroshima-shi": ["34", 34101, 34108]
};
const PREFS = [...new Set(Object.values(TARGETS).map(t => t[0]))];

mkdirSync(CACHE, { recursive: true });
async function loadPref(code) {
  const gj = join(CACHE, `L01-${YY}_${code}_GML`, `L01-${YY}_${code}.geojson`);
  if (!existsSync(gj)) {
    const zip = join(CACHE, `L01-${YY}_${code}.zip`);
    if (!existsSync(zip)) {
      const url = `https://nlftp.mlit.go.jp/ksj/gml/data/L01/L01-${YY}/L01-${YY}_${code}_GML.zip`;
      console.log("download:", url);
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(r.status + " " + url);
      writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
    }
    execSync(`unzip -o -q "${zip}" -d "${CACHE}"`);
  }
  return JSON.parse(readFileSync(gj, "utf-8")).features;
}

const featuresByPref = {};
for (const p of PREFS) { featuresByPref[p] = await loadPref(p); console.log("pref", p, featuresByPref[p].length, "地点"); }

const outPath = join(ROOT, "tools", "market-data.json");
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : [];
const today = new Date().toISOString().slice(0, 10);
let added = 0, updated = 0;

for (const [slug, [pref, min, max]] of Object.entries(TARGETS)) {
  // 用途区分 000 = 住宅地。L01_001=行政コード, L01_007=年, L01_008=公示価格(円/m2)
  const pts = featuresByPref[pref].filter(f => {
    const p = f.properties, code = +p.L01_001;
    return p.L01_002 === "000" && p.L01_007 === YEAR && code >= min && code <= max;
  }).map(f => f.properties.L01_008).sort((a, b) => a - b);
  if (!pts.length) { console.log("no points:", slug); continue; }
  const avg = Math.round(pts.reduce((s, v) => s + v, 0) / pts.length);
  const median = pts.length % 2 ? pts[(pts.length - 1) / 2] : Math.round((pts[pts.length / 2 - 1] + pts[pts.length / 2]) / 2);
  const rec = {
    areaSlug: slug, propertyType: "land", period: `${YEAR}年地価公示`,
    avgPrice: null, medianPrice: null,               // 総額欄は使わない（地価は単価データ）
    pricePerSqm: avg, medianPerSqm: median, txCount: pts.length,
    label: "地価公示・住宅地平均", unit: "地点",
    sourceName: `国土交通省 地価公示（国土数値情報 L01・${YEAR}年）`,
    sourceUrl: `https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-${YEAR}.html`,
    sourceDate: `${YEAR}-01-01`, updatedAt: today
  };
  const i = out.findIndex(m => m.areaSlug === slug && m.propertyType === "land" && m.period === rec.period && m.label === rec.label);
  if (i >= 0) { out[i] = rec; updated++; } else { out.push(rec); added++; }
  console.log(slug, "住宅地", pts.length + "地点", "平均", avg.toLocaleString() + "円/㎡", "中央値", median.toLocaleString() + "円/㎡");
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`OK: market-data.json 追加${added}/更新${updated}。次: node tools/gen-data.mjs → data.js?v=N バンプ → node build.mjs`);
