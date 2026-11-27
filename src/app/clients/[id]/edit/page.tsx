import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { BACK_PARAM, firstParam } from "@/lib/list-query";
import { getClient } from "@/lib/clients/repository";
import { updateClientAction } from "../../actions";
import { ClientForm } from "../../_components/client-form";

async function EditForm({
  params,
  searchParams,
}: {
  params: PageProps<"/clients/[id]/edit">["params"];
  searchParams: PageProps<"/clients/[id]/edit">["searchParams"];
}) {
  const { id } = await params;
  const back = firstParam(await searchParams, BACK_PARAM);
  await connection();
  const client = /^\d+$/.test(id) ? getClient(getDb(), Number(id)) : undefined;
  if (!client) notFound();

  return (
    <ClientForm
      // 保存でデータが変わったらフォームを作り直す（前に開いたときの入力状態が残るため）
      key={client.updatedAt.getTime()}
      action={updateClientAction}
      client={client}
      mode="edit"

      back={back}
    />
  );
}

export default function Page({
  params,
  searchParams,
}: PageProps<"/clients/[id]/edit">) {
  return (
    <>
      <PageHeader title="取引先の編集" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <EditForm params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
