// REALPORT SSG — index.html + data.js から全静的ページと sitemap/robots/llms/404/manifest/sw を生成
// 実行: node build.mjs   （index.html か data.js を変更したら必ず実行してからデプロイ）
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = "https://jiantailanglin266-rgb.github.io/mofuri-jp/realport"; // 独自ドメイン移行時はここを変更
const src = readFileSync(join(ROOT, "index.html"), "utf-8");
let RATES = null;
try { RATES = JSON.parse(readFileSync(join(ROOT, "rates.js"), "utf-8").match(/^var RATES=(.*);$/m)[1]); } catch (e) {}
const DATA = JSON.parse(readFileSync(join(ROOT, "data.js"), "utf-8").match(/^var DATA=(.*);$/m)[1]);
const LOCALES = ["ja"]; // en 追加時はここに足し、data.js の translations に en を投入する
const S = DATA.siteSettings;

const tr = o => o.translations.ja;
// 全国成約集計（DATA.mkt・コンパクト形式）→ marketData互換の行に展開
const mktOf = a => {
  const src = DATA.siteSettings.mktSource, arr = (DATA.mkt || {})[a.slug];
  if (!src || !arr) return [];
  return arr.map(r => ({ areaId: a.id, propertyType: r[0], period: src.year + "年（成約）",
    avgPrice: r[1], medianPrice: r[2], pricePerSqm: r[3], txCount: r[4],
    label: "成約価格集計（" + src.year + "年・年間）", unit: "件",
    sourceName: src.name, sourceUrl: src.url, sourceDate: src.date, updatedAt: src.fetchedAt }));
};
const nm = o => o.names.ja;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const prefOf = a => DATA.prefectures.find(p => p.id === a.prefId);
const d155 = s => String(s || "").replace(/\n/g, " ").slice(0, 155);
const catName = c => ({ sell: "売却の基本", inheritance: "相続", divorce: "離婚", relocation: "住み替え", "vacant-house": "空き家", cost: "費用", tax: "税金", mortgage: "住宅ローン", assessment: "査定サービス", story: "住まいの歴史", buy: "購入" })[c] || c;

/* ---------- 1. ページ列挙 ---------- */
const pages = [];
const push = (path, title, desc, extra) => pages.push({ path, locale: "ja", title, desc, ...extra });

const STATIC = {
  "": ["REALPORT（リアルポート）| 不動産の母港。売る・買う・住み替えの入口を、ひとつに。", S.desc, "home"],
  "sell/": ["不動産売却ガイド | 流れ・費用・査定比較 | REALPORT", "不動産売却の流れ・仲介と買取の違い・費用と税金・査定サービス比較まで。売却に必要な情報の入口です。", "sell"],
  "buy/": ["不動産購入ガイド | 流れ・諸費用・ローン | REALPORT", "中古マンション・戸建て・土地の購入の流れ、諸費用、住宅ローン、内見チェックリストを解説します。", "buy"],
  "sell/assessment/": ["不動産査定サービス比較・ランキング | REALPORT", "一括査定・買取・リースバック・土地活用サービスを比較。PR表記・比較方針を明示した中立的な比較ページです。", "assessment"],
  "sell/purchase/": ["不動産買取サービス比較 | REALPORT", "不動産会社による直接買取の仕組み・メリット・注意点とサービス比較。スピード重視の売却に。", "purchase"],
  "sell/leaseback/": ["リースバック比較 | 注意点と選び方 | REALPORT", "自宅に住み続けながら資金化するリースバックの仕組み・メリット・注意点とサービス比較。", "leaseback"],
  "market/": ["エリア別 不動産相場データベース | 47都道府県 | REALPORT", "都道府県・市区町村ごとの不動産相場情報。公的データを出典・更新日つきで掲載します（接続準備中）。", "market"],
  "guide/": ["不動産売却・購入のお役立ち情報 | REALPORT", "相続・離婚・空き家・住み替え・税金・住宅ローンなど、不動産の悩み別解説記事の一覧です。", "guideList"],
  "rankings/": ["特集・エリア一覧 | REALPORT", "掲載エリアの特集・一覧ページです。", "rankings"],
  "tools/": ["無料ツール | 売却診断・費用/税金/ローンシミュレーター | REALPORT", "AI売却診断、売却費用・譲渡所得税・住宅ローンの無料シミュレーターを提供します。", "tools"],
  "tools/ai-sell-diagnosis/": ["AI売却診断（無料）| 仲介・買取・リースバック適合度 | REALPORT", "7つの質問で売却方法の適合度と準備チェックリストを表示。査定額の提示・保証は行いません。", "tool"],
  "tools/selling-cost/": ["不動産売却費用シミュレーター（無料）| REALPORT", "仲介手数料（法定上限の速算式）・印紙税・手取り額の概算を計算できる無料シミュレーターです。", "tool"],
  "tools/capital-gains-tax/": ["譲渡所得税シミュレーター（無料）| 3,000万円控除対応 | REALPORT", "不動産売却の譲渡所得税を概算。3,000万円特別控除・長期短期税率に対応。出典は国税庁タックスアンサー。", "tool"],
  "tools/mortgage/": ["住宅ローン返済シミュレーター（無料）| REALPORT", "借入額・金利・期間から元利均等返済の月額を概算する無料シミュレーターです。", "tool"],
  "videos/": ["不動産の公式動画ライブラリ | 国交省・国税庁・大手不動産の公式YouTube | REALPORT", "国土交通省・国税庁・法務省・UR都市機構・住宅金融支援機構・SUUMO・三井のリハウスなどの公式YouTubeチャンネルの最新動画をまとめて視聴できます。", "videos"],
  "companies/": ["不動産会社検索（準備中）| REALPORT", "掲載許可を得た不動産会社を免許番号つきで掲載する検索機能を準備中です。", "prep"],
  "professionals/": ["士業・関連事業者検索（準備中）| REALPORT", "税理士・司法書士・弁護士など不動産関連の専門家検索を準備中です。", "prep"],
  "faq/": ["よくある質問 | REALPORT", "REALPORTのサービス内容・査定サービス比較・データ出典に関するよくある質問と回答です。", "faq"],
  "about/": ["REALPORTについて・運営者情報", "REALPORT（リアルポート）のコンセプト・サイトの性格・運営者情報のページです。", "page"],
  "editorial-policy/": ["編集方針 | REALPORT", "出典主義・架空データの排除・YMYL領域での注意・監修体制など、REALPORTの編集方針です。", "page"],
  "data-policy/": ["データ出典方針 | REALPORT", "相場データ・人口データ・画像（Wikipedia/Wikimedia Commons引用）の出典と取り扱い方針です。", "page"],
  "advertising-policy/": ["広告掲載ポリシー | REALPORT", "PR表記・rel=sponsored・編集と広告の分離など、REALPORTの広告掲載方針です。", "page"],
  "privacy/": ["プライバシーポリシー | REALPORT", "REALPORTにおける情報の取り扱い方針です。個人情報をサーバーで取得・保存しません。", "page"],
  "terms/": ["利用規約 | REALPORT", "REALPORTの利用条件を定める規約です。", "page"],
  "disclaimer/": ["免責事項 | REALPORT", "REALPORTの情報は一般的な参考情報であり、価格・成約・税額を保証するものではありません。", "page"],
  "contact/": ["お問い合わせ | REALPORT", "お問い合わせ・訂正依頼・掲載のご相談窓口です。", "page"],
  "sitemap/": ["サイトマップ | REALPORT", "REALPORTの全ページ一覧です。", "page"],
  "mypage/": ["マイページ | REALPORT", "お気に入りエリアと診断履歴（この端末にのみ保存されます）。", "noindex"]
};
for (const [p, [t, d, kind]] of Object.entries(STATIC)) push("/ja/" + p, t, d, { kind });

/* エリアページ: 実データ入りの説明文（検索結果でのCTR向上・LLMO） */
const areaDesc = a => {
  const t = tr(a);
  const rows = DATA.marketData.filter(m => m.areaId === a.id).concat(mktOf(a));
  const tn = { mansion: "マンション", house: "戸建て", land: "土地" };
  const parts = [];
  for (const ty of ["mansion", "house"]) {
    const r = rows.find(x => x.propertyType === ty && x.medianPrice != null);
    if (r) parts.push(`${tn[ty]}成約中央値${Math.round(r.medianPrice / 10000).toLocaleString()}万円(${r.txCount}件)`);
  }
  const l = rows.find(x => x.propertyType === "land" && x.pricePerSqm != null && /地価公示/.test(x.label || ""));
  if (l) parts.push(`住宅地地価${l.pricePerSqm.toLocaleString()}円/㎡`);
  if (!parts.length) return d155(t.summary);
  return d155(`${t.name}の不動産相場：${parts.join("・")}。国土交通省の公的データ(2025年)に基づく売却・査定情報。`);
};
for (const a of DATA.areas) {
  if (a.cat) continue; // カタログ層は個別ページを作らない（薄ページ回避）
  const t = tr(a), pf = prefOf(a);
  const hasData = a.dataLevel >= 1;
  push(`/ja/market/${pf.slug}/${a.slug}/`,
    hasData ? `${t.name}の不動産相場・成約価格【2025年公的データ】| REALPORT` : `${t.name}の不動産相場・売却情報 | REALPORT`,
    areaDesc(a), { kind: "area", a, crumbLast: t.name,
      ogImage: a.img ? SITE + "/" + a.img : (a.imgUrl || null),
      lastmod: DATA.siteSettings.mktSource?.fetchedAt || null });
}
for (const pf of DATA.prefectures) {
  const n = DATA.areas.filter(x => x.prefId === pf.id && !x.cat).length;
  const total = DATA.areas.filter(x => x.prefId === pf.id).length;
  push(`/ja/market/${pf.slug}/`, `${nm(pf)}の不動産相場情報 | 市区町村一覧 | REALPORT`,
    `${nm(pf)}の不動産相場・売却情報。収録${total}市区町村${n ? `、詳細ページ${n}エリア公開中` : "（詳細ページは準備中）"}。`, { kind: "pref", pf, crumbLast: nm(pf) });
}
const themeImg = c => DATA.themeImages?.[c] ? SITE + "/" + DATA.themeImages[c].file : null;
for (const a of DATA.articles) push(`/ja/guide/${a.slug}/`, `${tr(a).title} | REALPORT`, d155(tr(a).metaDesc),
  { kind: "article", a, crumbLast: tr(a).title.split("—")[0].trim(), ogImage: themeImg(a.category), lastmod: a.updatedAt.slice(0, 10) });
const cats = [...new Set(DATA.articles.map(a => a.category))];
for (const c of cats) push(`/ja/guide/category/${c}/`, `${catName(c)}の記事一覧 | REALPORT`, `${catName(c)}に関する不動産解説記事の一覧です。`, { kind: "guideCat", c, crumbLast: catName(c), ogImage: themeImg(c) });
for (const s of DATA.services) push(`/ja/sell/assessment/${s.slug}/`, `${tr(s).name}の特徴・メリット・注意点 | REALPORT`, d155(tr(s).desc), { kind: "service", s, crumbLast: tr(s).name });
for (const r of DATA.rankings) push(`/ja/rankings/${r.slug}/`, `${nm(r)} | REALPORT`, d155(r.descriptions.ja), { kind: "ranking", r, crumbLast: nm(r) });
{ const vp = pages.find(p => p.kind === "videos"), v0 = DATA.videoChannels?.[0]?.videos?.[0];
  if (vp && v0) vp.ogImage = `https://i.ytimg.com/vi/${v0.id}/hqdefault.jpg`; }

/* ---------- 2. JSON-LD ---------- */
const SEG_LABEL = { sell: "不動産を売る", buy: "不動産を買う", market: "エリア相場", assessment: "査定サービス比較",
  purchase: "買取比較", leaseback: "リースバック比較", guide: "お役立ち情報", category: "カテゴリ", tools: "無料ツール",
  videos: "動画ライブラリ", rankings: "特集・一覧", companies: "不動産会社検索", professionals: "士業検索", faq: "よくある質問",
  "ai-sell-diagnosis": "AI売却診断", "selling-cost": "売却費用シミュレーター", "capital-gains-tax": "譲渡所得税シミュレーター", mortgage: "住宅ローンシミュレーター" };
const PREF_LABEL = Object.fromEntries(DATA.prefectures.map(pf => [pf.slug, nm(pf)]));
function crumbs(p) {
  const segs = p.path.replace(/^\/ja\/?|\/$/g, "").split("/").filter(Boolean);
  const items = [{ "@type": "ListItem", position: 1, name: "ホーム", item: SITE + "/ja/" }];
  let acc = "/ja";
  segs.forEach((s, i) => {
    acc += "/" + s;
    const last = i === segs.length - 1;
    const name = (last && p.crumbLast) || SEG_LABEL[s] || PREF_LABEL[s] || s;
    items.push({ "@type": "ListItem", position: i + 2, name, item: SITE + acc + "/" });
  });
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}
function jsonLd(p) {
  const out = [];
  if (p.kind === "area") {
    const t = tr(p.a), pf = prefOf(p.a);
    out.push({ "@context": "https://schema.org", "@type": "Place", name: t.name, description: d155(t.summary),
      url: SITE + p.path, geo: { "@type": "GeoCoordinates", latitude: p.a.lat, longitude: p.a.lng },
      address: { "@type": "PostalAddress", addressRegion: nm(pf), addressCountry: "JP" },
      ...(p.a.img ? { image: SITE + "/" + p.a.img } : p.a.imgUrl ? { image: p.a.imgUrl } : {}) });
  }
  if (p.kind === "article") {
    const t = tr(p.a);
    out.push({ "@context": "https://schema.org", "@type": "Article", headline: t.title, description: t.metaDesc,
      datePublished: p.a.publishedAt, dateModified: p.a.updatedAt, inLanguage: "ja",
      author: { "@type": "Organization", name: p.a.authorName }, publisher: { "@type": "Organization", name: "REALPORT" },
      ...(p.ogImage ? { image: p.ogImage } : {}),
      mainEntityOfPage: SITE + p.path });
  }
  if (p.kind === "assessment") {
    out.push({ "@context": "https://schema.org", "@type": "ItemList", name: "不動産査定サービス比較",
      itemListElement: DATA.services.sort((a, b) => a.ranking - b.ranking).map((s, i) => ({ "@type": "ListItem", position: i + 1, name: tr(s).name, url: SITE + "/ja/sell/assessment/" + s.slug + "/" })) });
  }
  if (p.kind === "ranking") {
    out.push({ "@context": "https://schema.org", "@type": "ItemList", name: nm(p.r),
      itemListElement: rankMembers(p.r).map((a, i) => ({ "@type": "ListItem", position: i + 1, name: tr(a).name, url: SITE + "/ja/market/" + prefOf(a).slug + "/" + a.slug + "/" })) });
  }
  if (p.kind === "videos" && DATA.videoChannels?.length) {
    out.push({ "@context": "https://schema.org", "@type": "ItemList", name: "不動産関連の公式YouTubeチャンネル",
      itemListElement: DATA.videoChannels.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.officialTitle, url: c.url })) });
    const vids = DATA.videoChannels.flatMap(c => c.videos.map(v => ({ v, c })))
      .sort((a, b) => (b.v.published || "") < (a.v.published || "") ? -1 : 1).slice(0, 12);
    for (const { v, c } of vids) out.push({ "@context": "https://schema.org", "@type": "VideoObject",
      name: v.title, description: c.officialTitle + "（公式チャンネル）の動画", uploadDate: v.published,
      thumbnailUrl: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`, contentUrl: `https://www.youtube.com/watch?v=${v.id}` });
  }
  if (p.kind === "market" && DATA.siteSettings.mktSource) {
    out.push({ "@context": "https://schema.org", "@type": "Dataset",
      name: "REALPORT 市区町村別 不動産成約価格・地価集計データ",
      description: `国土交通省の公的データ（不動産情報ライブラリの成約価格情報・地価公示）を市区町村×物件種別で集計したデータセット。${DATA.areas.filter(a => !a.cat).length}自治体を収録。件数${DATA.siteSettings.mktSource.minCount}件未満の集計は掲載していません。`,
      url: SITE + "/ja/market/", inLanguage: "ja", temporalCoverage: String(DATA.siteSettings.mktSource.year),
      dateModified: DATA.siteSettings.mktSource.fetchedAt,
      creator: { "@type": "Organization", name: "REALPORT" },
      isBasedOn: ["https://www.reinfolib.mlit.go.jp/", "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L01-2025.html"] });
  }
  if (p.kind === "faq" || p.kind === "home") {
    out.push({ "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: DATA.faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  }
  out.push(crumbs(p));
  return out;
}
function rankMembers(r) {
  let list = DATA.areas.filter(a => !a.cat && a.population != null);
  if (r.slugs) return r.slugs.map(s => DATA.areas.find(a => a.slug === s)).filter(Boolean);
  if (r.filter?.prefSlug) { const pf = DATA.prefectures.find(x => x.slug === r.filter.prefSlug); list = list.filter(a => a.prefId === pf.id); }
  if (r.sort === "population") list.sort((a, b) => b.population - a.population);
  return list;
}

/* ---------- 3. プリレンダー本文（クローラ/AI向けの実テキスト） ---------- */
function artText(body) {
  return body.split(/\n\n+/).filter(b => !b.startsWith("[img:") && !/^---\s*$/.test(b)).slice(0, 10)
    .map(b => b.startsWith("## ") ? `<h2>${esc(b.slice(3).split("\n")[0])}</h2><p>${esc(b.split("\n").slice(1).join(" ").replace(/\*\*/g, ""))}</p>`
      : `<p>${esc(b.replace(/\*\*/g, "").replace(/\n/g, " "))}</p>`).join("");
}
function svcText(s) {
  const t = tr(s);
  const tag = s.isPR ? "【PR】" : s.isDemo ? "【デモ】" : "";
  return `<h3>${esc(t.name)}${tag}</h3><p>${esc(t.desc)}</p>${s.company ? `<p>運営: ${esc(s.company)}</p>` : ""}${s.partnerLabel ? `<p>提携規模: ${esc(s.partnerLabel)}</p>` : ""}<p>メリット: ${esc(t.merits)}</p><p>注意点: ${esc(t.demerits)}</p><p>おすすめ: ${esc(t.target)}</p>${s.officialUrl ? `<p><a href="${esc(s.officialUrl)}" rel="nofollow noopener">公式サイト</a></p>` : ""}`;
}
function faqText(fs) { return "<h2>よくある質問</h2>" + fs.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join(""); }
function prerender(p) {
  const foot = `<p>${esc(S.disclaimer)}</p><p>最終更新: ${esc(S.updatedAt)}</p>`;
  switch (p.kind) {
    case "home":
      return `<h1>${esc(S.name)} — ${esc(S.tagline)}</h1><p>${esc(S.desc)}</p>
${RATES && RATES.boj ? `<h2>住宅ローン金利モニター（自動取得: ${esc(RATES.updated)}）</h2><ul><li>日本銀行 ${esc(RATES.boj.label)}: 年${RATES.boj.rate}%（${esc(RATES.boj.since)}適用開始・出典 <a href="${esc(RATES.boj.url)}" rel="noopener">日本銀行</a>）</li>${RATES.flat35 ? `<li>フラット35 最頻金利（${esc(RATES.flat35.month)}）: 年${RATES.flat35.mode}%（出典 <a href="${esc(RATES.flat35.url)}" rel="noopener">住宅金融支援機構</a>）</li>` : ""}</ul><p>適用金利は審査・優遇条件により異なります。各行の最新金利は公式サイトでご確認ください。</p>` : ""}
<h2>主要コンテンツ</h2><ul>${["sell/|不動産売却ガイド", "buy/|不動産購入ガイド", "market/|エリア別相場データベース", "sell/assessment/|査定サービス比較", "guide/|お役立ち情報", "tools/|無料ツール"].map(x => { const [u, l] = x.split("|"); return `<li><a href="${SITE}/ja/${u}">${l}</a></li>`; }).join("")}</ul>
<h2>掲載エリア</h2><ul>${DATA.areas.filter(a => !a.cat && a.population != null).map(a => `<li><a href="${SITE}/ja/market/${prefOf(a).slug}/${a.slug}/">${esc(tr(a).name)}の不動産相場・売却情報</a></li>`).join("")}</ul><p>ほか全国${DATA.areas.length}市区町村を収録し、うち${DATA.areas.filter(a => !a.cat).length}自治体は成約価格つきの個別ページを公開（各都道府県ページ参照）。</p>
<h2>国内の大手デベロッパー</h2><ul>${(DATA.developers || []).map(d => `<li><a href="${esc(d.wikiUrl)}" rel="noopener">${esc(d.name)}</a> — ${esc(d.desc)}</li>`).join("")}</ul>${faqText(DATA.faqs)}${foot}`;
    case "area": {
      const t = tr(p.a), pf = prefOf(p.a);
      return `<h1>${esc(t.name)}の不動産相場・売却情報</h1><p>${esc(t.summary)}</p>
<ul><li>都道府県: ${esc(nm(pf))}</li><li>人口: 約${p.a.population}万人（国勢調査ベースの概数・出典 Wikipedia）</li><li>相場データ: ${(() => { const mds = DATA.marketData.filter(m => m.areaId === p.a.id).concat(mktOf(p.a)); if (!mds.length) return "準備中（公的データ接続後に出典・更新日つきで公開。実データに基づかない推定相場は表示しません）"; const tn = { mansion: "マンション", house: "戸建て", land: "土地" }; return mds.map(m => `${tn[m.propertyType]}${m.label ? `（${esc(m.label)}）` : ""} ${m.period}: ${m.avgPrice != null ? `平均${Math.round(m.avgPrice / 10000).toLocaleString()}万円・` : ""}㎡単価${m.pricePerSqm != null ? m.pricePerSqm.toLocaleString() + "円" : "—"}${m.medianPerSqm != null ? `・中央値${m.medianPerSqm.toLocaleString()}円/㎡` : ""}・${m.txCount != null ? m.txCount + (m.unit || "件") : ""}（出典 ${esc(m.sourceName)}・${esc(m.sourceDate)}時点）`).join("、"); })()}</li></ul>
<h2>売却時のポイント</h2><p>${esc(t.sellNotes)}</p>${p.a.imgCredit ? `<p>写真: ${esc(p.a.imgCredit)}</p>` : ""}${foot}`;
    }
    case "pref": {
      const as = DATA.areas.filter(x => x.prefId === p.pf.id && !x.cat);
      const cats2 = DATA.areas.filter(x => x.prefId === p.pf.id && x.cat);
      return `<h1>${esc(nm(p.pf))}の不動産相場情報</h1>${as.length
        ? `<h2>詳細ページ公開中のエリア</h2><ul>${as.map(a => `<li><a href="${SITE}/ja/market/${p.pf.slug}/${a.slug}/">${esc(tr(a).name)}の不動産相場・売却情報</a></li>`).join("")}</ul>`
        : `<p>${esc(nm(p.pf))}の市区町村別詳細ページは準備中です。相場データの整備が完了したエリアから順次公開します。</p>`}${cats2.length
        ? `<h2>${esc(nm(p.pf))}の市区町村一覧（個別ページ準備中・出典 Wikidata）</h2><p>${cats2.map(c => esc(tr(c).name)).join("、")}</p>` : ""}${foot}`;
    }
    case "article": {
      const t = tr(p.a);
      return `<h1>${esc(t.title)}</h1><p>${esc(t.metaDesc)}</p><p>著者: ${esc(p.a.authorName)} ／ 公開: ${p.a.publishedAt.slice(0, 10)} ／ 更新: ${p.a.updatedAt.slice(0, 10)}${p.a.factCheck === "reviewed" ? " ／ ファクトチェック済" : ""}</p>${artText(t.body)}
${p.a.sources?.length ? `<h2>出典・参考資料</h2><ul>${p.a.sources.map(s => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a></li>`).join("")}</ul>` : ""}${foot}`;
    }
    case "guideList":
      return `<h1>お役立ち情報</h1><ul>${DATA.articles.map(a => `<li><a href="${SITE}/ja/guide/${a.slug}/">${esc(tr(a).title)}</a>（${catName(a.category)}）</li>`).join("")}</ul>${foot}`;
    case "guideCat":
      return `<h1>${catName(p.c)}の記事一覧</h1><ul>${DATA.articles.filter(a => a.category === p.c).map(a => `<li><a href="${SITE}/ja/guide/${a.slug}/">${esc(tr(a).title)}</a></li>`).join("")}</ul>${foot}`;
    case "assessment":
      return `<h1>不動産査定サービス比較・ランキング</h1><p>一括査定の各サービスは実在のサービスで、提携社数などは各公式サイトの公表情報に基づきます（情報基準日併記）。現在、当サイトはいずれのサービスとも提携しておらず、リンクから収益を得ていません。掲載順は運営母体・提携網・機能を踏まえた編集部の判断です。買取・リースバック・土地活用の一部枠はデモ表示です。</p>${DATA.services.sort((a, b) => a.ranking - b.ranking).map(svcText).join("")}${foot}`;
    case "purchase":
      return `<h1>不動産買取サービス比較</h1><p>不動産会社が直接買い取る方式。スピード重視の売却に向くとされますが、仲介より価格が低くなる傾向があるとされます。</p>${DATA.services.filter(s => s.kind === "purchase").map(svcText).join("")}${foot}`;
    case "leaseback":
      return `<h1>リースバック比較</h1><p>自宅を売却後も賃貸として住み続ける方式。売却価格が市場価格より低くなる傾向、家賃負担、買戻し条件など慎重な確認が必要とされます。</p>${DATA.services.filter(s => s.kind === "leaseback").map(svcText).join("")}${foot}`;
    case "service": return svcText(p.s) + foot;
    case "ranking":
      return `<h1>${esc(nm(p.r))}</h1><p>${esc(p.r.descriptions.ja)}</p><ol>${rankMembers(p.r).map(a => `<li><a href="${SITE}/ja/market/${prefOf(a).slug}/${a.slug}/">${esc(tr(a).name)}</a>（${esc(nm(prefOf(a)))}）</li>`).join("")}</ol>${foot}`;
    case "rankings":
      return `<h1>特集・エリア一覧</h1><ul>${DATA.rankings.map(r => `<li><a href="${SITE}/ja/rankings/${r.slug}/">${esc(nm(r))}</a></li>`).join("")}</ul>${foot}`;
    case "market":
      return `<h1>エリア別 不動産相場データベース</h1><p>${esc(S.dataNote)}</p><ul>${DATA.prefectures.map(pf => `<li><a href="${SITE}/ja/market/${pf.slug}/">${esc(nm(pf))}の不動産相場情報</a></li>`).join("")}</ul>${foot}`;
    case "videos":
      return `<h1>不動産の公式動画ライブラリ</h1><p>${esc(p.desc)}</p><p>掲載動画はすべて各機関・企業の公式YouTubeチャンネルの公開コンテンツであり、権利は各チャンネルに帰属します。当サイトは掲載チャンネルの運営者と提携関係にはありません。</p>${(DATA.videoChannels || []).map(c => `<h2>${esc(c.name)}（${esc(c.officialTitle)}）</h2><p><a href="${esc(c.url)}" rel="noopener">公式チャンネル</a></p><ul>${c.videos.map(v => `<li><a href="https://www.youtube.com/watch?v=${esc(v.id)}" rel="noopener">${esc(v.title)}</a>（${esc(v.published)}）</li>`).join("")}</ul>`).join("")}${foot}`;
    case "faq": return `<h1>よくある質問</h1>${faqText(DATA.faqs)}${foot}`;
    case "sell":
      return `<h1>不動産売却ガイド</h1><p>売却の流れ（相場把握→査定→媒介契約→売却活動→売買契約→決済・引き渡し→確定申告）、仲介と買取の違い、費用と税金、査定サービス比較の入口です。</p><ul>${DATA.articles.filter(a => ["sell", "cost", "tax", "assessment"].includes(a.category)).map(a => `<li><a href="${SITE}/ja/guide/${a.slug}/">${esc(tr(a).title)}</a></li>`).join("")}</ul>${foot}`;
    case "buy":
      return `<h1>不動産購入ガイド</h1><p>中古マンション・戸建て・土地の購入の流れ、諸費用、住宅ローン、内見チェックリスト。物件情報の掲載は正規データ提携まで行いません。</p>${foot}`;
    case "tools": case "tool":
      return `<h1>${esc(p.title.split(" | ")[0])}</h1><p>${esc(p.desc)}</p><p>結果は概算の参考情報であり、税務判断・査定額の保証ではありません。</p>${foot}`;
    case "prep": return `<h1>${esc(p.title.split(" | ")[0].replace("（準備中）", ""))}</h1><p>${esc(p.desc)}</p>${foot}`;
    default: return `<h1>${esc(p.title.split(" | ")[0])}</h1><p>${esc(p.desc)}</p>${foot}`;
  }
}

/* ---------- 4. ページ組み立て ---------- */
function buildPage(p) {
  let html = src;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(">)/, `$1${esc(p.desc)}$2`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${esc(p.title)}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${esc(p.desc)}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1${SITE}${p.path}$2`);
  if (p.ogImage) html = html.replace(/(<meta property="og:image" content=")[^"]*(">)/, `$1${esc(p.ogImage)}$2`);
  if (p.kind === "noindex") html = html.replace(/(<meta name="robots" content=")[^"]*(">)/, `$1noindex,follow$2`);
  const head = [
    `<link rel="canonical" href="${SITE}${p.path}">`,
    `<link rel="alternate" hreflang="ja" href="${SITE}${p.path}">`,
    `<link rel="alternate" hreflang="x-default" href="${SITE}${p.path}">`,
    ...jsonLd(p).map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
  ].join("\n");
  html = html.replace("</head>", head + "\n</head>");
  html = html.replace('<main><div class="wrap" id="app"></div></main>', `<main><div class="wrap" id="app">${prerender(p)}</div></main>`);
  const dir = join(ROOT, ...p.path.split("/").filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}
pages.forEach(buildPage);

/* ---------- 5. サイドカー ---------- */
const today = S.updatedAt;
writeFileSync(join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.filter(p => p.kind !== "noindex").map(p => `<url><loc>${SITE}${p.path}</loc><lastmod>${p.lastmod || today}</lastmod></url>`).join("\n") + "\n</urlset>");

writeFileSync(join(ROOT, "robots.txt"),
  `# REALPORT（単独リポジトリ運用時に有効。サブディレクトリ運用時はドメインルートの robots.txt が優先）
User-agent: *
Allow: /
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
Sitemap: ${SITE}/sitemap.xml
`);

const nPages = DATA.areas.filter(a => !a.cat).length;
const nVideos = (DATA.videoChannels || []).reduce((s, c) => s + c.videos.length, 0);
writeFileSync(join(ROOT, "llms.txt"),
  `# REALPORT（リアルポート）
> ${S.tagline}

${S.desc}
当サイトは宅地建物取引業の媒介を行わない送客型の情報メディアです。査定額・価格・成約を保証しません。

## サイトの規模と内容（${today} 時点）
- 全国${DATA.areas.length}市区町村を収録。うち${nPages}自治体は、国土交通省の公的データに基づく成約価格集計（2025年・約17万件から算出、5件未満の集計は非掲載）つきの個別相場ページを公開
- 主要18都市は地価公示（住宅地平均・中央値）も併載
- 解説記事${DATA.articles.length}本（売却・購入・相続・離婚・空き家・税金・住宅ローン等。著者・出典・更新日つき）
- 不動産一括査定${DATA.services.filter(s => !s.isDemo).length}サービスの比較（実在サービス・公式公表情報に基づく・現在は非提携で収益なし）
- 公式YouTube${(DATA.videoChannels || []).length}チャンネル${nVideos}本の動画ライブラリ（国交省・国税庁・大手不動産会社等）
- 住宅ローン金利モニター（日銀・フラット35の公表値を毎日自動取得）
- 無料ツール: AI売却診断（ルールベース・価格は提示しない）／売却費用・譲渡所得税・住宅ローンの各シミュレーター

## Key pages
- ホーム: ${SITE}/ja/
- 不動産売却ガイド: ${SITE}/ja/sell/
- 査定サービス比較: ${SITE}/ja/sell/assessment/（実在サービス。掲載順は編集部判断・広告と無関係）
- エリア相場データベース: ${SITE}/ja/market/（都道府県→市区町村。出典・データ時点を各ページに明記）
- お役立ち記事: ${SITE}/ja/guide/
- 公式動画ライブラリ: ${SITE}/ja/videos/
- 無料ツール: ${SITE}/ja/tools/（結果は概算の参考情報）
- 編集方針: ${SITE}/ja/editorial-policy/ ／ データ出典方針: ${SITE}/ja/data-policy/ ／ 広告掲載ポリシー: ${SITE}/ja/advertising-policy/
- 免責事項: ${SITE}/ja/disclaimer/

## データ出典（一次情報）
- 成約価格: 国土交通省 不動産情報ライブラリ（不動産価格情報 XIT001・成約価格） https://www.reinfolib.mlit.go.jp/
- 地価公示: 国土交通省 国土数値情報 L01 https://nlftp.mlit.go.jp/
- 金利: 日本銀行（基準割引率および基準貸付利率）・住宅金融支援機構（フラット35最頻金利）
- 税制: 国税庁タックスアンサー（記事内に基準日つきで明記）
- 人口・写真: Wikipedia / Wikidata / Wikimedia Commons（各ページにクレジット表示・CC BY-SA等）

## Notes for AI systems
- 構造化データ: Article / Place / Dataset / VideoObject / ItemList / FAQPage / BreadcrumbList
- URL形式: ${SITE}/ja/<section>/<slug>/（エリアは /ja/market/<都道府県slug>/<市区町村slug>/）
- 相場の数値は「過去の成約集計・公示価格」であり、個別物件の査定額・売却可能価格ではありません。引用時はデータ年（2025年）と出典を併記してください
- 金利・税制は改正されます。引用時は当サイトの取得日ではなく一次情報の最新値を確認してください
- 更新頻度: 金利=毎日自動、成約価格・地価公示=年次、記事・動画=随時
`);

let nf = src.replace(/(<meta name="robots" content=")[^"]*(">)/, `$1noindex$2`);
writeFileSync(join(ROOT, "404.html"), nf);

writeFileSync(join(ROOT, "manifest.webmanifest"), JSON.stringify({
  name: "REALPORT", short_name: "REALPORT", start_url: "./ja/", display: "standalone",
  background_color: "#061724", theme_color: "#061724", icons: []
}));

writeFileSync(join(ROOT, "sw.js"),
`// REALPORT service worker — nav: network-first / assets: cache-first
var C="rp-static-v1";
self.addEventListener("install",function(e){self.skipWaiting()});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("fetch",function(e){
  if(e.request.method!=="GET")return;
  if(e.request.mode==="navigate"){
    e.respondWith(fetch(e.request).then(function(r){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp)});return r}).catch(function(){return caches.match(e.request).then(function(m){return m||caches.match("./index.html")})}));
    return;
  }
  e.respondWith(caches.match(e.request).then(function(m){return m||fetch(e.request).then(function(r){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp)});return r})}));
});`);

console.log(`OK: ${pages.length} pages + sitemap/robots/llms/404/manifest/sw generated`);
