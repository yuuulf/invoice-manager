import {
  feeBearers,
  paymentTermTypes,
  roundingModes,
  type FeeBearer,
  type PaymentTermType,
  type RoundingMode,
} from "@/db/schema";
import { getText as text, isOneOf } from "@/lib/form-data";

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

/** 取引先フォームの入力値を検証する（spec.md 5） */
export function parseClientForm(formData: FormData): ClientParseResult {
  const values: ClientFormValues = {
    name: text(formData, "name"),
    code: text(formData, "code"),
    department: text(formData, "department"),
    contactName: text(formData, "contactName"),
    paymentTermType: text(formData, "paymentTermType"),
    paymentTermDay: text(formData, "paymentTermDay"),
    feeBearer: text(formData, "feeBearer"),
    rounding: text(formData, "rounding"),
  };
  const errors: ClientFormErrors = {};

  if (!values.name) {
    errors.name = "会社名を入力してください";
  }

  if (!values.code) {
    errors.code = "取引先コードを入力してください";
  } else if (!CLIENT_CODE_PATTERN.test(values.code)) {
    errors.code = "取引先コードは英大文字・数字の3桁で入力してください";
  }

  const { paymentTermType, feeBearer, rounding } = values;
  if (!isOneOf(paymentTermTypes, paymentTermType)) {
    errors.paymentTermType = "支払い期限を選択してください";
  }

  let paymentTermDay: number | null = null;
  if (paymentTermType === "next_month_day") {
    if (!values.paymentTermDay) {
      errors.paymentTermDay = "日を入力してください";
    } else if (!/^\d+$/.test(values.paymentTermDay)) {
      errors.paymentTermDay = "日は1〜31の整数で入力してください";
    } else {
      paymentTermDay = Number(values.paymentTermDay);
      if (paymentTermDay < 1 || paymentTermDay > 31) {
        errors.paymentTermDay = "日は1〜31の整数で入力してください";
      }
    }
  }

  if (!isOneOf(feeBearers, feeBearer)) {
    errors.feeBearer = "手数料負担を選択してください";
  }
  if (!isOneOf(roundingModes, rounding)) {
    errors.rounding = "端数処理を選択してください";
  }

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
      paymentTermDay,
      feeBearer,
      rounding,
    },
  };
}
