"use client";

import { useActionState } from "react";
import { BACK_PARAM, listHref } from "@/lib/list-query";
import { preventEnterSubmit } from "@/components/ui/prevent-enter-submit";
import { FormActions, type FormMode } from "@/components/ui/form-actions";
import { FormColumns } from "@/components/ui/form-columns";
import { FormSection } from "@/components/ui/form-section";
import { RadioGroup } from "@/components/ui/radio-group";
import { TextField } from "@/components/ui/text-field";
import { useBlurValidation } from "@/components/ui/use-blur-validation";
import { accountTypes } from "@/db/schema";
import { accountTypeLabels } from "@/lib/owners/labels";
import type { OwnerSummary } from "@/lib/owners/repository";
import {
  readOwnerValues,
  validateOwnerField,
  type OwnerFormValues,
} from "@/lib/owners/validation";
import { digitsOnly } from "@/lib/text-rules";
import type { OwnerFormState } from "../actions";
import { SealField } from "./seal-field";

type Action = (
  state: OwnerFormState,
  formData: FormData,
) => Promise<OwnerFormState>;

/** 作成時の初期値（spec.md 6） */
const newOwnerValues: OwnerFormValues = {
  name: "",
  tradeName: "",
  postalCode: "",
  address1: "",
  address2: "",
  phone: "",
  email: "",
  bankName: "",
  bankCode: "",
  branchName: "",
  branchCode: "",
  accountType: "ordinary",
  accountNumber: "",
  accountHolder: "",
};

function valuesOf(owner: OwnerSummary): OwnerFormValues {
  return {
    ...owner,
    tradeName: owner.tradeName ?? "",
    address2: owner.address2 ?? "",
  };
}

export function OwnerForm({
  action,
  owner,
  mode,
  back = "",
}: {
  action: Action;
  owner?: OwnerSummary;
  mode: FormMode;
  /** 一覧に戻るときの条件（一覧の検索パラメータ） */
  back?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? (owner ? valuesOf(owner) : newOwnerValues);
  const { errors, onBlur } = useBlurValidation(
    state,
    state?.errors ?? {},
    (name, formData) => validateOwnerField(name, readOwnerValues(formData)),
  );
  const field = (name: keyof OwnerFormValues) => ({
    name,
    defaultValue: values[name],
    error: errors[name],
  });
  /** 入力制限: 数字だけを、決まった桁数まで */
  const digits = (length: number) => (value: string) =>
    digitsOnly(value).slice(0, length);

  return (
    <form
      action={formAction}
      onBlur={onBlur}
      // 保存・作成はボタンだけで行う（入力欄で Enter を押しても送信しない）
      onKeyDown={preventEnterSubmit}
      noValidate
      className="max-w-4xl space-y-10"
    >
      {owner && <input type="hidden" name="id" value={owner.id} />}
      <FormColumns>
        <FormSection title="基本情報">
          <TextField label="屋号" {...field("tradeName")} />
          <TextField label="氏名" required {...field("name")} />
          <TextField
            label="郵便番号"
            required
            inputMode="numeric"
            inputFilter={digits(7)}
            hint="ハイフンなしの7桁（例: 1500001）"
            className="w-32"
            {...field("postalCode")}
          />
          <TextField label="住所（1行目）" required {...field("address1")} />
          <TextField label="住所（2行目）" {...field("address2")} />
          <TextField
            label="電話番号"
            required
            type="tel"
            hint="数字とハイフン（例: 03-1234-5678）"
            {...field("phone")}
          />
          <TextField
            label="メールアドレス"
            required
            type="email"
            {...field("email")}
          />
        </FormSection>
        <FormSection title="振込先">
          <TextField label="銀行名" required {...field("bankName")} />
          <TextField
            label="銀行番号"
            required
            inputMode="numeric"
            inputFilter={digits(4)}
            hint="4桁の数字"
            {...field("bankCode")}
          />
          <TextField label="支店名" required {...field("branchName")} />
          <TextField
            label="支店番号"
            required
            inputMode="numeric"
            inputFilter={digits(3)}
            hint="3桁の数字"
            {...field("branchCode")}
          />
          <RadioGroup
            legend="科目"
            name="accountType"
            required
            defaultValue={values.accountType}
            error={errors.accountType}
            options={accountTypes.map((value) => ({
              value,
              label: accountTypeLabels[value],
            }))}
          />
          <TextField
            label="口座番号"
            required
            inputMode="numeric"
            inputFilter={digits(7)}
            hint="7桁の数字"
            {...field("accountNumber")}
          />
          <TextField label="口座名義" required {...field("accountHolder")} />
        </FormSection>
      </FormColumns>
      <FormSection title="データ印">
        <SealField
          currentSealUrl={
            owner?.hasSeal
              ? `/owners/${owner.id}/seal?v=${owner.updatedAt.getTime()}`
              : undefined
          }
          error={errors.seal}
        />
      </FormSection>
      <input type="hidden" name={BACK_PARAM} value={back} />
      <FormActions
        mode={mode}
        cancelHref={listHref("/owners", back)}
        pending={pending}
      />
    </form>
  );
}
