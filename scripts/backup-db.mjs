import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const PREFIX = "invoice-manager-";
const SUFFIX = ".db";

function pad(n) {
  return String(n).padStart(2, "0");
}

/** バックアップのファイル名（例: invoice-manager-20261127-093000.db）。名前順が日時順になる */
export function backupFileName(date) {
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `${PREFIX}${stamp}${SUFFIX}`;
}

/** バックアップフォルダにあるバックアップ（古い順） */
export function listBackups(backupDir) {
  if (!existsSync(backupDir)) return [];
  return readdirSync(backupDir)
    .filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
    .sort();
}

/**
 * DB をバックアップし、新しいものから keep 個だけ残す。DB がまだなければ何もしない。
 * SQLite のバックアップ機能を使うため、-wal に書き込み途中のデータも含めて整合した状態で保存できる。
 * @param {{ databasePath: string, backupDir: string, keep: number, Database: any, now?: Date }} options
 * @returns {Promise<{ created: string | null, removed: string[] }>}
 */
export async function backupDatabase({
  databasePath,
  backupDir,
  keep,
  Database,
  now = new Date(),
}) {
  if (!existsSync(databasePath)) return { created: null, removed: [] };

  mkdirSync(backupDir, { recursive: true });
  const created = path.join(backupDir, backupFileName(now));
  const db = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    await db.backup(created);
  } finally {
    db.close();
  }

  const backups = listBackups(backupDir);
  const removed = backups.slice(0, Math.max(0, backups.length - keep));
  for (const name of removed) rmSync(path.join(backupDir, name));
  return { created, removed };
}
