import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/db";
import { BACK_PARAM, firstParam } from "@/lib/list-query";
import { toDateString } from "@/lib/invoices/calc";
import { getLedgerEntry } from "@/lib/ledger/repository";
import { updateLedgerAction } from "../../actions";
import { LedgerForm } from "../../_components/ledger-form";

async function EditForm({
  params,
  searchParams,
}: {
  params: PageProps<"/ledger/[id]/edit">["params"];
  searchParams: PageProps<"/ledger/[id]/edit">["searchParams"];
}) {
  const { id } = await params;
  const back = firstParam(await searchParams, BACK_PARAM);
  await connection();
  const entry = /^\d+$/.test(id)
    ? getLedgerEntry(getDb(), Number(id))
    : undefined;
  if (!entry) notFound();

  return (
    <LedgerForm
      // 保存で内容が変わったらフォームを作り直す（前に開いたときの入力状態が残るため）
      key={JSON.stringify([
        entry.sentOn,
        entry.paidOn,
        entry.sentFileUrl,
        entry.memo,
      ])}
      action={updateLedgerAction}
      entry={entry}
      today={toDateString(new Date())}

      back={back}
    />
  );
}

export default function Page({
  params,
  searchParams,
}: PageProps<"/ledger/[id]/edit">) {
  return (
    <>
      <PageHeader title="台帳の編集" />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <EditForm params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
