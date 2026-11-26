import { sql } from "drizzle-orm";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb } from "./create-db";
import { runMigrations } from "./migrate";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeMigrationsFolder() {
  const dir = mkdtempSync(path.join(tmpdir(), "invoice-manager-migrations-"));
  tempDirs.push(dir);
  return dir;
}

test("マイグレーションがなければ何もしない", () => {
  const db = createDb(":memory:");
  expect(() => runMigrations(db, makeMigrationsFolder())).not.toThrow();
});

test("未適用のマイグレーションを適用する", () => {
  const dir = makeMigrationsFolder();
  mkdirSync(path.join(dir, "meta"));
  writeFileSync(
    path.join(dir, "meta", "_journal.json"),
    JSON.stringify({
      version: "7",
      dialect: "sqlite",
      entries: [
        {
          idx: 0,
          version: "6",
          when: 1700000000000,
          tag: "0000_init",
          breakpoints: true,
        },
      ],
    }),
  );
  writeFileSync(
    path.join(dir, "0000_init.sql"),
    "CREATE TABLE `sample` (`id` integer PRIMARY KEY NOT NULL);",
  );
  const db = createDb(":memory:");

  runMigrations(db, dir);
  runMigrations(db, dir);

  expect(
    db.all(
      sql`select name from sqlite_master where type = 'table' and name = 'sample'`,
    ),
  ).toEqual([{ name: "sample" }]);
});
