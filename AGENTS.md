<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

請求書の作成・管理を行う Web アプリ（invoice-manager）のエージェント向け作業ルール。
機能の仕様は `spec.md` が唯一の正とする。

## 技術スタック

- Next.js（App Router）+ React + TypeScript
- Tailwind CSS
- SQLite（better-sqlite3 + Drizzle ORM）
- Node.js のバージョンは mise（`mise.toml`）で管理する。`mise install` で揃えてから作業する
- フォーマット: Prettier / 静的解析: ESLint
- テスト: Vitest + Testing Library

## コマンド

| コマンド               | 用途                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run local`        | 最新 main を `.local-run/` で起動（データは `data/local/`、DB バックアップ 3 世代、ポート 3110〜） |
| `npm run dev`          | 開発サーバー起動                                                                                   |
| `npm run lint`         | ESLint（警告が1件でもあれば失敗）                                                                  |
| `npm run format`       | Prettier で整形                                                                                    |
| `npm run format:check` | Prettier の差分検査                                                                                |
| `npm test`             | Vitest でテスト実行                                                                                |
| `npm run test:watch`   | Vitest を監視モードで実行                                                                          |
| `npm run db:generate`  | スキーマからマイグレーションを生成                                                                 |
| `npm run build`        | 本番ビルド                                                                                         |

## ディレクトリ構成・コーディング規約

- Next.js 公式ドキュメント（`node_modules/next/dist/docs/` のバージョン一致版）の Project Structure・規約に従う。独自の構成を持ち込まない
- アプリのコードは `src/` 配下に置く。import は `@/*` エイリアス（`src/*`）を使う
  - `src/app/`: ルーティング（ページ・レイアウト）。特定のルートでしか使わないものは、そのルート配下の `_components/` などに置く
  - `src/components/`: 複数画面で使う UI。汎用部品（ボタン・入力欄・ラジオボタン・見出し等）は `src/components/ui/`
  - `src/db/`: DB 接続（`index.ts` の `getDb()`）とテーブル定義（`schema.ts`）
  - `src/lib/pdf/`: 請求書 PDF の生成（pdfkit）。文言の組み立て（`invoice-text.ts`）と描画（`render-invoice.ts`）を分け、文言はテストで spec.md 8 章と突き合わせる
  - `scripts/`: `npm run local` などの補助スクリプト（Node.js の `.mjs`）。`.local-run/` は `npm run local` が最新 main を取り出す専用フォルダで、lint・テスト・型チェックの対象外
  - `assets/fonts/`: PDF 用の日本語フォント（Noto Sans JP、OFL）。外部から取得しない
  - `src/lib/<機能>/`: 画面に依存しない処理。入力チェック（`validation.ts`）、DB 操作（`repository.ts`。`db` を引数で受け取りテストではインメモリ DB を渡す）、選択肢の表示名（`labels.ts`）など
  - Server Actions は各ルートの `actions.ts` に置き、入力チェックと DB 操作は `src/lib/` を呼ぶだけにする
- 外部通信をしない（spec.md PRE-1）。`next/font/google` や CDN など、実行時・ビルド時に外部へ取りに行くものを使わない
- Server Components を基本とし、状態やイベントが必要な箇所だけ `"use client"` にする
- データ更新は Server Actions / Route Handlers を使う。SQLite へのアクセスはサーバー側コードに閉じ、クライアントへ持ち込まない
- `cacheComponents` が有効なため、リクエスト時のデータ（`searchParams`・`params`・DB クエリ）を読むコンポーネントは `<Suspense>` で囲む。`usePathname()` も動的ルートでは Suspense が必要（サイドバーはフォールバック付きで囲み済み）
- `cacheComponents` では前に開いた画面が入力状態ごと残る（React の `<Activity>`）。編集フォームはデータの更新日時（`updatedAt`）を `key` にし、作成フォームなど開くたびにまっさらにしたいものは `ResetOnNavigation` で囲む
- Server Action でデータを変えたら `revalidatePath("/{一覧のパス}", "layout")` で配下の画面をまとめて再検証する
- フォーマットと静的解析のルールは Prettier / ESLint の設定で機械的に強制する。設定で表現できるルールは AGENTS.md に書かず設定ファイルに書く
- ルールを無効化するコメント（`eslint-disable` 等）は理由をコメントで添え、最小範囲にとどめる

## データベース（SQLite + Drizzle ORM）

- DB には `@/db` の `getDb()` で接続する（`server-only` 付き）
- テーブル定義を変えたら `npm run db:generate` でマイグレーション（`drizzle/`）を生成し、同じコミットに含める。生成済みのマイグレーションは手で書き換えない
- マイグレーションは `getDb()` で自動で適用される（開発サーバーを起動したまま追加しても、次の接続で適用される）。テストでは `@/db/test-utils` の `createTestDb()`（マイグレーション適用済みのインメモリ DB）を使う
- DB ファイルは `data/`（git 管理外）。開発は `data/invoice-manager.db`（環境変数 `DATABASE_PATH` で変更可）
- `npm run local`（普段使い）のデータは `data/local/`（`LOCAL_DATABASE_PATH` で変更可）。開発のデータと混ぜないため、`npm run local` は `DATABASE_PATH` を見ない
- `cacheComponents` が有効なため、better-sqlite3 の同期クエリはそのままだとビルド時にプリレンダーされる。リクエストごとに最新データを表示するページでは、クエリの前に `connection()`（`next/server`）を呼ぶ

## UI と文言

- UI コンポーネントは共通コンポーネント（ボタン、入力欄、テーブル、ダイアログ等）を作って再利用し、画面ごとに見た目や振る舞いをばらつかせない。`src/components/ui/` にあるものは必ずそれを使い、足りなければそこに追加する
- 一覧画面の操作は次の配置で統一する（アイコンは `lucide-react`、アイコンだけのボタンは `IconButton` / `IconLink` で操作名を `label` に渡す）
  - ページ見出しの右: 「作成」ボタン、その右にアーカイブ一覧への切り替え（アーカイブアイコンのみ。`ArchiveToggle`、`?view=archived`）
  - 一覧の各行の右端: 編集アイコンボタン、その右に縦三点リーダーのアイコンボタン（`ActionMenu`）。メニューには「アーカイブ」「削除」を入れる（請求書一覧は先頭に「コピー」も。`RowActions` の `copyAction`）。アーカイブ・削除がある一覧は `RowActions` を使う
  - アーカイブ一覧の各行: 編集アイコンは出さず、縦三点リーダーのメニューに「アーカイブを解除」「削除」を入れる
  - 元に戻せない操作（削除など）は `ActionMenuItem` の `confirmMessage` で確認してから実行する
  - 行の操作が失敗したとき（使用中で削除できない等）は、Server Action が `RowActionResult`（`{ error }`）を返し、`RowActions` がメッセージを表示する
- 入力欄は `TextField` / `SelectField` / `TextAreaField` / `RadioGroup` を使う（ラベル・注釈・エラーの関連付けは `Field` が行う）
- Server Action で送信するフォームの `SelectField` は `value` で固定しない。送信後に React がフォームをリセットすると選択が外れて見えるため、`defaultValue`（送信結果の値でフォームを作り直す）にし、`onChange` で state に反映する
- 必須項目は `required` を渡すと、ラベルの後ろに赤い `*` が付く（`RequiredMark`。読み上げでは「必須」）。「必須」の文字は表示しない
- 項目が多いフォームは `FormSection` でまとまり（例: 基本情報、振込先）に分ける
- フォーム全体に関わるエラー（例: 必須項目が足りず出力できない）は `FormMessage` で先頭に表示する
- 取り消せない重要な操作（台帳の削除など）は `TypedConfirmDialog` で決められた文字列（請求番号など）を入力させてから実行する
- 請求書の PDF 出力は、保存してプレビュー画面（`/invoices/[id]/preview`、PDF を `?inline=1` で埋め込み表示）を開き、ダウンロード・確定はそこで行う。埋め込みの iframe は前に開いた画面ごと残るため、URL と `key` に PDF の内容から作る `pdfVersion` を付け、内容が変わったら読み込み直させる。確定のように別画面へ移ってからダウンロードさせるときは、`?download=...` 付きの画面へリダイレクトして `AutoDownload` を表示する
- 作成・編集フォームの下部は `FormActions` を使う。入力欄の右端に揃え、左から「キャンセル」「作成」（作成画面）／「保存」（編集画面）の順に並べる。「新規作成」「新規登録」とは書かない
- 入力エラーは項目の下に表示し、入力欄に `aria-invalid` と `aria-describedby` で関連付ける（`TextField`・`RadioGroup` が対応済み）
- 入力チェックは項目ごとの関数（`src/lib/<機能>/validation.ts` の `validate{機能}Field(name, values)`）に書き、保存時（`parse...Form`）とフォーカスアウト時（`useBlurValidation` をフォームの `onBlur` に渡す）の両方で使う。ブラウザでも動くよう、サーバー専用のモジュールを import しない
- 文字数の上限は validation.ts の定数（例: `CLIENT_MAX_LENGTHS`）にまとめてチェックで使う。入力欄に `maxLength` は付けず（入力は止めない）、フォーカスアウトと保存時のエラーで知らせる。入力制限のある項目（spec.md 3.1。決まった文字・桁数だけ）だけ `TextField` の `inputFilter`（`@/lib/text-rules` の `digitsOnly` など）を使う
- 画面の文言は日本語で統一する。同じ概念には同じ用語を使う（例: 「取引先」「事業主」「請求書」「台帳」「確定」「アーカイブ」「作成」「保存」）。用語は `spec.md` に合わせ、新しい用語が必要なら spec.md に追記する
- ボタン・見出し・エラーメッセージの言い回し（「〜する」「〜を入力してください」等）も既存画面と揃える

## テスト

- 振る舞いを変える変更には自動テスト（Vitest + Testing Library）を必ず伴わせる
- テストは対象ファイルの隣に `*.test.ts` / `*.test.tsx` で置く
- `npm test` が通らない状態でコミットしない

## 仕様（spec.md）との整合

- 実装は `spec.md` と整合させる。作業前に関係する節を読み、作業後に食い違いがないか確認する
- 実装中に spec と食い違う点・曖昧な点が見つかったら、コードで勝手に解決せず相談する
- 仕様が変わる場合は `spec.md` も同じ変更で修正する

## 作業完了の条件

変更を完了とする前に、以下をすべて満たすこと。

- [ ] `npm run lint` / `npm run format:check` / `npm test` / `npm run build` がすべて成功する
- [ ] `spec.md` と実装が整合している
- [ ] `README.md`・`AGENTS.md` の更新要否を確認し、必要なら同じ変更（同じ PR）で更新した

## Git / PR

- `main` へ直接 push しない。ブランチを切って PR を作る
- コミットメッセージは短い日本語で書く（例: 「出力ボタンを追加」）
- 1 コミット 1 目的にする。フォーマットだけの変更は機能変更と別のコミットにする
