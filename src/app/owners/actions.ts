"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { RowActionResult } from "@/lib/action-result";
import {
  archiveOwner,
  createOwner,
  deleteOwner,
  restoreOwner,
  updateOwner,
} from "@/lib/owners/repository";
import {
  parseOwnerForm,
  type OwnerFormErrors,
  type OwnerFormValues,
} from "@/lib/owners/validation";

export type OwnerFormState = {
  errors: OwnerFormErrors;
  values: OwnerFormValues;
} | null;

function idFrom(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("不正な事業主IDです");
  return id;
}

export async function createOwnerAction(
  _prev: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const parsed = await parseOwnerForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  createOwner(getDb(), parsed.data, parsed.seal);
  revalidatePath("/owners", "layout");
  redirect("/owners");
}

export async function updateOwnerAction(
  _prev: OwnerFormState,
  formData: FormData,
): Promise<OwnerFormState> {
  const parsed = await parseOwnerForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  updateOwner(getDb(), idFrom(formData), parsed.data, parsed.seal);
  revalidatePath("/owners", "layout");
  redirect("/owners");
}

export async function archiveOwnerAction(
  formData: FormData,
): Promise<RowActionResult> {
  const result = archiveOwner(getDb(), idFrom(formData));
  revalidatePath("/owners", "layout");
  return result;
}

export async function restoreOwnerAction(formData: FormData) {
  restoreOwner(getDb(), idFrom(formData));
  revalidatePath("/owners", "layout");
}

export async function deleteOwnerAction(
  formData: FormData,
): Promise<RowActionResult> {
  const result = deleteOwner(getDb(), idFrom(formData));
  revalidatePath("/owners", "layout");
  return result;
}
