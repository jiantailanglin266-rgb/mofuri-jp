// REALPORT — 査定サービスカードの背景画像取得（運営企業ゆかりのWikipedia画像・クレジット付き）
// ロゴ（商標）は使わず、運営企業の本社ビル・関連建築物の写真を候補記事から取得する。
// 実行: node tools/fetch-service-images.mjs → images/services/ + tools/service-images.json
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "User-Agent": "REALPORT-site-builder/1.0 (contact: jiantailanglin266@gmail.com)" };

// slug → 候補記事（運営企業・本社ビル等）。sumai-value は既存の developers 画像を使うため対象外
const TARGETS = {
  "lifull-satei": ["LIFULL", "千代田区"],
  "ieul": ["Speee", "六本木グランドタワー"],
  "suumo-baikyaku": ["リクルートホールディングス", "グラントウキョウ", "東京駅"],
  "home4u": ["NTTデータグループ", "NTTデータ", "豊洲センタービル"],
  "lvnmatch": ["リビン・テクノロジーズ", "東京証券取引所"]
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => String(s || "").replace(/<[^>]*>/g, "").trim();
const BAD = /\.svg$|logo|ロゴ|map|位置|emblem|flag/i;
async function jget(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(r.status); return r.json(); }
async function tryTitle(title) {
  const q = await jget("https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=640&redirects=1&titles=" + encodeURIComponent(title));
  const p = Object.values(q.query.pages)[0];
  if (!p || !p.thumbnail || !p.pageimage) return null;
  if (BAD.test(p.pageimage)) return null;
  return { thumbUrl: p.thumbnail.source, fileName: "File:" + p.pageimage, article: title };
}

mkdirSync(join(ROOT, "images", "services"), { recursive: true });
const outPath = join(ROOT, "tools", "service-images.json");
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : {};

for (const [slug, titles] of Object.entries(TARGETS)) {
  if (out[slug]) { console.log("skip:", slug); continue; }
  let hit = null;
  for (const t of titles) { try { hit = await tryTitle(t); } catch (e) {} if (hit) break; await sleep(250); }
  if (!hit) { console.log("NO IMAGE:", slug); continue; }
  try {
    const m = await jget("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata%7Curl&titles=" + encodeURIComponent(hit.fileName));
    const info = Object.values(m.query.pages)[0];
    const md = info?.imageinfo?.[0]?.extmetadata || {};
    const img = await fetch(hit.thumbUrl, { headers: UA });
    if (!img.ok) throw new Error("img " + img.status);
    const buf = Buffer.from(await img.arrayBuffer());
    const ext = (hit.thumbUrl.match(/\.(jpe?g|webp|png)/i)?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
    const file = "images/services/" + slug + "." + ext;
    writeFileSync(join(ROOT, file), buf);
    out[slug] = { file, article: hit.article,
      credit: "Photo: " + (strip(md.Artist?.value) || "不明") + " / Wikimedia Commons, " + (strip(md.LicenseShortName?.value) || "see Commons"),
      source: info?.imageinfo?.[0]?.descriptionurl || "" };
    writeFileSync(outPath, JSON.stringify(out, null, 1));
    console.log("ok:", slug, "←", hit.article, "(" + Math.round(buf.length / 1024) + "KB)");
  } catch (e) { console.log("FAIL:", slug, String(e.message || e)); }
  await sleep(400);
}
console.log("done:", Object.keys(out).length, "/", Object.keys(TARGETS).length);
