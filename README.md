# invoice-manager

請求書の作成・管理を行う Web アプリ。仕様は [spec.md](spec.md)、開発ルールは [AGENTS.md](AGENTS.md) を参照。

## 技術スタック

Next.js（App Router）+ React + TypeScript / Tailwind CSS / SQLite（better-sqlite3 + Drizzle ORM）/ Vitest + Testing Library / Prettier / ESLint

## セットアップ

```sh
mise install   # mise.toml の Node.js をインストール
npm install
npm run dev    # http://localhost:3000（初回アクセス時に data/invoice-manager.db を作成）
```

## 主なコマンド

| コマンド               | 用途                               |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | 開発サーバー起動                   |
| `npm run lint`         | ESLint                             |
| `npm run format`       | Prettier で整形                    |
| `npm run format:check` | Prettier の差分検査                |
| `npm test`             | テスト実行                         |
| `npm run db:generate`  | スキーマからマイグレーションを生成 |
| `npm run build`        | 本番ビルド                         |
