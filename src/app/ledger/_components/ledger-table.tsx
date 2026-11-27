import {
  ClampedText,
  columnWidth,
  tableClass,
  TableScroll,
} from "@/components/ui/data-table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { formatAmount } from "@/lib/invoices/calc";
import type { LedgerSortKey } from "@/lib/ledger/list-query";
import { withBack, type ListView } from "@/lib/list-query";
import type { LedgerListRow } from "@/lib/ledger/repository";
import { LedgerRowActions } from "./ledger-row-actions";
import { LedgerStatus } from "./ledger-status";
import { MemoIndicator } from "./memo-indicator";

export function LedgerTable({
  entries,
  view,
}: {
  entries: LedgerListRow[];
  view: ListView<LedgerSortKey>;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-zinc-500">
        {view.filtered
          ? "条件に合う台帳はありません。"
          : "確定した請求書はありません。"}
      </p>
    );
  }

  return (
    <TableScroll>
      <table className={tableClass}>
        <thead>
          <tr className="border-b border-zinc-300 text-left">
            <SortableHeader
              {...view}
              label="請求書番号"
              sortKey="invoiceNumber"
              className={columnWidth.invoiceNumber}
            />
            <SortableHeader {...view} label="取引先" sortKey="clientName" />
            <SortableHeader {...view} label="件名" sortKey="subject" />
            <SortableHeader
              {...view}
              label="請求日"
              sortKey="issueDate"
              className={columnWidth.date}
            />
            <SortableHeader
              {...view}
              label="合計"
              sortKey="total"
              align="right"
              className={columnWidth.amount}
            />
            <SortableHeader
              {...view}
              label="状態"
              sortKey="status"
              className={columnWidth.ledgerStatus}
            />
            <th className={`${columnWidth.icon} px-3 py-2 text-center`}>
              備考
            </th>
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
                  editHref={withBack(`/ledger/${entry.id}/edit`, view.query)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
