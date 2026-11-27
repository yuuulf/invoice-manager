import { formatAmount } from "@/lib/invoices/calc";

/**
 * 一覧の件数と合計金額（spec.md 3.2）。金額を計算できない行（取引先が未選択の請求書など）は合計から除き、その件数を添える
 */
export function ListSummary({
  totals,
}: {
  /** 各行の金額。計算できない行は null */
  totals: readonly (number | null)[];
}) {
  const known = totals.filter((t): t is number => t !== null);
  const sum = known.reduce((a, b) => a + b, 0);
  const unknown = totals.length - known.length;
  return (
    <p className="mb-2 text-sm text-zinc-600" aria-live="polite">
      <span className="font-bold text-zinc-900">{totals.length}件</span>
      <span className="ml-3">
        合計{" "}
        <span className="font-bold text-zinc-900">{formatAmount(sum)}</span>
      </span>
      {unknown > 0 && (
        <span className="ml-1">（金額を計算できない{unknown}件を除く）</span>
      )}
    </p>
  );
}
