import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { BACK_PARAM, firstParam } from "@/lib/list-query";
import { getOwner } from "@/lib/owners/repository";
import { updateOwnerAction } from "../../actions";
import { OwnerForm } from "../../_components/owner-form";

async function EditForm({
  params,
  searchParams,
}: {
  params: PageProps<"/owners/[id]/edit">["params"];
  searchParams: PageProps<"/owners/[id]/edit">["searchParams"];
}) {
  const { id } = await params;
  const back = firstParam(await searchParams, BACK_PARAM);
  await connection();
  const owner = /^\d+$/.test(id) ? getOwner(getDb(), Number(id)) : undefined;
  if (!owner) notFound();

  return (
    <OwnerForm
      // 保存でデータが変わったらフォームを作り直す（前に開いたときの入力状態が残るため）
      key={owner.updatedAt.getTime()}
      action={updateOwnerAction}
      owner={owner}
      mode="edit"

      back={back}
    />
  );
}

export default function Page({
  params,
  searchParams,
}: PageProps<"/owners/[id]/edit">) {
  return (
    <>
      <PageHeader title="事業主の編集" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <EditForm params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
