import {
  ClampedText,
  columnWidth,
  tableClass,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { formatAmount } from "@/lib/invoices/calc";
import type { InvoiceListRow } from "@/lib/invoices/repository";
import {
  archiveInvoiceAction,
  copyInvoiceAction,
  deleteInvoiceAction,
  restoreInvoiceAction,
} from "../actions";

export function InvoiceTable({
  invoices,
  archived,
}: {
  invoices: InvoiceListRow[];
  archived: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <p className="text-zinc-500">
        {archived
          ? "アーカイブした請求書はありません。"
          : "作成中の請求書はありません。"}
      </p>
    );
  }

  return (
    <table className={tableClass}>
      <thead>
        <tr className="border-b border-zinc-300 text-left">
          <th className={`${columnWidth.invoiceNumber} px-3 py-2`}>請求番号</th>
          <th className="px-3 py-2">取引先</th>
          <th className="px-3 py-2">件名</th>
          <th className={`${columnWidth.date} px-3 py-2`}>請求日</th>
          <th className={`${columnWidth.amount} px-3 py-2 text-right`}>合計</th>
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
            <td className="px-3 py-2 whitespace-nowrap">{invoice.issueDate}</td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              {invoice.total === null ? "" : formatAmount(invoice.total)}
            </td>
            <td className="px-3 py-1">
              <RowActions
                id={invoice.id}
                archived={archived}
                editHref={`/invoices/${invoice.id}/edit`}
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
  );
}
