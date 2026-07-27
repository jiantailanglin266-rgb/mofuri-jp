// REALPORT — 記事一括登録ツール（data.js を手編集しないための正規ルート）
// 使い方:
//   1. tools/new-articles.mjs を作る（下の SAMPLE 形式で export default [...]）
//   2. node tools/register-articles.mjs tools/new-articles.mjs
//   3. index.html の data.js?v=N をバンプ → node build.mjs → 確認 → デプロイ
import { readFileSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* SAMPLE（tools/new-articles.mjs）:
export default [{
  slug: "my-new-article", cat: "sell",
  date: [2026, 8, 1],                     // 公開日（UTC固定・Date.now()禁止）
  title: "…", metaDesc: "…",
  body: `本文…\n\n## 見出し\n本文…`,      // マイクロ記法: ## / **b** / [img:path|credit] / --- / *note*
  sources: [{ title: "…", url: "https://…" }],
  factCheck: null                          // story系で検証済みなら "reviewed"
}];
*/

const file = process.argv[2];
if (!file) { console.error("usage: node tools/register-articles.mjs <articles.mjs>"); process.exit(1); }
const mod = await import(pathToFileURL(resolve(file)).href);
const items = mod.default;

const src = readFileSync(join(ROOT, "data.js"), "utf-8");
const DATA = JSON.parse(src.match(/^var DATA=(.*);$/m)[1]);

let added = 0;
for (const a of items) {
  if (DATA.articles.find(x => x.slug === a.slug)) { console.log("skip (dup):", a.slug); continue; }
  const iso = new Date(Date.UTC(a.date[0], a.date[1] - 1, a.date[2], 9)).toISOString();
  DATA.articles.push({
    id: "art_" + a.slug.replace(/-/g, "_"), slug: a.slug, category: a.cat,
    authorName: a.authorName || "REALPORT編集部", supervisorName: a.supervisorName || null,
    status: "published", publishedAt: iso, updatedAt: iso,
    factCheck: a.factCheck || null, sources: a.sources || [],
    translations: { ja: { title: a.title, metaDesc: a.metaDesc, body: a.body } }
  });
  added++; console.log("add:", a.slug);
}
writeFileSync(join(ROOT, "data.js"), "var DATA=" + JSON.stringify(DATA) + ";");
console.log(`OK: ${added} articles added (total ${DATA.articles.length}). 次: data.js?v=N をバンプ → node build.mjs`);
