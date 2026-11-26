import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { getInvoice } from "@/lib/invoices/repository";
import { prepareInvoiceOutput } from "@/lib/ledger/repository";
import { invoicePdfFileName } from "@/lib/pdf/response";
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
        <FormMessage message="必須項目がそろっていないため、PDFを表示できません。編集に戻って入力してください" />
        <ButtonLink href={`/invoices/${invoice.id}/edit`} variant="secondary">
          編集に戻る
        </ButtonLink>
      </div>
    );
  }

  const { invoiceNumber } = output.snapshot;
  const pdfHref = `/invoices/${invoice.id}/pdf`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        請求番号 <span className="font-mono font-bold">{invoiceNumber}</span>{" "}
        の確定前のPDFです（「SAMPLE」の透かし入り）。確定すると透かしのないPDFになり、台帳に記録されます。
      </p>
      <iframe
        // 請求番号を振り直したときに表示し直す
        key={invoiceNumber}
        src={`${pdfHref}?inline=1&v=${encodeURIComponent(invoiceNumber)}`}
        title="請求書PDFのプレビュー"
        className="h-[75vh] w-full rounded border border-zinc-300"
      />
      <PreviewActions
        invoiceId={invoice.id}
        sampleHref={pdfHref}
        fileName={invoicePdfFileName(invoiceNumber)}
      />
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
