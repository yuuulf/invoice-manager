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

| コマンド               | 用途                               |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | 開発サーバー起動                   |
| `npm run lint`         | ESLint（警告が1件でもあれば失敗）  |
| `npm run format`       | Prettier で整形                    |
| `npm run format:check` | Prettier の差分検査                |
| `npm test`             | Vitest でテスト実行                |
| `npm run test:watch`   | Vitest を監視モードで実行          |
| `npm run db:generate`  | スキーマからマイグレーションを生成 |
| `npm run build`        | 本番ビルド                         |

## ディレクトリ構成・コーディング規約

- Next.js 公式ドキュメント（`node_modules/next/dist/docs/` のバージョン一致版）の Project Structure・規約に従う。独自の構成を持ち込まない
- アプリのコードは `src/` 配下に置く。import は `@/*` エイリアス（`src/*`）を使う
  - `src/app/`: ルーティング（ページ・レイアウト）。特定のルートでしか使わないものは、そのルート配下の `_components/` などに置く
  - `src/components/`: 複数画面で使う UI。汎用部品（ボタン・入力欄・ラジオボタン・見出し等）は `src/components/ui/`
  - `src/db/`: DB 接続（`index.ts` の `getDb()`）とテーブル定義（`schema.ts`）
  - `src/lib/<機能>/`: 画面に依存しない処理。入力チェック（`validation.ts`）、DB 操作（`repository.ts`。`db` を引数で受け取りテストではインメモリ DB を渡す）、選択肢の表示名（`labels.ts`）など
  - Server Actions は各ルートの `actions.ts` に置き、入力チェックと DB 操作は `src/lib/` を呼ぶだけにする
- 外部通信をしない（spec.md PRE-1）。`next/font/google` や CDN など、実行時・ビルド時に外部へ取りに行くものを使わない
- Server Components を基本とし、状態やイベントが必要な箇所だけ `"use client"` にする
- データ更新は Server Actions / Route Handlers を使う。SQLite へのアクセスはサーバー側コードに閉じ、クライアントへ持ち込まない
- `cacheComponents` が有効なため、リクエスト時のデータ（`searchParams`・`params`・DB クエリ）を読むコンポーネントは `<Suspense>` で囲む。`usePathname()` も動的ルートでは Suspense が必要（サイドバーはフォールバック付きで囲み済み）
- フォーマットと静的解析のルールは Prettier / ESLint の設定で機械的に強制する。設定で表現できるルールは AGENTS.md に書かず設定ファイルに書く
- ルールを無効化するコメント（`eslint-disable` 等）は理由をコメントで添え、最小範囲にとどめる

## データベース（SQLite + Drizzle ORM）

- DB には `@/db` の `getDb()` で接続する（`server-only` 付き）
- テーブル定義を変えたら `npm run db:generate` でマイグレーション（`drizzle/`）を生成し、同じコミットに含める。生成済みのマイグレーションは手で書き換えない
- マイグレーションは `getDb()` の初回接続時に自動で適用される。テストでは `@/db/test-utils` の `createTestDb()`（マイグレーション適用済みのインメモリ DB）を使う
- DB ファイルは `data/`（git 管理外）。保存先は環境変数 `DATABASE_PATH` で変更できる
- `cacheComponents` が有効なため、better-sqlite3 の同期クエリはそのままだとビルド時にプリレンダーされる。リクエストごとに最新データを表示するページでは、クエリの前に `connection()`（`next/server`）を呼ぶ

## UI と文言

- UI コンポーネントは共通コンポーネント（ボタン、入力欄、テーブル、ダイアログ等）を作って再利用し、画面ごとに見た目や振る舞いをばらつかせない。`src/components/ui/` にあるものは必ずそれを使い、足りなければそこに追加する
- 一覧画面の操作は次の配置で統一する（アイコンは `lucide-react`、アイコンだけのボタンは `IconButton` / `IconLink` で操作名を `label` に渡す）
  - ページ見出しの右: 「作成」ボタン、その右にアーカイブ一覧への切り替え（アーカイブアイコンのみ。`ArchiveToggle`、`?view=archived`）
  - 一覧の各行の右端: 編集アイコンボタン、その右に縦三点リーダーのアイコンボタン（`ActionMenu`）。メニューには「アーカイブ」「削除」を入れる。アーカイブ・削除がある一覧は `RowActions` を使う
  - アーカイブ一覧の各行: 編集アイコンは出さず、縦三点リーダーのメニューに「アーカイブを解除」「削除」を入れる
  - 元に戻せない操作（削除など）は `ActionMenuItem` の `confirmMessage` で確認してから実行する
- 項目が多いフォームは `FormSection` でまとまり（例: 基本情報、振込先）に分ける
- 作成・編集フォームの下部は `FormActions` を使う。入力欄の右端に揃え、左から「キャンセル」「作成」（作成画面）／「保存」（編集画面）の順に並べる。「新規作成」「新規登録」とは書かない
- 入力エラーは項目の下に表示し、入力欄に `aria-invalid` と `aria-describedby` で関連付ける（`TextField`・`RadioGroup` が対応済み）
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
