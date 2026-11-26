"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { RowActionResult } from "@/lib/action-result";
import {
  archiveClient,
  createClient,
  deleteClient,
  restoreClient,
  updateClient,
} from "@/lib/clients/repository";
import {
  parseClientForm,
  type ClientFormErrors,
  type ClientFormValues,
} from "@/lib/clients/validation";

export type ClientFormState = {
  errors: ClientFormErrors;
  values: ClientFormValues;
} | null;

function idFrom(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("不正な取引先IDです");
  return id;
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = parseClientForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const result = createClient(getDb(), parsed.data);
  if (!result.ok) {
    return { errors: result.errors, values: parsed.values };
  }
  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = parseClientForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const result = updateClient(getDb(), idFrom(formData), parsed.data);
  if (!result.ok) {
    return { errors: result.errors, values: parsed.values };
  }
  revalidatePath("/clients");
  redirect("/clients");
}

export async function archiveClientAction(
  formData: FormData,
): Promise<RowActionResult> {
  const result = archiveClient(getDb(), idFrom(formData));
  revalidatePath("/clients");
  return result;
}

export async function restoreClientAction(formData: FormData) {
  restoreClient(getDb(), idFrom(formData));
  revalidatePath("/clients");
}

export async function deleteClientAction(
  formData: FormData,
): Promise<RowActionResult> {
  const result = deleteClient(getDb(), idFrom(formData));
  revalidatePath("/clients");
  return result;
}
