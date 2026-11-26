import { connection } from "next/server";
import { getDb } from "@/db";
import { prepareInvoiceOutput } from "@/lib/ledger/repository";
import { renderInvoicePdf } from "@/lib/pdf/render-invoice";
import { pdfResponse } from "@/lib/pdf/response";
import { getInvoice } from "@/lib/invoices/repository";

/** 確定前の PDF（SAMPLE の透かし入り。spec.md 7.4）。?inline=1 でプレビュー表示用 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/invoices/[id]/pdf">,
) {
  const { id } = await params;
  await connection();
  const db = getDb();
  if (!/^\d+$/.test(id) || !getInvoice(db, Number(id))) {
    return new Response("請求書が見つかりません", { status: 404 });
  }
  const output = prepareInvoiceOutput(db, Number(id));
  if (!output.ok) {
    return new Response("必須項目がそろっていないため出力できません", {
      status: 400,
    });
  }
  const pdf = await renderInvoicePdf(output.snapshot, {
    sample: true,
    seal: output.seal,
  });
  return pdfResponse(pdf, output.snapshot.invoiceNumber, {
    inline: new URL(request.url).searchParams.get("inline") === "1",
    sample: true,
  });
}
