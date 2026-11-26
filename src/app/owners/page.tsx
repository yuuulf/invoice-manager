import { connection } from "next/server";
import { Suspense } from "react";
import { ArchiveToggle } from "@/components/ui/archive-toggle";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { listOwners } from "@/lib/owners/repository";
import { OwnerTable } from "./_components/owner-table";

async function OwnerList({
  searchParams,
}: {
  searchParams: PageProps<"/owners">["searchParams"];
}) {
  const { view } = await searchParams;
  const archived = view === "archived";
  await connection();
  const owners = listOwners(getDb(), { archived });

  return (
    <>
      <PageHeader
        title={archived ? "事業主（アーカイブ一覧）" : "事業主"}
        actions={
          <>
            <ButtonLink href="/owners/new">作成</ButtonLink>
            <ArchiveToggle basePath="/owners" archived={archived} />
          </>
        }
      />
      <OwnerTable owners={owners} archived={archived} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/owners">) {
  return (
    <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
      <OwnerList searchParams={searchParams} />
    </Suspense>
  );
}
