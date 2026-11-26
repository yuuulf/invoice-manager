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
- SQLite
- Node.js のバージョンは mise（`mise.toml`）で管理する。`mise install` で揃えてから作業する
- フォーマット: Prettier / 静的解析: ESLint
- テスト: Vitest + Testing Library

## コマンド

| コマンド               | 用途                 |
| ---------------------- | -------------------- |
| `npm run dev`          | 開発サーバー起動     |
| `npm run lint`         | ESLint               |
| `npm run format`       | Prettier で整形      |
| `npm run format:check` | Prettier の差分検査  |
| `npm test`             | Vitest でテスト実行  |
| `npm run build`        | 本番ビルド           |

## ディレクトリ構成・コーディング規約

- Next.js 公式ドキュメント（`node_modules/next/dist/docs/` のバージョン一致版）の Project Structure・規約に従う。独自の構成を持ち込まない
- Server Components を基本とし、状態やイベントが必要な箇所だけ `"use client"` にする
- データ更新は Server Actions / Route Handlers を使う。SQLite へのアクセスはサーバー側コードに閉じ、クライアントへ持ち込まない
- フォーマットと静的解析のルールは Prettier / ESLint の設定で機械的に強制する。設定で表現できるルールは AGENTS.md に書かず設定ファイルに書く
- ルールを無効化するコメント（`eslint-disable` 等）は理由をコメントで添え、最小範囲にとどめる

## UI と文言

- UI コンポーネントは共通コンポーネント（ボタン、入力欄、テーブル、ダイアログ等）を作って再利用し、画面ごとに見た目や振る舞いをばらつかせない
- 画面の文言は日本語で統一する。同じ概念には同じ用語を使う（例: 「取引先」「事業主」「請求書」「台帳」「確定」「アーカイブ」）。用語は `spec.md` に合わせ、新しい用語が必要なら spec.md に追記する
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
