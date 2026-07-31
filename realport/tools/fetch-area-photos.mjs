// REALPORT — 全市区町村ページの写真取得（ja.wikipedia 代表画像・クレジット付き）
// 個別ページを持つ全エリア（cat でない自治体）について、Wikipedia記事の代表画像の
// サムネイルURL(800px)と撮影者クレジットを取得し tools/area-photos.json に保存する。
// 画像本体は複製せず Wikimedia公式サムネイルを参照（460枚×数百KBのリポジトリ肥大を回避）。
// 地図・SVG・位置図は自動で除外。曖昧な市名は「名前 (都道府県名)」でも試行。
// 実行: node tools/fetch-area-photos.mjs   （取得済みスラッグはスキップ。差し替えはjsonから削除）
import { writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "User-Agent": "REALPORT-site-builder/1.0 (contact: jiantailanglin266@gmail.com)" };

const DATA = JSON.parse(readFileSync(join(ROOT, "data.js"), "utf-8").match(/^var DATA=(.*);$/m)[1]);
const prefName = id => DATA.prefectures.find(p => p.id === id).names.ja;
const targets = DATA.areas.filter(a => !a.cat && !a.img); // ローカル画像を持つcurated 18は対象外

const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => String(s || "").replace(/<[^>]*>/g, "").trim();
const BAD = /\.svg$|map|位置|location|locator|emblem|flag|章|旗/i;
async function jget(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(r.status); return r.json(); }

async function thumbAt(title, size) {
  const q = await jget("https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=" + size + "&redirects=1&titles=" + encodeURIComponent(title));
  const p = Object.values(q.query.pages)[0];
  if (!p || !p.thumbnail || !p.pageimage) return null;
  if (BAD.test(p.pageimage)) return null;
  return { thumbUrl: p.thumbnail.source, fileName: "File:" + p.pageimage };
}
async function tryTitle(title) {
  const big = await thumbAt(title, 800);       // ヒーロー用
  if (!big) return null;
  await sleep(120);
  const small = await thumbAt(title, 480);     // カード用（API経由=正規レンダリング）
  return { thumbUrl: big.thumbUrl, thumbSmall: small ? small.thumbUrl : big.thumbUrl, fileName: big.fileName };
}

const outPath = join(ROOT, "tools", "area-photos.json");
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : {};
let ok = 0, none = 0, skip = 0;
for (const a of targets) {
  if (out[a.slug]) { skip++; continue; }
  const name = a.translations.ja.name, pf = prefName(a.prefId);
  let hit = null;
  for (const t of [name, name + " (" + pf + ")"]) {
    try { hit = await tryTitle(t); } catch (e) {}
    if (hit) break;
    await sleep(150);
  }
  if (!hit) { none++; console.log("no image:", pf, name); continue; }
  try {
    const m = await jget("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata%7Curl&titles=" + encodeURIComponent(hit.fileName));
    const info = Object.values(m.query.pages)[0];
    const md = info?.imageinfo?.[0]?.extmetadata || {};
    out[a.slug] = {
      url: hit.thumbUrl, urlSmall: hit.thumbSmall,
      credit: "Photo: " + (strip(md.Artist?.value) || "不明") + " / Wikimedia Commons, " + (strip(md.LicenseShortName?.value) || "see Commons"),
      source: info?.imageinfo?.[0]?.descriptionurl || ("https://commons.wikimedia.org/wiki/" + encodeURIComponent(hit.fileName))
    };
    ok++;
    if (ok % 25 === 0) { writeFileSync(outPath, JSON.stringify(out, null, 1)); console.log("…", ok, "/", targets.length); }
  } catch (e) { none++; console.log("meta fail:", name); }
  await sleep(250);
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`done: 取得${ok} / スキップ(取得済)${skip} / 画像なし${none}（対象${targets.length}エリア）`);
