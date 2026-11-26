import "server-only";
import { createDb, DEFAULT_DATABASE_PATH, type Db } from "./create-db";

const globalForDb = globalThis as unknown as { db?: Db };

/** アプリ全体で共有する DB 接続。開発時のホットリロードで接続が増えないよう globalThis に保持する。 */
export function getDb(): Db {
  globalForDb.db ??= createDb(
    process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
  );
  return globalForDb.db;
}
