// REALPORT — data.js 生成スクリプト（data.js の唯一の生成元。data.js を手編集しない）
// 使い方: node tools/gen-data.mjs  → realport/data.js を書き出す
// 変更後は index.html / build.mjs の data.js?v=N をバンプすること。
import { writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// 公開日は再現性のため Date.UTC 固定（Date.now() 禁止）
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 9)).toISOString();

/* ============ 地方・都道府県 ============ */
const REGIONS = [
  ["hokkaido", "北海道"], ["tohoku", "東北"], ["kanto", "関東"], ["chubu", "中部"],
  ["kinki", "近畿"], ["chugoku", "中国"], ["shikoku", "四国"], ["kyushu", "九州・沖縄"]
];
const PREFS = [
  ["hokkaido", "北海道", "hokkaido"],
  ["aomori", "青森県", "tohoku"], ["iwate", "岩手県", "tohoku"], ["miyagi", "宮城県", "tohoku"],
  ["akita", "秋田県", "tohoku"], ["yamagata", "山形県", "tohoku"], ["fukushima", "福島県", "tohoku"],
  ["ibaraki", "茨城県", "kanto"], ["tochigi", "栃木県", "kanto"], ["gunma", "群馬県", "kanto"],
  ["saitama", "埼玉県", "kanto"], ["chiba", "千葉県", "kanto"], ["tokyo", "東京都", "kanto"], ["kanagawa", "神奈川県", "kanto"],
  ["niigata", "新潟県", "chubu"], ["toyama", "富山県", "chubu"], ["ishikawa", "石川県", "chubu"], ["fukui", "福井県", "chubu"],
  ["yamanashi", "山梨県", "chubu"], ["nagano", "長野県", "chubu"], ["gifu", "岐阜県", "chubu"],
  ["shizuoka", "静岡県", "chubu"], ["aichi", "愛知県", "chubu"],
  ["mie", "三重県", "kinki"], ["shiga", "滋賀県", "kinki"], ["kyoto", "京都府", "kinki"], ["osaka", "大阪府", "kinki"],
  ["hyogo", "兵庫県", "kinki"], ["nara", "奈良県", "kinki"], ["wakayama", "和歌山県", "kinki"],
  ["tottori", "鳥取県", "chugoku"], ["shimane", "島根県", "chugoku"], ["okayama", "岡山県", "chugoku"],
  ["hiroshima", "広島県", "chugoku"], ["yamaguchi", "山口県", "chugoku"],
  ["tokushima", "徳島県", "shikoku"], ["kagawa", "香川県", "shikoku"], ["ehime", "愛媛県", "shikoku"], ["kochi", "高知県", "shikoku"],
  ["fukuoka", "福岡県", "kyushu"], ["saga", "佐賀県", "kyushu"], ["nagasaki", "長崎県", "kyushu"], ["kumamoto", "熊本県", "kyushu"],
  ["oita", "大分県", "kyushu"], ["miyazaki", "宮崎県", "kyushu"], ["kagoshima", "鹿児島県", "kyushu"], ["okinawa", "沖縄県", "kyushu"]
];

/* ============ 主要エリア（curated tier / 18件） ============
   population: 国勢調査ベースの概数（万人単位に丸め・出典 Wikipedia）。相場・価格は一切含めない。 */
const AREAS = [
  ["shinjuku-ku", "新宿区", "tokyo", 35, 35.6938, 139.7034,
    "東京都庁が置かれる東京の中心区のひとつ。新宿駅を核とした商業・業務集積と、神楽坂・落合など住宅地の両面を持つ。単身者向けから都心立地のファミリー向けまで住宅の層が幅広いとされる。",
    "商業地と住宅地が混在するため、同じ区内でも立地条件による価格差が大きいとされます。査定は複数社比較で幅を確かめるのが無難です。"],
  ["shibuya-ku", "渋谷区", "tokyo", 24, 35.664, 139.698,
    "渋谷駅周辺の大規模再開発で知られる東京の主要区。恵比寿・代官山・広尾など住宅地としての人気エリアも多く抱える。",
    "ブランド力のあるエリアが多い一方、築年や駅距離による評価差も指摘されます。売り出し前に相場観の裏取りをおすすめします。"],
  ["minato-ku", "港区", "tokyo", 26, 35.658, 139.752,
    "六本木・麻布・青山・白金台など、都心の代表的な住宅・業務エリアを含む区。タワーマンションの集積地としても知られる。",
    "高額帯の取引が多いエリアとされ、査定額の会社間差が出やすい傾向が指摘されます。実績のある会社の比較が重要です。"],
  ["setagaya-ku", "世田谷区", "tokyo", 94, 35.646, 139.653,
    "東京23区で最大級の人口を持つ住宅都市。二子玉川・三軒茶屋・下北沢など個性ある街を多く含み、戸建て・低層住宅地も広い。",
    "戸建てストックが多く、土地の形状・接道条件が価格に影響しやすいとされます。戸建て売却の実績が多い会社への相談が有効です。"],
  ["koto-ku", "江東区", "tokyo", 52, 35.673, 139.817,
    "豊洲・有明など湾岸部の大規模マンション開発が進んだ区。門前仲町・清澄白河など下町文化のエリアも併せ持つ。",
    "湾岸部のタワーマンションと内陸部の既成市街地で市場の性格が異なるとされます。物件タイプに合った査定先選びが大切です。"],
  ["nerima-ku", "練馬区", "tokyo", 74, 35.735, 139.652,
    "23区北西部の住宅区。西武線・大江戸線沿線に住宅地が広がり、緑地や農地が比較的多く残ることでも知られる。",
    "ファミリー向け需要が中心とされるエリアです。学区や公園など生活利便の訴求が売却時のポイントになるといわれます。"],
  ["yokohama", "横浜市", "kanagawa", 377, 35.444, 139.638,
    "全国の市で最大級の人口を持つ政令指定都市。みなとみらいの都心機能から郊外住宅地まで18区で市場の性格が大きく異なる。",
    "区・沿線によって相場水準の差が大きいとされます。市全体の平均値ではなく、区単位・駅単位で相場を確認しましょう。"],
  ["kawasaki", "川崎市", "kanagawa", 154, 35.531, 139.703,
    "東京と横浜に挟まれた政令指定都市。武蔵小杉の再開発で知られ、東京都心への通勤利便から住宅需要が厚いとされる。",
    "沿線（東急・JR・小田急ほか）ごとに需要層が異なるといわれます。最寄り駅の徒歩分数が評価に与える影響が大きい地域です。"],
  ["saitama-shi", "さいたま市", "saitama", 132, 35.861, 139.646,
    "埼玉県の県庁所在地・政令指定都市。大宮・浦和の2都心を持ち、新幹線・在来線の結節点として交通利便が高い。",
    "浦和エリアの文教イメージ、大宮エリアの商業集積など、区ごとの個性が価格形成に影響するとされます。"],
  ["chiba-shi", "千葉市", "chiba", 97, 35.607, 140.106,
    "千葉県の県庁所在地・政令指定都市。幕張新都心をはじめ湾岸部の開発が進み、内陸部には成熟した住宅地が広がる。",
    "湾岸部と内陸部、駅距離によって需要の厚みが変わるとされます。売却時期は通勤需要の動向も踏まえて検討を。"],
  ["osaka-shi", "大阪市", "osaka", 275, 34.694, 135.502,
    "西日本最大の都市・政令指定都市。うめきた等の大規模再開発が続き、都心部のマンション供給が活発とされる。",
    "都心6区とその他の区で市場動向が分かれるとの指摘があります。マンション売却は直近の成約事例の確認が重要です。"],
  ["kyoto-shi", "京都市", "kyoto", 146, 35.011, 135.768,
    "歴史都市として国際的に知られる政令指定都市。景観規制により建物の高さが制限され、中心部の住宅供給が限られるとされる。",
    "景観条例など独自の規制が資産価値に影響するといわれます。地域の規制に詳しい会社への相談が有効です。"],
  ["kobe-shi", "神戸市", "hyogo", 152, 34.690, 135.196,
    "港町として発展した政令指定都市。三宮の都心再整備が進む一方、山手・郊外の住宅地はエリアごとに個性がある。",
    "坂の多い地形のため、駅距離だけでなく高低差も評価に影響するとされます。現地をよく知る会社の査定が参考になります。"],
  ["nagoya", "名古屋市", "aichi", 233, 35.181, 136.906,
    "中部圏の中心となる政令指定都市。リニア中央新幹線計画に伴う名駅周辺の再開発で知られる。",
    "名駅・栄への近接性、地下鉄沿線かどうかが評価の軸になるといわれます。戸建て志向も根強い地域とされます。"],
  ["sapporo", "札幌市", "hokkaido", 197, 43.062, 141.354,
    "北海道の道庁所在地・政令指定都市。全国有数の人口規模を持ち、地下鉄沿線を中心にマンション供給が続く。",
    "積雪・暖房仕様など寒冷地特有の条件が評価に関わるとされます。売却写真は雪のない時期に撮る工夫も語られます。"],
  ["fukuoka-shi", "福岡市", "fukuoka", 161, 33.590, 130.402,
    "九州最大の政令指定都市。天神ビッグバン等の再開発と人口増で知られ、コンパクトな都市構造が特徴とされる。",
    "人口動態が比較的良好とされる都市ですが、区・沿線による差はあります。直近の需給を査定時に確認しましょう。"],
  ["sendai", "仙台市", "miyagi", 110, 38.268, 140.869,
    "東北最大の政令指定都市。「杜の都」と呼ばれ、地下鉄東西線・南北線沿線に住宅地が広がる。",
    "転勤に伴う売買が比較的多い都市といわれます。売却スケジュールは異動期（1〜3月）を意識する例が多いようです。"],
  ["hiroshima-shi", "広島市", "hiroshima", 120, 34.385, 132.455,
    "中国地方最大の政令指定都市。三角州の上に市街地が広がり、太田川の河川と6つの川筋が都市景観を形づくる。",
    "デルタ市街地と丘陵部の住宅団地で市場の性格が異なるとされます。土地の地勢条件も査定時の確認ポイントです。"]
];

/* ============ 送客サービス（全件デモ / ASP承認後に差し替え） ============ */
const SERVICES = [
  { slug: "demo-assessment-a", kind: "assessment", ranking: 1, name: "（デモ）スマート一括査定",
    desc: "複数の不動産会社へまとめて査定依頼できる一括査定サービスのデモ表示です。実在のサービスではありません。",
    merits: "一度の入力で複数社を比較できる／査定額の幅がわかる／無料で利用できる",
    demerits: "複数社から連絡が来る場合がある／対応エリア外だと依頼先が少ないことがある",
    target: "はじめて売却する方・複数社の査定額を比べたい方",
    types: ["mansion", "house", "land"], reasons: ["sell", "relocation", "inheritance"] },
  { slug: "demo-assessment-b", kind: "assessment", ranking: 2, name: "（デモ）マンション査定ナビ",
    desc: "マンション専門の査定比較サービスのデモ表示です。実在のサービスではありません。",
    merits: "マンションに特化した査定／部屋単位の事例に基づく比較がしやすい",
    demerits: "戸建て・土地は対象外のことがある",
    target: "分譲マンションの売却を検討している方",
    types: ["mansion"], reasons: ["sell", "relocation", "divorce"] },
  { slug: "demo-purchase-a", kind: "purchase", ranking: 3, name: "（デモ）ダイレクト買取窓口",
    desc: "不動産会社による直接買取の一括比較サービスのデモ表示です。実在のサービスではありません。",
    merits: "仲介より短期間で現金化しやすい／内覧対応や広告が不要／契約不適合責任が軽減される場合がある",
    demerits: "仲介での売却より価格が低くなる傾向があるとされる",
    target: "スピード重視の方・相続や転勤で早く手放したい方",
    types: ["mansion", "house", "land"], reasons: ["inheritance", "urgent", "vacant"] },
  { slug: "demo-leaseback-a", kind: "leaseback", ranking: 4, name: "（デモ）あんしんリースバック",
    desc: "自宅を売却した後も賃貸として住み続けるリースバックの比較サービスのデモ表示です。実在のサービスではありません。",
    merits: "住み続けながら資金化できる／引っ越し不要",
    demerits: "売却価格が市場価格より低くなる傾向・家賃負担が続く点に注意が必要とされる",
    target: "資金需要があるが住み替えたくない方（利用前に条件の十分な確認を）",
    types: ["mansion", "house"], reasons: ["funds", "loan"] },
  { slug: "demo-landuse-a", kind: "landuse", ranking: 5, name: "（デモ）土地活用プラン一括請求",
    desc: "土地活用（賃貸経営・駐車場等）の企業資料をまとめて請求できるサービスのデモ表示です。実在のサービスではありません。",
    merits: "複数企業のプラン・収支想定を比較できる",
    demerits: "収支は想定であり保証されない点に注意が必要",
    target: "相続した土地・遊休地の活用を比較検討したい方",
    types: ["land"], reasons: ["inheritance", "vacant"] },
  { slug: "demo-ninbai-a", kind: "purchase", ranking: 6, name: "（デモ）任意売却相談窓口",
    desc: "住宅ローンの返済が難しい場合の任意売却相談サービスのデモ表示です。実在のサービスではありません。",
    merits: "競売より柔軟な条件で売却できる場合があるとされる／生活再建の相談がしやすい",
    demerits: "債権者（金融機関）の同意が必要／信用情報への影響等は専門家への確認が必要",
    target: "ローン返済が困難で売却を検討している方（まず金融機関・専門家に相談を）",
    types: ["mansion", "house"], reasons: ["loan"] }
];

/* ============ 記事（10本） ============ */
const ARTICLES = [
  { slug: "inherited-home-sale", cat: "inheritance", date: D(2026, 7, 20),
    title: "相続した実家を売却する手順 — 名義変更から引き渡しまで",
    metaDesc: "相続した実家を売るには、相続登記（名義変更）を済ませてから売却活動に入るのが基本です。手順・必要書類・特例の概要を整理します。",
    body: `相続した実家は、亡くなった方の名義のままでは売却できません。まず相続登記で名義を相続人に変更し、その後に査定・媒介契約・売却活動へ進むのが基本の流れです。

## 手順の全体像
1. 遺言書の有無を確認する
2. 相続人と遺産分割の内容を確定する（遺産分割協議）
3. 相続登記を行う（司法書士への依頼が一般的）
4. 不動産会社に査定を依頼し、媒介契約を結ぶ
5. 売却活動・売買契約・引き渡し

## 相続登記は義務化されている
相続登記は2024年4月から申請が義務化されました。正当な理由なく放置すると過料の対象になり得るとされています。詳細は法務省の案内を確認してください。

## 税金の特例を確認する
相続した空き家の売却では、一定の要件を満たすと譲渡所得から最高3,000万円を控除できる特例（空き家特例）が使える場合があります。要件は細かく、適用可否の判断は税理士・税務署への確認が必要です。

## 共有名義に注意
実家を兄弟で共有にすると、売却時に全員の同意が必要になります。売却予定があるなら、単独名義か換価分割（売却して代金を分ける方法）を早めに検討するとよいとされています。

*本記事は一般的な情報です。個別の相続・税務の判断は司法書士・税理士等の専門家にご確認ください。*`,
    sources: [
      { title: "法務省：相続登記の申請義務化について", url: "https://www.moj.go.jp/MINJI/minji05_00565.html" },
      { title: "国税庁タックスアンサー No.3306 被相続人の居住用財産（空き家）を売ったときの特例", url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3306.htm" }
    ] },
  { slug: "divorce-home-loan", cat: "divorce", date: D(2026, 7, 20),
    title: "離婚時の家と住宅ローン — 売る・住み続ける・名義の整理",
    metaDesc: "離婚時の自宅は「売却して清算」「どちらかが住み続ける」の大きく2択。ローン残債・名義・連帯保証の確認ポイントを解説します。",
    body: `離婚に伴う自宅の扱いは、売却して財産分与で清算する方法と、どちらか一方が住み続ける方法に大別されます。どちらを選ぶにしても、最初に確認すべきは「ローン残高」「名義」「連帯保証・連帯債務の有無」の3点です。

## まずアンダーローンかオーバーローンか
自宅の査定額がローン残高を上回る（アンダーローン）なら、売却代金でローンを完済し、残りを分与する清算がしやすいとされます。査定額が残高を下回る（オーバーローン）場合は、不足分の扱いを金融機関・専門家と相談する必要があります。

## 住み続ける場合の注意
・ローン名義人でない側が住み続けると、名義人の返済が滞った場合に退去リスクが生じ得ます
・連帯保証を外すには金融機関の承諾や借り換えが必要になるのが一般的です
・名義変更（財産分与による移転登記）は司法書士への相談をおすすめします

## 売却する場合
共有名義なら双方の同意が必要です。感情的な対立で話が進まないケースも多いため、査定は早めに取り、客観的な数字を共有してから話し合うと進めやすいといわれます。

*離婚条件・財産分与は法律問題です。弁護士等の専門家にご相談ください。*`,
    sources: [] },
  { slug: "vacant-house-guide", cat: "vacant-house", date: D(2026, 7, 21),
    title: "空き家を放置するリスクと売却の選択肢",
    metaDesc: "空き家の放置は管理コスト・特定空家指定・固定資産税などのリスクを伴うとされます。売却・活用の主な選択肢を整理します。",
    body: `使う予定のない空き家は、持ち続けるだけで固定資産税・管理の手間・老朽化リスクが積み上がります。「特定空家」に指定されると住宅用地の固定資産税軽減が外れる場合があるとされ、早めの方針決定が重要です。

## 放置の主なリスク
・老朽化による倒壊・外壁落下などの近隣トラブル
・雑草・害虫・不法投棄など管理問題
・特定空家等に指定された場合の税負担増・行政指導

## 売却の選択肢
1. **そのまま売る（古家付き土地）** — 解体費をかけずに売り出せる。買主がリフォーム前提で購入するケース
2. **解体して更地で売る** — 土地として売りやすくなる場合があるが、解体費と税負担の変化に注意
3. **不動産会社の買取** — スピード重視。仲介より価格は下がる傾向とされる
4. **自治体の空き家バンク** — 地方物件で選択肢になることがある

## 空き家特例の確認を
相続した空き家は、要件を満たせば譲渡所得の3,000万円特別控除（空き家特例）の対象になる場合があります。適用要件（耐震改修または解体、譲渡期限など）が細かいため、税理士・税務署に確認してください。

*解体や税務の判断は、現地の状況・自治体の制度によって異なります。専門家・自治体窓口にご相談ください。*`,
    sources: [
      { title: "国土交通省：空家等対策の推進に関する特別措置法関連情報", url: "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000035.html" },
      { title: "国税庁タックスアンサー No.3306（空き家特例）", url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3306.htm" }
    ] },
  { slug: "sell-first-or-buy-first", cat: "relocation", date: D(2026, 7, 21),
    title: "住み替えは「売り先行」か「買い先行」か — 判断の軸を整理",
    metaDesc: "住み替えの順番は資金余力とスケジュールで決まります。売り先行・買い先行それぞれのメリット・デメリットを比較します。",
    body: `住み替えでは「先に売るか、先に買うか」が最初の分かれ道です。一般に、資金に余裕がなければ売り先行、余裕があり住みたい物件が決まっているなら買い先行が向くとされます。

## 売り先行のメリット・デメリット
**メリット**：売却代金が確定してから購入予算を組めるため資金計画が安全／二重ローンを避けやすい
**デメリット**：引き渡しまでに新居が決まらないと仮住まいが必要になる

## 買い先行のメリット・デメリット
**メリット**：新居をじっくり探せる／仮住まい不要で引っ越しが1回で済む
**デメリット**：売却が長引くと二重ローン・維持費が発生／売り急いで価格を下げるリスク

## 判断の軸
1. 自宅のローン残高と自己資金 — 残債が多いなら売り先行が無難とされます
2. 売りやすいエリアか — 需要の厚いエリアなら買い先行でも売却期間を読みやすい
3. 「買い替え特約」や「つなぎ融資」の利用可否 — 使える場合は選択肢が広がります

まず自宅の査定を取り、残債との差額（売却余力）を把握することが出発点です。

*資金計画は金融機関・FP等にもご相談ください。*`,
    sources: [] },
  { slug: "selling-flow", cat: "sell", date: D(2026, 7, 22),
    title: "不動産売却の流れ完全ガイド — 査定から引き渡しまでの7ステップ",
    metaDesc: "不動産売却は「相場把握→査定→媒介契約→売却活動→売買契約→決済・引き渡し→確定申告」の7ステップ。各段階の要点を解説します。",
    body: `はじめての不動産売却でも、全体の流れを知っておけば各段階で慌てずに判断できます。売却は一般に3〜6か月程度かかるといわれますが、物件・価格設定・時期によって大きく変わります。

## 7つのステップ
1. **相場を把握する** — 周辺の売出事例・成約事例を確認。公的な取引価格情報（不動産情報ライブラリ等）も参考になります
2. **査定を依頼する** — 複数社に依頼し、査定額だけでなく根拠の説明を比較します
3. **媒介契約を結ぶ** — 一般媒介・専任媒介・専属専任媒介の3種類。それぞれ報告義務や自己発見取引の扱いが異なります
4. **売却活動** — 写真・図面の質、内覧対応が結果を左右するとされます
5. **売買契約** — 手付金の授受、契約不適合責任の範囲などを確認します
6. **決済・引き渡し** — 残代金の受領と同時に所有権移転登記・抵当権抹消を行います
7. **確定申告** — 譲渡益が出た場合は申告が必要。特例適用にも申告が必要な場合があります

## 高く売るための基本
査定額は「その価格で売れる保証」ではありません。高すぎる査定額に飛びつかず、根拠（近隣成約事例）を必ず確認しましょう。

*本記事は一般的な流れの解説です。個別の契約条件は不動産会社・専門家にご確認ください。*`,
    sources: [] },
  { slug: "chukai-vs-kaitori", cat: "sell", date: D(2026, 7, 22),
    title: "仲介と買取の違い — 価格・スピード・手間で比較",
    metaDesc: "仲介は市場価格を狙える一方時間がかかり、買取は早いが価格が下がる傾向。向き不向きを整理します。",
    body: `不動産の売却方法は大きく「仲介」と「買取」に分かれます。どちらが良いかは、価格とスピードのどちらを優先するかで決まります。

## 仲介
不動産会社が買主を探す方法。市場価格での売却を狙えますが、売却期間は数か月かかるのが一般的です。成約時に仲介手数料（法定の上限あり）がかかります。

## 買取
不動産会社が直接買い取る方法。最短数週間で現金化できるとされますが、買取価格は仲介での想定売却価格より低くなる傾向があるといわれます（会社の再販コスト・リスクが織り込まれるため）。

## 比較表
・**価格** — 仲介：市場価格を狙える ／ 買取：低くなる傾向
・**期間** — 仲介：数か月 ／ 買取：数週間〜
・**内覧対応** — 仲介：必要 ／ 買取：原則不要
・**近所に知られず売る** — 仲介：広告が出る ／ 買取：広告なしが可能
・**契約不適合責任** — 仲介：原則あり ／ 買取：免除される場合がある

## 向いているケース
**仲介**：時間に余裕があり、少しでも高く売りたい
**買取**：相続・転勤・離婚などで早期の現金化を優先したい、築古で買い手が付きにくい

まず仲介の査定額と買取の提示額を両方取り、差額を見てから判断するのが合理的です。

*条件は会社・物件により異なります。複数社の提示を比較してください。*`,
    sources: [] },
  { slug: "selling-costs", cat: "cost", date: D(2026, 7, 23),
    title: "不動産売却にかかる費用一覧 — 仲介手数料・税金・その他",
    metaDesc: "売却費用の中心は仲介手数料（法定上限：400万円超の部分は3%+消費税ほか速算式）。印紙税・登記費用・税金も含めた全体像を解説します。",
    body: `不動産を売るときにも費用がかかります。手取り額を正しく見積もるため、主な費用を把握しておきましょう。

## 仲介手数料（最大の費用）
宅地建物取引業法に基づく報酬上限が定められています。売買価格400万円超の場合の速算式は「価格×3％＋6万円＋消費税」です（これは上限であり、交渉や会社の方針で下回ることもあります）。※800万円以下の物件については、2024年の告示改正で上限の特例が設けられています。詳細は国土交通省の告示をご確認ください。

## 印紙税
売買契約書に貼付します。契約金額に応じた税額で、不動産譲渡契約書には軽減措置が設けられている期間があります。最新の税額は国税庁のページで確認してください。

## 登記関連費用
・**抵当権抹消登記** — ローンが残っていた場合に必要。登録免許税＋司法書士報酬
・住所変更登記が必要になる場合もあります

## その他かかり得る費用
・測量費（土地の境界が不明確な場合）
・解体費（更地渡しの場合）
・ハウスクリーニング・残置物処分
・引っ越し費用

## 税金
譲渡益が出た場合は譲渡所得税・住民税がかかります。マイホームの3,000万円特別控除など特例があるため、該当しそうな場合は税理士・税務署に確認しましょう。

*金額は物件・契約により異なります。本記事の計算式は上限の目安であり、実額は各社の見積りでご確認ください。*`,
    sources: [
      { title: "国税庁タックスアンサー No.7108 不動産の譲渡・消費貸借等に関する契約書（印紙税）", url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7108.htm" },
      { title: "国土交通省：宅地建物取引業者が宅地又は建物の売買等に関して受けることができる報酬の額", url: "https://www.mlit.go.jp/totikensangyo/const/1_6_bt_000249.html" }
    ] },
  { slug: "capital-gains-basics", cat: "tax", date: D(2026, 7, 23),
    title: "譲渡所得税の基礎 — 3,000万円特別控除と長期・短期の税率",
    metaDesc: "不動産売却の利益（譲渡所得）には所得税・住民税がかかります。マイホームの3,000万円特別控除、所有期間5年での税率の違いを解説します。",
    body: `不動産を売って利益（譲渡所得）が出ると、所得税・住民税・復興特別所得税がかかります。仕組みの骨格はシンプルです。

## 譲渡所得の計算式
**譲渡所得 ＝ 売却価格 −（取得費 ＋ 譲渡費用）− 特別控除**

・取得費：購入代金や購入時諸費用（建物は減価償却後）。不明な場合は売却価格の5％を概算取得費にできます
・譲渡費用：仲介手数料・印紙税など売却にかかった費用

## 税率は所有期間で変わる
売却した年の1月1日時点の所有期間で判定されます。
・**5年超（長期譲渡所得）**：所得税・住民税等 合計 20.315％
・**5年以下（短期譲渡所得）**：合計 39.63％
（いずれも復興特別所得税を含む税率。最新は国税庁で確認してください）

## マイホームの3,000万円特別控除
自分が住んでいた家を売る場合、要件を満たせば譲渡所得から最高3,000万円を控除できます。多くのマイホーム売却ではこの特例により税額がゼロになるケースがあるとされますが、適用には確定申告が必要で、住宅ローン控除との併用制限などの注意点もあります。

## 損が出た場合
一定の要件を満たすマイホームの買い替え等では、譲渡損失の損益通算・繰越控除の特例が使える場合があります。

*税額の確定判断は税理士・税務署にご確認ください。本記事は制度の概要です。*`,
    sources: [
      { title: "国税庁タックスアンサー No.3302 マイホームを売ったときの特例", url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3302.htm" },
      { title: "国税庁タックスアンサー No.3208 長期譲渡所得の税額の計算", url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3208.htm" },
      { title: "国税庁タックスアンサー No.3211 短期譲渡所得の税額の計算", url: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/joto/3211.htm" }
    ] },
  { slug: "sell-with-mortgage", cat: "mortgage", date: D(2026, 7, 24),
    title: "住宅ローンが残っている家を売る方法 — 抵当権と残債の整理",
    metaDesc: "ローン中の家も、引き渡しまでに残債を完済して抵当権を抹消できれば売却可能です。オーバーローン時の選択肢も解説します。",
    body: `住宅ローン返済中の家でも売却はできます。条件は「引き渡し（決済）までにローンを完済し、抵当権を抹消できること」です。

## 基本パターン：売却代金で完済
査定額がローン残高を上回っていれば、決済時に売却代金でローンを一括返済し、同時に抵当権抹消と所有権移転の登記を行います。これが最も一般的な流れです。

## まず確認する2つの数字
1. **ローン残高** — 金融機関の残高証明書・ウェブで確認
2. **売却想定額** — 複数社の査定で幅を把握

この差額（＋自己資金）で完済できるかが分かれ目です。

## オーバーローン（残債＞売却額）の場合の選択肢
・**自己資金で不足分を補って売却する**
・**住み替えローンを利用する** — 新居のローンに不足分を上乗せする方法。審査は厳しめとされます
・**売却を延期して残債を減らす**
・**返済が困難な場合は任意売却を検討** — 金融機関の同意を得て売却する方法。早めに金融機関・専門家へ相談を

## 注意点
売買契約から決済まで通常1〜2か月あります。金融機関への一括返済の申し出には事前手続きが必要な場合があるため、売却活動と並行して金融機関に連絡しておきましょう。

*任意売却・返済条件の変更は信用情報等への影響があり得ます。必ず金融機関・専門家にご相談ください。*`,
    sources: [] },
  { slug: "how-to-choose-assessment", cat: "assessment", date: D(2026, 7, 24),
    title: "不動産一括査定サービスの選び方と利用時の注意点",
    metaDesc: "一括査定は複数社の査定額を比較できる便利な仕組みですが、査定額＝売却価格ではありません。選び方と使い方のコツを解説します。",
    body: `一括査定サービスは、物件情報を一度入力するだけで複数の不動産会社に査定を依頼できる仕組みです。無料で使える一方、仕組みと注意点を知って使うことが大切です。

## 一括査定の仕組み
多くのサービスは、査定依頼が成立すると不動産会社側が紹介料を支払うビジネスモデルです。利用者は無料で使えますが、依頼後は各社から連絡が来ることを想定しておきましょう。

## 選び方のポイント
1. **対応エリア** — 地方・郊外は提携会社が少ない場合があります。対応エリアの確認が最初です
2. **対応物件種別** — マンション特化型、土地・収益物件対応型など得意分野が分かれます
3. **提携会社の傾向** — 大手中心か、地域密着か。両方に依頼して比較するのが理想とされます
4. **連絡方法の選択肢** — メール連絡を選べるかどうか

## 利用時の注意点
・**査定額は「売れる価格」の保証ではありません。** 高い査定額で媒介契約を取り、後から値下げを提案する例もあると指摘されています。査定額の根拠（成約事例）を必ず聞きましょう
・**依頼社数は3〜4社程度が現実的**とされます。多すぎると対応の負担が大きくなります
・**個人情報の扱い**を確認し、同意内容を理解してから送信しましょう

## 匿名査定・AI査定について
概算を知りたいだけの段階では、匿名で使えるシミュレーションを先に使う方法もあります。ただし精度には限界があり、実際の売却判断には訪問査定が必要です。

*当サイトの比較ページにはPR（広告）を含む場合があります。掲載方針は広告掲載ポリシーをご覧ください。*`,
    sources: [] },
  { slug: "dojunkai-apartments-story", cat: "story", date: D(2026, 7, 25),
    title: "同潤会アパートと日本の集合住宅100年 — 「マンション」前史をたどる",
    metaDesc: "関東大震災後に建てられた同潤会アパートは、日本の鉄筋コンクリート集合住宅の草分けとされます。表参道・代官山の記憶とともに、日本の住まいの100年を振り返ります。",
    factCheck: "reviewed",
    body: `東京・表参道の「表参道ヒルズ」の一角に、蔦の絡んだ古いアパートの外観が一部再現されています。ここにはかつて「同潤会青山アパート」が建っていました。

## 同潤会とは
同潤会は、1923年の関東大震災の義援金をもとに1924年に設立された財団法人で、被災者向けの住宅供給を目的としていました。1920年代後半から東京・横浜に鉄筋コンクリート造の集合住宅（アパートメント）を相次いで建設し、これらは日本における本格的なRC造集合住宅の草分けとされています。

## 当時の最先端
同潤会アパートには、当時としては先進的な設備（水道・ガス・水洗便所など）が導入されたと伝えられています。青山（現・表参道ヒルズ）、代官山、江戸川など各地のアパートは、その後数十年にわたって都市の暮らしの舞台となりました。

## 解体と記憶
老朽化に伴い各アパートは順次解体され、青山アパートは2003年に解体、跡地には安藤忠雄氏の設計による表参道ヒルズが2006年に開業しました。その一角に旧棟の外観を再現した「同潤館」が設けられ、記憶の継承が図られています。

## 「マンション」への系譜
戦後、日本住宅公団（1955年設立）の団地建設、1960年代以降の民間分譲マンションの普及へと、集合住宅の系譜は続いていきます。現在の中古マンション市場を考えるとき、築年数と建て替え・管理の問題は避けて通れません。同潤会アパートの100年は、「集合住宅は建てた後どう維持し、どう終わらせるか」という現代の課題を先取りしていたともいえます。

---
**ファクトノート**：同潤会の設立経緯・各アパートの解体年・表参道ヒルズの開業年は、下記の公開資料・Wikipediaの記述に基づきます。設備の詳細など一部は「伝えられています」として記述しました。本文の一部はWikipediaの記述を参考にしています（CC BY-SA 4.0）。`,
    sources: [
      { title: "Wikipedia: 同潤会", url: "https://ja.wikipedia.org/wiki/%E5%90%8C%E6%BD%A4%E4%BC%9A" },
      { title: "Wikipedia: 表参道ヒルズ", url: "https://ja.wikipedia.org/wiki/%E8%A1%A8%E5%8F%82%E9%81%93%E3%83%92%E3%83%AB%E3%82%BA" }
    ] }
];

/* ---- 追加記事: tools/articles/*.mjs（export default [{slug,cat,date:[y,m,d],title,metaDesc,body,sources,factCheck}]） ---- */
const artDir = join(ROOT, "tools", "articles");
if (existsSync(artDir)) {
  for (const f of readdirSync(artDir).filter(x => x.endsWith(".mjs")).sort()) {
    const mod = await import(pathToFileURL(join(artDir, f)).href);
    for (const a of mod.default) {
      if (ARTICLES.find(x => x.slug === a.slug)) throw new Error("dup article slug: " + a.slug);
      ARTICLES.push({ ...a, date: D(a.date[0], a.date[1], a.date[2]) });
    }
  }
}

/* ============ ランキング ============ */
const RANKINGS = [
  { slug: "major-cities-by-population", name: "人口の多い主要掲載エリア",
    desc: "REALPORTに掲載中の主要エリアを人口（国勢調査ベースの概数・出典 Wikipedia）順に並べた一覧です。相場の優劣を示すものではありません。",
    sort: "population" },
  { slug: "tokyo-23ku", name: "東京23区の掲載エリア",
    desc: "REALPORTに掲載中の東京23区エリアの一覧です。", filter: { prefSlug: "tokyo" } },
  { slug: "seirei-cities", name: "政令指定都市の掲載エリア",
    desc: "REALPORTに掲載中の政令指定都市の一覧です。",
    slugs: ["yokohama", "kawasaki", "saitama-shi", "chiba-shi", "osaka-shi", "kyoto-shi", "kobe-shi", "nagoya", "sapporo", "fukuoka-shi", "sendai", "hiroshima-shi"] }
];

/* ============ FAQ（サイト共通） ============ */
const FAQS = [
  { q: "REALPORTは何をするサイトですか？", a: "不動産の売却・購入・相場・査定サービス比較など、不動産売買の検討に必要な情報をまとめて比較できる情報サイトです。当サイト自身が物件の媒介（仲介）を行うことはありません。" },
  { q: "利用にお金はかかりますか？", a: "情報の閲覧・診断ツール・シミュレーターはすべて無料でご利用いただけます。" },
  { q: "掲載されている査定サービスは実在のものですか？", a: "現在表示している査定サービスはすべて「デモ（サンプル）」であり、実在のサービスではありません。提携開始後に実サービスへ差し替えます。" },
  { q: "AI売却診断の結果は査定額ですか？", a: "いいえ。診断結果は入力内容に基づく一般的な参考情報であり、正式な査定・価格の保証ではありません。実際の売却判断には不動産会社による査定が必要です。" },
  { q: "相場データはどこから来ていますか？", a: "公的データ（国土交通省の不動産取引価格情報等）の接続を準備中です。データ未登録のエリアには推定値を表示せず「データ準備中」と表示します。出典と更新日は各ページに明記します。" },
  { q: "税金やローンの相談はできますか？", a: "当サイトは一般的な情報提供のみを行います。税務は税理士・税務署、法務は弁護士・司法書士、ローンは金融機関へご相談ください。" }
];

/* ============ CTAルール（記事カテゴリ→出し分け） ============ */
const CTA_RULES = [
  { match: ["inheritance", "vacant-house"], kinds: ["assessment", "purchase", "landuse"], label: "相続・空き家の売却をご検討の方へ" },
  { match: ["divorce", "relocation", "sell", "cost", "assessment"], kinds: ["assessment"], label: "まずは査定額の比較から" },
  { match: ["mortgage"], kinds: ["assessment", "purchase", "leaseback"], label: "残債がある方の売却相談" },
  { match: ["tax", "story"], kinds: ["assessment"], label: "売却をご検討の方へ" }
];

/* ============ 組み立て ============ */
const imgMap = existsSync(join(ROOT, "tools", "area-images.json"))
  ? JSON.parse(readFileSync(join(ROOT, "tools", "area-images.json"), "utf-8")) : {};

/* ---- カタログ層（Wikidata全国市区町村・cat:1・個別静的ページなし） ---- */
const wdPath = join(ROOT, "tools", "wikidata-areas.json");
const wdAreas = existsSync(wdPath) ? JSON.parse(readFileSync(wdPath, "utf-8")) : {};
const curatedNames = new Set(AREAS.map(a => a[1] + "|" + a[2])); // 名前|都道府県slug で重複排除
const prefNameBySlug = Object.fromEntries(PREFS.map(([slug, name]) => [slug, name]));
const usedSlugs = new Set(AREAS.map(a => a[0]));
const seenQids = new Set();
const slugify = s => String(s || "").toLowerCase().normalize("NFKD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const CATALOG = [];
for (const [prefSlug, rows] of Object.entries(wdAreas)) {
  for (const r of rows) {
    if (seenQids.has(r.qid)) continue; seenQids.add(r.qid);
    if (curatedNames.has(r.ja + "|" + prefSlug)) continue; // curated済みはスキップ
    let slug = slugify(r.en) || r.qid.toLowerCase();
    if (usedSlugs.has(slug)) slug = slug + "-" + prefSlug;
    if (usedSlugs.has(slug)) slug = r.qid.toLowerCase();
    usedSlugs.add(slug);
    CATALOG.push({
      id: "wd_" + r.qid.toLowerCase(), slug, prefId: "pf_" + prefSlug.replace(/-/g, "_"),
      population: null, popRaw: r.pop || null, // 出典: Wikidata (P1082)
      lat: r.lat, lng: r.lon, dataLevel: 0, status: "published", cat: 1,
      img: null, imgCredit: null, imgSource: null,
      translations: { ja: { name: r.ja, summary: prefNameBySlug[prefSlug] + "の市区町村。市区町村別の相場ページは準備中です。", sellNotes: "" } }
    });
  }
}

/* ---- テーマ画像（Wikipedia/Commons・カードのパネリング用） ---- */
const themePath = join(ROOT, "tools", "theme-images.json");
const themeImages = existsSync(themePath) ? JSON.parse(readFileSync(themePath, "utf-8")) : {};
// market テーマは新宿のエリア写真を再利用
if (imgMap["shinjuku-ku"] && !themeImages.market)
  themeImages.market = { file: imgMap["shinjuku-ku"].file, credit: imgMap["shinjuku-ku"].credit, source: imgMap["shinjuku-ku"].source, article: "新宿区" };

/* ---- マーキー画像（Wikipedia/Commons・横長12枚×3プール） ---- */
const mqPath = join(ROOT, "tools", "marquee-images.json");
const marqueeImages = existsSync(mqPath) ? JSON.parse(readFileSync(mqPath, "utf-8")) : {};

/* ---- 国内大手デベロッパー一覧（tools/fetch-developer-images.mjs が生成） ---- */
const devPath = join(ROOT, "tools", "developer-images.json");
const DEV_ORDER = ["mitsui", "mec", "sumitomo", "tokyu", "nomura", "mori", "tatemono", "hulic", "daiwa", "sekisui", "nttud", "openhouse"];
const developers = (existsSync(devPath) ? JSON.parse(readFileSync(devPath, "utf-8")) : [])
  .sort((a, b) => DEV_ORDER.indexOf(a.key) - DEV_ORDER.indexOf(b.key));

/* ---- 公式YouTubeチャンネル（tools/fetch-youtube.mjs が生成。定期再実行で最新化） ---- */
const ytPath = join(ROOT, "tools", "youtube-channels.json");
const videoChannels = (existsSync(ytPath) ? JSON.parse(readFileSync(ytPath, "utf-8")) : [])
  .filter(c => c.videos && c.videos.length); // 動画0本のチャンネルは表示しない

const DATA = {
  themeImages,
  marqueeImages,
  videoChannels,
  developers,
  regions: REGIONS.map(([slug, name]) => ({ id: "rg_" + slug.replace(/-/g, "_"), slug, names: { ja: name } })),
  prefectures: PREFS.map(([slug, name, rg]) => ({
    id: "pf_" + slug.replace(/-/g, "_"), slug, regionId: "rg_" + rg, names: { ja: name } })),
  areas: AREAS.map(([slug, name, pref, pop, lat, lng, summary, sellNotes]) => ({
    id: "ar_" + slug.replace(/-/g, "_"), slug, prefId: "pf_" + pref.replace(/-/g, "_"),
    population: pop, lat, lng, dataLevel: 0, status: "published",
    img: imgMap[slug]?.file || null, imgCredit: imgMap[slug]?.credit || null, imgSource: imgMap[slug]?.source || null,
    translations: { ja: { name, summary, sellNotes } } })).concat(CATALOG),
  stations: [],
  // 相場の単一ソースは tools/market-data.json（import-chika-koji / import-market-csv がマージ）
  marketData: (existsSync(join(ROOT, "tools", "market-data.json"))
    ? JSON.parse(readFileSync(join(ROOT, "tools", "market-data.json"), "utf-8")) : [])
    .map(m => ({ ...m, areaId: "ar_" + m.areaSlug.replace(/-/g, "_") })),
  services: SERVICES.map(s => ({
    id: "sv_" + s.slug.replace(/-/g, "_"), slug: s.slug, kind: s.kind, isDemo: true,
    affiliateUrl: "", trackingCode: "", partnerCount: null, rating: null, ranking: s.ranking, isPR: true,
    status: "published", gate: { propertyTypes: s.types, reasons: s.reasons },
    translations: { ja: { name: s.name, desc: s.desc, merits: s.merits, demerits: s.demerits, target: s.target } } })),
  rankings: RANKINGS.map(r => ({
    id: "rk_" + r.slug.replace(/-/g, "_"), slug: r.slug, names: { ja: r.name }, descriptions: { ja: r.desc },
    sort: r.sort || null, filter: r.filter || null, slugs: r.slugs || null })),
  articles: ARTICLES.map(a => ({
    id: "art_" + a.slug.replace(/-/g, "_"), slug: a.slug, category: a.cat,
    authorName: "REALPORT編集部", supervisorName: null, // 実在監修者の許諾取得まで null（架空の専門家を作らない）
    status: "published", publishedAt: a.date, updatedAt: a.date,
    factCheck: a.factCheck || null, sources: a.sources || [],
    translations: { ja: { title: a.title, metaDesc: a.metaDesc, body: a.body } } })),
  companies: [],      // 直接掲載の開始まで空（デモ会社も掲載しない方針）
  professionals: [],  // 同上
  faqs: FAQS,
  ctaRules: CTA_RULES,
  siteSettings: {
    name: "REALPORT", tagline: "不動産の母港。売る・買う・住み替えの入口を、ひとつに。",
    desc: "REALPORT（リアルポート）は、不動産売却・購入・相場・査定サービス比較・住み替え・相続・空き家の情報をひとつに集約した不動産情報ポータルです。",
    disclaimer: "本サイトの情報は一般的な参考情報であり、正式な査定ではありません。価格・成約を保証するものではなく、税務・法務の個別判断は専門家にご確認ください。本サイトにはアフィリエイト広告（PR）を含む場合があります。",
    dataNote: "相場データは公的データの接続準備中です。未登録エリアには推定値を表示していません。",
    updatedAt: "2026-07-27"
  }
};

/* ---- 全国市区町村の成約集計（market-all.json）→ データのある自治体を個別ページへ昇格 ---- */
const allPath = join(ROOT, "tools", "market-all.json");
DATA.mkt = {};
if (existsSync(allPath)) {
  const all = JSON.parse(readFileSync(allPath, "utf-8"));
  DATA.siteSettings.mktSource = {
    name: all.sourceName, url: all.sourceUrl, date: all.sourceDate,
    year: all.year, minCount: all.minCount, fetchedAt: all.fetchedAt
  };
  const curatedNameSet = new Set(AREAS.map(a => a[1] + "|" + a[2])); // curatedは既存marketDataを使う
  const prefSlugByCode = Object.fromEntries(PREFS.map(([slug], i) => [String(i + 1).padStart(2, "0"), slug]));
  // (prefSlug|名前) → area の索引
  const areaByName = new Map();
  for (const a of DATA.areas) {
    const pfSlug = a.prefId.replace("pf_", "").replace(/_/g, "-");
    areaByName.set(pfSlug + "|" + a.translations.ja.name, a);
  }
  let matched = 0, unmatched = 0; const unmatchedSample = [];
  for (const r of all.rows) {
    const pfSlug = prefSlugByCode[r.pref]; if (!pfSlug) continue;
    if (curatedNameSet.has(r.name + "|" + pfSlug)) continue; // curated 18はスキップ（重複防止）
    const a = areaByName.get(pfSlug + "|" + r.name);
    if (!a) { unmatched++; if (unmatchedSample.length < 8) unmatchedSample.push(r.name); continue; }
    matched++;
    (DATA.mkt[a.slug] = DATA.mkt[a.slug] || []).push([r.type, r.avg, r.med, r.ppsm, r.n]);
    if (a.cat) { delete a.cat; a.dataLevel = 2; // カタログ層から昇格
      a.translations.ja.summary = a.translations.ja.name + "（" + prefNameBySlug[pfSlug] + "）のエリアページです。国土交通省の公的データに基づく" + all.year + "年の成約価格集計を掲載しています。";
      a.translations.ja.sellNotes = "相場は物件の条件（駅距離・築年・面積・状態）により幅があります。売却検討時は複数社の査定で実際の価格帯をご確認ください。";
    }
  }
  console.log("market-all: 集計" + all.rows.length + "行 → 反映" + matched + "行 / 非対応" + unmatched + "行（政令市の区など: " + unmatchedSample.join("・") + "…）");
  console.log("個別ページ昇格: " + DATA.areas.filter(a => !a.cat).length + "エリア（うちcurated " + AREAS.length + "）");
}

/* ---- 全市区町村ページの写真（ja.wikipedia代表画像・Wikimedia公式サムネイル参照） ---- */
const photoPath = join(ROOT, "tools", "area-photos.json");
if (existsSync(photoPath)) {
  const photos = JSON.parse(readFileSync(photoPath, "utf-8"));
  let attached = 0;
  for (const a of DATA.areas) {
    if (a.cat || a.img) continue;
    const ph = photos[a.slug];
    if (ph) { a.imgUrl = ph.url; a.imgUrlSmall = ph.urlSmall || ph.url; a.imgCredit = ph.credit; a.imgSource = ph.source; attached++; }
  }
  console.log("area-photos: " + attached + "エリアに写真を適用（Wikipedia代表画像）");
}

/* dataLevel を相場データの有無から客観判定（1=地価公示あり 2=取引相場あり） */
for (const m of DATA.marketData) {
  const a = DATA.areas.find(x => x.id === m.areaId);
  if (!a) throw new Error("marketData: 不明なエリア " + m.areaSlug);
  if (!a.cat) a.dataLevel = Math.max(a.dataLevel, /地価公示/.test(m.label || "") ? 1 : 2);
  if ((m.avgPrice != null || m.pricePerSqm != null) && !(m.sourceName && m.sourceUrl && m.sourceDate))
    throw new Error("marketData: 出典のない価格 " + m.areaSlug);
}

/* 検証: 参照整合性 */
for (const p of DATA.prefectures) if (!DATA.regions.find(r => r.id === p.regionId)) throw new Error("dangling region: " + p.slug);
for (const a of DATA.areas) if (!DATA.prefectures.find(p => p.id === a.prefId)) throw new Error("dangling pref: " + a.slug);
const slugs = new Set();
for (const a of [...DATA.areas, ...DATA.articles, ...DATA.services, ...DATA.rankings]) {
  if (slugs.has(a.slug)) throw new Error("dup slug: " + a.slug); slugs.add(a.slug);
}

writeFileSync(join(ROOT, "data.js"), "var DATA=" + JSON.stringify(DATA) + ";");
console.log("OK: data.js written —",
  DATA.prefectures.length, "prefs /", DATA.areas.filter(a => !a.cat).length, "curated +",
  DATA.areas.filter(a => a.cat).length, "catalog areas /",
  DATA.articles.length, "articles /", DATA.services.length, "services(demo)");
