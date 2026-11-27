import {
  ClampedText,
  columnWidth,
  tableClass,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import type { Client } from "@/db/schema";
import {
  archiveClientAction,
  deleteClientAction,
  restoreClientAction,
} from "../actions";

export function ClientTable({
  clients,
  archived,
}: {
  clients: Client[];
  archived: boolean;
}) {
  if (clients.length === 0) {
    return (
      <p className="text-zinc-500">
        {archived
          ? "アーカイブした取引先はありません。"
          : "取引先が登録されていません。"}
      </p>
    );
  }

  return (
    <table className={tableClass}>
      <thead>
        <tr className="border-b border-zinc-300 text-left">
          <th className={`${columnWidth.clientCode} px-3 py-2`}>
            取引先コード
          </th>
          <th className="w-2/5 px-3 py-2">会社名</th>
          <th className="px-3 py-2">部署</th>
          <th className="px-3 py-2">担当者名</th>
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
                editHref={`/clients/${client.id}/edit`}
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
  );
}
