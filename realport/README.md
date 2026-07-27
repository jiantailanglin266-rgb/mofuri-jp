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
