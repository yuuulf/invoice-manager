import { sql } from "drizzle-orm";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { createDb } from "./create-db";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("インメモリ DB に接続してクエリを実行できる", () => {
  const db = createDb(":memory:");
  expect(db.get<{ one: number }>(sql`select 1 as one`)).toEqual({ one: 1 });
});

test("外部キー制約が有効になっている", () => {
  const db = createDb(":memory:");
  expect(db.get<{ foreign_keys: number }>(sql`pragma foreign_keys`)).toEqual({
    foreign_keys: 1,
  });
});

test("保存先ディレクトリがなければ作成する", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "invoice-manager-"));
  tempDirs.push(dir);
  const db = createDb(path.join(dir, "nested", "test.db"));
  expect(db.get<{ one: number }>(sql`select 1 as one`)).toEqual({ one: 1 });
});
