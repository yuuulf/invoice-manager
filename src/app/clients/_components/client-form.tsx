"use client";

import { useActionState } from "react";
import { FieldError } from "@/components/ui/field-error";
import { inputFilterHandlers } from "@/components/ui/input-filter";
import { FormActions, type FormMode } from "@/components/ui/form-actions";
import { RadioGroup } from "@/components/ui/radio-group";
import { TextField } from "@/components/ui/text-field";
import { useBlurValidation } from "@/components/ui/use-blur-validation";
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
import {
  CLIENT_MAX_LENGTHS,
  readClientValues,
  validateClientField,
  type ClientFormValues,
} from "@/lib/clients/validation";
import { digitsOnly, upperAlphanumericOnly } from "@/lib/text-rules";
import type { ClientFormState } from "../actions";

type Action = (
  state: ClientFormState,
  formData: FormData,
) => Promise<ClientFormState>;

/** 作成時の初期値（spec.md 5） */
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
  mode,
}: {
  action: Action;
  client?: Client;
  mode: FormMode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? (client ? valuesOf(client) : newClientValues);
  const { errors, onBlur } = useBlurValidation(
    state,
    state?.errors ?? {},
    (name, formData) => validateClientField(name, readClientValues(formData)),
  );

  return (
    <form
      action={formAction}
      onBlur={onBlur}
      noValidate
      className="max-w-xl space-y-6"
    >
      {client && <input type="hidden" name="id" value={client.id} />}
      <TextField
        label="会社名"
        name="name"
        required
        maxLength={CLIENT_MAX_LENGTHS.name}
        defaultValue={values.name}
        error={errors.name}
      />
      <TextField
        label="取引先コード"
        name="code"
        required
        inputFilter={(v) => upperAlphanumericOnly(v).slice(0, 3)}
        hint="英大文字・数字の3桁（例: ABC、A1B）"
        defaultValue={values.code}
        error={errors.code}
        className="w-24"
      />
      <TextField
        label="部署"
        name="department"
        maxLength={CLIENT_MAX_LENGTHS.department}
        defaultValue={values.department}
        error={errors.department}
      />
      <TextField
        label="担当者名"
        name="contactName"
        maxLength={CLIENT_MAX_LENGTHS.contactName}
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
                    {...inputFilterHandlers((v) => digitsOnly(v).slice(0, 2))}
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
      <FormActions mode={mode} cancelHref="/clients" pending={pending} />
    </form>
  );
}
