import "server-only";
import { createDb, DEFAULT_DATABASE_PATH, type Db } from "./create-db";
import { runMigrations } from "./migrate";

const globalForDb = globalThis as unknown as { db?: Db };

/**
 * アプリ全体で共有する DB 接続。初回接続時に未適用のマイグレーションを適用する。
 * 開発時のホットリロードで接続が増えないよう globalThis に保持する。
 */
export function getDb(): Db {
  if (!globalForDb.db) {
    const db = createDb(process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH);
    runMigrations(db);
    globalForDb.db = db;
  }
  return globalForDb.db;
}
