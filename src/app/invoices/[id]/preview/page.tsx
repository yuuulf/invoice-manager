import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { PageHeader } from "@/components/ui/page-header";
import { ResetOnNavigation } from "@/components/ui/reset-on-navigation";
import { getDb } from "@/db";
import { getInvoice } from "@/lib/invoices/repository";
import { prepareInvoiceOutput } from "@/lib/ledger/repository";
import { invoicePdfFileName } from "@/lib/pdf/response";
import { pdfVersion } from "@/lib/pdf/version";
import { PreviewActions } from "./preview-actions";

async function Preview({
  params,
}: {
  params: PageProps<"/invoices/[id]/preview">["params"];
}) {
  const { id } = await params;
  await connection();
  const db = getDb();
  const invoice = /^\d+$/.test(id) ? getInvoice(db, Number(id)) : undefined;
  if (!invoice) notFound();

  const output = prepareInvoiceOutput(db, invoice.id);
  if (!output.ok) {
    return (
      <div className="space-y-4">
        <FormMessage
          message={
            output.errors.total
              ? `${output.errors.total}。編集に戻って直してください`
              : "必須項目がそろっていないため、PDFを表示できません。編集に戻って入力してください"
          }
        />
        <ButtonLink href={`/invoices/${invoice.id}/edit`} variant="secondary">
          編集に戻る
        </ButtonLink>
      </div>
    );
  }

  const { invoiceNumber } = output.snapshot;
  const pdfHref = `/invoices/${invoice.id}/pdf`;
  const version = pdfVersion(output.snapshot, output.seal);
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        請求番号 <span className="font-mono font-bold">{invoiceNumber}</span>{" "}
        の確定前のPDFです（「SAMPLE」の透かし入り）。確定すると透かしのないPDFになり、台帳に記録されます。
      </p>
      <iframe
        // 内容（請求番号・取引先・事業主を含む）が変わったら読み込み直す。
        // 前に開いた画面は iframe ごと残るため、URL と key の両方を変える
        key={version}
        src={`${pdfHref}?inline=1&v=${version}`}
        title="請求書PDFのプレビュー"
        className="h-[75vh] w-full rounded border border-zinc-300"
      />
      {/* 開き直したら「確定する」のチェックを外した状態に戻す */}
      <ResetOnNavigation>
        <PreviewActions
          invoiceId={invoice.id}
          sampleHref={pdfHref}
          fileName={invoicePdfFileName(invoiceNumber, { sample: true })}
        />
      </ResetOnNavigation>
    </div>
  );
}

export default function Page({ params }: PageProps<"/invoices/[id]/preview">) {
  return (
    <>
      <PageHeader title="PDFプレビュー" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <Preview params={params} />
      </Suspense>
    </>
  );
}
