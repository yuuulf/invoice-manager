"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { RowActionResult } from "@/lib/action-result";
import {
  archiveInvoice,
  deleteInvoice,
  restoreInvoice,
  saveInvoice,
} from "@/lib/invoices/repository";
import { checkCompleteness } from "@/lib/invoices/snapshot";
import {
  parseInvoiceForm,
  type InvoiceFormErrors,
  type InvoiceFormValues,
} from "@/lib/invoices/validation";
import { confirmInvoice } from "@/lib/ledger/repository";

export type InvoiceFormState =
  | {
      errors: InvoiceFormErrors;
      values: InvoiceFormValues;
      /** フォーム全体に出すメッセージ */
      message?: string;
      /** 保存後の請求番号（振り直したときに表示を更新する） */
      invoiceNumber?: string | null;
    }
  | {
      /** PDF 出力に成功した。ダウンロードしてから next に移動する */
      download: string;
      next: string;
    }
  | null;

function idFrom(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("不正な請求書IDです");
  return id;
}

/**
 * 保存（intent=save）または PDF 出力（intent=output）。
 * 出力は必須項目がそろっているときだけ保存してから行い、確定にチェックがあれば台帳に記録する（spec.md 7.4）。
 */
async function submit(
  id: number | undefined,
  formData: FormData,
): Promise<InvoiceFormState> {
  const parsed = parseInvoiceForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const output = formData.get("intent") === "output";
  if (output) {
    const errors = checkCompleteness(parsed.data);
    if (Object.keys(errors).length > 0) {
      return {
        errors,
        values: parsed.values,
        message: "PDFを出力するには、必須項目をすべて入力してください",
      };
    }
  }

  const db = getDb();
  const saved = saveInvoice(db, id, parsed.data);
  if (!saved.ok) return { errors: saved.errors, values: parsed.values };
  revalidatePath("/invoices");
  if (!output) redirect("/invoices");

  if (formData.get("confirm") !== "on") {
    return {
      download: `/invoices/${saved.id}/pdf`,
      next: `/invoices/${saved.id}/edit`,
    };
  }

  const confirmed = confirmInvoice(db, saved.id);
  if (!confirmed.ok) {
    return "renumbered" in confirmed
      ? {
          errors: {},
          values: parsed.values,
          invoiceNumber: confirmed.renumbered,
          message: `請求番号が台帳と重複するため ${confirmed.renumbered} に振り直しました。内容を確認して、もう一度確定してください`,
        }
      : {
          errors: confirmed.errors,
          values: parsed.values,
          message: "PDFを出力するには、必須項目をすべて入力してください",
        };
  }
  revalidatePath("/ledger");
  return { download: `/ledger/${confirmed.ledgerId}/pdf`, next: "/ledger" };
}

export async function createInvoiceAction(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  return submit(undefined, formData);
}

export async function updateInvoiceAction(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  return submit(idFrom(formData), formData);
}

export async function archiveInvoiceAction(
  formData: FormData,
): Promise<RowActionResult> {
  archiveInvoice(getDb(), idFrom(formData));
  revalidatePath("/invoices");
  return undefined;
}

export async function restoreInvoiceAction(
  formData: FormData,
): Promise<RowActionResult> {
  restoreInvoice(getDb(), idFrom(formData));
  revalidatePath("/invoices");
  return undefined;
}

export async function deleteInvoiceAction(
  formData: FormData,
): Promise<RowActionResult> {
  deleteInvoice(getDb(), idFrom(formData));
  revalidatePath("/invoices");
  return undefined;
}
