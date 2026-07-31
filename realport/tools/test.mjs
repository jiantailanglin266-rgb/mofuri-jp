// REALPORT 単体テスト: node tools/test.mjs
import { createRequire } from "module";
import assert from "assert";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const C = require(join(ROOT, "calc.js"));

let n = 0; const ok = (name, fn) => { fn(); n++; console.log("ok", n, "-", name); };

/* 仲介手数料上限（税込10%） */
ok("仲介手数料: 3000万円 → (900,000+60,000)*1.1 = 1,056,000", () =>
  assert.strictEqual(C.brokerageFeeMax(30000000), 1056000));
ok("仲介手数料: 400万円 → (120,000+60,000)*1.1 = 198,000", () =>
  assert.strictEqual(C.brokerageFeeMax(4000000), 198000));   // 400万ちょうどは4%帯: 160,000+20,000=180,000*1.1=198,000
ok("仲介手数料: 100万円 → 50,000*1.1 = 55,000", () =>
  assert.strictEqual(C.brokerageFeeMax(1000000), 55000));
ok("仲介手数料: 0/負値 → 0", () => { assert.strictEqual(C.brokerageFeeMax(0), 0); assert.strictEqual(C.brokerageFeeMax(-5), 0); });

/* 印紙税（軽減税率） */
ok("印紙税: 3000万円 → 10,000", () => assert.strictEqual(C.stampTax(30000000), 10000));
ok("印紙税: 8000万円 → 30,000", () => assert.strictEqual(C.stampTax(80000000), 30000));
ok("印紙税: 900万円 → 5,000", () => assert.strictEqual(C.stampTax(9000000), 5000));

/* 売却費用 */
ok("売却費用: ローンなしは抹消費用0", () => {
  const r = C.sellingCost({ price: 30000000, loanBalance: 0, otherCosts: 0 });
  assert.strictEqual(r.cancel, 0);
  assert.strictEqual(r.total, r.fee + r.stamp);
  assert.strictEqual(r.net, 30000000 - r.total);
});
ok("売却費用: ローンありは抹消費用込み・残債控除", () => {
  const r = C.sellingCost({ price: 30000000, loanBalance: 10000000, otherCosts: 100000 });
  assert.strictEqual(r.cancel, 22000);
  assert.strictEqual(r.net, 30000000 - r.total - 10000000);
});

/* 譲渡所得税 */
ok("譲渡税: 3000万控除で課税ゼロ", () => {
  const r = C.capitalGainsTax({ price: 40000000, cost: 30000000, expenses: 1000000, ownedOver5y: true, useSpecial3000: true });
  assert.strictEqual(r.gain, 9000000); assert.strictEqual(r.taxable, 0); assert.strictEqual(r.tax, 0);
});
ok("譲渡税: 長期20.315%", () => {
  const r = C.capitalGainsTax({ price: 50000000, cost: 20000000, expenses: 0, ownedOver5y: true, useSpecial3000: false });
  assert.strictEqual(r.tax, Math.floor(30000000 * 0.20315));
});
ok("譲渡税: 短期39.63%", () => {
  const r = C.capitalGainsTax({ price: 50000000, cost: 20000000, expenses: 0, ownedOver5y: false, useSpecial3000: false });
  assert.strictEqual(r.tax, Math.floor(30000000 * 0.3963));
});
ok("譲渡税: 概算取得費5%", () => {
  const r = C.capitalGainsTax({ price: 20000000, costUnknown: true, expenses: 0, ownedOver5y: true });
  assert.strictEqual(r.acquisition, 1000000);
});
ok("譲渡税: 損失なら税額0", () => {
  const r = C.capitalGainsTax({ price: 20000000, cost: 30000000, expenses: 0, ownedOver5y: true });
  assert.ok(r.gain < 0); assert.strictEqual(r.tax, 0);
});

/* ローン月額 */
ok("ローン: 金利0% 3600万/30年 → 100,000", () => assert.strictEqual(C.loanMonthly(36000000, 0, 30), 100000));
ok("ローン: 3000万/1.5%/35年 ≒ 91,855円（±2円）", () => {
  const m = C.loanMonthly(30000000, 1.5, 35);
  assert.ok(Math.abs(m - 91855) <= 2, "got " + m);
});

/* 診断 */
ok("診断: 急ぎ+空き家 → 買取優勢", () => {
  const r = C.diagnose({ propertyType: "house", age: 35, urgency: "asap", reason: "inheritance", occupied: "vacant", loanStatus: "none" });
  assert.strictEqual(r.method, "kaitori");
});
ok("診断: 余裕あり自宅 → 仲介優勢", () => {
  const r = C.diagnose({ propertyType: "mansion", age: 10, urgency: "none", reason: "relocation", occupied: "self", loanStatus: "under" });
  assert.strictEqual(r.method, "chukai");
});
ok("診断: 資金需要+居住中 → リースバック上昇", () => {
  const r = C.diagnose({ propertyType: "house", age: 20, urgency: "1y", reason: "funds", occupied: "self", loanStatus: "under" });
  assert.ok(r.scores.leaseback >= 40);
});
ok("診断: 土地はリースバック0", () => {
  const r = C.diagnose({ propertyType: "land", age: 0, urgency: "1y", reason: "sell", occupied: "vacant", loanStatus: "none" });
  assert.strictEqual(r.scores.leaseback, 0);
});
ok("診断: 価格・査定額を出力しない", () => {
  const r = C.diagnose({ propertyType: "mansion", age: 10, urgency: "1y", reason: "sell", occupied: "self", loanStatus: "none" });
  assert.ok(!JSON.stringify(r).match(/万円|査定額|円/));
});

/* data.js 整合性 */
ok("data.js: 1行・パース可能・デモ識別子", () => {
  const src = readFileSync(join(ROOT, "data.js"), "utf-8");
  const D = JSON.parse(src.match(/^var DATA=(.*);$/m)[1]);
  assert.strictEqual(D.prefectures.length, 47);
  for (const s of D.services) { assert.strictEqual(s.isDemo, true); assert.ok(s.translations.ja.name.includes("デモ")); }
  for (const a of D.areas) assert.ok(D.prefectures.find(p => p.id === a.prefId));
  // 架空相場の混入チェック: marketData に非null価格がある場合は出典必須
  for (const m of D.marketData) if (m.avgPrice != null || m.pricePerSqm != null) assert.ok(m.sourceName && m.sourceUrl && m.sourceDate, "market data without source");
});
ok("data.js: カタログ層/昇格エリアの整合性（slug一意・参照整合・捏造なし）", () => {
  const src = readFileSync(join(ROOT, "data.js"), "utf-8");
  const D = JSON.parse(src.match(/^var DATA=(.*);$/m)[1]);
  assert.ok(D.areas.length > 1700, "areas too small: " + D.areas.length);
  const promoted = D.areas.filter(a => !a.cat && a.population == null);
  assert.ok(promoted.length > 400, "promoted too small: " + promoted.length);
  const slugs = new Set();
  for (const a of D.areas) { assert.ok(!slugs.has(a.slug), "dup slug " + a.slug); slugs.add(a.slug); }
  for (const a of D.areas.filter(x => x.cat)) {
    assert.ok(D.prefectures.find(p => p.id === a.prefId), "dangling pref " + a.slug);
    assert.strictEqual(a.dataLevel, 0);          // 未整備は0のまま（評価を捏造しない）
    assert.ok(a.translations.ja.name);
  }
  // 昇格エリアは全て成約集計を持ち、最低件数を満たす
  assert.ok(D.siteSettings.mktSource && D.siteSettings.mktSource.name, "mktSource missing");
  for (const a of promoted) {
    const rows = D.mkt[a.slug];
    assert.ok(rows && rows.length, "promoted without mkt: " + a.slug);
    for (const r of rows) assert.ok(r[4] >= D.siteSettings.mktSource.minCount, "count below min: " + a.slug);
  }
});

console.log("\nALL " + n + " tests passed");
