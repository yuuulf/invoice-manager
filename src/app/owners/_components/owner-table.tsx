import {
  ClampedText,
  columnWidth,
  tableClass,
} from "@/components/ui/data-table";
import { RowActions } from "@/components/ui/row-actions";
import { SortableHeader } from "@/components/ui/sortable-header";
import { withBack, type ListView } from "@/lib/list-query";
import type { OwnerSortKey } from "@/lib/owners/list-query";
import type { OwnerSummary } from "@/lib/owners/repository";
import {
  archiveOwnerAction,
  deleteOwnerAction,
  restoreOwnerAction,
} from "../actions";

export function OwnerTable({
  owners,
  archived,
  view,
}: {
  owners: OwnerSummary[];
  archived: boolean;
  view: ListView<OwnerSortKey>;
}) {
  if (owners.length === 0) {
    return (
      <p className="text-zinc-500">
        {view.filtered
          ? "条件に合う事業主はありません。"
          : archived
            ? "アーカイブした事業主はありません。"
            : "事業主が登録されていません。"}
      </p>
    );
  }

  return (
    <table className={tableClass}>
      <thead>
        <tr className="border-b border-zinc-300 text-left">
          <SortableHeader {...view} label="屋号" sortKey="tradeName" />
          <SortableHeader {...view} label="氏名" sortKey="name" />
          <SortableHeader
            {...view}
            label="電話番号"
            sortKey="phone"
            className={columnWidth.phone}
          />
          <SortableHeader {...view} label="メールアドレス" sortKey="email" />
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
                editHref={withBack(`/owners/${owner.id}/edit`, view.query)}
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
