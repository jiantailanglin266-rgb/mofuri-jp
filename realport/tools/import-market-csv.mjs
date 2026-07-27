// REALPORT — 相場データCSVインポータ（公的データ専用）
// 使い方: node tools/import-market-csv.mjs <file.csv>
// CSV列: areaSlug,propertyType,period,avgPrice,medianPrice,pricePerSqm,txCount,sourceName,sourceUrl,sourceDate
//   - propertyType: mansion | house | land
//   - 価格は円。未取得の列は空欄（0や推定値で埋めない）
//   - 価格を1つでも入れる行は sourceName / sourceUrl / sourceDate 必須（出典のない相場は登録できない）
// 例:
// shinjuku-ku,mansion,2025,,,1234000,321,国土交通省 不動産情報ライブラリ,https://www.reinfolib.mlit.go.jp/,2025-12-31
// 取り込み後: index.html の data.js?v=N をバンプ → node build.mjs
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const file = process.argv[2];
if (!file) { console.error("usage: node tools/import-market-csv.mjs <file.csv>"); process.exit(1); }

const src = readFileSync(join(ROOT, "data.js"), "utf-8");
const DATA = JSON.parse(src.match(/^var DATA=(.*);$/m)[1]);

const lines = readFileSync(file, "utf-8").split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"));
const header = lines[0].toLowerCase().includes("areaslug") ? 1 : 0; // ヘッダ行は任意
let added = 0, replaced = 0;
const num = s => s === "" || s == null ? null : +String(s).replace(/[,¥\s]/g, "");

for (const line of lines.slice(header)) {
  const c = line.split(",").map(s => s.trim());
  const [areaSlug, propertyType, period] = c;
  const rec = {
    areaId: null, propertyType, period,
    avgPrice: num(c[3]), medianPrice: num(c[4]), pricePerSqm: num(c[5]), txCount: num(c[6]),
    sourceName: c[7] || null, sourceUrl: c[8] || null, sourceDate: c[9] || null,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
  const area = DATA.areas.find(a => a.slug === areaSlug);
  if (!area) { console.error("SKIP 不明なエリア:", areaSlug); continue; }
  if (!["mansion", "house", "land"].includes(propertyType)) { console.error("SKIP 不正な種別:", line); continue; }
  const hasPrice = rec.avgPrice != null || rec.medianPrice != null || rec.pricePerSqm != null;
  if (hasPrice && !(rec.sourceName && rec.sourceUrl && rec.sourceDate)) {
    console.error("SKIP 出典なしの価格は登録できません:", areaSlug, propertyType, period); continue;
  }
  rec.areaId = area.id;
  const i = DATA.marketData.findIndex(m => m.areaId === rec.areaId && m.propertyType === propertyType && m.period === period);
  if (i >= 0) { DATA.marketData[i] = rec; replaced++; } else { DATA.marketData.push(rec); added++; }
  // 詳細ページの状態フラグ（curatedのみ意味を持つ）
  if (!area.cat) area.dataLevel = Math.max(area.dataLevel || 0, 2);
}
writeFileSync(join(ROOT, "data.js"), "var DATA=" + JSON.stringify(DATA) + ";");
console.log(`OK: 追加${added}件 / 更新${replaced}件（marketData 計${DATA.marketData.length}件）。次: data.js?v=N をバンプ → node build.mjs`);
