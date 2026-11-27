import {
  ClampedText,
  columnWidth,
  tableClass,
} from "@/components/ui/data-table";
import { formatAmount } from "@/lib/invoices/calc";
import type { LedgerListRow } from "@/lib/ledger/repository";
import { LedgerRowActions } from "./ledger-row-actions";
import { LedgerStatus } from "./ledger-status";
import { MemoIndicator } from "./memo-indicator";

export function LedgerTable({ entries }: { entries: LedgerListRow[] }) {
  if (entries.length === 0) {
    return <p className="text-zinc-500">確定した請求書はありません。</p>;
  }

  return (
    <table className={tableClass}>
      <thead>
        <tr className="border-b border-zinc-300 text-left">
          <th className={`${columnWidth.invoiceNumber} px-3 py-2`}>
            請求書番号
          </th>
          <th className="px-3 py-2">取引先</th>
          <th className="px-3 py-2">件名</th>
          <th className={`${columnWidth.date} px-3 py-2`}>請求日</th>
          <th className={`${columnWidth.amount} px-3 py-2 text-right`}>合計</th>
          <th className={`${columnWidth.ledgerStatus} px-3 py-2`}>状態</th>
          <th className={`${columnWidth.icon} px-3 py-2 text-center`}>備考</th>
          <th className={`${columnWidth.actions} px-3 py-2`}>
            <span className="sr-only">操作</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-b border-zinc-200">
            <td className="px-3 py-2 font-mono whitespace-nowrap">
              {entry.invoiceNumber}
            </td>
            <td className="px-3 py-2">
              <ClampedText>{entry.clientName}</ClampedText>
            </td>
            <td className="px-3 py-2">
              <ClampedText>{entry.subject}</ClampedText>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">{entry.issueDate}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              {formatAmount(entry.total)}
            </td>
            <td className="px-3 py-2">
              <LedgerStatus sentOn={entry.sentOn} paidOn={entry.paidOn} />
            </td>
            <td className="px-3 py-2 text-center">
              <MemoIndicator memo={entry.memo} />
            </td>
            <td className="px-3 py-1">
              <LedgerRowActions
                id={entry.id}
                invoiceNumber={entry.invoiceNumber}
                sent={entry.sentOn !== null}
                sentFileUrl={entry.sentFileUrl}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
