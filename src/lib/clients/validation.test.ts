import { describe, expect, test } from "vitest";
import { parseClientForm } from "./validation";

function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const base: Record<string, string> = {
    name: "サンプル産業株式会社",
    code: "ABC",
    department: "",
    contactName: "",
    paymentTermType: "next_month_end",
    paymentTermDay: "",
    feeBearer: "none",
    rounding: "floor",
  };
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    fd.set(key, value);
  }
  return fd;
}

describe("parseClientForm", () => {
  test("必須項目だけで登録できる。任意項目の空欄は null になる", () => {
    expect(parseClientForm(form())).toEqual({
      ok: true,
      data: {
        name: "サンプル産業株式会社",
        code: "ABC",
        department: null,
        contactName: null,
        paymentTermType: "next_month_end",
        paymentTermDay: null,
        feeBearer: "none",
        rounding: "floor",
      },
    });
  });

  test("前後の空白は取り除く", () => {
    const result = parseClientForm(
      form({ name: "  サンプル  ", department: " 経理部 " }),
    );
    expect(result.ok && result.data).toMatchObject({
      name: "サンプル",
      department: "経理部",
    });
  });

  test("会社名と取引先コードは必須", () => {
    const result = parseClientForm(form({ name: "", code: "" }));
    expect(result).toMatchObject({
      ok: false,
      errors: {
        name: "会社名を入力してください",
        code: "取引先コードを入力してください",
      },
    });
  });

  test.each(["ABC", "123", "A1B"])(
    "取引先コード %s は英大文字・数字の3桁なので有効",
    (code) => {
      expect(parseClientForm(form({ code })).ok).toBe(true);
    },
  );

  test.each(["abc", "AB", "ABCD", "A-B", "ＡＢＣ"])(
    "取引先コード %s は無効",
    (code) => {
      expect(parseClientForm(form({ code }))).toMatchObject({
        ok: false,
        errors: { code: "取引先コードは英大文字・数字の3桁で入力してください" },
      });
    },
  );

  test("翌月N日では N が必須", () => {
    expect(
      parseClientForm(form({ paymentTermType: "next_month_day" })),
    ).toMatchObject({
      ok: false,
      errors: { paymentTermDay: "日を入力してください" },
    });
  });

  test.each(["1", "31"])("翌月N日の N=%s は有効", (day) => {
    const result = parseClientForm(
      form({ paymentTermType: "next_month_day", paymentTermDay: day }),
    );
    expect(result.ok && result.data.paymentTermDay).toBe(Number(day));
  });

  test.each(["0", "32", "1.5", "-1", "abc"])("翌月N日の N=%s は無効", (day) => {
    expect(
      parseClientForm(
        form({ paymentTermType: "next_month_day", paymentTermDay: day }),
      ),
    ).toMatchObject({
      ok: false,
      errors: { paymentTermDay: "日は1〜31の整数で入力してください" },
    });
  });

  test("翌月N日以外では N を無視する", () => {
    const result = parseClientForm(
      form({ paymentTermType: "month_after_next_end", paymentTermDay: "15" }),
    );
    expect(result.ok && result.data.paymentTermDay).toBeNull();
  });

  test("選択肢にない値はエラーにし、入力値を返す", () => {
    const result = parseClientForm(
      form({ paymentTermType: "x", feeBearer: "x", rounding: "x" }),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: {
        paymentTermType: "支払い期限を選択してください",
        feeBearer: "手数料負担を選択してください",
        rounding: "端数処理を選択してください",
      },
      values: { name: "サンプル産業株式会社" },
    });
  });
});
