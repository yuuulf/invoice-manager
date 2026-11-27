import { connection } from "next/server";
import { Suspense } from "react";
import { ArchiveToggle } from "@/components/ui/archive-toggle";
import { ButtonLink } from "@/components/ui/button";
import { ListFilter } from "@/components/ui/list-filter";
import { ListSummary } from "@/components/ui/list-summary";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import {
  applyInvoiceListQuery,
  parseInvoiceListQuery,
} from "@/lib/invoices/list-query";
import { LIST_PARAM, toSearchParams, withBack } from "@/lib/list-query";
import { listInvoices } from "@/lib/invoices/repository";
import { InvoiceTable } from "./_components/invoice-table";

async function InvoiceList({
  searchParams,
}: {
  searchParams: PageProps<"/invoices">["searchParams"];
}) {
  const params = await searchParams;
  const archived = params.view === "archived";
  const query = parseInvoiceListQuery(params);
  const listQuery = toSearchParams(params).toString();
  const filterKey = toSearchParams(params, [
    LIST_PARAM.sort,
    LIST_PARAM.order,
  ]).toString();
  await connection();
  const invoices = applyInvoiceListQuery(
    listInvoices(getDb(), { archived }),
    query,
  );

  return (
    <>
      <PageHeader
        title={archived ? "請求書（アーカイブ一覧）" : "請求書"}
        actions={
          <>
            <ButtonLink href={withBack("/invoices/new", listQuery)}>
              作成
            </ButtonLink>
            <ArchiveToggle basePath="/invoices" archived={archived} />
          </>
        }
      />
      <ListFilter
        // 入力欄は初期値（defaultValue）で表示するため、条件が変わったら作り直す
        // （「条件をクリア」や戻る操作で URL の条件が変わっても、入力が残らないように）
        key={filterKey}
        basePath="/invoices"
        keyword={query.keyword}
        keywordHint="請求書番号・取引先・件名"
        keep={{
          [LIST_PARAM.view]: archived ? "archived" : undefined,
          [LIST_PARAM.sort]: query.sort?.key,
          [LIST_PARAM.order]: query.sort?.order,
        }}
        active={Boolean(query.keyword)}
      />
      <ListSummary totals={invoices.map((row) => row.total)} />
      <InvoiceTable
        invoices={invoices}
        archived={archived}
        view={{
          basePath: "/invoices",
          sort: query.sort,
          query: listQuery,
          filtered: Boolean(query.keyword),
        }}
      />
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
