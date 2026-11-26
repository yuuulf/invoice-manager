import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export const DEFAULT_DATABASE_PATH = "data/invoice-manager.db";

export function createDb(filename: string) {
  if (filename !== ":memory:") {
    mkdirSync(path.dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle({ client: sqlite, schema });
}

export type Db = ReturnType<typeof createDb>;
