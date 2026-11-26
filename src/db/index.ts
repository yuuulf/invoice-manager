import "server-only";
import { createDb, DEFAULT_DATABASE_PATH, type Db } from "./create-db";
import { runMigrationsIfChanged } from "./migrate";

const globalForDb = globalThis as unknown as {
  db?: Db;
  /** 最後に適用したときのマイグレーション一覧 */
  migratedJournal?: string;
};

/**
 * アプリ全体で共有する DB 接続。未適用のマイグレーションがあれば適用する。
 * 開発時のホットリロードで接続が増えないよう globalThis に保持する。
 */
export function getDb(): Db {
  globalForDb.db ??= createDb(
    process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
  );
  globalForDb.migratedJournal = runMigrationsIfChanged(
    globalForDb.db,
    globalForDb.migratedJournal,
  );
  return globalForDb.db;
}
