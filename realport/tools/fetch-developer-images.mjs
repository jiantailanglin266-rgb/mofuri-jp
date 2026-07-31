// REALPORT — 国内大手デベロッパー一覧の画像取得（Wikipedia引用・クレジット付き）
// 各社のja.wikipedia記事（または代表プロジェクト記事）の代表画像を取得し
// images/developers/ に保存、tools/developer-images.json にメタデータを記録する。
// 実行: node tools/fetch-developer-images.mjs
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "User-Agent": "REALPORT-site-builder/1.0 (contact: jiantailanglin266@gmail.com)" };

// name / 紹介文（断定を避けた一般的記述）/ 画像候補記事（先頭から試行）
const DEVELOPERS = [
  { key: "mitsui",   name: "三井不動産",       desc: "日本橋の再開発や東京ミッドタウン、ららぽーと等を手がける総合デベロッパー。", articles: ["三井不動産", "日本橋三井タワー", "東京ミッドタウン"] },
  { key: "mec",      name: "三菱地所",         desc: "丸の内エリアの開発で知られる総合デベロッパー。「ザ・パークハウス」を展開。", articles: ["三菱地所", "丸の内ビルディング"] },
  { key: "sumitomo", name: "住友不動産",       desc: "都心の超高層オフィス・タワーマンションを多数手がける総合デベロッパー。", articles: ["住友不動産", "新宿住友ビルディング"] },
  { key: "tokyu",    name: "東急不動産",       desc: "渋谷の再開発や「ブランズ」シリーズで知られる東急グループのデベロッパー。", articles: ["東急不動産", "渋谷スクランブルスクエア"] },
  { key: "nomura",   name: "野村不動産",       desc: "分譲マンション「プラウド」シリーズで知られるデベロッパー。", articles: ["野村不動産", "新宿野村ビルディング"] },
  { key: "mori",     name: "森ビル",           desc: "六本木ヒルズ・麻布台ヒルズなど大規模複合開発を手がける都市デベロッパー。", articles: ["森ビル", "六本木ヒルズ"] },
  { key: "tatemono", name: "東京建物",         desc: "「Brillia」シリーズや八重洲の再開発で知られる老舗デベロッパー。", articles: ["東京建物", "東京スクエアガーデン"] },
  { key: "hulic",    name: "ヒューリック",     desc: "都心部の不動産保有・開発を軸とするデベロッパー。", articles: ["ヒューリック", "銀座", "有楽町"] },
  { key: "daiwa",    name: "大和ハウス工業",   desc: "戸建てから商業・物流施設まで手がける住宅・建設大手。", articles: ["大和ハウス工業", "大阪マルビル"] },
  { key: "sekisui",  name: "積水ハウス",       desc: "戸建て住宅大手。分譲マンション「グランドメゾン」も展開。", articles: ["積水ハウス"] },
  { key: "nttud",    name: "NTT都市開発",       desc: "アーバンネットシリーズのオフィスや「ウエリス」を手がけるNTTグループのデベロッパー。", articles: ["NTT都市開発", "アーバンネット大手町ビルディング", "大手町"] },
  { key: "openhouse",name: "オープンハウスグループ", desc: "都心部の戸建て・マンションを軸に成長した総合不動産グループ。", articles: ["オープンハウスグループ", "オープンハウス"] }
];

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

mkdirSync(join(ROOT, "images", "developers"), { recursive: true });
const outPath = join(ROOT, "tools", "developer-images.json");
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf-8")) : [];

for (const d of DEVELOPERS) {
  if (out.find(o => o.key === d.key)) { console.log("skip:", d.name); continue; }
  let hit = null;
  for (const t of d.articles) { try { hit = await tryTitle(t); } catch (e) {} if (hit) break; await sleep(250); }
  if (!hit) { console.log("NO IMAGE:", d.name); continue; }
  try {
    const m = await jget("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata%7Curl&titles=" + encodeURIComponent(hit.fileName));
    const info = Object.values(m.query.pages)[0];
    const md = info?.imageinfo?.[0]?.extmetadata || {};
    const img = await fetch(hit.thumbUrl, { headers: UA });
    if (!img.ok) throw new Error("img " + img.status);
    const buf = Buffer.from(await img.arrayBuffer());
    const ext = (hit.thumbUrl.match(/\.(jpe?g|webp|png)/i)?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
    const file = "images/developers/" + d.key + "." + ext;
    writeFileSync(join(ROOT, file), buf);
    out.push({ key: d.key, name: d.name, desc: d.desc, file,
      credit: "Photo: " + (strip(md.Artist?.value) || "不明") + " / Wikimedia Commons, " + (strip(md.LicenseShortName?.value) || "see Commons"),
      source: info?.imageinfo?.[0]?.descriptionurl || "",
      article: hit.article, wikiUrl: "https://ja.wikipedia.org/wiki/" + encodeURIComponent(hit.article) });
    writeFileSync(outPath, JSON.stringify(out, null, 1));
    console.log("ok:", d.name, "←", hit.article, "(" + Math.round(buf.length / 1024) + "KB)");
  } catch (e) { console.log("FAIL:", d.name, String(e.message || e)); }
  await sleep(400);
}
console.log("done:", out.length, "/", DEVELOPERS.length);
