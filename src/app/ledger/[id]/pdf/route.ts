import { connection } from "next/server";
import { getDb } from "@/db";
import { getLedgerOutput } from "@/lib/ledger/repository";
import { renderInvoicePdf } from "@/lib/pdf/render-invoice";
import { pdfResponse } from "@/lib/pdf/response";

/** 確定した請求書の PDF。台帳のデータだけで確定時と同じ内容を出す（spec.md 7.4） */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/ledger/[id]/pdf">,
) {
  const { id } = await params;
  await connection();
  const output = /^\d+$/.test(id)
    ? getLedgerOutput(getDb(), Number(id))
    : undefined;
  if (!output) return new Response("台帳が見つかりません", { status: 404 });

  const pdf = await renderInvoicePdf(output.snapshot, {
    sample: false,
    seal: output.seal,
  });
  return pdfResponse(pdf, output.snapshot.invoiceNumber);
}
