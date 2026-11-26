"use client";

import { useActionState, useState } from "react";
import { Button, ButtonLink, buttonClassName } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { confirmInvoiceAction } from "../../actions";

/**
 * プレビュー画面のボタン（spec.md 7.4）: 編集に戻る / SAMPLEをダウンロード / 確定してダウンロード。
 * 「確定する」にチェックを入れるまで「確定してダウンロード」は押せない。
 */
export function PreviewActions({
  invoiceId,
  sampleHref,
  fileName,
}: {
  invoiceId: number;
  sampleHref: string;
  fileName: string;
}) {
  const [state, formAction, pending] = useActionState(
    confirmInvoiceAction,
    null,
  );
  const [confirmChecked, setConfirmChecked] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage message={state?.message} />
      <input type="hidden" name="id" value={invoiceId} />
      <div className="flex items-center justify-end gap-2">
        <ButtonLink href={`/invoices/${invoiceId}/edit`} variant="secondary">
          編集に戻る
        </ButtonLink>
        <a
          href={sampleHref}
          download={fileName}
          className={buttonClassName("secondary")}
        >
          SAMPLEをダウンロード
        </a>
        <label className="ml-4 flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
          />
          確定する
        </label>
        <Button
          type="submit"
          disabled={pending || !confirmChecked}
          onClick={(event) => {
            if (
              !window.confirm(
                "確定すると台帳に記録され、この請求書は変更できなくなります。確定してダウンロードしますか？",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          確定してダウンロード
        </Button>
      </div>
    </form>
  );
}
