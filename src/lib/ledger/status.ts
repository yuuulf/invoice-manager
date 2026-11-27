// 台帳の送信・入金の状態（spec.md 7.6）。サーバー・ブラウザの両方で使う

/** 台帳の状態。未送信 → 送信済み（未入金）→ 入金済み の順に進む */
export const ledgerStatuses = ["unsent", "sent", "paid"] as const;
export type LedgerStatus = (typeof ledgerStatuses)[number];

/** 一覧のバッジに出す状態名 */
export const ledgerStatusLabels: Record<LedgerStatus, string> = {
  unsent: "未送信",
  sent: "未入金",
  paid: "入金済",
};

/** 編集画面の選択肢の表示名 */
export const ledgerStatusOptionLabels: Record<LedgerStatus, string> = {
  unsent: "未送信",
  sent: "送信済み（未入金）",
  paid: "入金済み",
};

/** 送信日・入金日から状態を求める */
export function ledgerStatusOf(entry: {
  sentOn: string | null;
  paidOn: string | null;
}): LedgerStatus {
  if (entry.paidOn) return "paid";
  if (entry.sentOn) return "sent";
  return "unsent";
}

/** 送信済みの台帳を削除しようとしたときのメッセージ（spec.md 7.6） */
export const LEDGER_SENT_CANNOT_DELETE =
  "送信済みの台帳は削除できません。未送信に戻してから削除してください。";
