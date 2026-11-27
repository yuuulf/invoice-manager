import {
  ClampedText,
  columnWidth,
  tableClass,
  TableScroll,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { SortableHeader } from "@/components/ui/sortable-header";
import type { Client } from "@/db/schema";
import type { ClientSortKey } from "@/lib/clients/list-query";
import { withBack, type ListView } from "@/lib/list-query";
import {
  archiveClientAction,
  deleteClientAction,
  restoreClientAction,
} from "../actions";

export function ClientTable({
  clients,
  archived,
  view,
}: {
  clients: Client[];
  archived: boolean;
  view: ListView<ClientSortKey>;
}) {
  if (clients.length === 0) {
    return (
      <p className="text-zinc-500">
        {view.filtered
          ? "条件に合う取引先はありません。"
          : archived
            ? "アーカイブした取引先はありません。"
            : "取引先が登録されていません。"}
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
              label="取引先コード"
              sortKey="code"
              className={columnWidth.clientCode}
            />
            <SortableHeader
              {...view}
              label="会社名"
              sortKey="name"
              className="w-2/5"
            />
            <SortableHeader {...view} label="部署" sortKey="department" />
            <SortableHeader {...view} label="担当者名" sortKey="contactName" />
            <th className={`${columnWidth.actions} px-3 py-2`}>
              <span className="sr-only">操作</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-zinc-200">
              <td className="px-3 py-2 font-mono whitespace-nowrap">
                {client.code}
              </td>
              <td className="px-3 py-2">
                <ClampedText>{client.name}</ClampedText>
              </td>
              <td className="px-3 py-2">
                <ClampedText>{client.department}</ClampedText>
              </td>
              <td className="px-3 py-2">
                <ClampedText>{client.contactName}</ClampedText>
              </td>
              <td className="px-3 py-1">
                <RowActions
                  id={client.id}
                  archived={archived}
                  editHref={withBack(`/clients/${client.id}/edit`, view.query)}
                  archiveAction={archiveClientAction}
                  restoreAction={restoreClientAction}
                  deleteAction={deleteClientAction}
                  deleteConfirmMessage={`取引先「${client.name}」を削除しますか？この操作は元に戻せません。`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
