import { connection } from "next/server";
import { Suspense } from "react";
import { ArchiveToggle } from "@/components/ui/archive-toggle";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { listClients } from "@/lib/clients/repository";
import { ClientTable } from "./_components/client-table";

async function ClientList({
  searchParams,
}: {
  searchParams: PageProps<"/clients">["searchParams"];
}) {
  const { view } = await searchParams;
  const archived = view === "archived";
  await connection();
  const clients = listClients(getDb(), { archived });

  return (
    <>
      <PageHeader
        title={archived ? "取引先（アーカイブ一覧）" : "取引先"}
        actions={
          <>
            <ArchiveToggle basePath="/clients" archived={archived} />
            <ButtonLink href="/clients/new">新規登録</ButtonLink>
          </>
        }
      />
      <ClientTable clients={clients} archived={archived} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/clients">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
      <ClientList searchParams={searchParams} />
    </Suspense>
  );
}
