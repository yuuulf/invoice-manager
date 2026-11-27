import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ResetOnNavigation } from "@/components/ui/reset-on-navigation";
import { BACK_PARAM, firstParam } from "@/lib/list-query";
import { createClientAction } from "../actions";
import { ClientForm } from "../_components/client-form";

async function NewForm({
  searchParams,
}: {
  searchParams: PageProps<"/clients/new">["searchParams"];
}) {
  const back = firstParam(await searchParams, BACK_PARAM);
  return (
    <ResetOnNavigation>
      <ClientForm action={createClientAction} mode="create" back={back} />
    </ResetOnNavigation>
  );
}

export default function Page({ searchParams }: PageProps<"/clients/new">) {
  return (
    <>
      <PageHeader title="取引先の作成" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <NewForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}
