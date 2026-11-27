import { NotebookText } from "lucide-react";

/**
 * 台帳の備考が入っているかを一覧で示すアイコン（spec.md 7.6）。空なら何も出さない。
 * マウスを重ねるとツールチップで備考の全文を出す（改行もそのまま）
 */
export function MemoIndicator({ memo }: { memo: string | null }) {
  if (!memo) return null;
  return (
    <span title={memo} className="inline-flex align-middle text-zinc-600">
      <NotebookText className="size-5" aria-hidden />
      <span className="sr-only">備考: {memo}</span>
    </span>
  );
}
