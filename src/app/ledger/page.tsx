import { connection } from "next/server";
import { Suspense } from "react";
import { AutoDownload } from "@/components/ui/auto-download";
import { ListSummary } from "@/components/ui/list-summary";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import {
  applyLedgerListQuery,
  hasLedgerFilter,
  ledgerClientNames,
  parseLedgerListQuery,
} from "@/lib/ledger/list-query";
import { listLedger } from "@/lib/ledger/repository";
import { LIST_PARAM, toSearchParams } from "@/lib/list-query";
import { invoicePdfFileName } from "@/lib/pdf/response";
import { LedgerFilter } from "./_components/ledger-filter";
import { LedgerTable } from "./_components/ledger-table";

async function LedgerList({
  searchParams,
}: {
  searchParams: PageProps<"/ledger">["searchParams"];
}) {
  const params = await searchParams;
  const query = parseLedgerListQuery(params);
  // download は確定直後の一度だけのダウンロード用なので、戻り先などの条件には含めない
  const listQuery = toSearchParams(params, ["download"]).toString();
  const filtered = hasLedgerFilter(query);
  await connection();
  const all = listLedger(getDb());
  const entries = applyLedgerListQuery(all, query);
  // 確定して出力した直後は、確定した PDF をダウンロードする
  const downloaded = all.find((entry) => String(entry.id) === params.download);
  return (
    <>
      {downloaded && (
        <AutoDownload
          href={`/ledger/${downloaded.id}/pdf`}
          fileName={invoicePdfFileName(downloaded.invoiceNumber)}
          cleanUrl="/ledger"
        />
      )}
      {all.length > 0 && (
        <>
          <LedgerFilter
            // 入力欄は初期値（defaultValue）で表示するため、条件が変わったら作り直す
            // （「条件をクリア」や戻る操作で URL の条件が変わっても、入力が残らないように）
            key={toSearchParams(params, [
              "download",
              LIST_PARAM.sort,
              LIST_PARAM.order,
            ]).toString()}
            query={query}
            clientNames={ledgerClientNames(all)}
            active={filtered}
          />
          <ListSummary totals={entries.map((entry) => entry.total)} />
        </>
      )}
      <LedgerTable
        entries={entries}
        view={{
          basePath: "/ledger",
          sort: query.sort,
          query: listQuery,
          filtered,
        }}
      />
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
