import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { IconLink } from "@/components/ui/icon-button";
import type { Client } from "@/db/schema";
import {
  archiveClientAction,
  deleteClientAction,
  restoreClientAction,
} from "../actions";

const menuIcon = "size-4";

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
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-zinc-300 text-left">
          <th className="px-3 py-2">取引先コード</th>
          <th className="px-3 py-2">会社名</th>
          <th className="px-3 py-2">部署</th>
          <th className="px-3 py-2">担当者名</th>
          <th className="px-3 py-2">
            <span className="sr-only">操作</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {clients.map((client) => (
          <tr key={client.id} className="border-b border-zinc-200">
            <td className="px-3 py-2 font-mono">{client.code}</td>
            <td className="px-3 py-2">{client.name}</td>
            <td className="px-3 py-2">{client.department}</td>
            <td className="px-3 py-2">{client.contactName}</td>
            <td className="px-3 py-1">
              <div className="flex items-center justify-end gap-1">
                {!archived && (
                  <IconLink
                    href={`/clients/${client.id}/edit`}
                    label="編集"
                    icon={<Pencil className="size-5" aria-hidden />}
                  />
                )}
                <ActionMenu>
                  {archived ? (
                    <form action={restoreClientAction}>
                      <input type="hidden" name="id" value={client.id} />
                      <ActionMenuItem
                        icon={
                          <ArchiveRestore className={menuIcon} aria-hidden />
                        }
                      >
                        アーカイブを解除
                      </ActionMenuItem>
                    </form>
                  ) : (
                    <form action={archiveClientAction}>
                      <input type="hidden" name="id" value={client.id} />
                      <ActionMenuItem
                        icon={<Archive className={menuIcon} aria-hidden />}
                      >
                        アーカイブ
                      </ActionMenuItem>
                    </form>
                  )}
                  <form action={deleteClientAction}>
                    <input type="hidden" name="id" value={client.id} />
                    <ActionMenuItem
                      danger
                      icon={<Trash2 className={menuIcon} aria-hidden />}
                      confirmMessage={`取引先「${client.name}」を削除しますか？この操作は元に戻せません。`}
                    >
                      削除
                    </ActionMenuItem>
                  </form>
                </ActionMenu>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
