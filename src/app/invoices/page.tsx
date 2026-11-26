import { connection } from "next/server";
import { Suspense } from "react";
import { ArchiveToggle } from "@/components/ui/archive-toggle";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { listInvoices } from "@/lib/invoices/repository";
import { InvoiceTable } from "./_components/invoice-table";

async function InvoiceList({
  searchParams,
}: {
  searchParams: PageProps<"/invoices">["searchParams"];
}) {
  const { view } = await searchParams;
  const archived = view === "archived";
  await connection();
  const invoices = listInvoices(getDb(), { archived });

  return (
    <>
      <PageHeader
        title={archived ? "請求書（アーカイブ一覧）" : "請求書"}
        actions={
          <>
            <ButtonLink href="/invoices/new">作成</ButtonLink>
            <ArchiveToggle basePath="/invoices" archived={archived} />
          </>
        }
      />
      <InvoiceTable invoices={invoices} archived={archived} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/invoices">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
      <InvoiceList searchParams={searchParams} />
    </Suspense>
  );
}
