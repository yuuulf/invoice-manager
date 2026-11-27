import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ResetOnNavigation } from "@/components/ui/reset-on-navigation";
import { BACK_PARAM, firstParam } from "@/lib/list-query";
import { createOwnerAction } from "../actions";
import { OwnerForm } from "../_components/owner-form";

async function NewForm({
  searchParams,
}: {
  searchParams: PageProps<"/owners/new">["searchParams"];
}) {
  const back = firstParam(await searchParams, BACK_PARAM);
  return (
    <ResetOnNavigation>
      <OwnerForm action={createOwnerAction} mode="create" back={back} />
    </ResetOnNavigation>
  );
}

export default function Page({ searchParams }: PageProps<"/owners/new">) {
  return (
    <>
      <PageHeader title="事業主の作成" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <NewForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}
