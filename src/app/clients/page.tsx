import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ListTabs } from "@/components/ui/list-tabs";
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
      <ListTabs basePath="/clients" archived={archived} />
      <ClientTable clients={clients} archived={archived} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/clients">) {
  return (
    <>
      <PageHeader
        title="取引先"
        actions={<ButtonLink href="/clients/new">新規登録</ButtonLink>}
      />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <ClientList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
