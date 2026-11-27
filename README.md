# invoice-manager

請求書の作成・管理を行う Web アプリ。自分のパソコンの中だけで動き、外部とは通信しません。

仕様は [spec.md](spec.md)、開発ルールは [AGENTS.md](AGENTS.md) を参照。

## 必要なもの

- [mise](https://mise.jdx.dev/)（Node.js のバージョン管理。使う Node.js は `mise.toml` で指定）

## はじめての準備

```sh
mise install   # mise.toml の Node.js をインストール
npm ci         # 依存パッケージをインストール
```

## 使う（ローカル実行）

```sh
npm run local
```

GitHub の **最新の main** を取り出して起動します。起動したら、表示された URL（通常は http://localhost:3110）をブラウザで開きます。終了するときはターミナルで `Ctrl + C` を押します。

起動のたびに次のことを行います。

1. origin/main の最新を、専用フォルダ `.local-run/` に取り出す（git worktree。今作業中のブランチや未コミットの変更には影響しない）
2. `package-lock.json` が変わっていれば依存パッケージを入れ直し、ビルドする
3. DB をバックアップする（下の「データの保存場所とバックアップ」）
4. 3110 番ポートで起動する。使われていれば 3111、3112… と空いている番号を使う

- このパソコンからだけ開けます（同じネットワークの他の端末からは開けません）
- 最初の起動は依存パッケージのインストールがあるため時間がかかります
- 始める番号を変えるときは `PORT=3200 npm run local`
- DB のテーブルの変更は起動後に自動で反映されます

### 基本的な流れ

1. **取引先** に請求先の会社を作成する（支払い期限・手数料負担・端数処理もここで設定）
2. **事業主** に自分の情報と振込先を作成する（データ印の PNG も登録できる）
3. **請求書** で取引先・事業主を選んで内容を入力する。途中で保存しておける
4. 請求書の「PDF出力」でプレビューを確認する
   - 「サンプル」: 透かし入りの PDF をダウンロード（`サンプル_請求書_{請求書番号}.pdf`）
   - 「確定する」にチェックして「発行」: 台帳に記録し、確定した PDF をダウンロード（`請求書_{請求書番号}.pdf`）
5. 発行した請求書は **台帳** にある。PDF の再ダウンロード、請求書へのコピー（作り直し用）、削除ができる
6. 取引先に送ったら、台帳の編集画面で「送信済み」にする。入金されたら「入金済み」にする（日付・送信ファイル・備考も記録できる）。送信済みの台帳は削除できない

一覧は列見出しを押すと並べ替えられ、上の欄でキーワード（台帳は取引先・請求日・状態も）で絞り込めます。

### データの保存場所とバックアップ

- `npm run local` のデータは `data/local/invoice-manager.db`（SQLite）に保存されます。git には含まれません
- 開発（`npm run dev`）のデータ `data/invoice-manager.db` とは別のファイルなので、開発中に試したデータが混ざることはありません
- `npm run local` で起動するたびに、`data/local/backups/invoice-manager-{日時}.db` にバックアップを取ります。新しいものから **3 世代** だけ残し、古いものは自動で削除します
- バックアップから戻すときは、アプリを終了してから、戻したいバックアップを `data/local/invoice-manager.db` に上書きコピーします（同じフォルダの `invoice-manager.db-wal` と `invoice-manager.db-shm` があれば削除してから）
- 手元で別の場所にも保管したいときは、アプリを終了してから `data/local/` フォルダごとコピーしてください
- 保存先を変えるときは環境変数 `LOCAL_DATABASE_PATH` で指定します（例: `LOCAL_DATABASE_PATH=~/Documents/invoice.db npm run local`）。開発用の `DATABASE_PATH` は `npm run local` では使いません

## 開発

```sh
npm run dev    # 開発サーバー（http://localhost:3000）
```

開発サーバーのデータは `data/invoice-manager.db`（環境変数 `DATABASE_PATH` で変更可）で、`npm run local` のデータとは分かれています。

| コマンド               | 用途                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run local`        | 最新 main をバックアップ付きで起動（このパソコンからのみ開ける） |
| `npm run dev`          | 開発サーバー起動                                                 |
| `npm run lint`         | ESLint                                                           |
| `npm run format`       | Prettier で整形                                                  |
| `npm run format:check` | Prettier の差分検査                                              |
| `npm test`             | テスト実行                                                       |
| `npm run db:generate`  | スキーマからマイグレーションを生成                               |
| `npm run build`        | 本番ビルド                                                       |

PR を作ると GitHub Actions で `lint` / `format:check` / `test` / `build` が実行されます。

## 技術スタック

Next.js（App Router）+ React + TypeScript / Tailwind CSS / SQLite（better-sqlite3 + Drizzle ORM）/ pdfkit / Vitest + Testing Library / Prettier / ESLint

PDF の日本語フォントとして Noto Sans JP（SIL Open Font License 1.1）を `assets/fonts/` に同梱しています。
