import { ButtonLink } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
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
            <td className="px-3 py-2">
              <div className="flex justify-end gap-2">
                {archived ? (
                  <form action={restoreClientAction}>
                    <input type="hidden" name="id" value={client.id} />
                    <Button type="submit" variant="secondary">
                      元に戻す
                    </Button>
                  </form>
                ) : (
                  <>
                    <ButtonLink
                      href={`/clients/${client.id}/edit`}
                      variant="secondary"
                    >
                      編集
                    </ButtonLink>
                    <form action={archiveClientAction}>
                      <input type="hidden" name="id" value={client.id} />
                      <Button type="submit" variant="secondary">
                        アーカイブ
                      </Button>
                    </form>
                  </>
                )}
                <form action={deleteClientAction}>
                  <input type="hidden" name="id" value={client.id} />
                  <ConfirmButton
                    variant="danger"
                    confirmMessage={`取引先「${client.name}」を削除しますか？この操作は元に戻せません。`}
                  >
                    削除
                  </ConfirmButton>
                </form>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
