// ローカルで使うための起動スクリプト（npm run local）。
// 作業中のブランチに影響しないよう、専用フォルダ（.local-run/、git worktree）に
// origin/main の最新を取り出してビルドし、このパソコンからだけ開けるように起動する。
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { backupDatabase } from "./backup-db.mjs";
import { findFreePort } from "./free-port.mjs";
import { localBackupDir, localDatabasePath } from "./local-data.mjs";

const PREFERRED_PORT = 3110;
const HOST = "127.0.0.1";
/** 起動時に取る DB バックアップの保持数 */
const BACKUP_GENERATIONS = 3;

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...options }).trim();
}

// git worktree の中から実行されても、元のリポジトリを基準にする
const repoRoot = path.dirname(
  git(["rev-parse", "--path-format=absolute", "--git-common-dir"]),
);
const runDir = path.join(repoRoot, ".local-run");

console.log("▶ origin/main の最新を取得しています…");
run("git", ["fetch", "origin", "main"], { cwd: repoRoot });

if (existsSync(runDir)) {
  // 専用フォルダは利用者が編集しない前提なので、強制的に最新へそろえる
  git(["checkout", "--detach", "--force", "origin/main"], { cwd: runDir });
} else {
  git(["worktree", "add", "--detach", runDir, "origin/main"], {
    cwd: repoRoot,
  });
}
console.log(`  main: ${git(["log", "-1", "--format=%h %s"], { cwd: runDir })}`);

// package-lock.json が変わったときだけ依存を入れ直す
const lockHash = createHash("sha256")
  .update(readFileSync(path.join(runDir, "package-lock.json")))
  .digest("hex");
const installedHashFile = path.join(runDir, "node_modules", ".lock-hash");
const installedHash = existsSync(installedHashFile)
  ? readFileSync(installedHashFile, "utf8")
  : null;
if (installedHash !== lockHash) {
  console.log("▶ 依存パッケージをインストールしています…");
  run("npm", ["ci"], { cwd: runDir });
  writeFileSync(installedHashFile, lockHash);
}

console.log("▶ ビルドしています…");
run("npx", ["next", "build"], { cwd: runDir });

const port = await findFreePort(Number(process.env.PORT) || PREFERRED_PORT, {
  host: HOST,
});
// データは専用フォルダではなく元のリポジトリの data/local/ に置き、開発用のデータと分ける
const databasePath = localDatabasePath(repoRoot);

// 起動する前に DB をバックアップし、新しいものから3世代だけ残す
const backupDir = localBackupDir(databasePath);
const Database = createRequire(path.join(runDir, "package.json"))(
  "better-sqlite3",
);
const backup = await backupDatabase({
  databasePath,
  backupDir,
  keep: BACKUP_GENERATIONS,
  Database,
});
if (backup.created) {
  console.log(`▶ DB をバックアップしました: ${backup.created}`);
  for (const name of backup.removed)
    console.log(`  古いバックアップを削除: ${name}`);
}

console.log("");
console.log(`▶ 起動します: http://localhost:${port}`);
console.log(`  データ: ${databasePath}`);
console.log("  終了するには Ctrl + C");
console.log("");

const server = spawn(
  "npx",
  ["next", "start", "--hostname", HOST, "--port", String(port)],
  {
    cwd: runDir,
    stdio: "inherit",
    env: { ...process.env, DATABASE_PATH: databasePath },
  },
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
