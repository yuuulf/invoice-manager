import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Db } from "./create-db";

export const MIGRATIONS_FOLDER = "drizzle";

/** 未適用のマイグレーションを適用する。マイグレーションがまだ 1 つもなければ何もしない。 */
export function runMigrations(db: Db, migrationsFolder = MIGRATIONS_FOLDER) {
  if (!existsSync(path.join(migrationsFolder, "meta", "_journal.json"))) {
    return;
  }
  migrate(db, { migrationsFolder });
}
