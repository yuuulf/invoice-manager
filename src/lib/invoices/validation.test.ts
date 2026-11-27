import { describe, expect, test } from "vitest";
import {
  countNoteLines,
  parseInvoiceForm,
  SUBJECT_MAX_LENGTH,
} from "./validation";

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

  test("消費税は未送信なら税抜。税込を選べる。不正な値はエラー", () => {
    expect(
      parseInvoiceForm(form()).ok && parseInvoiceForm(form()),
    ).toMatchObject({
      data: { taxMode: "excluded" },
    });
    expect(parseInvoiceForm(form({ taxMode: "included" }))).toMatchObject({
      ok: true,
      data: { taxMode: "included" },
    });
    expect(parseInvoiceForm(form({ taxMode: "x" }))).toMatchObject({
      ok: false,
      errors: { taxMode: "消費税を選択してください" },
    });
  });

  test("備考は1行50文字（全角換算）で折り返して5行まで", () => {
    const message = "備考は1行50文字で折り返して5行以内で入力してください";
    // 50 文字ちょうどは 1 行、51 文字は 2 行
    expect(parseInvoiceForm(form({ notes: "あ".repeat(250) })).ok).toBe(true);
    expect(parseInvoiceForm(form({ notes: "あ".repeat(251) }))).toMatchObject({
      ok: false,
      errors: { notes: message },
    });
    // 改行で区切った行も数える（51 文字 = 2 行 + 3 行 = 5 行）
    expect(
      parseInvoiceForm(form({ notes: `${"あ".repeat(51)}\n3\n4\n5` })).ok,
    ).toBe(true);
    expect(
      parseInvoiceForm(form({ notes: `${"あ".repeat(51)}\n3\n4\n5\n6` })),
    ).toMatchObject({ ok: false, errors: { notes: message } });
  });

  test("明細の文字数の上限（内容60・数量15・単位10・単価10桁）", () => {
    expect(
      parseInvoiceForm(
        form({
          "items.0.description": "あ".repeat(60),
          "items.0.quantity": "123456789012.50",
          "items.0.unit": "あ".repeat(10),
          "items.0.unitPrice": "1234567890",
        }),
      ).ok,
    ).toBe(true);
    expect(
      parseInvoiceForm(
        form({
          "items.0.description": "あ".repeat(61),
          "items.0.quantity": "1234567890123.5",
          "items.1.quantity": "1234567890123.50",
          "items.0.unit": "あ".repeat(11),
          "items.0.unitPrice": "12345678901",
        }),
      ),
    ).toMatchObject({
      ok: false,
      errors: {
        "items.0.description": "内容は60文字以内で入力してください",
        "items.1.quantity":
          "数量は15文字以内（小数点を含む）で入力してください",
        "items.0.unit": "単位は10文字以内で入力してください",
        "items.0.unitPrice": "単価は10桁以内で入力してください",
      },
    });
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

describe("備考の行数（countNoteLines）", () => {
  test("空なら0、空の行も1行", () => {
    expect(countNoteLines("")).toBe(0);
    expect(countNoteLines("1\n\n3")).toBe(3);
  });

  test("全角は1文字、半角（英数字・記号・半角カナ）は0.5文字として50文字で折り返す", () => {
    expect(countNoteLines("あ".repeat(50))).toBe(1);
    expect(countNoteLines("あ".repeat(51))).toBe(2);
    expect(countNoteLines("a".repeat(100))).toBe(1);
    expect(countNoteLines("a".repeat(101))).toBe(2);
    expect(countNoteLines("ｱ".repeat(100))).toBe(1);
    // 全角 49 + 半角 2 = 50
    expect(countNoteLines(`${"あ".repeat(49)}ab`)).toBe(1);
    expect(countNoteLines(`${"あ".repeat(49)}abc`)).toBe(2);
  });
});
