import { sql } from "drizzle-orm";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb } from "./create-db";
import { runMigrations, runMigrationsIfChanged } from "./migrate";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function writeMigrations(dir: string, tables: string[]) {
  mkdirSync(path.join(dir, "meta"), { recursive: true });
  writeFileSync(
    path.join(dir, "meta", "_journal.json"),
    JSON.stringify({
      version: "7",
      dialect: "sqlite",
      entries: tables.map((table, idx) => ({
        idx,
        version: "6",
        when: 1700000000000 + idx,
        tag: `000${idx}_${table}`,
        breakpoints: true,
      })),
    }),
  );
  tables.forEach((table, idx) =>
    writeFileSync(
      path.join(dir, `000${idx}_${table}.sql`),
      `CREATE TABLE \`${table}\` (\`id\` integer PRIMARY KEY NOT NULL);`,
    ),
  );
}

function tableNames(db: ReturnType<typeof createDb>) {
  return db
    .all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' and name not like '%migrations' order by name`,
    )
    .map((row) => row.name);
}

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

test("接続したあとにマイグレーションが追加されても、一覧が変われば適用する", () => {
  const dir = makeMigrationsFolder();
  writeMigrations(dir, ["first"]);
  const db = createDb(":memory:");

  let journal = runMigrationsIfChanged(db, undefined, dir);
  expect(tableNames(db)).toEqual(["first"]);

  // 開発サーバーを起動したまま新しいマイグレーションを追加した
  writeMigrations(dir, ["first", "second"]);
  journal = runMigrationsIfChanged(db, journal, dir);
  expect(tableNames(db)).toEqual(["first", "second"]);

  // 一覧が変わっていなければ何もしない
  expect(runMigrationsIfChanged(db, journal, dir)).toBe(journal);
});

test("マイグレーションがなければ何もしない（runMigrationsIfChanged）", () => {
  const db = createDb(":memory:");
  expect(
    runMigrationsIfChanged(db, undefined, makeMigrationsFolder()),
  ).toBeUndefined();
});
