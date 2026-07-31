// REALPORT — 不動産関連「公式」YouTubeチャンネルの動画取り込み
// 1) ハンドル候補から公式チャンネルを解決（og:titleに期待名が含まれるか検証）
// 2) 公式RSS(feeds/videos.xml)から最新動画のメタデータ(videoId/title/公開日)を取得
// 3) tools/youtube-channels.json に保存（gen-data が DATA.videoChannels に取り込む）
// 使い方: node tools/fetch-youtube.mjs   （全チャンネル再取得。定期実行で最新化）
// ※動画・サムネイルは取り込まず、表示は各動画の公式埋め込み(iframe)とYouTube提供サムネイルを使用
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) REALPORT-site-builder/1.0", "Accept-Language": "ja" };
const PER_CHANNEL = 12;

// 公式チャンネル候補。search（チャンネル検索）で解決し、タイトルに must のいずれかが含まれたら採用
const ORGS = [
  { key: "mlit",    name: "国土交通省",                type: "行政", must: ["国土交通"], search: "国土交通省" },
  { key: "nta",     name: "国税庁",                    type: "行政", must: ["国税庁"], search: "国税庁動画チャンネル" },
  { key: "moj",     name: "法務省",                    type: "行政", must: ["法務省", "MOJ"], search: "法務省チャンネル" },
  { key: "gov",     name: "政府広報オンライン",         type: "行政", must: ["政府広報"], search: "政府広報オンライン" },
  { key: "ur",      name: "UR都市機構",                type: "公的機関", must: ["UR都市機構"], search: "UR都市機構 公式" },
  { key: "jhf",     name: "住宅金融支援機構（フラット35）", type: "公的機関", must: ["住宅金融支援機構", "フラット35", "JHF"], search: "住宅金融支援機構" },
  { key: "suumo",   name: "SUUMO",                    type: "企業公式", must: ["SUUMO", "スーモ"], search: "SUUMO スーモ 公式" },
  { key: "homes",   name: "LIFULL HOME'S",            type: "企業公式", must: ["LIFULL", "HOME'S", "ホームズ"], search: "LIFULL HOME'S 公式" },
  { key: "rehouse", name: "三井のリハウス",             type: "企業公式", must: ["リハウス"], search: "三井のリハウス 公式" },
  { key: "livable", name: "東急リバブル",               type: "企業公式", must: ["リバブル"], search: "東急リバブル 公式" },
  { key: "nomu",    name: "ノムコム（野村不動産ソリューションズ）", type: "企業公式", must: ["ノムコム", "野村不動産"], search: "ノムコム 野村不動産" },
  { key: "zentaku", name: "全宅連（ハトマーク）",        type: "業界団体", must: ["宅地建物", "全宅連", "ハトマーク"], search: "全国宅地建物取引業協会" },
  { key: "fudosandaigaku", name: "棚田行政書士の不動産大学", type: "メディア", must: ["不動産大学"], search: "棚田行政書士の不動産大学" },
  { key: "rakumachi", name: "楽待",                    type: "メディア", must: ["楽待"], search: "楽待 不動産投資チャンネル" }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const dec = s => String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// チャンネル検索(フィルタ: チャンネルのみ)の結果から channelId+タイトル一覧を抽出
async function searchChannels(query) {
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query) + "&sp=EgIQAg%253D%253D";
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return [];
  const html = await r.text();
  const out = [];
  const re = /"channelId":"(UC[\w-]{22})".{0,400}?"title":\{"simpleText":"((?:[^"\\]|\\.)+)"\}/gs;
  let m;
  while ((m = re.exec(html)) && out.length < 8) {
    const title = dec(m[2].replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(.)/g, "$1"));
    if (!out.find(o => o.channelId === m[1])) out.push({ channelId: m[1], title });
  }
  return out;
}

async function fetchRss(channelId) {
  const r = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId, { headers: UA });
  if (!r.ok) throw new Error("rss " + r.status);
  const xml = await r.text();
  const out = [];
  const entries = xml.split("<entry>").slice(1);
  for (const e of entries) {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = dec((e.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
    const published = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || "";
    if (id && title) out.push({ id, title, published: published.slice(0, 10) });
    if (out.length >= PER_CHANNEL) break;
  }
  return out;
}

const channels = [];
for (const org of ORGS) {
  let hit = null;
  // 連続リクエストで検索結果が空になることがあるため、間隔を空けて最大3回試行
  for (let attempt = 1; attempt <= 3 && !hit; attempt++) {
    try {
      const results = await searchChannels(org.search);
      hit = results.find(c => org.must.some(m => c.title.includes(m)));
      if (!hit && results.length) { console.log("  候補:", org.name, "→", results.slice(0, 3).map(c => c.title).join(" / ")); break; }
      if (!hit) await sleep(4000 * attempt);
    } catch (e) { await sleep(4000 * attempt); }
  }
  if (!hit) { console.log("NG:", org.name, "(公式チャンネルを解決できず)"); continue; }
  try {
    const videos = await fetchRss(hit.channelId);
    channels.push({ key: org.key, name: org.name, officialTitle: hit.title, type: org.type,
      channelId: hit.channelId,
      url: "https://www.youtube.com/channel/" + hit.channelId, videos,
      fetchedAt: new Date().toISOString().slice(0, 10) });
    console.log("OK:", org.name, "→", hit.title, "(" + videos.length + "本)");
  } catch (e) { console.log("RSS FAIL:", org.name, String(e.message || e)); }
  await sleep(2500);
}
writeFileSync(join(ROOT, "tools", "youtube-channels.json"), JSON.stringify(channels, null, 1));
console.log("\ndone:", channels.length, "チャンネル /", channels.reduce((s, c) => s + c.videos.length, 0), "動画");
