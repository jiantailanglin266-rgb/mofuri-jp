# REALPORT（リアルポート）

> 不動産の母港。売る・買う・住み替えの入口を、ひとつに。

不動産売却・購入・相場・査定サービス比較の**送客型情報ポータル**。
global-affiliate-site フレームワーク（単一SPA + SSG、ゼロ依存、静的ホスティング）で構築。
設計の全体像は [PROJECT-BRIEF.md](PROJECT-BRIEF.md) を参照。

## 構成ファイル

| ファイル | 役割 |
|---|---|
| `index.html` | SPA本体（デザイン・ルーター・全ビュー・診断UI）。SSGのテンプレートを兼ねる |
| `data.js` | 全データ（1行の `var DATA={...};`）。**手編集禁止** — 必ず tools 経由で生成 |
| `calc.js` | 計算ロジック（手数料・印紙税・譲渡税・ローン・診断ルール）。税率は `TAX_CONF` に集約 |
| `build.mjs` | SSG。全静的ページ + sitemap/robots/llms.txt/404/manifest/sw を生成 |
| `tools/gen-data.mjs` | data.js の生成元（エリア・記事・サービス等のマスターデータ） |
| `tools/register-articles.mjs` | 記事の一括追加 |
| `tools/fetch-commons-images.mjs` | Wikipedia/Wikimedia Commons 画像取得（クレジット付き） |
| `tools/import-market-csv.mjs` | （TODO・未実装）国交省オープンデータの相場CSVインポート |
| `tools/test.mjs` | 単体テスト（22件） |
| `tools/serve.mjs` | ローカルプレビューサーバー（SPAフォールバック付き） |

## 日常の運用手順

### 確認・開発

```bash
cd realport
node tools/test.mjs      # 1. テスト
node build.mjs           # 2. 静的ページ生成
node tools/serve.mjs     # 3. http://localhost:3210 で確認
```

### 記事を追加する

1. `tools/new-articles.mjs` を作成（書式は `tools/register-articles.mjs` 冒頭のSAMPLE参照）
2. `node tools/register-articles.mjs tools/new-articles.mjs`
3. `index.html` 内の `data.js?v=N` の N を +1（**必須** — キャッシュバスト）
4. `node build.mjs` → プレビュー確認 → デプロイ

### エリア・サービス等を変更する

1. `tools/gen-data.mjs` を編集
2. `node tools/gen-data.mjs`
3. `data.js?v=N` をバンプ → `node build.mjs` → 確認 → デプロイ

### 動画ライブラリを最新化する（/ja/videos/）

```bash
cd realport
node tools/fetch-youtube.mjs
node tools/gen-data.mjs
```

→ `data.js?v=N` をバンプ → `node build.mjs` → デプロイ。
公式チャンネル（国交省・国税庁・法務省・政府広報・UR・住宅金融支援機構・SUUMO・LIFULL HOME'S・三井のリハウス・東急リバブル）の最新12本ずつをRSSから再取得します。チャンネルの追加は `tools/fetch-youtube.mjs` の ORGS に1行足すだけ（検索クエリ＋名称照合で公式を自動解決）。

### 税率・制度の改正時

1. `calc.js` の `TAX_CONF` を更新（`asOf` の基準日も更新）
2. `node tools/test.mjs` で期待値を更新・確認
3. 該当記事の本文・出典を見直し → ビルド → デプロイ

### デプロイ（GitHub Pages）

```bash
git add realport && git commit -m "realport: <変更内容>" && git push
```

公開URL: `https://jiantailanglin266-rgb.github.io/mofuri-jp/realport/ja/`
（push が拒否されたら `git pull --rebase` してから再 push）

## ASP登録の手順（ユーザー本人の作業）

アカウント作成・ログインを伴うため、以下はサイト運営者本人が行ってください。

1. ASPに登録する（不動産一括査定案件が多い主要ASP: A8.net / afb / アクセストレード / バリューコマース）。登録時にサイトURL `https://jiantailanglin266-rgb.github.io/mofuri-jp/realport/ja/` を申請
2. サイト審査を通過したら「不動産 査定」「不動産 買取」「リースバック」「土地活用」等で案件を検索し、提携申請
3. 提携承認後、**アフィリエイトリンクURL**を取得（ASP管理画面の「広告リンク」からURLのみコピー）
4. 取得したURLを Claude に渡す → `gen-data.mjs` の該当サービスを実サービス情報へ差し替え（下記「ASP提携が決まったら」参照）

※審査時は「広告掲載ポリシー」「運営者情報」ページの存在が見られることが多いです（実装済み）。
※デモ表示のままでは収益は発生しません。

## 不動産情報ライブラリ APIキーの取得（ユーザー本人の作業）→ 成約価格データ投入

1. https://www.reinfolib.mlit.go.jp/api/request/ を開く
2. 利用者情報を入力（利用者種別は「個人」でOK。利用目的は「不動産情報サイトでのエリア別成約価格の統計表示」等）
3. 利用約款に同意して申請（**承認まで約5営業日**。承認メールが届くまで待つ。迷惑メールフォルダも確認）
4. 届いたAPIキーを `realport/tools/.reinfolib-key` に保存（git管理外）するか、Claude に渡す
5. あとは Claude が実行:

```bash
cd realport && node tools/import-seiyaku.mjs && node tools/gen-data.mjs
```

（データ検証 → `data.js?v=N` バンプ → build → デプロイまで実施。18エリア×マンション/戸建て/土地の
成約価格の平均・中央値・㎡単価・件数が、地価公示の下に出典付きで表示されます。
件数5件未満の集計は統計として不安定なため自動で掲載をスキップします）

## Google Search Console 登録の手順（ユーザー本人の作業）

1. https://search.google.com/search-console にGoogleアカウントでログイン
2. 「プロパティを追加」→「URLプレフィックス」に `https://jiantailanglin266-rgb.github.io/mofuri-jp/realport/` を入力
3. 所有権の確認方法で「HTMLタグ」を選び、表示された `<meta name="google-site-verification" content="...">` タグを **Claude に渡す**（index.html への追記とビルド・デプロイは Claude が実施）
4. 確認完了後、「サイトマップ」メニューで `sitemap.xml` を送信（フルURL: `https://jiantailanglin266-rgb.github.io/mofuri-jp/realport/sitemap.xml`）
5. 数日〜数週間でインデックス状況・検索クエリが見られるようになります

※GA4を使う場合も同様に、測定ID（`G-XXXXXXX`）を取得して Claude に渡せば接続します（`af_click`・`diagnosis_complete`・`tool_complete` イベントは実装済み）。

## ASP提携が決まったら（収益化ON）

1. `tools/gen-data.mjs` の該当サービスを実サービス情報に書き換え、`isDemo:true` を外し、名前の「（デモ）」を削除
2. `affiliateUrl` に計測付きリンクを設定 → CTAボタンが自動で表示される（`rel="sponsored nofollow noopener"` は自動付与）
3. `advertising-policy` の「現在の状態」文言を更新（`index.html` 内 PAGES）
4. `gen-data → v=N バンプ → build → 確認 → デプロイ`

## 相場データを載せるとき（重要ルール）

- 出典は公的データのみ（国土交通省 不動産情報ライブラリ / 地価公示）
- `marketData` レコードに `sourceName / sourceUrl / sourceDate` が無い価格は掲載しない（テストで検証される）
- 未登録エリアは自動で「データ準備中」表示になる。**推定値で埋めない**

## GA4 を接続するとき

`index.html` の `</head>` 直前に gtag スニペットを追加するだけ。
`af_click` / `diagnosis_complete` / `tool_complete` イベントは実装済みで、gtag があれば自動送信される。

## 重要な決まりごと（フレームワークのルール）

1. `data.js` 変更のたびに `index.html` の `data.js?v=N` をバンプ
2. 新しい関数・設定は `index.html` の `/* ====== 初期化 ====== */` より**上**に定義
3. モバイルCSSは `<style>` の**末尾**の media ブロックに追記
4. 架空の相場・実績・監修者を作らない（未整備は「準備中」表示）
5. 広告リンクは `rel="sponsored nofollow noopener"` + PR表記（svcCard が自動処理）
6. デプロイ前に必ず `node tools/test.mjs && node build.mjs`

## 今後のロードマップ（PROJECT-BRIEF §10）

- **PHASE 2**: Wikidata全国市区町村インポート（catalog層 `cat:1`）、国交省CSV相場投入、記事量産（50本→）
- **PHASE 3**: ASP実提携・直接掲載（companies/professionals 実データ化）、GA4接続
- **PHASE 4**: 独自ドメイン・単独リポジトリ移行（`build.mjs` の `SITE` 変更のみ）、en ロケール追加

## トラブルシューティング

- **変更が反映されない** → `data.js?v=N` のバンプ忘れが9割。次にブラウザのハード再読み込み
- **ページが真っ暗/白** → DevTools Console を確認。`data.js` のパースエラーなら `node tools/gen-data.mjs` を再実行
- **build.mjs がエラー** → `data.js` が1行形式か、`index.html` の `<main><div class="wrap" id="app"></div></main>` が変形していないか確認
- **git push 拒否** → `git pull --rebase` してから再 push
