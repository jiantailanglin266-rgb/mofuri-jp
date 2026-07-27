// REALPORT — 相場データCSVインポータ（公的データ専用）
// tools/market-data.json（相場の単一ソース）へマージする。data.js は直接書き換えない。
// 使い方: node tools/import-market-csv.mjs <file.csv> → node tools/gen-data.mjs → v=N バンプ → node build.mjs
// CSV列: areaSlug,propertyType,period,avgPrice,medianPrice,pricePerSqm,txCount,sourceName,sourceUrl,sourceDate,label
//   - propertyType: mansion | house | land ／ 価格は円。未取得列は空欄（0や推定値で埋めない）
//   - 価格を1つでも入れる行は sourceName / sourceUrl / sourceDate 必須（出典のない相場は登録不可）
// 例:
// shinjuku-ku,mansion,2025,,,1234000,321,国土交通省 不動産情報ライブラリ,https://www.reinfolib.mlit.go.jp/,2025-12-31,成約価格集計
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const file = process.argv[2];
if (!file) { console.error("usage: node tools/import-market-csv.mjs <file.csv>"); process.exit(1); }

const DATA = JSON.parse(readFileSync(join(ROOT, "data.js"), "utf-8").match(/^var DATA=(.*);$/m)[1]);
const outPath = join(ROOT, "tools", "market-data.json");
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : [];

const lines = readFileSync(file, "utf-8").split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"));
const header = lines[0].toLowerCase().includes("areaslug") ? 1 : 0;
const num = s => s === "" || s == null ? null : +String(s).replace(/[,¥\s]/g, "");
let added = 0, replaced = 0;

for (const line of lines.slice(header)) {
  const c = line.split(",").map(s => s.trim());
  const [areaSlug, propertyType, period] = c;
  const rec = {
    areaSlug, propertyType, period,
    avgPrice: num(c[3]), medianPrice: num(c[4]), pricePerSqm: num(c[5]), txCount: num(c[6]),
    label: c[10] || null, sourceName: c[7] || null, sourceUrl: c[8] || null, sourceDate: c[9] || null,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  if (!DATA.areas.find(a => a.slug === areaSlug)) { console.error("SKIP 不明なエリア:", areaSlug); continue; }
  if (!["mansion", "house", "land"].includes(propertyType)) { console.error("SKIP 不正な種別:", line); continue; }
  const hasPrice = rec.avgPrice != null || rec.medianPrice != null || rec.pricePerSqm != null;
  if (hasPrice && !(rec.sourceName && rec.sourceUrl && rec.sourceDate)) {
    console.error("SKIP 出典なしの価格は登録できません:", areaSlug, propertyType, period); continue;
  }
  const i = out.findIndex(m => m.areaSlug === areaSlug && m.propertyType === propertyType && m.period === period && (m.label || null) === rec.label);
  if (i >= 0) { out[i] = rec; replaced++; } else { out.push(rec); added++; }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`OK: market-data.json 追加${added}/更新${replaced}（計${out.length}件）。次: node tools/gen-data.mjs → data.js?v=N バンプ → node build.mjs`);
