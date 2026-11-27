"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { RowActionResult } from "@/lib/action-result";
import { getText } from "@/lib/form-data";
import {
  copyLedgerToInvoice,
  deleteLedgerEntry,
  updateLedgerStatus,
} from "@/lib/ledger/repository";
import {
  parseLedgerForm,
  type LedgerFormErrors,
  type LedgerFormValues,
} from "@/lib/ledger/validation";

export type LedgerFormState = {
  errors: LedgerFormErrors;
  values: LedgerFormValues;
} | null;

function idFrom(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("不正な台帳IDです");
  return id;
}

/** 台帳から請求書画面にコピーし、その請求書の編集画面を開く（spec.md 7.4） */
export async function copyLedgerAction(formData: FormData): Promise<void> {
  const invoiceId = copyLedgerToInvoice(getDb(), idFrom(formData));
  revalidatePath("/invoices", "layout");
  redirect(`/invoices/${invoiceId}/edit`);
}

/** 台帳を削除する。請求書番号の入力で確認する（spec.md 4） */
export async function deleteLedgerAction(
  formData: FormData,
): Promise<RowActionResult> {
  const result = deleteLedgerEntry(
    getDb(),
    idFrom(formData),
    getText(formData, "confirmation"),
  );
  revalidatePath("/ledger", "layout");
  return result;
}

/** 台帳の送信・入金・備考を保存する（spec.md 7.6） */
export async function updateLedgerAction(
  _prev: LedgerFormState,
  formData: FormData,
): Promise<LedgerFormState> {
  const parsed = parseLedgerForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  updateLedgerStatus(getDb(), idFrom(formData), parsed.data);
  revalidatePath("/ledger", "layout");
  redirect("/ledger");
}
