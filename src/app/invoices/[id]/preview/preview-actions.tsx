"use client";

import { useActionState } from "react";
import { Button, ButtonLink, buttonClassName } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { confirmInvoiceAction } from "../../actions";

/** プレビュー画面のボタン（spec.md 7.4）: 編集に戻る / SAMPLEをダウンロード / 確定してダウンロード */
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

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage message={state?.message} />
      <input type="hidden" name="id" value={invoiceId} />
      <div className="flex justify-end gap-2">
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
        <Button
          type="submit"
          disabled={pending}
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
