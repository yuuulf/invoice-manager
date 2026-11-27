import { describe, expect, test } from "vitest";
import { parseInvoiceForm, SUBJECT_MAX_LENGTH } from "./validation";

function form(entries: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

describe("parseInvoiceForm（作成中の保存）", () => {
  test("何も入力していなくても保存できる", () => {
    const result = parseInvoiceForm(form());
    expect(result).toMatchObject({
      ok: true,
      data: {
        clientId: null,
        ownerId: null,
        issueDate: null,
        subject: null,
        periodType: null,
        dueDate: null,
        dueDateManual: false,
        notes: null,
        items: [],
      },
    });
  });

  test("入力済みの値を変換する。対象期間は種類に合う値だけ残す", () => {
    const result = parseInvoiceForm(
      form({
        clientId: "3",
        ownerId: "4",
        issueDate: "2026-11-30",
        subject: " Webサイト保守 ",
        periodType: "month",
        periodMonth: "2026-11",
        periodStart: "2026-11-01",
        dueDate: "2026-12-31",
        dueDateManual: "true",
        notes: "\n いつもお世話になっております。\r\nよろしくお願いします。\n",
      }),
    );
    expect(result.ok && result.data).toMatchObject({
      clientId: 3,
      ownerId: 4,
      issueDate: "2026-11-30",
      subject: "Webサイト保守",
      periodType: "month",
      periodMonth: "2026-11",
      periodStart: null,
      periodEnd: null,
      dueDate: "2026-12-31",
      dueDateManual: true,
      notes: "いつもお世話になっております。\nよろしくお願いします。",
    });
  });

  test("入力のある明細行だけを行番号付きで返す", () => {
    const result = parseInvoiceForm(
      form({
        "items.0.description": "Webサイト保守",
        "items.0.quantity": "1",
        "items.0.unit": "式",
        "items.0.unitPrice": "50000",
        "items.2.description": "LP改修作業",
        "items.2.quantity": "1.5",
      }),
    );
    expect(result.ok && result.data.items).toEqual([
      {
        position: 0,
        description: "Webサイト保守",
        quantity: 100,
        unit: "式",
        unitPrice: 50000,
      },
      {
        position: 2,
        description: "LP改修作業",
        quantity: 150,
        unit: null,
        unitPrice: null,
      },
    ]);
  });

  test.each([
    ["issueDate", "2026-02-30", "issueDate", "請求日の日付が正しくありません"],
    ["dueDate", "2026/12/31", "dueDate", "支払い期限の日付が正しくありません"],
    ["periodType", "week", "periodType", "対象期間の種類を選択してください"],
    [
      "items.1.quantity",
      "1.234",
      "items.1.quantity",
      "数量は0以上の数値（小数第2位まで）で入力してください",
    ],
    [
      "items.1.quantity",
      "-1",
      "items.1.quantity",
      "数量は0以上の数値（小数第2位まで）で入力してください",
    ],
    [
      "items.9.unitPrice",
      "1.5",
      "items.9.unitPrice",
      "単価は0以上の整数で入力してください",
    ],
    [
      "items.9.unitPrice",
      "-100",
      "items.9.unitPrice",
      "単価は0以上の整数で入力してください",
    ],
  ])("%s=%s は形式エラー", (key, value, errorKey, message) => {
    const result = parseInvoiceForm(form({ [key]: value }));
    expect(result).toMatchObject({
      ok: false,
      errors: { [errorKey]: message },
    });
  });

  test("対象期間（月）の年月の形式をチェックする", () => {
    expect(
      parseInvoiceForm(form({ periodType: "month", periodMonth: "2026-13" })),
    ).toMatchObject({
      ok: false,
      errors: { periodMonth: "対象期間の年月が正しくありません" },
    });
  });

  test("対象期間（期間）は開始日 ≤ 終了日", () => {
    const base = { periodType: "range", periodStart: "2026-11-15" };
    expect(
      parseInvoiceForm(form({ ...base, periodEnd: "2026-11-01" })),
    ).toMatchObject({
      ok: false,
      errors: { periodEnd: "対象期間の終了日は開始日以降にしてください" },
    });
    expect(
      parseInvoiceForm(form({ ...base, periodEnd: "2026-11-15" })).ok,
    ).toBe(true);
  });

  test("件名は34文字まで", () => {
    expect(SUBJECT_MAX_LENGTH).toBe(34);
    expect(parseInvoiceForm(form({ subject: "あ".repeat(34) })).ok).toBe(true);
    expect(parseInvoiceForm(form({ subject: "あ".repeat(35) }))).toMatchObject({
      ok: false,
      errors: { subject: "件名は34文字以内で入力してください" },
    });
  });

  test("エラーのときは入力値を返す", () => {
    const result = parseInvoiceForm(
      form({ subject: "件名", "items.0.quantity": "x" }),
    );
    expect(result.ok).toBe(false);
    expect(result.values.subject).toBe("件名");
    expect(result.values.items[0].quantity).toBe("x");
    expect(result.values.items).toHaveLength(10);
  });
});
