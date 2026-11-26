import { formatAmount, toDateString } from "@/lib/invoices/calc";
import type { LedgerListRow } from "@/lib/ledger/repository";
import { LedgerRowActions } from "./ledger-row-actions";

export function LedgerTable({ entries }: { entries: LedgerListRow[] }) {
  if (entries.length === 0) {
    return <p className="text-zinc-500">確定した請求書はありません。</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-zinc-300 text-left">
          <th className="px-3 py-2">請求番号</th>
          <th className="px-3 py-2">取引先</th>
          <th className="px-3 py-2">件名</th>
          <th className="px-3 py-2">請求日</th>
          <th className="px-3 py-2 text-right">合計</th>
          <th className="px-3 py-2">確定日</th>
          <th className="px-3 py-2">
            <span className="sr-only">操作</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-b border-zinc-200">
            <td className="px-3 py-2 font-mono">{entry.invoiceNumber}</td>
            <td className="px-3 py-2">{entry.clientName}</td>
            <td className="px-3 py-2">{entry.subject}</td>
            <td className="px-3 py-2">{entry.issueDate}</td>
            <td className="px-3 py-2 text-right">
              {formatAmount(entry.total)}
            </td>
            <td className="px-3 py-2">{toDateString(entry.confirmedAt)}</td>
            <td className="px-3 py-1">
              <LedgerRowActions
                id={entry.id}
                invoiceNumber={entry.invoiceNumber}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
