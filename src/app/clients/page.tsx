import { connection } from "next/server";
import { Suspense } from "react";
import { ArchiveToggle } from "@/components/ui/archive-toggle";
import { ButtonLink } from "@/components/ui/button";
import { ListFilter } from "@/components/ui/list-filter";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import {
  applyClientListQuery,
  parseClientListQuery,
} from "@/lib/clients/list-query";
import { LIST_PARAM, toSearchParams, withBack } from "@/lib/list-query";
import { listClients } from "@/lib/clients/repository";
import { ClientTable } from "./_components/client-table";

async function ClientList({
  searchParams,
}: {
  searchParams: PageProps<"/clients">["searchParams"];
}) {
  const params = await searchParams;
  const archived = params.view === "archived";
  const query = parseClientListQuery(params);
  const listQuery = toSearchParams(params).toString();
  const filterKey = toSearchParams(params, [
    LIST_PARAM.sort,
    LIST_PARAM.order,
  ]).toString();
  await connection();
  const clients = applyClientListQuery(
    listClients(getDb(), { archived }),
    query,
  );

  return (
    <>
      <PageHeader
        title={archived ? "取引先（アーカイブ一覧）" : "取引先"}
        actions={
          <>
            <ButtonLink href={withBack("/clients/new", listQuery)}>
              作成
            </ButtonLink>
            <ArchiveToggle basePath="/clients" archived={archived} />
          </>
        }
      />
      <ListFilter
        // 入力欄は初期値（defaultValue）で表示するため、条件が変わったら作り直す
        // （「条件をクリア」や戻る操作で URL の条件が変わっても、入力が残らないように）
        key={filterKey}
        basePath="/clients"
        keyword={query.keyword}
        keywordHint="コード・会社名・部署・担当者名"
        keep={{
          [LIST_PARAM.view]: archived ? "archived" : undefined,
          [LIST_PARAM.sort]: query.sort?.key,
          [LIST_PARAM.order]: query.sort?.order,
        }}
        active={Boolean(query.keyword)}
      />
      <ClientTable
        clients={clients}
        archived={archived}
        view={{
          basePath: "/clients",
          sort: query.sort,
          query: listQuery,
          filtered: Boolean(query.keyword),
        }}
      />
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
