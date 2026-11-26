import { createDb } from "./create-db";
import { runMigrations } from "./migrate";

/** テスト用: マイグレーション適用済みのインメモリ DB を作る */
export function createTestDb() {
  const db = createDb(":memory:");
  runMigrations(db);
  return db;
}
