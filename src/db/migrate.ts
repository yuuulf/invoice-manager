import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Db } from "./create-db";

export const MIGRATIONS_FOLDER = "drizzle";

function journalPath(migrationsFolder: string) {
  return path.join(migrationsFolder, "meta", "_journal.json");
}

/** 未適用のマイグレーションを適用する。マイグレーションがまだ 1 つもなければ何もしない。 */
export function runMigrations(db: Db, migrationsFolder = MIGRATIONS_FOLDER) {
  if (!existsSync(journalPath(migrationsFolder))) {
    return;
  }
  migrate(db, { migrationsFolder });
}

/**
 * マイグレーションの一覧（_journal.json）が前回から変わっていれば適用する。
 * 開発サーバーを起動したままマイグレーションが追加されても、再起動せずに適用するため。
 * @returns 今回の一覧の内容。次回の呼び出しで previous として渡す
 */
export function runMigrationsIfChanged(
  db: Db,
  previous: string | undefined,
  migrationsFolder = MIGRATIONS_FOLDER,
): string | undefined {
  const file = journalPath(migrationsFolder);
  const current = existsSync(file) ? readFileSync(file, "utf8") : undefined;
  if (current !== previous) runMigrations(db, migrationsFolder);
  return current;
}
