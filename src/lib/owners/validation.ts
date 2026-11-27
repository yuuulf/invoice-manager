import { accountTypes, type AccountType } from "@/db/schema";
import { getText, isOneOf } from "@/lib/form-data";
import { exceeds, maxLengthMessage } from "@/lib/text-rules";
import { isPng, SEAL_MAX_BYTES } from "./seal";

export type OwnerInput = {
  name: string;
  tradeName: string | null;
  postalCode: string;
  address1: string;
  address2: string | null;
  phone: string;
  email: string;
  bankName: string;
  bankCode: string;
  branchName: string;
  branchCode: string;
  accountType: AccountType;
  accountNumber: string;
  accountHolder: string;
};

/** データ印の変更内容 */
export type SealChange =
  { type: "keep" } | { type: "remove" } | { type: "replace"; data: Buffer };

type TextField = keyof OwnerInput;
export type OwnerFormValues = Record<TextField, string>;
export type OwnerFormErrors = Partial<Record<TextField | "seal", string>>;

export type OwnerParseResult =
  | { ok: true; data: OwnerInput; seal: SealChange; values: OwnerFormValues }
  | { ok: false; errors: OwnerFormErrors; values: OwnerFormValues };

const textFields: TextField[] = [
  "name",
  "tradeName",
  "postalCode",
  "address1",
  "address2",
  "phone",
  "email",
  "bankName",
  "bankCode",
  "branchName",
  "branchCode",
  "accountType",
  "accountNumber",
  "accountHolder",
];

const requiredMessages: Partial<Record<TextField, string>> = {
  name: "氏名を入力してください",
  postalCode: "郵便番号を入力してください",
  address1: "住所（1行目）を入力してください",
  phone: "電話番号を入力してください",
  email: "メールアドレスを入力してください",
  bankName: "銀行名を入力してください",
  bankCode: "銀行番号を入力してください",
  branchName: "支店名を入力してください",
  branchCode: "支店番号を入力してください",
  accountNumber: "口座番号を入力してください",
  accountHolder: "口座名義を入力してください",
};

const formatRules: Partial<Record<TextField, [RegExp, string]>> = {
  postalCode: [
    /^\d{7}$/,
    "郵便番号はハイフンなしの7桁の数字で入力してください",
  ],
  phone: [/^\d[\d-]*\d$/, "電話番号は数字とハイフンで入力してください"],
  email: [
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    "メールアドレスの形式が正しくありません",
  ],
  bankCode: [/^\d{4}$/, "銀行番号は4桁の数字で入力してください"],
  branchCode: [/^\d{3}$/, "支店番号は3桁の数字で入力してください"],
  accountNumber: [/^\d{7}$/, "口座番号は7桁の数字で入力してください"],
};

/** 文字数の上限（spec.md 6）。桁数が決まっている項目は formatRules でチェックする */
export const OWNER_MAX_LENGTHS = {
  tradeName: 20,
  name: 20,
  address1: 20,
  address2: 20,
  phone: 15,
  email: 254,
  bankName: 40,
  branchName: 40,
  accountHolder: 50,
} as const;

const labels: Record<keyof typeof OWNER_MAX_LENGTHS, string> = {
  tradeName: "屋号",
  name: "氏名",
  address1: "住所（1行目）",
  address2: "住所（2行目）",
  phone: "電話番号",
  email: "メールアドレス",
  bankName: "銀行名",
  branchName: "支店名",
  accountHolder: "口座名義",
};

/**
 * 事業主フォームの 1 項目をチェックする（spec.md 6）。保存時とフォーカスアウト時に使う。
 * 問題なければ undefined、チェックしない項目（データ印など）なら null
 */
export function validateOwnerField(
  name: string,
  values: OwnerFormValues,
): string | undefined | null {
  if (!(textFields as string[]).includes(name)) return null;
  const key = name as TextField;
  const value = values[key];
  if (key === "accountType") {
    return isOneOf(accountTypes, value) ? undefined : "科目を選択してください";
  }
  if (!value) return requiredMessages[key];
  const max = OWNER_MAX_LENGTHS[key as keyof typeof OWNER_MAX_LENGTHS];
  if (max !== undefined && exceeds(value, max)) {
    return maxLengthMessage(labels[key as keyof typeof OWNER_MAX_LENGTHS], max);
  }
  const rule = formatRules[key];
  if (rule && !rule[0].test(value)) return rule[1];
  return undefined;
}

/** FormData から事業主フォームの値（データ印以外）を読む */
export function readOwnerValues(formData: FormData): OwnerFormValues {
  return Object.fromEntries(
    textFields.map((key) => [key, getText(formData, key)]),
  ) as OwnerFormValues;
}

async function parseSeal(
  formData: FormData,
): Promise<{ ok: true; seal: SealChange } | { ok: false; error: string }> {
  const file = formData.get("seal");
  if (file instanceof File && file.size > 0) {
    if (file.size > SEAL_MAX_BYTES) {
      return { ok: false, error: "データ印は1MB以下の画像を選択してください" };
    }
    const data = Buffer.from(await file.arrayBuffer());
    if (!isPng(data)) {
      return { ok: false, error: "データ印はPNG画像を選択してください" };
    }
    return { ok: true, seal: { type: "replace", data } };
  }
  if (formData.get("removeSeal") === "on") {
    return { ok: true, seal: { type: "remove" } };
  }
  return { ok: true, seal: { type: "keep" } };
}

/** 事業主フォームの入力値を検証する（spec.md 6） */
export async function parseOwnerForm(
  formData: FormData,
): Promise<OwnerParseResult> {
  const values = readOwnerValues(formData);
  const errors: OwnerFormErrors = {};
  for (const key of textFields) {
    const error = validateOwnerField(key, values);
    if (error) errors[key] = error;
  }
  const { accountType } = values;

  const seal = await parseSeal(formData);
  if (!seal.ok) errors.seal = seal.error;

  if (
    Object.keys(errors).length > 0 ||
    !seal.ok ||
    !isOneOf(accountTypes, accountType)
  ) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    values,
    seal: seal.seal,
    data: {
      ...values,
      tradeName: values.tradeName || null,
      address2: values.address2 || null,
      accountType,
    },
  };
}
