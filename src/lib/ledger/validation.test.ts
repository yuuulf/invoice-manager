import { describe, expect, test } from "vitest";
import {
  isHttpUrl,
  LEDGER_MEMO_MAX_LENGTH,
  SENT_FILE_URL_MAX_LENGTH,
  parseLedgerForm,
  validateLedgerField,
  type LedgerFormValues,
} from "./validation";

function form(values: Partial<LedgerFormValues>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const base: LedgerFormValues = {
  status: "unsent",
  sentOn: "",
  paidOn: "",
  sentFileUrl: "",
  memo: "",
};

describe("validateLedgerField", () => {
  test("状態は未送信・送信済み・入金済みのどれか", () => {
    expect(validateLedgerField("status", { ...base, status: "x" })).toBe(
      "状態を選択してください",
    );
    expect(validateLedgerField("status", base)).toBeUndefined();
  });

  test("送信済み・入金済みなら送信日が必要", () => {
    expect(validateLedgerField("sentOn", base)).toBeUndefined();
    expect(validateLedgerField("sentOn", { ...base, status: "sent" })).toBe(
      "送信日を入力してください",
    );
    expect(
      validateLedgerField("sentOn", {
        ...base,
        status: "paid",
        sentOn: "2026-02-30",
      }),
    ).toBe("送信日の日付が正しくありません");
  });

  test("入金済みなら入金日が必要で、送信日より前にはできない", () => {
    const paid = { ...base, status: "paid", sentOn: "2026-11-30" };
    expect(validateLedgerField("paidOn", { ...base, status: "sent" })).toBe(
      undefined,
    );
    expect(validateLedgerField("paidOn", paid)).toBe(
      "入金日を入力してください",
    );
    expect(
      validateLedgerField("paidOn", { ...paid, paidOn: "2026-11-29" }),
    ).toBe("入金日は送信日以降の日付を入力してください");
    expect(
      validateLedgerField("paidOn", { ...paid, paidOn: "2026-11-30" }),
    ).toBeUndefined();
  });

  test("送信ファイルは任意で、http(s) の URL だけ", () => {
    const sent = { ...base, status: "sent", sentOn: "2026-11-30" };
    expect(validateLedgerField("sentFileUrl", sent)).toBeUndefined();
    expect(
      validateLedgerField("sentFileUrl", {
        ...sent,
        sentFileUrl: "https://drive.google.com/file/d/abc/view",
      }),
    ).toBeUndefined();
    for (const sentFileUrl of ["drive.google.com/abc", "javascript:alert(1)"]) {
      expect(validateLedgerField("sentFileUrl", { ...sent, sentFileUrl })).toBe(
        "送信ファイルは http:// または https:// で始まるURLを入力してください",
      );
    }
    const long = `https://example.com/${"a".repeat(SENT_FILE_URL_MAX_LENGTH)}`;
    expect(
      validateLedgerField("sentFileUrl", { ...sent, sentFileUrl: long }),
    ).toBe(
      `送信ファイルは${SENT_FILE_URL_MAX_LENGTH}文字以内で入力してください`,
    );
    // 未送信ではチェックしない（保存時に消す）
    expect(
      validateLedgerField("sentFileUrl", { ...base, sentFileUrl: "x" }),
    ).toBeUndefined();
  });

  test("isHttpUrl は http(s) で始まる正しい URL だけ true", () => {
    expect(isHttpUrl("https://drive.google.com/x")).toBe(true);
    expect(isHttpUrl("HTTP://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("https://")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });

  test("備考は上限の文字数まで", () => {
    const memo = "あ".repeat(LEDGER_MEMO_MAX_LENGTH);
    expect(validateLedgerField("memo", { ...base, memo })).toBeUndefined();
    expect(validateLedgerField("memo", { ...base, memo: `${memo}あ` })).toBe(
      `備考は${LEDGER_MEMO_MAX_LENGTH}文字以内で入力してください`,
    );
  });
});

describe("parseLedgerForm", () => {
  test("入金済みなら送信日・入金日・備考を返す", () => {
    const result = parseLedgerForm(
      form({
        status: "paid",
        sentOn: "2026-11-30",
        paidOn: "2026-12-25",
        memo: "振込確認\n",
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      data: { sentOn: "2026-11-30", paidOn: "2026-12-25", memo: "振込確認" },
    });
  });

  test("未入金に戻すと入金日を、未送信に戻すと送信日・リンクも消す", () => {
    const dates = {
      sentOn: "2026-11-30",
      paidOn: "2026-12-25",
      sentFileUrl: "https://drive.google.com/x",
    };
    expect(parseLedgerForm(form({ status: "sent", ...dates }))).toMatchObject({
      ok: true,
      data: {
        sentOn: "2026-11-30",
        paidOn: null,
        sentFileUrl: "https://drive.google.com/x",
        memo: null,
      },
    });
    expect(parseLedgerForm(form({ status: "unsent", ...dates }))).toMatchObject(
      { ok: true, data: { sentOn: null, paidOn: null, sentFileUrl: null } },
    );
  });

  test("エラーがあれば項目ごとに返す", () => {
    const result = parseLedgerForm(form({ status: "paid" }));
    expect(result).toMatchObject({
      ok: false,
      errors: {
        sentOn: "送信日を入力してください",
        paidOn: "入金日を入力してください",
      },
    });
  });
});
