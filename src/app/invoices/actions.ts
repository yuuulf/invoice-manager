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

export type InvoiceFormState = {
  errors: InvoiceFormErrors;
  values: InvoiceFormValues;
  /** フォーム全体に出すメッセージ */
  message?: string;
} | null;

function idFrom(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("不正な請求書IDです");
  return id;
}

/**
 * 保存（intent=save）または PDF 出力（intent=output）。
 * 出力は必須項目がそろっているときだけ保存して、プレビュー画面を開く（spec.md 7.4）。
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

  const saved = saveInvoice(getDb(), id, parsed.data);
  if (!saved.ok) return { errors: saved.errors, values: parsed.values };
  revalidatePath("/invoices");
  redirect(output ? `/invoices/${saved.id}/preview` : "/invoices");
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

export type ConfirmState = { message: string } | null;

/**
 * プレビュー画面の「確定してダウンロード」。台帳に記録して台帳画面に移り、確定した PDF をダウンロードする。
 * 請求番号を振り直した場合や必須項目が足りない場合は、確定せずにメッセージを返す（spec.md 7.2, 7.4）。
 */
export async function confirmInvoiceAction(
  _prev: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const id = idFrom(formData);
  const confirmed = confirmInvoice(getDb(), id);
  if (!confirmed.ok) {
    revalidatePath(`/invoices/${id}/preview`);
    return {
      message:
        "renumbered" in confirmed
          ? `請求番号が台帳と重複するため ${confirmed.renumbered} に振り直しました。プレビューを確認して、もう一度確定してください`
          : "必須項目がそろっていないため確定できません。編集に戻って入力してください",
    };
  }
  revalidatePath("/invoices");
  revalidatePath("/ledger");
  // 元の請求書は消えるため、台帳の画面に移ってからダウンロードする
  redirect(`/ledger?download=${confirmed.ledgerId}`);
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
