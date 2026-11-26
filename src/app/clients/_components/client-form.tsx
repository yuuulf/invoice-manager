"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { RadioGroup } from "@/components/ui/radio-group";
import { TextField } from "@/components/ui/text-field";
import {
  feeBearers,
  paymentTermTypes,
  roundingModes,
  type Client,
} from "@/db/schema";
import {
  feeBearerLabels,
  paymentTermLabels,
  roundingLabels,
} from "@/lib/clients/labels";
import type { ClientFormValues } from "@/lib/clients/validation";
import type { ClientFormState } from "../actions";

type Action = (
  state: ClientFormState,
  formData: FormData,
) => Promise<ClientFormState>;

/** 新規登録時の初期値（spec.md 5） */
const newClientValues: ClientFormValues = {
  name: "",
  code: "",
  department: "",
  contactName: "",
  paymentTermType: "next_month_end",
  paymentTermDay: "",
  feeBearer: "none",
  rounding: "floor",
};

function valuesOf(client: Client): ClientFormValues {
  return {
    name: client.name,
    code: client.code,
    department: client.department ?? "",
    contactName: client.contactName ?? "",
    paymentTermType: client.paymentTermType,
    paymentTermDay: client.paymentTermDay?.toString() ?? "",
    feeBearer: client.feeBearer,
    rounding: client.rounding,
  };
}

export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: Action;
  client?: Client;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? (client ? valuesOf(client) : newClientValues);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} noValidate className="max-w-xl space-y-6">
      {client && <input type="hidden" name="id" value={client.id} />}
      <TextField
        label="会社名"
        name="name"
        required
        defaultValue={values.name}
        error={errors.name}
      />
      <TextField
        label="取引先コード"
        name="code"
        required
        maxLength={3}
        hint="英大文字・数字の3桁（例: ABC、A1B）"
        defaultValue={values.code}
        error={errors.code}
        className="w-24"
      />
      <TextField
        label="部署"
        name="department"
        defaultValue={values.department}
        error={errors.department}
      />
      <TextField
        label="担当者名"
        name="contactName"
        defaultValue={values.contactName}
        error={errors.contactName}
      />
      <div>
        <RadioGroup
          legend="支払い期限"
          name="paymentTermType"
          required
          defaultValue={values.paymentTermType}
          error={errors.paymentTermType}
          hint="支払い期限は請求書ごとに手動で変更できます。"
          options={paymentTermTypes.map((value) => ({
            value,
            label: paymentTermLabels[value],
            addon:
              value === "next_month_day" ? (
                <span className="flex items-center gap-1">
                  <span aria-hidden>N =</span>
                  <input
                    name="paymentTermDay"
                    inputMode="numeric"
                    aria-label="翌月 N 日の N"
                    aria-invalid={errors.paymentTermDay ? true : undefined}
                    defaultValue={values.paymentTermDay}
                    className={`w-16 rounded border px-2 py-1 ${errors.paymentTermDay ? "border-red-600" : "border-zinc-300"}`}
                  />
                </span>
              ) : undefined,
          }))}
        />
        <FieldError id="paymentTermDay-error" message={errors.paymentTermDay} />
      </div>
      <RadioGroup
        legend="手数料負担"
        name="feeBearer"
        required
        defaultValue={values.feeBearer}
        error={errors.feeBearer}
        options={feeBearers.map((value) => ({
          value,
          label: feeBearerLabels[value],
        }))}
      />
      <RadioGroup
        legend="端数処理"
        name="rounding"
        required
        defaultValue={values.rounding}
        error={errors.rounding}
        options={roundingModes.map((value) => ({
          value,
          label: roundingLabels[value],
        }))}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
        <ButtonLink href="/clients" variant="secondary">
          キャンセル
        </ButtonLink>
      </div>
    </form>
  );
}
