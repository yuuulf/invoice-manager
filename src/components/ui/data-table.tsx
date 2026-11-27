/**
 * 一覧のテーブル（AGENTS.md「UI と文言」）。横スクロールさせないため列幅は固定レイアウトで決め、
 * 中身の長さで広がらないようにする。はみ出す文字は ClampedText で 1 行に収めて「…」にする。
 */
export const tableClass = "w-full table-fixed border-collapse text-sm";

/**
 * 1 行に収まる幅を確保する列の幅（切れてはいけない列。セルには whitespace-nowrap を付ける）。
 * 幅を指定しない列（会社名・件名など）は残りを分け合う
 */
export const columnWidth = {
  /** INV-ABC-202611-001（等幅 18 文字） */
  invoiceNumber: "w-48",
  /** yyyy-MM-dd */
  date: "w-28",
  /** 9,999,999,999 */
  amount: "w-32",
  /** 見出し「取引先コード」が収まる幅 */
  clientCode: "w-32",
  /** 15 文字の電話番号 */
  phone: "w-36",
  /** 編集アイコン＋縦三点リーダー */
  actions: "w-28",
  /** アイコン 1 つ分（見出しは 2 文字まで。例: 台帳の備考） */
  icon: "w-16",
  /** 台帳の状態（バッジ＋日付） */
  ledgerStatus: "w-48",
} as const;

/** 幅に収まらない文字を 1 行で「…」に省略して表示する。省略しても全文はツールチップで確認できる */
export function ClampedText({
  children,
}: {
  children: string | null | undefined;
}) {
  if (!children) return null;
  return (
    <span title={children} className="block truncate">
      {children}
    </span>
  );
}
