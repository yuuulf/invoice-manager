"use client";

import { Copy, ExternalLink, FileDown, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  ActionMenu,
  ActionMenuAnchor,
  ActionMenuItem,
} from "@/components/ui/action-menu";
import { IconLink } from "@/components/ui/icon-button";
import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog";
import { LEDGER_SENT_CANNOT_DELETE } from "@/lib/ledger/status";
import { isHttpUrl } from "@/lib/ledger/validation";
import { invoicePdfFileName } from "@/lib/pdf/response";
import { copyLedgerAction, deleteLedgerAction } from "../actions";

/**
 * 台帳の行の操作。編集（送信・入金・備考。spec.md 7.6）と、
 * メニュー（「PDF出力」「送信ファイルを開く」（リンクがあるとき）「請求書にコピー」「削除」。
 * spec.md 7.4・7.6）を並べる。
 * 送信済みの台帳は削除できないため、削除を押せなくする。
 */
export function LedgerRowActions({
  id,
  invoiceNumber,
  sent,
  sentFileUrl,
}: {
  id: number;
  invoiceNumber: string;
  /** 送信済みか（送信済みなら削除できない） */
  sent: boolean;
  /** 送信ファイルの URL。あればメニューから開ける */
  sentFileUrl: string | null;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <IconLink
        href={`/ledger/${id}/edit`}
        label="編集"
        icon={<Pencil className="size-5" aria-hidden />}
      />
      <ActionMenu>
        <ActionMenuAnchor
          href={`/ledger/${id}/pdf`}
          download={invoicePdfFileName(invoiceNumber)}
          icon={<FileDown className="size-4" aria-hidden />}
        >
          PDF出力
        </ActionMenuAnchor>
        {sentFileUrl && isHttpUrl(sentFileUrl) && (
          <ActionMenuAnchor
            href={sentFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            icon={<ExternalLink className="size-4" aria-hidden />}
          >
            送信ファイルを開く
          </ActionMenuAnchor>
        )}
        <form action={copyLedgerAction}>
          <input type="hidden" name="id" value={id} />
          <ActionMenuItem icon={<Copy className="size-4" aria-hidden />}>
            請求書にコピー
          </ActionMenuItem>
        </form>
        <ActionMenuItem
          type="button"
          danger
          disabled={sent}
          title={sent ? LEDGER_SENT_CANNOT_DELETE : undefined}
          icon={<Trash2 className="size-4" aria-hidden />}
          onClick={() => setDeleting(true)}
        >
          削除
          {sent && <span className="text-xs">（送信済みのため不可）</span>}
        </ActionMenuItem>
      </ActionMenu>
      <TypedConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="台帳の削除"
        description={
          <>
            <p>
              請求書番号{" "}
              <span className="font-mono font-bold">{invoiceNumber}</span>{" "}
              を台帳から削除します。この操作は元に戻せません。
            </p>
          </>
        }
        expected={invoiceNumber}
        inputLabel="確認のため請求書番号を入力してください"
        submitLabel="削除"
        action={deleteLedgerAction}
        hiddenFields={{ id: String(id) }}
      />
    </div>
  );
}
