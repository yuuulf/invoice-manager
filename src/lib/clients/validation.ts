import {
  feeBearers,
  paymentTermTypes,
  roundingModes,
  type FeeBearer,
  type PaymentTermType,
  type RoundingMode,
} from "@/db/schema";
import { getText as text, isOneOf } from "@/lib/form-data";
import { exceeds, maxLengthMessage } from "@/lib/text-rules";

export type ClientInput = {
  name: string;
  code: string;
  department: string | null;
  contactName: string | null;
  paymentTermType: PaymentTermType;
  paymentTermDay: number | null;
  feeBearer: FeeBearer;
  rounding: RoundingMode;
};

export type ClientFormValues = Record<keyof ClientInput, string>;
export type ClientFormErrors = Partial<Record<keyof ClientInput, string>>;

export type ClientParseResult =
  | { ok: true; data: ClientInput; values: ClientFormValues }
  | { ok: false; errors: ClientFormErrors; values: ClientFormValues };

export const CLIENT_CODE_PATTERN = /^[A-Z0-9]{3}$/;

/** 文字数の上限（spec.md 5.1） */
export const CLIENT_MAX_LENGTHS = {
  name: 40,
  department: 20,
  contactName: 20,
} as const;

const labels = { name: "会社名", department: "部署", contactName: "担当者名" };

/**
 * 取引先フォームの 1 項目をチェックする（spec.md 5.1）。保存時とフォーカスアウト時に使う。
 * 問題なければ undefined、チェックしない項目なら null
 */
export function validateClientField(
  name: string,
  values: ClientFormValues,
): string | undefined | null {
  const value = values[name as keyof ClientFormValues] ?? "";
  switch (name) {
    case "name":
      if (!value) return "会社名を入力してください";
      break;
    case "code":
      if (!value) return "取引先コードを入力してください";
      if (!CLIENT_CODE_PATTERN.test(value))
        return "取引先コードは英大文字・数字の3桁で入力してください";
      return undefined;
    case "department":
    case "contactName":
      break;
    case "paymentTermType":
      return isOneOf(paymentTermTypes, value)
        ? undefined
        : "支払い期限を選択してください";
    case "paymentTermDay": {
      if (values.paymentTermType !== "next_month_day") return undefined;
      if (!value) return "日を入力してください";
      const day = Number(value);
      return /^\d+$/.test(value) && day >= 1 && day <= 31
        ? undefined
        : "日は1〜31の整数で入力してください";
    }
    case "feeBearer":
      return isOneOf(feeBearers, value)
        ? undefined
        : "手数料負担を選択してください";
    case "rounding":
      return isOneOf(roundingModes, value)
        ? undefined
        : "端数処理を選択してください";
    default:
      return null;
  }
  const key = name as keyof typeof CLIENT_MAX_LENGTHS;
  return exceeds(value, CLIENT_MAX_LENGTHS[key])
    ? maxLengthMessage(labels[key], CLIENT_MAX_LENGTHS[key])
    : undefined;
}

/** FormData から取引先フォームの値を読む */
export function readClientValues(formData: FormData): ClientFormValues {
  return {
    name: text(formData, "name"),
    code: text(formData, "code"),
    department: text(formData, "department"),
    contactName: text(formData, "contactName"),
    paymentTermType: text(formData, "paymentTermType"),
    paymentTermDay: text(formData, "paymentTermDay"),
    feeBearer: text(formData, "feeBearer"),
    rounding: text(formData, "rounding"),
  };
}

/** 取引先フォームの入力値を検証する（spec.md 5） */
export function parseClientForm(formData: FormData): ClientParseResult {
  const values = readClientValues(formData);
  const errors: ClientFormErrors = {};
  for (const key of Object.keys(values) as (keyof ClientFormValues)[]) {
    const error = validateClientField(key, values);
    if (error) errors[key] = error;
  }

  const { paymentTermType, feeBearer, rounding } = values;
  if (
    Object.keys(errors).length > 0 ||
    !isOneOf(paymentTermTypes, paymentTermType) ||
    !isOneOf(feeBearers, feeBearer) ||
    !isOneOf(roundingModes, rounding)
  ) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    values,
    data: {
      name: values.name,
      code: values.code,
      department: values.department || null,
      contactName: values.contactName || null,
      paymentTermType,
      paymentTermDay:
        paymentTermType === "next_month_day"
          ? Number(values.paymentTermDay)
          : null,
      feeBearer,
      rounding,
    },
  };
}
