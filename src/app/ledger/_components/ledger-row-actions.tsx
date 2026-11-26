"use client";

import { Copy, FileDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionMenu, ActionMenuItem } from "@/components/ui/action-menu";
import { IconAnchor } from "@/components/ui/icon-button";
import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog";
import { invoicePdfFileName } from "@/lib/pdf/response";
import { copyLedgerAction, deleteLedgerAction } from "../actions";

/**
 * 台帳の行の操作。編集はできないため、編集アイコンの位置に PDF 出力を置き、
 * メニューに「請求書にコピー」「削除」を入れる（spec.md 7.4）。
 */
export function LedgerRowActions({
  id,
  invoiceNumber,
}: {
  id: number;
  invoiceNumber: string;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <IconAnchor
        href={`/ledger/${id}/pdf`}
        download={invoicePdfFileName(invoiceNumber)}
        label="PDF出力"
        icon={<FileDown className="size-5" aria-hidden />}
      />
      <ActionMenu>
        <form action={copyLedgerAction}>
          <input type="hidden" name="id" value={id} />
          <ActionMenuItem icon={<Copy className="size-4" aria-hidden />}>
            請求書にコピー
          </ActionMenuItem>
        </form>
        <ActionMenuItem
          type="button"
          danger
          icon={<Trash2 className="size-4" aria-hidden />}
          onClick={() => setDeleting(true)}
        >
          削除
        </ActionMenuItem>
      </ActionMenu>
      <TypedConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="台帳の削除"
        description={
          <>
            <p>
              請求番号{" "}
              <span className="font-mono font-bold">{invoiceNumber}</span>{" "}
              を台帳から削除します。この操作は元に戻せません。
            </p>
          </>
        }
        expected={invoiceNumber}
        inputLabel="確認のため請求番号を入力してください"
        submitLabel="削除"
        action={deleteLedgerAction}
        hiddenFields={{ id: String(id) }}
      />
    </div>
  );
}
