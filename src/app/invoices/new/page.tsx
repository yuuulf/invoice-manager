import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ResetOnNavigation } from "@/components/ui/reset-on-navigation";
import { getDb } from "@/db";
import { BACK_PARAM, firstParam } from "@/lib/list-query";
import { toDateString } from "@/lib/invoices/calc";
import { createInvoiceAction } from "../actions";
import { loadFormOptions } from "../_components/form-options";
import { InvoiceForm } from "../_components/invoice-form";

async function NewForm({
  searchParams,
}: {
  searchParams: PageProps<"/invoices/new">["searchParams"];
}) {
  const back = firstParam(await searchParams, BACK_PARAM);
  await connection();
  const { clients, owners } = loadFormOptions(getDb());
  return (
    <ResetOnNavigation>
      <InvoiceForm
        action={createInvoiceAction}
        clients={clients}
        owners={owners}
        today={toDateString(new Date())}
        mode="create"
        back={back}
      />
    </ResetOnNavigation>
  );
}

export default function Page({ searchParams }: PageProps<"/invoices/new">) {
  return (
    <>
      <PageHeader title="請求書の作成" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <NewForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}
