import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AutoDownload } from "@/components/ui/auto-download";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { toDateString } from "@/lib/invoices/calc";
import { getInvoice } from "@/lib/invoices/repository";
import { invoicePdfFileName } from "@/lib/pdf/response";
import { updateInvoiceAction } from "../../actions";
import { loadFormOptions } from "../../_components/form-options";
import { InvoiceForm } from "../../_components/invoice-form";

async function EditForm({
  params,
  searchParams,
}: PageProps<"/invoices/[id]/edit">) {
  const { id } = await params;
  const { download } = await searchParams;
  await connection();
  const db = getDb();
  const invoice = /^\d+$/.test(id) ? getInvoice(db, Number(id)) : undefined;
  if (!invoice) notFound();
  const { clients, owners } = loadFormOptions(db);

  return (
    <>
      {download && invoice.invoiceNumber && (
        <AutoDownload
          href={`/invoices/${invoice.id}/pdf`}
          fileName={invoicePdfFileName(invoice.invoiceNumber)}
          cleanUrl={`/invoices/${invoice.id}/edit`}
        />
      )}
      <InvoiceForm
        action={updateInvoiceAction}
        invoice={invoice}
        clients={clients}
        owners={owners}
        today={toDateString(new Date())}
        mode="edit"
      />
    </>
  );
}

export default function Page(props: PageProps<"/invoices/[id]/edit">) {
  return (
    <>
      <PageHeader title="請求書の編集" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <EditForm {...props} />
      </Suspense>
    </>
  );
}
