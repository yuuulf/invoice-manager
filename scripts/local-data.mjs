// npm run local（普段使い）のデータの置き場所。
// 開発（npm run dev、DATABASE_PATH）のデータと混ざらないよう、別のフォルダに分ける。
import path from "node:path";

/** 普段使いのデータを置くフォルダ（リポジトリからの相対パス） */
export const LOCAL_DATA_DIR = path.join("data", "local");

/**
 * 普段使いの DB ファイルの絶対パス。
 * 開発用の DATABASE_PATH は見ず、変えたいときは LOCAL_DATABASE_PATH で指定する。
 */
export function localDatabasePath(repoRoot, env = process.env) {
  return path.resolve(
    repoRoot,
    env.LOCAL_DATABASE_PATH || path.join(LOCAL_DATA_DIR, "invoice-manager.db"),
  );
}

/** 普段使いの DB のバックアップを置くフォルダ（DB と同じフォルダの backups/） */
export function localBackupDir(databasePath) {
  return path.join(path.dirname(databasePath), "backups");
}
