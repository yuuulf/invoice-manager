import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { listLedger } from "@/lib/ledger/repository";
import { LedgerTable } from "./_components/ledger-table";

async function LedgerList() {
  await connection();
  return <LedgerTable entries={listLedger(getDb())} />;
}

export default function Page() {
  return (
    <>
      <PageHeader title="台帳" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <LedgerList />
      </Suspense>
    </>
  );
}
