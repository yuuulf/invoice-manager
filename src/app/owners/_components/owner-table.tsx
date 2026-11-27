import {
  ClampedText,
  columnWidth,
  tableClass,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import type { OwnerSummary } from "@/lib/owners/repository";
import {
  archiveOwnerAction,
  deleteOwnerAction,
  restoreOwnerAction,
} from "../actions";

export function OwnerTable({
  owners,
  archived,
}: {
  owners: OwnerSummary[];
  archived: boolean;
}) {
  if (owners.length === 0) {
    return (
      <p className="text-zinc-500">
        {archived
          ? "アーカイブした事業主はありません。"
          : "事業主が登録されていません。"}
      </p>
    );
  }

  return (
    <table className={tableClass}>
      <thead>
        <tr className="border-b border-zinc-300 text-left">
          <th className="px-3 py-2">屋号</th>
          <th className="px-3 py-2">氏名</th>
          <th className={`${columnWidth.phone} px-3 py-2`}>電話番号</th>
          <th className="px-3 py-2">メールアドレス</th>
          <th className={`${columnWidth.actions} px-3 py-2`}>
            <span className="sr-only">操作</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {owners.map((owner) => (
          <tr key={owner.id} className="border-b border-zinc-200">
            <td className="px-3 py-2">
              <ClampedText>{owner.tradeName}</ClampedText>
            </td>
            <td className="px-3 py-2">
              <ClampedText>{owner.name}</ClampedText>
            </td>
            <td className="px-3 py-2">
              <ClampedText>{owner.phone}</ClampedText>
            </td>
            <td className="px-3 py-2">
              <ClampedText>{owner.email}</ClampedText>
            </td>
            <td className="px-3 py-1">
              <RowActions
                id={owner.id}
                archived={archived}
                editHref={`/owners/${owner.id}/edit`}
                archiveAction={archiveOwnerAction}
                restoreAction={restoreOwnerAction}
                deleteAction={deleteOwnerAction}
                deleteConfirmMessage={`事業主「${owner.name}」を削除しますか？この操作は元に戻せません。`}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
