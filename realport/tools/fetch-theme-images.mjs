// REALPORT — テーマ別パネル画像取得（Wikipedia/Wikimedia Commons・クレジット付き）
// カード種別ごとのサムネイル画像を ja.wikipedia の代表画像から取得し
// images/themes/<key>.jpg + tools/theme-images.json に保存する。
// 使い方: node tools/fetch-theme-images.mjs   （取得済みキーはスキップ。差し替えは json から該当キーを削除）
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "User-Agent": "REALPORT-site-builder/1.0 (contact: jiantailanglin266@gmail.com)" };

// key → 候補記事タイトル（先頭から順に試す）
const THEMES = {
  sell:          ["一戸建て", "日本の住宅"],
  buy:           ["晴海 (東京都中央区)"],
  inheritance:   ["古民家", "民家"],
  divorce:       ["多摩ニュータウン","ニュータウン"],
  relocation:    ["引越し"],
  "vacant-house":["空き家"],
  cost:          ["日本銀行券","一万円紙幣","日本円"],
  tax:           ["霞が関","財務省"],
  mortgage:      ["日本銀行", "銀行"],
  assessment:    ["握手"],
  story:         ["表参道ヒルズ","団地","日本住宅公団"],
  diagnosis:     ["方位磁針", "羅針盤"],
  relport_hero:  ["横浜港", "港"]
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => String(s || "").replace(/<[^>]*>/g, "").trim();
async function jget(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(r.status + " " + url); return r.json(); }

async function tryTitle(title) {
  const q = await jget("https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=640&redirects=1&titles=" + encodeURIComponent(title));
  const page = Object.values(q.query.pages)[0];
  if (!page || !page.thumbnail) return null;
  return { thumbUrl: page.thumbnail.source, fileName: "File:" + page.pageimage, article: title };
}

async function main() {
  mkdirSync(join(ROOT, "images", "themes"), { recursive: true });
  const outPath = join(ROOT, "tools", "theme-images.json");
  const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : {};

  for (const [key, titles] of Object.entries(THEMES)) {
    if (out[key]) { console.log("skip (done):", key); continue; }
    let hit = null;
    for (const t of titles) { try { hit = await tryTitle(t); } catch (e) {} if (hit) break; await sleep(300); }
    if (!hit) { console.log("NO IMAGE:", key, titles.join("/")); continue; }
    try {
      const m = await jget("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata%7Curl&titles=" + encodeURIComponent(hit.fileName));
      const info = Object.values(m.query.pages)[0];
      const md = info?.imageinfo?.[0]?.extmetadata || {};
      const artist = strip(md.Artist?.value) || "不明";
      const license = strip(md.LicenseShortName?.value) || "see Commons";
      const descUrl = info?.imageinfo?.[0]?.descriptionurl || ("https://commons.wikimedia.org/wiki/" + encodeURIComponent(hit.fileName));
      const img = await fetch(hit.thumbUrl, { headers: UA });
      if (!img.ok) throw new Error("img " + img.status);
      const buf = Buffer.from(await img.arrayBuffer());
      const ext = (hit.thumbUrl.match(/\.(png|jpe?g|webp)/i)?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
      const file = "images/themes/" + key + "." + ext;
      writeFileSync(join(ROOT, file), buf);
      out[key] = { file, credit: "Photo: " + artist + " / Wikimedia Commons, " + license, source: descUrl, article: hit.article, wikiFile: hit.fileName };
      writeFileSync(outPath, JSON.stringify(out, null, 1));
      console.log("ok:", key, "←", hit.article, "(" + Math.round(buf.length / 1024) + "KB, " + license + ")");
    } catch (e) { console.log("FAIL:", key, String(e.message || e)); }
    await sleep(400);
  }
  console.log("done:", Object.keys(out).length + "/" + Object.keys(THEMES).length);
}
main();
