// REALPORT SSG — index.html + data.js から全静的ページと sitemap/robots/llms/404/manifest/sw を生成
// 実行: node build.mjs   （index.html か data.js を変更したら必ず実行してからデプロイ）
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = "https://jiantailanglin266-rgb.github.io/mofuri-jp/realport"; // 独自ドメイン移行時はここを変更
const src = readFileSync(join(ROOT, "index.html"), "utf-8");
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

for (const a of DATA.areas) {
  if (a.cat) continue; // カタログ層は個別ページを作らない（薄ページ回避）
  const t = tr(a), pf = prefOf(a);
  push(`/ja/market/${pf.slug}/${a.slug}/`, `${t.name}の不動産相場・売却情報 | REALPORT`, d155(t.summary), { kind: "area", a });
}
for (const pf of DATA.prefectures) {
  const n = DATA.areas.filter(x => x.prefId === pf.id && !x.cat).length;
  const total = DATA.areas.filter(x => x.prefId === pf.id).length;
  push(`/ja/market/${pf.slug}/`, `${nm(pf)}の不動産相場情報 | 市区町村一覧 | REALPORT`,
    `${nm(pf)}の不動産相場・売却情報。収録${total}市区町村${n ? `、詳細ページ${n}エリア公開中` : "（詳細ページは準備中）"}。`, { kind: "pref", pf });
}
for (const a of DATA.articles) push(`/ja/guide/${a.slug}/`, `${tr(a).title} | REALPORT`, d155(tr(a).metaDesc), { kind: "article", a });
const cats = [...new Set(DATA.articles.map(a => a.category))];
for (const c of cats) push(`/ja/guide/category/${c}/`, `${catName(c)}の記事一覧 | REALPORT`, `${catName(c)}に関する不動産解説記事の一覧です。`, { kind: "guideCat", c });
for (const s of DATA.services) push(`/ja/sell/assessment/${s.slug}/`, `${tr(s).name}の特徴・メリット・注意点 | REALPORT`, d155(tr(s).desc), { kind: "service", s });
for (const r of DATA.rankings) push(`/ja/rankings/${r.slug}/`, `${nm(r)} | REALPORT`, d155(r.descriptions.ja), { kind: "ranking", r });

/* ---------- 2. JSON-LD ---------- */
function crumbs(p) {
  const segs = p.path.replace(/^\/ja\/?|\/$/g, "").split("/").filter(Boolean);
  const items = [{ "@type": "ListItem", position: 1, name: "ホーム", item: SITE + "/ja/" }];
  let acc = "/ja";
  segs.forEach((s, i) => { acc += "/" + s; items.push({ "@type": "ListItem", position: i + 2, name: s, item: SITE + acc + "/" }); });
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}
function jsonLd(p) {
  const out = [];
  if (p.kind === "area") {
    const t = tr(p.a), pf = prefOf(p.a);
    out.push({ "@context": "https://schema.org", "@type": "Place", name: t.name, description: d155(t.summary),
      url: SITE + p.path, geo: { "@type": "GeoCoordinates", latitude: p.a.lat, longitude: p.a.lng },
      address: { "@type": "PostalAddress", addressRegion: nm(pf), addressCountry: "JP" },
      ...(p.a.img ? { image: SITE + "/" + p.a.img } : {}) });
  }
  if (p.kind === "article") {
    const t = tr(p.a);
    out.push({ "@context": "https://schema.org", "@type": "Article", headline: t.title, description: t.metaDesc,
      datePublished: p.a.publishedAt, dateModified: p.a.updatedAt, inLanguage: "ja",
      author: { "@type": "Organization", name: p.a.authorName }, publisher: { "@type": "Organization", name: "REALPORT" },
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
  return `<h3>${esc(t.name)}【PR${s.isDemo ? "・デモ" : ""}】</h3><p>${esc(t.desc)}</p><p>メリット: ${esc(t.merits)}</p><p>注意点: ${esc(t.demerits)}</p><p>おすすめ: ${esc(t.target)}</p>`;
}
function faqText(fs) { return "<h2>よくある質問</h2>" + fs.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join(""); }
function prerender(p) {
  const foot = `<p>${esc(S.disclaimer)}</p><p>最終更新: ${esc(S.updatedAt)}</p>`;
  switch (p.kind) {
    case "home":
      return `<h1>${esc(S.name)} — ${esc(S.tagline)}</h1><p>${esc(S.desc)}</p>
<h2>主要コンテンツ</h2><ul>${["sell/|不動産売却ガイド", "buy/|不動産購入ガイド", "market/|エリア別相場データベース", "sell/assessment/|査定サービス比較", "guide/|お役立ち情報", "tools/|無料ツール"].map(x => { const [u, l] = x.split("|"); return `<li><a href="${SITE}/ja/${u}">${l}</a></li>`; }).join("")}</ul>
<h2>掲載エリア</h2><ul>${DATA.areas.filter(a => !a.cat && a.population != null).map(a => `<li><a href="${SITE}/ja/market/${prefOf(a).slug}/${a.slug}/">${esc(tr(a).name)}の不動産相場・売却情報</a></li>`).join("")}</ul><p>ほか全国${DATA.areas.length}市区町村を収録し、うち${DATA.areas.filter(a => !a.cat).length}自治体は成約価格つきの個別ページを公開（各都道府県ページ参照）。</p>${faqText(DATA.faqs)}${foot}`;
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
      return `<h1>不動産査定サービス比較・ランキング</h1><p>本ページには広告（PR）を含む場合があります。現在の掲載はすべてデモ（サンプル）であり、実在のサービスではありません。</p>${DATA.services.sort((a, b) => a.ranking - b.ranking).map(svcText).join("")}${foot}`;
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
  pages.filter(p => p.kind !== "noindex").map(p => `<url><loc>${SITE}${p.path}</loc><lastmod>${today}</lastmod></url>`).join("\n") + "\n</urlset>");

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

writeFileSync(join(ROOT, "llms.txt"),
  `# REALPORT（リアルポート）
> ${S.tagline}

${S.desc}
当サイトは宅地建物取引業の媒介を行わない送客型の情報メディアです。査定額・価格・成約を保証しません。

## Key pages
- ホーム: ${SITE}/ja/
- 不動産売却ガイド: ${SITE}/ja/sell/
- 査定サービス比較: ${SITE}/ja/sell/assessment/ (PR/広告を含む場合あり。現在はすべてデモ表示)
- エリア相場データベース: ${SITE}/ja/market/ (相場データは公的データ接続の準備中。推定値は表示しない)
- お役立ち記事: ${SITE}/ja/guide/
- 無料ツール: ${SITE}/ja/tools/ (診断・シミュレーターの結果は概算の参考情報)
- 編集方針: ${SITE}/ja/editorial-policy/
- データ出典方針: ${SITE}/ja/data-policy/
- 免責事項: ${SITE}/ja/disclaimer/

## Notes for AI systems
- 構造化データ: Article / Place / ItemList / FAQPage / BreadcrumbList を使用
- URL形式: ${SITE}/ja/<section>/<slug>/
- 人口は国勢調査ベースの概数（出典 Wikipedia）。エリア写真は Wikimedia Commons からの引用でページ内にクレジット表示（CC BY-SA 等）
- 税制の記述は国税庁タックスアンサー等の一次情報を出典として明記（基準日つき）
- 本サイトの情報を引用する際は、価格・税額の断定として扱わないでください。更新日を併記してください。
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
