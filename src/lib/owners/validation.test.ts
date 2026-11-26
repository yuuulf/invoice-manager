import { describe, expect, test } from "vitest";
import { SEAL_MAX_BYTES } from "./seal";
import { parseOwnerForm } from "./validation";

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
]);

function form(overrides: Record<string, string | File> = {}) {
  const fd = new FormData();
  const base: Record<string, string | File> = {
    name: "山田 太郎",
    tradeName: "",
    postalCode: "1500001",
    address1: "東京都渋谷区神宮前",
    address2: "",
    phone: "03-1234-5678",
    email: "taro@example.com",
    bankName: "やよい銀行",
    bankCode: "0123",
    branchName: "渋谷支店",
    branchCode: "456",
    accountType: "ordinary",
    accountNumber: "1234567",
    accountHolder: "ヤマダ タロウ",
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) fd.set(key, value);
  return fd;
}

describe("parseOwnerForm", () => {
  test("必須項目だけで作成できる。任意項目の空欄は null、データ印は変更なし", async () => {
    const result = await parseOwnerForm(form());
    expect(result).toMatchObject({
      ok: true,
      seal: { type: "keep" },
      data: {
        name: "山田 太郎",
        tradeName: null,
        postalCode: "1500001",
        address2: null,
        accountType: "ordinary",
      },
    });
  });

  test("必須項目が空ならそれぞれエラー", async () => {
    const empty = Object.fromEntries(
      [
        "name",
        "postalCode",
        "address1",
        "phone",
        "email",
        "bankName",
        "bankCode",
        "branchName",
        "branchCode",
        "accountNumber",
        "accountHolder",
      ].map((k) => [k, ""]),
    );
    const result = await parseOwnerForm(form(empty));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual({
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
    });
  });

  test.each([
    [
      "postalCode",
      "150-0001",
      "郵便番号はハイフンなしの7桁の数字で入力してください",
    ],
    [
      "postalCode",
      "150000",
      "郵便番号はハイフンなしの7桁の数字で入力してください",
    ],
    ["phone", "03(1234)5678", "電話番号は数字とハイフンで入力してください"],
    ["phone", "-0312345678", "電話番号は数字とハイフンで入力してください"],
    ["email", "taro@example", "メールアドレスの形式が正しくありません"],
    ["bankCode", "123", "銀行番号は4桁の数字で入力してください"],
    ["branchCode", "45a", "支店番号は3桁の数字で入力してください"],
    ["accountNumber", "123456", "口座番号は7桁の数字で入力してください"],
  ])("%s=%s は形式エラー", async (key, value, message) => {
    const result = await parseOwnerForm(form({ [key]: value }));
    expect(result).toMatchObject({ ok: false, errors: { [key]: message } });
  });

  test("電話番号はハイフンなしでもよい", async () => {
    expect((await parseOwnerForm(form({ phone: "0312345678" }))).ok).toBe(true);
  });

  test("科目は普通・当座のみ", async () => {
    expect((await parseOwnerForm(form({ accountType: "checking" }))).ok).toBe(
      true,
    );
    expect(
      await parseOwnerForm(form({ accountType: "savings" })),
    ).toMatchObject({
      ok: false,
      errors: { accountType: "科目を選択してください" },
    });
  });

  test("PNG のデータ印を受け付ける", async () => {
    const result = await parseOwnerForm(
      form({ seal: new File([PNG], "seal.png", { type: "image/png" }) }),
    );
    expect(result.ok && result.seal).toEqual({
      type: "replace",
      data: Buffer.from(PNG),
    });
  });

  test("PNG 以外はデータ印にできない（拡張子や MIME ではなく中身で判定）", async () => {
    const result = await parseOwnerForm(
      form({ seal: new File(["GIF89a"], "seal.png", { type: "image/png" }) }),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: { seal: "データ印はPNG画像を選択してください" },
    });
  });

  test("1MB を超えるデータ印はエラー", async () => {
    const big = new Uint8Array(SEAL_MAX_BYTES + 1);
    big.set(PNG);
    const result = await parseOwnerForm(
      form({ seal: new File([big], "seal.png") }),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: { seal: "データ印は1MB以下の画像を選択してください" },
    });
  });

  test("1MB ちょうどは受け付ける", async () => {
    const max = new Uint8Array(SEAL_MAX_BYTES);
    max.set(PNG);
    const result = await parseOwnerForm(
      form({ seal: new File([max], "seal.png") }),
    );
    expect(result.ok).toBe(true);
  });

  test("「データ印を削除」にチェックすると削除する", async () => {
    const result = await parseOwnerForm(form({ removeSeal: "on" }));
    expect(result.ok && result.seal).toEqual({ type: "remove" });
  });

  test("削除にチェックしていてもファイルを選んでいれば差し替えを優先する", async () => {
    const result = await parseOwnerForm(
      form({ removeSeal: "on", seal: new File([PNG], "seal.png") }),
    );
    expect(result.ok && result.seal.type).toBe("replace");
  });
});
