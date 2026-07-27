// REALPORT — Wikidata 全国市区町村インポート（catalog層のソース）
// 都道府県ごと（ISO 3166-2: JP-01〜JP-47）に市・町・村・特別区を取得し
// tools/wikidata-areas.json に保存する。gen-data.mjs がこれを読んで cat:1 エリアを生成する。
// 冪等: 取得済みの都道府県はスキップ（やり直しは wikidata-areas.json を削除）
// 実行: node tools/import-wikidata.mjs
import { writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "tools", "wikidata-areas.json");
const UA = { "User-Agent": "REALPORT-site-builder/1.0 (contact: jiantailanglin266@gmail.com)", "Accept": "application/sparql-results+json" };

// JIS都道府県コード順（gen-data.mjs の PREFS と同順）
const PREFS = ["hokkaido","aomori","iwate","miyagi","akita","yamagata","fukushima","ibaraki","tochigi","gunma","saitama","chiba","tokyo","kanagawa","niigata","toyama","ishikawa","fukui","yamanashi","nagano","gifu","shizuoka","aichi","mie","shiga","kyoto","osaka","hyogo","nara","wakayama","tottori","shimane","okayama","hiroshima","yamaguchi","tokushima","kagawa","ehime","kochi","fukuoka","saga","nagasaki","kumamoto","oita","miyazaki","kagoshima","okinawa"];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 市(Q494721)・町(Q1059478)・村(Q4174776)・特別区(Q1147395)。廃止済み(P576あり)は除外
// P131は1〜3ホップ（町村は郡経由、北海道は支庁経由のため）
const q = iso => `SELECT ?item ?ja ?en ?pop ?lat ?lon WHERE {
  ?prefE wdt:P300 "${iso}".
  ?item wdt:P131/wdt:P131?/wdt:P131? ?prefE. ?item wdt:P31/wdt:P279* ?cls.
  VALUES ?cls { wd:Q494721 wd:Q1059478 wd:Q4174776 wd:Q1147395 }
  FILTER NOT EXISTS { ?item wdt:P576 ?d }
  OPTIONAL { ?item wdt:P1082 ?pop }
  OPTIONAL { ?item p:P625/psv:P625 [ wikibase:geoLatitude ?lat; wikibase:geoLongitude ?lon ] }
  OPTIONAL { ?item rdfs:label ?ja FILTER(LANG(?ja)="ja") }
  OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en)="en") }
} LIMIT 2000`;

async function query(iso, attempt = 1) {
  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q(iso));
  const r = await fetch(url, { headers: UA });
  if (r.status === 429 || r.status === 504) {
    if (attempt > 3) throw new Error("giving up " + iso + " (" + r.status + ")");
    await sleep(3000 * attempt); return query(iso, attempt + 1);
  }
  if (!r.ok) throw new Error(r.status + " " + iso);
  const j = await r.json();
  // 同一QIDが複数行(複数P31)で返るため qid でまとめる
  const map = {};
  for (const b of j.results.bindings) {
    const qid = b.item.value.split("/").pop();
    if (!map[qid]) map[qid] = { qid,
      ja: b.ja?.value || null, en: b.en?.value || null,
      pop: b.pop ? +b.pop.value : null,
      lat: b.lat ? +(+b.lat.value).toFixed(4) : null,
      lon: b.lon ? +(+b.lon.value).toFixed(4) : null };
  }
  return Object.values(map).filter(x => x.ja); // 日本語名がないものは除外
}

const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf-8")) : {};
let total = 0, i = 0;
for (const slug of PREFS) {
  i++;
  const iso = "JP-" + String(i).padStart(2, "0");
  if (out[slug]) { total += out[slug].length; continue; }
  try {
    const rows = await query(iso);
    out[slug] = rows; total += rows.length;
    writeFileSync(OUT, JSON.stringify(out));
    console.log(iso, slug, rows.length + "件");
  } catch (e) { console.log("FAIL", iso, slug, String(e.message || e)); }
  await sleep(800);
}
console.log("done:", total, "municipalities in", Object.keys(out).length, "prefectures");
