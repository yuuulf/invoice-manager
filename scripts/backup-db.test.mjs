// @vitest-environment node
import Database from "better-sqlite3";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { backupDatabase, backupFileName, listBackups } from "./backup-db.mjs";

const dirs = [];

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), "invoice-backup-"));
  dirs.push(dir);
  const databasePath = path.join(dir, "data", "invoice-manager.db");
  return { dir, databasePath, backupDir: path.join(dir, "data", "backups") };
}

function createDb(databasePath, rows) {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.exec("create table t (v text)");
  for (const v of rows) db.prepare("insert into t values (?)").run(v);
  return db; // 開いたまま（WAL に書き込み途中のデータがある状態）
}

const at = (minute) => new Date(2026, 10, 27, 9, minute, 0);

test("ファイル名は日時入りで、名前順が日時順になる", () => {
  expect(backupFileName(new Date(2026, 0, 5, 3, 4, 5))).toBe(
    "invoice-manager-20260105-030405.db",
  );
});

test("DB がまだなければ何もしない", async () => {
  const { databasePath, backupDir } = setup();
  expect(
    await backupDatabase({ databasePath, backupDir, keep: 3, Database }),
  ).toEqual({ created: null, removed: [] });
  expect(listBackups(backupDir)).toEqual([]);
});

test("書き込み途中のデータも含めてバックアップする", async () => {
  const { databasePath, backupDir } = setup();
  const live = createDb(databasePath, ["a", "b"]);
  const { created } = await backupDatabase({
    databasePath,
    backupDir,
    keep: 3,
    Database,
    now: at(0),
  });
  live.close();
  const copy = new Database(created, { readonly: true });
  expect(copy.prepare("select v from t").all()).toEqual([
    { v: "a" },
    { v: "b" },
  ]);
  copy.close();
});

test("新しいものから3世代だけ残し、古いものは削除する", async () => {
  const { databasePath, backupDir } = setup();
  createDb(databasePath, ["a"]).close();
  const removed = [];
  for (const minute of [0, 1, 2, 3, 4]) {
    const result = await backupDatabase({
      databasePath,
      backupDir,
      keep: 3,
      Database,
      now: at(minute),
    });
    removed.push(...result.removed);
  }
  expect(listBackups(backupDir)).toEqual([
    "invoice-manager-20261127-090200.db",
    "invoice-manager-20261127-090300.db",
    "invoice-manager-20261127-090400.db",
  ]);
  expect(removed).toEqual([
    "invoice-manager-20261127-090000.db",
    "invoice-manager-20261127-090100.db",
  ]);
});
