import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { getOwner } from "@/lib/owners/repository";
import { updateOwnerAction } from "../../actions";
import { OwnerForm } from "../../_components/owner-form";

async function EditForm({
  params,
}: {
  params: PageProps<"/owners/[id]/edit">["params"];
}) {
  const { id } = await params;
  await connection();
  const owner = /^\d+$/.test(id) ? getOwner(getDb(), Number(id)) : undefined;
  if (!owner) notFound();

  return <OwnerForm action={updateOwnerAction} owner={owner} mode="edit" />;
}

export default function Page({ params }: PageProps<"/owners/[id]/edit">) {
  return (
    <>
      <PageHeader title="事業主の編集" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <EditForm params={params} />
      </Suspense>
    </>
  );
}
