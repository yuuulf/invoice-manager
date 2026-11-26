import { connection } from "next/server";
import { Suspense } from "react";
import { AutoDownload } from "@/components/ui/auto-download";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { listLedger } from "@/lib/ledger/repository";
import { invoicePdfFileName } from "@/lib/pdf/response";
import { LedgerTable } from "./_components/ledger-table";

async function LedgerList({
  searchParams,
}: {
  searchParams: PageProps<"/ledger">["searchParams"];
}) {
  const { download } = await searchParams;
  await connection();
  const entries = listLedger(getDb());
  // 確定して出力した直後は、確定した PDF をダウンロードする
  const downloaded = entries.find((entry) => String(entry.id) === download);
  return (
    <>
      {downloaded && (
        <AutoDownload
          href={`/ledger/${downloaded.id}/pdf`}
          fileName={invoicePdfFileName(downloaded.invoiceNumber)}
          cleanUrl="/ledger"
        />
      )}
      <LedgerTable entries={entries} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/ledger">) {
  return (
    <>
      <PageHeader title="台帳" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <LedgerList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
