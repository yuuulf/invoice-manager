import {
  ClampedText,
  columnWidth,
  tableClass,
  TableScroll,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { SortableHeader } from "@/components/ui/sortable-header";
import { formatAmount } from "@/lib/invoices/calc";
import type { InvoiceSortKey } from "@/lib/invoices/list-query";
import type { InvoiceListRow } from "@/lib/invoices/repository";
import { withBack, type ListView } from "@/lib/list-query";
import {
  archiveInvoiceAction,
  copyInvoiceAction,
  deleteInvoiceAction,
  restoreInvoiceAction,
} from "../actions";

export function InvoiceTable({
  invoices,
  archived,
  view,
}: {
  invoices: InvoiceListRow[];
  archived: boolean;
  view: ListView<InvoiceSortKey>;
}) {
  if (invoices.length === 0) {
    return (
      <p className="text-zinc-500">
        {view.filtered
          ? "条件に合う請求書はありません。"
          : archived
            ? "アーカイブした請求書はありません。"
            : "作成中の請求書はありません。"}
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
            <th className={`${columnWidth.actions} px-3 py-2`}>
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-zinc-200">
              <td className="px-3 py-2 font-mono whitespace-nowrap">
                {invoice.invoiceNumber ?? (
                  <span className="font-sans text-zinc-500">未採番</span>
                )}
              </td>
              <td className="px-3 py-2">
                <ClampedText>{invoice.clientName}</ClampedText>
              </td>
              <td className="px-3 py-2">
                <ClampedText>{invoice.subject}</ClampedText>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {invoice.issueDate}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                {invoice.total === null ? "" : formatAmount(invoice.total)}
              </td>
              <td className="px-3 py-1">
                <RowActions
                  id={invoice.id}
                  archived={archived}
                  editHref={withBack(
                    `/invoices/${invoice.id}/edit`,
                    view.query,
                  )}
                  archiveAction={archiveInvoiceAction}
                  restoreAction={restoreInvoiceAction}
                  deleteAction={deleteInvoiceAction}
                  copyAction={copyInvoiceAction}
                  deleteConfirmMessage={`請求書「${invoice.subject ?? invoice.invoiceNumber ?? "（件名なし）"}」を削除しますか？この操作は元に戻せません。`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
