// REALPORT — Wikipedia/Wikimedia Commons 画像取得パイプライン
// 各エリアの ja.wikipedia 代表画像(サムネイル800px)をDLし、Commonsのextmetadataから
// 作者・ライセンスを取得して area-images.json に記録する。画像は全てWikipedia引用方針。
// 使い方: node tools/fetch-commons-images.mjs   (realport/ ディレクトリで実行)
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "User-Agent": "REALPORT-site-builder/1.0 (contact: jiantailanglin266@gmail.com)" };

// slug → ja.wikipedia 記事名
const TARGETS = {
  "shinjuku-ku": "新宿区", "shibuya-ku": "渋谷区", "minato-ku": "港区 (東京都)",
  "setagaya-ku": "世田谷区", "koto-ku": "江東区", "nerima-ku": "練馬区",
  "yokohama": "横浜市", "kawasaki": "川崎市", "saitama-shi": "さいたま市", "chiba-shi": "千葉市",
  "osaka-shi": "大阪市", "kyoto-shi": "京都市", "kobe-shi": "神戸市", "nagoya": "名古屋市",
  "sapporo": "札幌市", "fukuoka-shi": "福岡市", "sendai": "仙台市", "hiroshima-shi": "広島市"
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => String(s || "").replace(/<[^>]*>/g, "").trim();

async function jget(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(r.status + " " + url);
  return r.json();
}

async function main() {
  mkdirSync(join(ROOT, "images", "areas"), { recursive: true });
  const outPath = join(ROOT, "tools", "area-images.json");
  const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : {};

  for (const [slug, title] of Object.entries(TARGETS)) {
    if (out[slug]) { console.log("skip (done):", slug); continue; }
    try {
      // 1) 記事の代表画像（800pxサムネイル + 元ファイル名）
      const q = await jget("https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=800&redirects=1&titles=" + encodeURIComponent(title));
      const page = Object.values(q.query.pages)[0];
      if (!page || !page.thumbnail) { console.log("no image:", slug, title); continue; }
      const thumbUrl = page.thumbnail.source;
      const fileName = "File:" + page.pageimage;

      // 2) Commons extmetadata（作者・ライセンス）
      const m = await jget("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata%7Curl&titles=" + encodeURIComponent(fileName));
      const info = Object.values(m.query.pages)[0];
      const md = info?.imageinfo?.[0]?.extmetadata || {};
      const artist = strip(md.Artist?.value) || "不明";
      const license = strip(md.LicenseShortName?.value) || "see Commons";
      const descUrl = info?.imageinfo?.[0]?.descriptionurl || ("https://commons.wikimedia.org/wiki/" + encodeURIComponent(fileName));

      // 3) サムネイルをDL
      const img = await fetch(thumbUrl, { headers: UA });
      if (!img.ok) throw new Error("img " + img.status);
      const buf = Buffer.from(await img.arrayBuffer());
      const ext = thumbUrl.match(/\.(png|jpe?g|webp)/i) ? thumbUrl.match(/\.(png|jpe?g|webp)/i)[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
      const file = "images/areas/" + slug + "." + ext;
      writeFileSync(join(ROOT, file), buf);

      out[slug] = { file, credit: "Photo: " + artist + " / Wikimedia Commons, " + license, source: descUrl, wikiFile: fileName };
      writeFileSync(outPath, JSON.stringify(out, null, 1));
      console.log("ok:", slug, "->", file, "(" + Math.round(buf.length / 1024) + "KB)", license);
    } catch (e) {
      console.log("FAIL:", slug, String(e.message || e));
    }
    await sleep(400); // 行儀よく
  }
  console.log("done. " + Object.keys(out).length + "/" + Object.keys(TARGETS).length + " images");
}
main();
