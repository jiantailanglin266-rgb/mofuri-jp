/* REALPORT 計算モジュール（純関数のみ・ブラウザ/Node両対応）
   税率・制度値は TAX_CONF に外出し。改正時はここを更新し data.js?v=N をバンプ。
   ※各計算は概算・上限の目安であり、税務判断ではない。 */
(function (g) {
  "use strict";

  var TAX_CONF = {
    asOf: "2026-07-27",
    consumptionTax: 0.10,
    // 譲渡所得税率（復興特別所得税込み）出典: 国税庁タックスアンサー No.3208 / No.3211
    longTermRate: 0.20315, shortTermRate: 0.3963,
    special3000: 30000000, // マイホーム3,000万円特別控除 (No.3302)
    unknownCostRate: 0.05, // 概算取得費 5%
    // 印紙税（不動産譲渡契約書・軽減税率適用時）出典: 国税庁 No.7108 ※最新は要確認
    stampBrackets: [
      [500000, 200], [1000000, 500], [5000000, 1000], [10000000, 5000],
      [50000000, 10000], [100000000, 30000], [500000000, 60000]
    ],
    mortgageCancelTax: 1000, // 抵当権抹消 登録免許税/件（不動産1個につき）
    mortgageCancelFeeEst: 20000 // 司法書士報酬の概算目安
  };

  // 仲介手数料の法定上限（速算式・税込）。price円 → 円
  function brokerageFeeMax(price) {
    if (!(price > 0)) return 0;
    var base;
    if (price > 4000000) base = price * 0.03 + 60000;
    else if (price > 2000000) base = price * 0.04 + 20000;
    else base = price * 0.05;
    return Math.floor(base * (1 + TAX_CONF.consumptionTax));
  }

  // 印紙税（軽減税率）。契約金額 → 円（5億円超は対象外として最上限を返す）
  function stampTax(price) {
    if (!(price > 0)) return 0;
    var b = TAX_CONF.stampBrackets;
    for (var i = 0; i < b.length; i++) if (price <= b[i][0]) return b[i][1];
    return b[b.length - 1][1];
  }

  // 売却費用の概算。in: {price, loanBalance, otherCosts} → 明細と手取り概算
  function sellingCost(inp) {
    var price = +inp.price || 0;
    var fee = brokerageFeeMax(price);
    var stamp = stampTax(price);
    var cancel = (+inp.loanBalance > 0) ? TAX_CONF.mortgageCancelTax * 2 + TAX_CONF.mortgageCancelFeeEst : 0;
    var other = +inp.otherCosts || 0;
    var total = fee + stamp + cancel + other;
    var net = price - total - (+inp.loanBalance || 0);
    return { fee: fee, stamp: stamp, cancel: cancel, other: other, total: total, net: net };
  }

  // 譲渡所得税の概算。in: {price, cost, costUnknown, expenses, ownedOver5y, useSpecial3000}
  function capitalGainsTax(inp) {
    var price = +inp.price || 0;
    var acquisition = inp.costUnknown ? Math.floor(price * TAX_CONF.unknownCostRate) : (+inp.cost || 0);
    var expenses = +inp.expenses || 0;
    var gain = price - acquisition - expenses;
    var deduction = 0;
    if (inp.useSpecial3000 && gain > 0) deduction = Math.min(gain, TAX_CONF.special3000);
    var taxable = Math.max(0, gain - deduction);
    var rate = inp.ownedOver5y ? TAX_CONF.longTermRate : TAX_CONF.shortTermRate;
    var tax = Math.floor(taxable * rate);
    return { acquisition: acquisition, gain: gain, deduction: deduction, taxable: taxable, rate: rate, tax: tax };
  }

  // 住宅ローン月額（元利均等）。principal円, annualRate(%), years → 円/月
  function loanMonthly(principal, annualRatePct, years) {
    var p = +principal || 0, n = (+years || 0) * 12, r = (+annualRatePct || 0) / 100 / 12;
    if (p <= 0 || n <= 0) return 0;
    if (r === 0) return Math.floor(p / n);
    return Math.floor(p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  }

  /* AI売却診断（ルールベース）
     in: {propertyType, age, urgency(months), reason, occupied, loanStatus, condition}
     → 各売却方法の適合度スコア(0-100)・チェックリスト・注意点。価格は一切出さない。 */
  function diagnose(inp) {
    var s = { chukai: 60, kaitori: 40, leaseback: 10 };
    var notes = [], checklist = [
      "登記済権利証（登記識別情報）の所在を確認する",
      "住宅ローン残高を金融機関で確認する",
      "固定資産税納税通知書を手元に用意する",
      "複数の不動産会社に査定を依頼し、根拠の説明を比較する"
    ];
    // 緊急度
    if (inp.urgency === "asap") { s.kaitori += 30; s.chukai -= 15; notes.push("お急ぎの場合、買取は仲介より早く現金化しやすい一方、価格は低くなる傾向があるとされます。仲介査定額との差を確認してから判断しましょう。"); }
    else if (inp.urgency === "1y") { s.chukai += 10; }
    else { s.chukai += 15; notes.push("時間に余裕がある場合は、仲介でじっくり買い手を探す選択肢が取りやすくなります。"); }
    // 理由
    if (inp.reason === "inheritance") { s.kaitori += 10; checklist.unshift("相続登記（名義変更）が済んでいるか確認する（未了なら売却できません）"); notes.push("相続物件は空き家特例（3,000万円控除）の対象になる場合があります。税理士・税務署にご確認ください。"); }
    if (inp.reason === "divorce") { checklist.unshift("名義（単独か共有か）と連帯保証の有無を確認する"); notes.push("共有名義の売却には共有者全員の同意が必要です。財産分与の条件は弁護士等にご相談ください。"); }
    if (inp.reason === "loan") { s.leaseback += 25; s.kaitori += 10; notes.push("ローン返済が困難な場合は、まず金融機関に相談してください。任意売却という選択肢もあります。"); }
    if (inp.reason === "funds" && inp.occupied === "self") { s.leaseback += 35; notes.push("住み続けながら資金化したい場合はリースバックが選択肢ですが、売却価格が低くなる傾向・家賃負担・買戻し条件を慎重に確認してください。"); }
    // 居住状況
    if (inp.occupied === "vacant") { s.kaitori += 10; notes.push("空き家は管理コストが継続します。売却方針は早めの決定が有利とされます。"); }
    if (inp.occupied !== "self") s.leaseback = Math.min(s.leaseback, 5); // 居住中でなければリースバック不適
    // 築年数
    if (+inp.age >= 30 && inp.propertyType !== "land") { s.kaitori += 15; notes.push("築30年超の建物は、リフォーム前提の買取や古家付き土地としての売却も比較対象になります。"); }
    // ローン残債
    if (inp.loanStatus === "over") { notes.push("残債が売却想定額を上回る（オーバーローン）場合、自己資金・住み替えローン・任意売却などの検討が必要です。金融機関への早めの相談をおすすめします。"); }
    // 土地
    if (inp.propertyType === "land") { s.leaseback = 0; notes.push("土地は境界の確定状況が売却期間に影響します。測量図の有無を確認しましょう。"); }
    var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
    s.chukai = clamp(s.chukai); s.kaitori = clamp(s.kaitori); s.leaseback = clamp(s.leaseback);
    var method = s.chukai >= s.kaitori && s.chukai >= s.leaseback ? "chukai" : (s.kaitori >= s.leaseback ? "kaitori" : "leaseback");
    return { scores: s, method: method, checklist: checklist, notes: notes,
      periodNote: "売却期間は一般に、仲介で3〜6か月程度、買取で数週間〜1か月程度といわれますが、物件・価格設定により大きく変わります。" };
  }

  var CALC = { TAX_CONF: TAX_CONF, brokerageFeeMax: brokerageFeeMax, stampTax: stampTax,
    sellingCost: sellingCost, capitalGainsTax: capitalGainsTax, loanMonthly: loanMonthly, diagnose: diagnose };
  if (typeof module !== "undefined" && module.exports) module.exports = CALC; else g.CALC = CALC;
})(typeof window !== "undefined" ? window : globalThis);
