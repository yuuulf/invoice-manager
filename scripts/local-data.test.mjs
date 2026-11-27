// @vitest-environment node
import path from "node:path";
import { expect, test } from "vitest";
import { localBackupDir, localDatabasePath } from "./local-data.mjs";

const repoRoot = path.resolve("/repo");

test("既定では data/local/ に置き、開発用の data/invoice-manager.db とは分ける", () => {
  expect(localDatabasePath(repoRoot, {})).toBe(
    path.join(repoRoot, "data", "local", "invoice-manager.db"),
  );
});

test("開発用の DATABASE_PATH は使わない", () => {
  expect(
    localDatabasePath(repoRoot, { DATABASE_PATH: "data/invoice-manager.db" }),
  ).toBe(path.join(repoRoot, "data", "local", "invoice-manager.db"));
});

test("LOCAL_DATABASE_PATH で変えられる（相対パスはリポジトリから）", () => {
  expect(localDatabasePath(repoRoot, { LOCAL_DATABASE_PATH: "my/a.db" })).toBe(
    path.join(repoRoot, "my", "a.db"),
  );
  const absolute = path.resolve("/somewhere/b.db");
  expect(localDatabasePath(repoRoot, { LOCAL_DATABASE_PATH: absolute })).toBe(
    absolute,
  );
});

test("バックアップは DB と同じフォルダの backups/ に置く", () => {
  const db = path.join(repoRoot, "data", "local", "invoice-manager.db");
  expect(localBackupDir(db)).toBe(
    path.join(repoRoot, "data", "local", "backups"),
  );
});
