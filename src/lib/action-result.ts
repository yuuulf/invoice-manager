/** 一覧の行の操作（アーカイブ・削除など）の結果。失敗時は利用者に見せるメッセージを返す */
export type RowActionResult = { error: string } | undefined;
