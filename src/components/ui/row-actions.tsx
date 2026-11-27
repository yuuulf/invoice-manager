"use client";

import { Archive, ArchiveRestore, Copy, Pencil, Trash2 } from "lucide-react";
import { ActionMenu, ActionMenuItem } from "./action-menu";
import type { RowActionResult } from "@/lib/action-result";
import { IconLink } from "./icon-button";

type RowAction = (formData: FormData) => Promise<RowActionResult | void>;

/** 操作が失敗したらメッセージを表示する */
function withErrorAlert(action: RowAction) {
  return async (formData: FormData) => {
    const result = await action(formData);
    if (result?.error) window.alert(result.error);
  };
}

const menuIcon = "size-4";

/**
 * 一覧の行の右端に置く操作（AGENTS.md「UI と文言」）。操作が失敗したらメッセージを表示する。
 * 通常の一覧: 編集アイコン＋メニュー（コピー（copyAction を渡したとき）／アーカイブ／削除）
 * アーカイブ一覧: メニュー（アーカイブを解除／削除）
 */
export function RowActions({
  id,
  archived,
  editHref,
  archiveAction,
  restoreAction,
  deleteAction,
  deleteConfirmMessage,
  copyAction,
}: {
  id: number;
  archived: boolean;
  editHref: string;
  archiveAction: RowAction;
  restoreAction: RowAction;
  deleteAction: RowAction;
  deleteConfirmMessage: string;
  /** 渡すと通常の一覧のメニューの先頭に「コピー」を出す */
  copyAction?: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {!archived && (
        <IconLink
          href={editHref}
          label="編集"
          icon={<Pencil className="size-5" aria-hidden />}
        />
      )}
      <ActionMenu>
        {!archived && copyAction && (
          <form action={copyAction}>
            <input type="hidden" name="id" value={id} />
            <ActionMenuItem icon={<Copy className={menuIcon} aria-hidden />}>
              コピー
            </ActionMenuItem>
          </form>
        )}
        {archived ? (
          <form action={withErrorAlert(restoreAction)}>
            <input type="hidden" name="id" value={id} />
            <ActionMenuItem
              icon={<ArchiveRestore className={menuIcon} aria-hidden />}
            >
              アーカイブを解除
            </ActionMenuItem>
          </form>
        ) : (
          <form action={withErrorAlert(archiveAction)}>
            <input type="hidden" name="id" value={id} />
            <ActionMenuItem icon={<Archive className={menuIcon} aria-hidden />}>
              アーカイブ
            </ActionMenuItem>
          </form>
        )}
        <form action={withErrorAlert(deleteAction)}>
          <input type="hidden" name="id" value={id} />
          <ActionMenuItem
            danger
            icon={<Trash2 className={menuIcon} aria-hidden />}
            confirmMessage={deleteConfirmMessage}
          >
            削除
          </ActionMenuItem>
        </form>
      </ActionMenu>
    </div>
  );
}
