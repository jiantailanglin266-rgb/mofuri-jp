// REALPORT — 画像マーキー用の写真取得（Wikipedia/Wikimedia Commons・横長のみ・各プール12枚）
// プール: city(都市) / living(住まい・街並み) / port(港・ランドマーク)
// 横長判定: APIのサムネイル寸法で width > height×1.15 のものだけ採用
// 使い方: node tools/fetch-marquee-images.mjs  （プール単位で取得済みならスキップ。やり直しは marquee-images.json の該当プールを削除）
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "User-Agent": "REALPORT-site-builder/1.0 (contact: jiantailanglin266@gmail.com)" };
const NEED = 12;

const POOLS = {
  city: ["新宿", "渋谷", "池袋", "銀座", "梅田", "難波", "栄 (名古屋市)", "天神 (福岡市)", "みなとみらい", "丸の内", "中之島 (大阪府)", "三宮", "大通公園", "博多駅", "仙台駅", "広島市中心部"],
  living: ["田園調布", "芦屋市", "自由が丘", "吉祥寺", "鎌倉市", "軽井沢町", "日本庭園", "縁側", "畳", "町家", "白川郷", "倉敷美観地区", "江戸東京たてもの園", "代官山町", "成城", "山手 (横浜市)"],
  port: ["横浜港", "神戸港", "東京港", "レインボーブリッジ", "横浜ベイブリッジ", "お台場", "東京駅", "東京スカイツリー", "門司港", "函館市", "長崎港", "小樽市", "晴海 (東京都中央区)", "竹芝", "神戸ポートタワー", "大さん橋", "名古屋港", "大阪港", "清水港", "博多港"]
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => String(s || "").replace(/<[^>]*>/g, "").trim();
const slugify = s => s.normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "x";
async function jget(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(r.status + " " + url); return r.json(); }

async function candidate(title) {
  const q = await jget("https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=640&redirects=1&titles=" + encodeURIComponent(title));
  const p = Object.values(q.query.pages)[0];
  if (!p || !p.thumbnail) return null;
  const t = p.thumbnail;
  if (!(t.width > t.height * 1.15)) return null; // 横長のみ
  if (/\.(svg|png)$/i.test(p.pageimage) && t.width < 400) return null; // ロゴ・地図らしきものを弾く
  return { thumbUrl: t.source, fileName: "File:" + p.pageimage, article: title, w: t.width, h: t.height };
}

async function main() {
  mkdirSync(join(ROOT, "images", "marquee"), { recursive: true });
  const outPath = join(ROOT, "tools", "marquee-images.json");
  const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : {};

  for (const [pool, titles] of Object.entries(POOLS)) {
    if (out[pool] && out[pool].length >= NEED) { console.log("skip (done):", pool); continue; }
    const got = out[pool] = out[pool] || [];
    for (const title of titles) {
      if (got.length >= NEED) break;
      if (got.find(g => g.article === title)) continue;
      try {
        const c = await candidate(title);
        if (!c) { console.log("  pass(縦長/なし):", title); await sleep(250); continue; }
        const m = await jget("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata%7Curl&titles=" + encodeURIComponent(c.fileName));
        const info = Object.values(m.query.pages)[0];
        const md = info?.imageinfo?.[0]?.extmetadata || {};
        const img = await fetch(c.thumbUrl, { headers: UA });
        if (!img.ok) throw new Error("img " + img.status);
        const buf = Buffer.from(await img.arrayBuffer());
        const ext = (c.thumbUrl.match(/\.(jpe?g|webp|png)/i)?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
        const file = "images/marquee/" + pool + "-" + slugify(title) + "." + ext;
        writeFileSync(join(ROOT, file), buf);
        got.push({ file, article: title,
          credit: "Photo: " + (strip(md.Artist?.value) || "不明") + " / Wikimedia Commons, " + (strip(md.LicenseShortName?.value) || "see Commons"),
          source: info?.imageinfo?.[0]?.descriptionurl || "" });
        writeFileSync(outPath, JSON.stringify(out, null, 1));
        console.log("ok:", pool, got.length + "/" + NEED, title, "(" + Math.round(buf.length / 1024) + "KB)");
      } catch (e) { console.log("FAIL:", title, String(e.message || e)); }
      await sleep(350);
    }
    console.log(pool, "→", got.length, "枚");
  }
}
main();
