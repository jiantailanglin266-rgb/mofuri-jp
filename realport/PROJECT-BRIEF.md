# REALPORT（リアルポート）— Global Affiliate Site Framework 設計ブリーフ

> 「不動産の母港。売る・買う・住み替えの入口を、ひとつに。」
>
> 元要件（Next.js + Supabase のフルスタック仕様）を、**global-affiliate-site スキルのひな形**
> （単一 `index.html` SPA + `data.js` + `build.mjs` SSG、ゼロ依存・静的ホスティング、
> Wikidata/Wikipedia ソーシング、アフィリエイト送客型）に再構成したもの。
> 参照実装：Mountain Peak（ja/en 約2,000山カタログ + 190記事 + アフィリエイト）。

---

## 0. リポジトリ調査結果

- 本リポジトリ（MOFURI.HP）は静的HTMLのブランドサイト。`terapp/`・`beauty-all-in/` 等、
  別ブランドのサブプロジェクトが同居する運用が既に確立している。
- フレームワーク・package.json・DB・認証は存在しない（＝スキルのゼロ依存構成と整合）。
- **REALPORT は `realport/` サブフォルダとして新規構築**。既存ファイルには一切触れない。
- 公開は GitHub Pages（または任意の静的ホスト）。独自ドメイン移行可能な相対パス設計とする。

## 1. フレームワークへのマッピング判断（元仕様との差分）

元仕様は Next.js + Supabase を推奨していたが、本ブリーフはスキルの静的アーキテクチャを採用する。
差分は以下の通り「同じ事業目的を静的構成で満たす」形にマッピングする。

| 元仕様 | Framework 版の実装 |
|---|---|
| Next.js App Router + SSR/ISR | 単一 `index.html` SPA + `build.mjs` による全URL静的プリレンダー |
| Supabase PostgreSQL | `data.js`（`var DATA={...};` 1行、唯一の真実源） |
| Supabase Auth・会員機能 | **localStorage**（お気に入り・診断履歴・比較リスト・閲覧履歴）。サーバー会員はフェーズ外 |
| 管理画面 `/admin` | `tools/*.mjs` 登録スクリプト群（記事登録・相場CSVインポート・査定サービス更新・ランキング生成） |
| CMS | 記事は scratchpad ESM → `register.mjs` で `data.js` へ一括登録（190記事で実証済みパターン） |
| React Hook Form + サーバー検証 | 問い合わせ・メルマガは外部フォームサービス（Formspree等）or mailto。個人情報を自サーバーで持たない |
| AI Provider Adapter | **ルールベース診断をクライアントJSで完結**（API不要・キー露出ゼロ）。将来AI API化できる関数境界を切る |
| Resend メール | フェーズ外（外部フォームサービスの通知で代替） |
| Recharts | 自前SVGチャート（参照実装に実物あり。CDN依存禁止） |
| GA4/GTM | GA4 直貼り + `af_click` イベント（アフィリエイトモジュール標準） |
| Vercel | GitHub Pages（`data.js?v=N` キャッシュバスト + sw.js） |

**この構成の利点**：個人情報を一切保持しない＝セキュリティ・法令リスクが構造的に消える。
サーバー費ゼロ。SEO/LLMOはプリレンダー静的ページで最強クラス。
**制約**：リアルタイム会員機能・大規模物件DBは持てない → 送客メディアという事業モデルには影響しない。

## 2. ジャンル・マッピング表（スキル必須の最初の作業）

| Framework 概念 | Mountain Peak | REALPORT |
|---|---|---|
| **Entity**（コアカタログ） | 山（~2,000） | **市区町村エリア**（全国~1,900自治体。Wikidataソース） |
| curated tier（深掘り個別ページ） | 名山 ~200 | 主要都市 ~150〜200（政令市・県庁所在地・都心区・人気郊外） |
| catalog tier `cat:1`（個別ページなし） | その他の山 | その他の自治体（基本情報のみ、SPA+404フォールバックで解決） |
| 数値スペック軸 | 標高 | **人口**（Wikidata由来・捏造不能な客観値。ソート・カタログ上限選定に使用） |
| 1–5 難易度/品質軸 | 登山難易度 | **データ整備度**（相場データ登録済み=高。主観評価は置かない。未整備=0） |
| **Sub-entity** | 登山ルート | **主要駅**（エリア内の駅。Wikidataソース）＋サンプルマンション（デモのみ） |
| **Ranking**（SEO主砲） | 百名山 | **査定サービスランキング**・「人口の多い市区町村」「東京23区エリア一覧」等の客観リスト |
| **Country/Region** | 国/山域 | **都道府県 / 地方**（北海道〜沖縄、8地方区分） |
| **Article** | 山の読み物190本 | **売却ノウハウ記事**（相続・離婚・住み替え・空き家・税金・ローン・任意売却…） |
| **People/Story**（権威コンテンツ） | 山を愛した人々 | **「日本の住まいの歴史」ストーリー**（同潤会アパート、ニュータウン史、名建築住宅…最厳格ファクト基準） |
| **Affiliate catalog** | 登山ギア | **査定・買取・リースバック・土地活用・ローン等の送客サービス**（ASP） |
| context-gating（`lv`） | 難易度でギア出し分け | **売却理由 × 物件種別**でサービス出し分け（相続→買取/士業、残債→任意売却系…） |
| チャットボット | 山コンシェルジュ | **AI売却相談**（ルールベース。価格・税務・法律の断定禁止、常時免責表示） |
| ログブック（localStorage） | 登頂記録 | **マイページ相当**（お気に入りエリア・診断結果保存・比較リスト） |

## 3. サイトマップ（元仕様 A〜O → Framework URL）

言語は **ja 単独で開始**（国内向けサービスのため）。ただしスキル標準の hreflang/LOCALES 構造は
保持し、`en` 追加を1設定で行えるようにする（仮定 §9-1）。

```
/                                  トップ（FV・目的別入口・特徴・エリア検索・査定比較・診断導線・記事・FAQ・最終CTA）
/sell/                             売却トップ（流れ・仲介vs買取・費用・税金・理由別ガイド導線）
/buy/                              購入トップ（流れ・注意点・ローン・諸費用。物件検索は「提携準備中」表示）
/sell/assessment/                  一括査定サービス比較（= Ranking + Affiliate の合体ページ）
/sell/assessment/<slug>/           査定サービス個別（メリデメ・対応物件/地域・PR表記・計測付き公式リンク）
/sell/purchase/  /sell/leaseback/  買取比較 / リースバック比較
/market/                           エリア相場DB トップ（47都道府県グリッド）
/market/<pref>/                    都道府県ハブ（= Country/Region ページ）
/market/<pref>/<city>/             市区町村ページ（= Entity 個別ページ。curated tier のみ静的生成）
                                   └ 種別タブ（マンション/戸建て/土地）はページ内セクション。
                                     独立URL化は相場データが種別別に揃った段階で（薄ページ回避）
/companies/                        不動産会社検索（デモデータ明示。直接掲載の営業が入り次第実データ化）
/professionals/                    士業・関連事業者（同上）
/guide/                            記事一覧（カテゴリ: sell/inheritance/divorce/vacant-house/tax/mortgage/relocation/story）
/guide/<slug>/                     記事個別（目次・著者・監修・出典・更新日・FAQ・JSON-LD・文脈CTA）
/tools/ai-sell-diagnosis/          AI売却診断（ルールベース）
/tools/selling-cost/               売却費用シミュレーター（純関数 + 単体テスト）
/tools/capital-gains-tax/          譲渡所得税 概算（税率は設定オブジェクトで外出し・「税務判断ではない」明記）
/tools/mortgage/                   住宅ローン返済シミュレーター
/about/ /editorial-policy/ /data-policy/ /advertising-policy/
/privacy/ /terms/ /disclaimer/ /contact/ /faq/ /sitemap/   固定ページ
404.html                           SPAフォールバック（catalog tier エリアの動的解決）
```

**SEO 4層構造の対応**：第1層=比較・ランキング（/sell/assessment/）、第2層=エリア×相場（/market/）、
第3層=悩み解決（/guide/）、第4層=ツール（/tools/）。
内部リンクの基本動線：**記事 → エリア相場 → 査定比較 → 送客**。各記事・エリアページは
カテゴリ/売却理由に応じたCTAを `data.js` の `ctaRules` で自動出し分けする。

## 4. `data.js` スキーマ（REALPORT 版）

```js
var DATA={
  areas:[...],        // ENTITY: 市区町村（curated + cat:1 カタログ）
  stations:[...],     // SUB-ENTITY: 主要駅
  services:[...],     // 査定/買取/リースバック等の送客サービス（= AF カタログの実体）
  rankings:[...],     // 比較・客観ランキング
  articles:[...],     // ノウハウ記事 + story
  prefectures:[...],  // = countries 相当（47件 + regions: 8地方区分）
  regions:[...],
  marketData:[...],   // 相場レコード（出典必須。未登録エリアは「データ準備中」）
  companies:[...],    // 不動産会社（デモ識別子必須）
  professionals:[...],// 士業（同上）
  faqs:[...], ctaRules:[...], siteSettings:{...}
};
```

主要レコード形：

```js
// areas[] — curated tier（個別静的ページあり）
{ id:"ar_shinjuku", slug:"shinjuku-ku", prefId:"pf_tokyo", regionId:"rg_kanto",
  population:346000,          // Wikidata由来。数値スペック軸
  lat:35.6938, lng:139.7034,
  dataLevel:2,                // 0=基本情報のみ 1=地価公示あり 2=取引相場あり（客観判定のみ）
  status:"published",
  translations:{ ja:{ name:"新宿区", summary:"…", sellNotes:"…" } } }

// areas[] — catalog tier（cat:1、SSGは if(a.cat) continue;）
{ id:"wd_q…", slug:"…", prefId:"pf_…", population:…, dataLevel:0,
  status:"published", cat:1, translations:{ ja:{name, summary} } }

// marketData[] — 架空相場の禁止をスキーマで強制
{ areaId:"ar_shinjuku", propertyType:"mansion", period:"2025",
  avgPrice:null, medianPrice:null, pricePerSqm:null, txCount:null,  // null=未登録（0や推定値で埋めない）
  sourceName:"国土交通省 不動産情報ライブラリ", sourceUrl:"https://…",
  sourceDate:"2026-06-30", updatedAt:"2026-07-27" }

// services[] — 送客サービス（AF_GEAR 相当）
{ id:"sv_demo1", slug:"demo-assessment-a", isDemo:true,           // ★デモ識別子必須
  kind:"assessment",           // assessment|purchase|leaseback|landuse|mortgage|pro
  affiliateUrl:"", trackingCode:"",                                // 空=リンク非表示（正直運用）
  partnerCount:null, ranking:1, isPR:true,
  gate:{ reasons:["inheritance","relocation"], propertyTypes:["mansion","house"] },  // 文脈ゲート
  translations:{ ja:{ name:"（デモ）査定サービスA", merits:"…", demerits:"…", target:"…" } } }

// articles[] — Mountain Peak と同形（category, authorName, supervisorName,
//   publishedAt(Date.UTC固定), factCheck, sources[], translations.ja.{title,metaDesc,body}）
//   body は artBody() マイクロ記法（## / ** / [img:path|クレジット] / --- / *note*）
```

規約：ID接頭辞 `ar_ st_ sv_ rk_ art_ pf_ rg_`。全レコード denormalize・文字列ID参照・
ランタイムjoinは `.find()` のみ。**一括登録は必ず `tools/register-*.mjs` 経由**（data.js手編集禁止）。
変更のたび `data.js?v=N` をバンプ（load-bearing rule #2）。

## 5. データソーシング（捏造ゼロの担保）

| データ | ソース | 方法 |
|---|---|---|
| 市区町村（名称・人口・座標・都道府県） | **Wikidata** | `tools/import-wikidata.mjs`。都道府県ごとの分割SPARQL（Q1907114/Q494721系クラス、`wdt:P1082` 人口）。LIMIT・リトライ・重複排除はスキル準拠 |
| 駅 | Wikidata | 同上（curated エリアのみ、主要駅に限定） |
| 相場・地価 | **国土交通省オープンデータ**（不動産情報ライブラリ / 地価公示） | 初期は手動CSV → `tools/import-market-csv.mjs`。出典名・出典URL・データ時点を必須カラムに。未接続エリアは「データ準備中」表示 |
| エリア概況テキスト | Wikipedia（要約・出典明記） | CC BY-SA 4.0 帰属表示をページ・llms.txt 両方に |
| **画像（全箇所）** | **Wikimedia Commons のみ** | 都市スカイライン・街並み・ランドマーク・住宅街写真。`tools/fetch-commons-images.mjs` でDL→目視検証→`images/areas/…`。キャプションに `Photo: <作者> / Wikimedia Commons, <ライセンス>` を必ず表示。PDはPD表記。**素材サイト・撮り下ろし・AI生成画像は使わない**（ユーザー指定） |
| ニュース | RSS ヘッドラインのみ | タイトル+ソース+外部リンクのみ。本文転載禁止 |
| 物件情報 | **転載しない** | 他社保有物件の無断掲載は行わない。購入セクションは「提携準備中」+ 正規API接続用アダプタの器だけ用意 |

## 6. ファクトポリシー（YMYL 全面適用）

不動産・税金・ローン・相続は YMYL。スキルの fact-policy を**そのまま全文適用**した上で、
REALPORT 固有の追加規則：

1. **架空相場の禁止**：`marketData` に推定値・それらしい数字を入れない。null は「データ準備中」
   として表示。実績数値（「数字で見るREALPORT」）も同様に「掲載準備中」表示で運用開始。
2. **価格・査定の断定禁止**：AI診断・シミュレーターは「一般的な参考情報であり正式な査定ではない」
   「価格・成約を保証しない」を結果画面に常時表示。
3. **税制・制度の数値は設定オブジェクトに外出し**し、`sourceUrl`（国税庁等）+ `asOf` 日付を持たせる。
   本文には「最新は公式サイトで確認」を必ず添える。仲介手数料は上限計算式（速算式）のみ扱う。
4. **デモデータの明示**：査定サービス・不動産会社・士業のダミーは `isDemo:true` + 表示名に
   「（デモ）」接頭辞 + ページ内に「サンプル掲載です」バナー。実在誤認を構造的に防ぐ。
5. **PR分離**：`isPR:true` のカードは PR バッジ + `rel="sponsored nofollow noopener"`。
   編集記事と広告枠を視覚的に分離。広告掲載方針ページ（/advertising-policy/）から全ルールに到達可能に。
6. **法令線引き**（サイト全体の免責 + フッター常設）：媒介・代理・交渉・価格保証・個別の税務法務
   判断は行わない送客型メディアであることを明記。宅建業免許を要する行為に踏み込む文言を書かない。
7. **記事の編集ステータス**：`status: draft|review|published|archived` + `factCheck:"reviewed"` で
   バッジ表示（reviewed のみ）。story 記事は `sources[]` 必須・文末ファクトノート必須。
8. **著者・監修**：`authorName`（編集部）+ `supervisorName`（監修者。実在者の許諾が取れるまでは
   「監修準備中」とし架空の専門家を作らない）。

## 7. アフィリエイトモジュール

```js
var AF_CONF={ ga4:"G-XXXX", prefix:{} };   // ASP計測プレフィックス。承認前は空＝リンク非表示
```

- Mountain Peak の `AF_GEAR` を `DATA.services` に統合（§4）。**ASP未承認の間は
  `affiliateUrl:""` → CTAボタン自体を出さない**（マーケットプレイス検索リンクで代替できる
  ギアと違い、査定ASPは実URLが無いと成立しないため。ここは参照実装からの意図的変更）。
- クリック計測：`afA()` 相当のリンクビルダーが GA4 `af_click` を送信
  （`service_id / source_page / campaign` パラメータ付き）。
- **文脈ゲート**：`service.gate`（売却理由×物件種別×都道府県）と、閲覧中ページの文脈
  （記事カテゴリ・エリア・診断回答）を突合して最適サービスを自動表示。
  例：相続記事 → 買取+司法書士系、残債記事 → 任意売却対応サービス。
- 収益モデル対応順：①査定ASP → ②買取/リースバック送客 → ③土地活用資料請求 →
  ④AdSense → ⑤直接掲載（companies/professionals の掲載枠）→ ⑥タイアップ記事（PR表記必須）。
- 開示：フッター + 各比較ページ冒頭に「本サイトはアフィリエイト広告を含みます」を常設。

## 8. SPA / SSG / SEO / LLMO

スキルの architecture.md / ssg-build.md 準拠。REALPORT 固有の設定のみ記す。

- **デザインシステム**（CSS変数、ダーク基調は参照実装と同型）：
  `--navy-950:#061724 --navy-900:#092235 --navy-800:#10344b --gold-500:#c5a15a
  --gold-400:#d4b46a --surface:#f6f7f8 --text:#18212a`。
  フォント：Noto Sans JP（本文）+ Noto Serif JP（見出し・英字ロゴ「REALPORT」）。
  モチーフ：港・航路・等高線・グリッド線の抽象SVG背景（軽量・パララックス禁止）。
  モバイルファースト。**レスポンシブ上書きは `<style>` 末尾**（rule #3）。
- ルーター：ハッシュ/パスルーター。新規描画関数・設定は `/* 初期化 */` より**上**に定義（rule #1）。
- チャットボット枠 → AI売却相談（ルールベース・免責常時表示）。ログブック枠 → マイページ相当。
- SSG 出力：curated エリア個別ページ（`cat:1` は除外、rule #6）、記事、比較、ツール、固定ページ。
  各ページに title/meta/canonical/OGP/パンくず。
- JSON-LD：Organization / WebSite+SearchAction / BreadcrumbList / Article /
  FAQPage / ItemList（比較・ランキング）/ **Dataset（/market/ 相場DB。出典・時点つき）** /
  Place（エリアページ）。
- LLMO：`llms.txt`（サイト要約 + 主要URL + データ出典 + CC BY-SA帰属）、AIクローラー許可の
  robots.txt、各ページ冒頭に引用可能な2〜3文の結論要約、FAQ、更新日、比較表。
- sitemap.xml / image-sitemap / RSS / 404.html / sw.js / manifest 自動生成。

## 9. 仮定（明示）— 後から変更しやすい設計で進める

1. **言語**：ja 単独で開始（国内サービス）。LOCALES 配列と translations 構造は ja/en 両対応で
   実装し、en 追加は翻訳投入のみで済むようにする。
2. **会員機能**：localStorage 実装で代替（元仕様 N 章のサーバー会員は PHASE 4 で
   fullstack-saas-builder 案件として再検討）。
3. **フォーム**：問い合わせ・メルマガは外部サービス接続前提。接続前は表示だけ用意し
   「準備中」を明示（架空の受付をしない）。
4. **査定サービス**：ASP承認が下りるまで全件 `isDemo:true`。比較UIとランキングの器を先に完成させる。
5. **ホスティング**：GitHub Pages（`realport` 用の新規リポジトリを推奨。MOFURI.HP 同居でも動くが
   ドメイン戦略上分離が望ましい）。
6. **物件検索（/buy/）**：正規データ提携まで実装しない。アダプタのインターフェース定義のみ置く。

## 10. 実装順序（スキル Build Order 準拠）

| # | フェーズ | 産出物 | 対応する元仕様PHASE |
|---|---|---|---|
| 1 | データモデル | `data.js` 初期版（47都道府県・8地方・記事カテゴリ・デモ査定サービス6件・FAQ・ctaRules） | PHASE 0 |
| 2 | SPA シェル | `index.html`（ネイビー×ゴールドDS、ルーター、i18n器、トップ/売却/購入/比較/記事/固定ページの全ビュー、AI診断、費用シミュレーター4種+単体テスト） | PHASE 1 |
| 3 | 実データ投入 | `tools/import-wikidata.mjs`（全国市区町村→catalog、主要150都市→curated候補）、Commons画像パイプライン、国交省CSVインポータ | PHASE 1–2 |
| 4 | ファクトポリシー適用 | 免責・PR表記・出典・更新日・「データ準備中」表示の全ページ監査 | PHASE 1（必須） |
| 5 | アフィリエイトモジュール | `AF_CONF`・afA()・af_click 計測・文脈ゲートCTA | PHASE 1–3 |
| 6 | SSG | `build.mjs`（全静的ページ・JSON-LD・sitemap・robots・llms.txt・404・sw.js） | PHASE 1 |
| 7 | デプロイ運用 | GitHub Pages ループ、`?v=N` バンプ手順、記事量産（register.mjs で10本→50本→…）、README | PHASE 1→2 |

検証ゲート（各フェーズ末）：プレビューで目視 → シミュレーター単体テスト green →
リンク切れゼロ → `data.js` パース検証 → デプロイ。一度に巨大な未検証コードを作らない。

---
*作成日: 2026-07-27 / このブリーフ自体が「後から変更しやすい設計」の一部。仮定が変わったら本ファイルを更新すること。*
