import { describe, expect, test } from "vitest";
import {
  basisMonthOf,
  calcAmount,
  calcTotals,
  calcDueDate,
  formatAmount,
  formatQuantity,
  invoiceNumberPrefix,
  isValidDate,
  isValidMonth,
  nextInvoiceNumber,
  parseQuantity,
  parseUnitPrice,
  toDateString,
} from "./calc";

describe("数量・単価", () => {
  test.each([
    ["1", 100],
    ["12", 1200],
    ["1.5", 150],
    ["0.25", 25],
    ["0", 0],
  ])("数量 %s は %i（100倍）", (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  test.each(["", "-1", "1.234", "1.", ".5", "abc", "１"])(
    "数量 %s は不正",
    (text) => {
      expect(parseQuantity(text)).toBeNull();
    },
  );

  test.each([
    [100, "1"],
    [150, "1.5"],
    [125, "1.25"],
    [1200, "12"],
    [5, "0.05"],
  ])("数量 %i は %s と表示", (scaled, text) => {
    expect(formatQuantity(scaled)).toBe(text);
  });

  test("単価は 0 以上の整数のみ", () => {
    expect(parseUnitPrice("5000")).toBe(5000);
    expect(parseUnitPrice("0")).toBe(0);
    for (const text of ["", "1.5", "-1", "1,000"]) {
      expect(parseUnitPrice(text)).toBeNull();
    }
  });
});

describe("金額の端数処理", () => {
  // 1.25 × 333 = 416.25、1.5 × 333 = 499.5
  test.each([
    ["floor", 125, 416],
    ["round", 125, 416],
    ["ceil", 125, 417],
    ["floor", 150, 499],
    ["round", 150, 500],
    ["ceil", 150, 500],
  ] as const)("%s: 数量 %i/100 × 333", (rounding, quantity, expected) => {
    expect(calcAmount(quantity, 333, rounding)).toBe(expected);
  });

  test("端数がなければどの処理でも同じ", () => {
    for (const rounding of ["floor", "round", "ceil"] as const) {
      expect(calcAmount(1200, 5000, rounding)).toBe(60000);
    }
  });
});

describe("日付", () => {
  test("isValidDate", () => {
    expect(isValidDate("2026-11-30")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026/11/30")).toBe(false);
  });

  test("isValidMonth", () => {
    expect(isValidMonth("2026-11")).toBe(true);
    expect(isValidMonth("2026-00")).toBe(false);
    expect(isValidMonth("2026-11-01")).toBe(false);
  });
});

describe("支払い期限（spec.md 5.1）", () => {
  const term = (
    paymentTermType:
      "next_month_end" | "month_after_next_end" | "next_month_day",
    paymentTermDay: number | null = null,
  ) => ({ paymentTermType, paymentTermDay });

  test("翌月末日", () => {
    expect(calcDueDate(term("next_month_end"), "2026-11")).toBe("2026-12-31");
    expect(calcDueDate(term("next_month_end"), "2026-12")).toBe("2027-01-31");
    expect(calcDueDate(term("next_month_end"), "2027-01")).toBe("2027-02-28");
  });

  test("翌々月末", () => {
    expect(calcDueDate(term("month_after_next_end"), "2026-11")).toBe(
      "2027-01-31",
    );
    expect(calcDueDate(term("month_after_next_end"), "2027-12")).toBe(
      "2028-02-29",
    );
  });

  test("翌月 N 日。その月にない日は末日にする", () => {
    expect(calcDueDate(term("next_month_day", 10), "2026-11")).toBe(
      "2026-12-10",
    );
    expect(calcDueDate(term("next_month_day", 30), "2027-01")).toBe(
      "2027-02-28",
    );
    expect(calcDueDate(term("next_month_day", 30), "2028-01")).toBe(
      "2028-02-29",
    );
    expect(calcDueDate(term("next_month_day", 31), "2026-10")).toBe(
      "2026-11-30",
    );
  });

  test("基準月は、月ならその月、期間なら終了日の月", () => {
    expect(basisMonthOf({ type: "month", month: "2026-11" })).toBe("2026-11");
    expect(
      basisMonthOf({ type: "range", start: "2026-10-15", end: "2026-11-15" }),
    ).toBe("2026-11");
  });

  test("仕様の例: 11/01〜11/15 で翌月末日 → 12/31", () => {
    const basis = basisMonthOf({
      type: "range",
      start: "2026-11-01",
      end: "2026-11-15",
    });
    expect(calcDueDate(term("next_month_end"), basis)).toBe("2026-12-31");
  });
});

describe("請求書番号（spec.md 7.2）", () => {
  test("先頭 15 桁は INV- + 取引先コード + 請求日の年月", () => {
    expect(invoiceNumberPrefix("ABC", "2026-11-30")).toBe("INV-ABC-202611-");
  });

  test("一致する番号がなければ 001", () => {
    expect(nextInvoiceNumber("INV-ABC-202611-", [])).toBe("INV-ABC-202611-001");
    expect(
      nextInvoiceNumber("INV-ABC-202611-", [
        "INV-ABC-202610-005",
        "INV-XYZ-202611-003",
      ]),
    ).toBe("INV-ABC-202611-001");
  });

  test("一致する番号の最大 +1（欠番があっても最大の次）", () => {
    expect(
      nextInvoiceNumber("INV-ABC-202611-", [
        "INV-ABC-202611-001",
        "INV-ABC-202611-003",
      ]),
    ).toBe("INV-ABC-202611-004");
  });
});

test("formatAmount は 3 桁区切り", () => {
  expect(formatAmount(134000)).toBe("134,000");
  expect(formatAmount(999)).toBe("999");
  expect(formatAmount(0)).toBe("0");
});

test("toDateString はローカル時刻の日付", () => {
  expect(toDateString(new Date(2026, 10, 30, 23, 59))).toBe("2026-11-30");
  expect(toDateString(new Date(2027, 0, 5))).toBe("2027-01-05");
});

describe("合計（spec.md 7.3）", () => {
  test("税抜なら小計がそのまま合計で、消費税相当額はない", () => {
    expect(calcTotals(110000, "excluded", "floor")).toEqual({
      subtotal: 110000,
      tax: null,
      total: 110000,
    });
  });

  test("税込なら小計の10%を消費税相当額として足す", () => {
    expect(calcTotals(110000, "included", "floor")).toEqual({
      subtotal: 110000,
      tax: 11000,
      total: 121000,
    });
  });

  test.each([
    ["floor", 12],
    ["round", 12],
    ["ceil", 13],
  ] as const)("消費税相当額の端数は取引先の端数処理（%s）", (rounding, tax) => {
    // 123 × 10% = 12.3
    expect(calcTotals(123, "included", rounding).tax).toBe(tax);
  });

  test("四捨五入は 0.5 を切り上げる", () => {
    // 125 × 10% = 12.5
    expect(calcTotals(125, "included", "round").tax).toBe(13);
    expect(calcTotals(125, "included", "floor").tax).toBe(12);
  });
});
