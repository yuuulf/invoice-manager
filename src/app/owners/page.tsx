import { connection } from "next/server";
import { Suspense } from "react";
import { ArchiveToggle } from "@/components/ui/archive-toggle";
import { ButtonLink } from "@/components/ui/button";
import { ListFilter } from "@/components/ui/list-filter";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import {
  applyOwnerListQuery,
  parseOwnerListQuery,
} from "@/lib/owners/list-query";
import { LIST_PARAM, toSearchParams, withBack } from "@/lib/list-query";
import { listOwners } from "@/lib/owners/repository";
import { OwnerTable } from "./_components/owner-table";

async function OwnerList({
  searchParams,
}: {
  searchParams: PageProps<"/owners">["searchParams"];
}) {
  const params = await searchParams;
  const archived = params.view === "archived";
  const query = parseOwnerListQuery(params);
  const listQuery = toSearchParams(params).toString();
  const filterKey = toSearchParams(params, [
    LIST_PARAM.sort,
    LIST_PARAM.order,
  ]).toString();
  await connection();
  const owners = applyOwnerListQuery(listOwners(getDb(), { archived }), query);

  return (
    <>
      <PageHeader
        title={archived ? "事業主（アーカイブ一覧）" : "事業主"}
        actions={
          <>
            <ButtonLink href={withBack("/owners/new", listQuery)}>
              作成
            </ButtonLink>
            <ArchiveToggle basePath="/owners" archived={archived} />
          </>
        }
      />
      <ListFilter
        // 入力欄は初期値（defaultValue）で表示するため、条件が変わったら作り直す
        // （「条件をクリア」や戻る操作で URL の条件が変わっても、入力が残らないように）
        key={filterKey}
        basePath="/owners"
        keyword={query.keyword}
        keywordHint="屋号・氏名・電話番号・メール"
        keep={{
          [LIST_PARAM.view]: archived ? "archived" : undefined,
          [LIST_PARAM.sort]: query.sort?.key,
          [LIST_PARAM.order]: query.sort?.order,
        }}
        active={Boolean(query.keyword)}
      />
      <OwnerTable
        owners={owners}
        archived={archived}
        view={{
          basePath: "/owners",
          sort: query.sort,
          query: listQuery,
          filtered: Boolean(query.keyword),
        }}
      />
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
