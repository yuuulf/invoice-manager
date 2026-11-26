import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { toDateString } from "@/lib/invoices/calc";
import { getInvoice } from "@/lib/invoices/repository";
import { updateInvoiceAction } from "../../actions";
import { loadFormOptions } from "../../_components/form-options";
import { InvoiceForm } from "../../_components/invoice-form";

async function EditForm({
  params,
}: {
  params: PageProps<"/invoices/[id]/edit">["params"];
}) {
  const { id } = await params;
  await connection();
  const db = getDb();
  const invoice = /^\d+$/.test(id) ? getInvoice(db, Number(id)) : undefined;
  if (!invoice) notFound();
  const { clients, owners } = loadFormOptions(db);

  return (
    <InvoiceForm
      // 保存でデータが変わったらフォームを作り直す（前に開いたときの入力状態が残るため）
      key={invoice.updatedAt.getTime()}
      action={updateInvoiceAction}
      invoice={invoice}
      clients={clients}
      owners={owners}
      today={toDateString(new Date())}
      mode="edit"
    />
  );
}

export default function Page({ params }: PageProps<"/invoices/[id]/edit">) {
  return (
    <>
      <PageHeader title="請求書の編集" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <EditForm params={params} />
      </Suspense>
    </>
  );
}
