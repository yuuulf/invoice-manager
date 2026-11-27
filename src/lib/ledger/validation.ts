import { getText, isOneOf } from "@/lib/form-data";
import { isValidDate } from "@/lib/invoices/calc";
import { exceeds, maxLengthMessage } from "@/lib/text-rules";
import { ledgerStatuses } from "./status";

export type LedgerStatusInput = {
  sentOn: string | null;
  paidOn: string | null;
  sentFileUrl: string | null;
  memo: string | null;
};

export type LedgerFormValues = {
  status: string;
  sentOn: string;
  paidOn: string;
  sentFileUrl: string;
  memo: string;
};
export type LedgerFormErrors = Partial<Record<keyof LedgerFormValues, string>>;

export type LedgerParseResult =
  | { ok: true; data: LedgerStatusInput; values: LedgerFormValues }
  | { ok: false; errors: LedgerFormErrors; values: LedgerFormValues };

/** 台帳の備考の最大文字数（spec.md 7.6） */
export const LEDGER_MEMO_MAX_LENGTH = 200;

/** 送信ファイルの URL の最大文字数（spec.md 7.6） */
export const SENT_FILE_URL_MAX_LENGTH = 2000;

/** http:// か https:// で始まる URL か（javascript: などのリンクを開かせないため） */
export function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 台帳の編集フォームの 1 項目をチェックする（spec.md 7.6）。保存時とフォーカスアウト時に使う。
 * 問題なければ undefined、チェックしない項目なら null
 */
export function validateLedgerField(
  name: string,
  values: LedgerFormValues,
): string | undefined | null {
  const sent = values.status === "sent" || values.status === "paid";
  switch (name) {
    case "status":
      return isOneOf(ledgerStatuses, values.status)
        ? undefined
        : "状態を選択してください";
    case "sentOn":
      if (!sent) return undefined;
      if (!values.sentOn) return "送信日を入力してください";
      return isValidDate(values.sentOn)
        ? undefined
        : "送信日の日付が正しくありません";
    case "paidOn":
      if (values.status !== "paid") return undefined;
      if (!values.paidOn) return "入金日を入力してください";
      if (!isValidDate(values.paidOn)) return "入金日の日付が正しくありません";
      // 日付は yyyy-MM-dd なので文字列で比べられる
      return isValidDate(values.sentOn) && values.paidOn < values.sentOn
        ? "入金日は送信日以降の日付を入力してください"
        : undefined;
    case "sentFileUrl":
      if (!sent || !values.sentFileUrl) return undefined;
      if (exceeds(values.sentFileUrl, SENT_FILE_URL_MAX_LENGTH))
        return maxLengthMessage("送信ファイル", SENT_FILE_URL_MAX_LENGTH);
      return isHttpUrl(values.sentFileUrl)
        ? undefined
        : "送信ファイルは http:// または https:// で始まるURLを入力してください";
    case "memo":
      return exceeds(values.memo, LEDGER_MEMO_MAX_LENGTH)
        ? maxLengthMessage("備考", LEDGER_MEMO_MAX_LENGTH)
        : undefined;
    default:
      return null;
  }
}

/** FormData から台帳の編集フォームの値を読む */
export function readLedgerValues(formData: FormData): LedgerFormValues {
  const memo = formData.get("memo");
  return {
    status: getText(formData, "status"),
    sentOn: getText(formData, "sentOn"),
    paidOn: getText(formData, "paidOn"),
    sentFileUrl: getText(formData, "sentFileUrl"),
    // 備考は行頭の空白や改行も残す（末尾の空白・改行だけ除く）
    memo: typeof memo === "string" ? memo.trimEnd() : "",
  };
}

/** 台帳の編集フォームの入力値を検証する（spec.md 7.6） */
export function parseLedgerForm(formData: FormData): LedgerParseResult {
  const values = readLedgerValues(formData);
  const errors: LedgerFormErrors = {};
  for (const key of Object.keys(values) as (keyof LedgerFormValues)[]) {
    const error = validateLedgerField(key, values);
    if (error) errors[key] = error;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors, values };

  const { status } = values;
  return {
    ok: true,
    values,
    data: {
      // 未送信に戻したら送信日・入金日・リンクを消す。未入金に戻したら入金日を消す
      sentOn: status === "unsent" ? null : values.sentOn,
      paidOn: status === "paid" ? values.paidOn : null,
      sentFileUrl: status === "unsent" ? null : values.sentFileUrl || null,
      memo: values.memo || null,
    },
  };
}
