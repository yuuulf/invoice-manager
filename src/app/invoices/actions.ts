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
import {
  parseInvoiceForm,
  type InvoiceFormErrors,
  type InvoiceFormValues,
} from "@/lib/invoices/validation";

export type InvoiceFormState = {
  errors: InvoiceFormErrors;
  values: InvoiceFormValues;
} | null;

function idFrom(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("不正な請求書IDです");
  return id;
}

async function save(
  id: number | undefined,
  formData: FormData,
): Promise<InvoiceFormState> {
  const parsed = parseInvoiceForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const result = saveInvoice(getDb(), id, parsed.data);
  if (!result.ok) return { errors: result.errors, values: parsed.values };
  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function createInvoiceAction(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  return save(undefined, formData);
}

export async function updateInvoiceAction(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  return save(idFrom(formData), formData);
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
