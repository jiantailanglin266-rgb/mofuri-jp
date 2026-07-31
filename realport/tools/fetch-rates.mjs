// REALPORT — 金利ダッシュボード自動取得（rates.js を生成）
// 取得元（すべて公式一次情報）:
//   1. 日本銀行「基準割引率および基準貸付利率」 … HTML表の最新行
//   2. 住宅金融支援機構 フラット35 金利情報 … 今月の金利範囲・最頻金利
//   3. 主要銀行の住宅ローン金利ページ … 変動金利をベストエフォートで抽出（失敗時はリンクのみ表示）
// 出力: realport/rates.js（`var RATES={...};` 1行）。ページ側は ?d=日付 で毎日キャッシュバスト。
// 実行: node tools/fetch-rates.mjs   ／ GitHub Actions で毎日自動実行
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) REALPORT-rates/1.0", "Accept-Language": "ja" };

const get = async u => { const r = await fetch(u, { headers: UA, redirect: "follow" }); if (!r.ok) throw new Error(r.status + " " + u); return r.text(); };
const text = h => h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");

/* 1. 日銀 基準割引率および基準貸付利率（旧・公定歩合）
   表の形式: 「令和 8（2026）年 6月17日 1.00 1.25」（括弧内が西暦） */
async function fetchBoj() {
  const url = "https://www.boj.or.jp/statistics/boj/other/discount/discount.htm";
  const t = text(await get(url));
  let best = null;
  const re = /（(\d{4})）年\s*(\d{1,2})月\s*(\d{1,2})日\s+(\d{1,2}\.\d{2})(?:\s+(\d{1,2}\.\d{2}))?/g;
  let m;
  while ((m = re.exec(t))) {
    const y = +m[1], mo = +m[2], d = +m[3];
    const rate = +(m[5] != null ? m[5] : m[4]); // 2列ある場合は右列＝基準貸付利率
    const key = y * 10000 + mo * 100 + d;
    if (!best || key > best.key) best = { key, since: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, rate };
  }
  if (!best) throw new Error("BOJ parse failed");
  return { rate: best.rate, since: best.since, label: "基準割引率および基準貸付利率", url };
}

/* 2. フラット35 最頻金利（flat35.com トップの「YYYY年M月の最頻金利」ブロック）
   直後の2つの%が「当初5年間（最大引下げ適用例）」「6年目以降（＝基準の最頻金利）」 */
async function fetchFlat35() {
  const url = "https://www.flat35.com/";
  const t = text(await get(url));
  const i = t.search(/(\d{4})年\s*(\d{1,2})月の最頻金利/);
  if (i < 0) throw new Error("flat35 month not found");
  const mon = t.slice(i).match(/(\d{4})年\s*(\d{1,2})月/);
  const seg = t.slice(i, i + 400);
  const pcts = [...seg.matchAll(/年\s*(\d\.\d{2,3})\s*[%％]/g)].map(x => +x[1]).filter(v => v > 0.3 && v < 9);
  if (pcts.length < 2) throw new Error("flat35 rates not found");
  return { month: mon[1] + "年" + mon[2] + "月", mode: pcts[1], first5: pcts[0],
    label: "フラット35 最頻金利", note: "融資率9割以下・新機構団信付。当初5年はポイント最大引下げ適用例", url };
}

/* 3. 主要銀行（変動金利のベストエフォート抽出。失敗時は rate:null → リンクのみ表示） */
const BANKS = [
  { name: "三菱UFJ銀行", url: "https://www.bk.mufg.jp/kariru/jutaku/kinri/index.html" },
  { name: "三井住友銀行", url: "https://www.smbc.co.jp/kojin/jutaku_loan/kinri/" },
  { name: "みずほ銀行", url: "https://www.mizuhobank.co.jp/loan/housing/rate/index.html" },
  { name: "りそな銀行", url: "https://www.resonabank.co.jp/kojin/jutaku/kinri/" },
  { name: "住信SBIネット銀行", url: "https://www.netbk.co.jp/contents/lineup/home-loan/" },
  { name: "楽天銀行", url: "https://www.rakuten-bank.co.jp/home-loan/" }
];
async function fetchBank(b) {
  try {
    const t = text(await get(b.url));
    const i = t.search(/変動金利|変動タイプ|変動\s*：|変動プラン/);
    if (i < 0) throw 0;
    const seg = t.slice(i, i + 400);
    const m = seg.match(/(\d\.\d{2,3})\s*[%％]/);
    if (!m) throw 0;
    const v = +m[1];
    if (v <= 0 || v >= 5) throw 0;
    return { ...b, rate: v, type: "変動金利（表示例）" };
  } catch (e) { return { ...b, rate: null, type: null }; }
}

const out = { updated: new Date().toISOString().replace(/\.\d+Z/, "Z") };
try { out.boj = await fetchBoj(); console.log("BOJ:", out.boj.rate + "%", out.boj.since); } catch (e) { console.log("BOJ FAIL:", e.message); }
try { out.flat35 = await fetchFlat35(); console.log("FLAT35:", out.flat35.mode + "%", out.flat35.month); } catch (e) { console.log("FLAT35 FAIL:", e.message); }
out.banks = [];
for (const b of BANKS) {
  const r = await fetchBank(b);
  out.banks.push(r);
  console.log((r.rate != null ? "ok " + r.rate + "%" : "link-only"), b.name);
  await new Promise(res => setTimeout(res, 600));
}
writeFileSync(join(ROOT, "rates.js"), "var RATES=" + JSON.stringify(out) + ";");
console.log("OK: rates.js written（取得 " + out.updated + "）");
