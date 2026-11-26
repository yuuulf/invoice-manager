import { describe, expect, test } from "vitest";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";
import {
  bankLines,
  formatBilledAmount,
  formatJapaneseDate,
  formatPeriod,
  formatPostalCode,
  formatQuantityWithUnit,
  noteLines,
  ownerGroups,
  recipientLines,
} from "./invoice-text";

const owner: InvoiceSnapshot["owner"] = {
  name: "山田 太郎",
  tradeName: "やまだデザイン",
  postalCode: "1500001",
  address1: "東京都渋谷区神宮前",
  address2: "1-2-3 サンプルビル4F",
  phone: "03-1234-5678",
  email: "taro@example.com",
  bankName: "やよい銀行",
  bankCode: "0123",
  branchName: "渋谷支店",
  branchCode: "456",
  accountType: "ordinary",
  accountNumber: "1234567",
  accountHolder: "ヤマダデザイン ヤマダタロウ",
};

const client: InvoiceSnapshot["client"] = {
  code: "ABC",
  name: "サンプル産業株式会社",
  department: null,
  contactName: null,
  feeBearer: "client",
  rounding: "floor",
};

test("日付は yyyy年MM月dd日（月日は0埋め）", () => {
  expect(formatJapaneseDate("2026-01-05")).toBe("2026年01月05日");
});

describe("件名の対象期間", () => {
  test("月", () => {
    expect(formatPeriod({ type: "month", month: "2026-11" })).toBe(
      "（2026年11月分）",
    );
  });
  test("期間", () => {
    expect(
      formatPeriod({ type: "range", start: "2026-11-01", end: "2026-11-15" }),
    ).toBe("（2026年11月01日〜2026年11月15日）");
  });
});

describe("宛名", () => {
  test("会社のみは1行で御中", () => {
    expect(recipientLines(client)).toEqual(["サンプル産業株式会社 御中"]);
  });
  test("会社＋部署は1行で御中", () => {
    expect(recipientLines({ ...client, department: "経理部" })).toEqual([
      "サンプル産業株式会社 経理部 御中",
    ]);
  });
  test("担当者名があれば2行で様", () => {
    expect(
      recipientLines({
        ...client,
        department: "経理部",
        contactName: "山田 花子",
      }),
    ).toEqual(["サンプル産業株式会社 経理部", "山田 花子 様"]);
    expect(recipientLines({ ...client, contactName: "山田 花子" })).toEqual([
      "サンプル産業株式会社",
      "山田 花子 様",
    ]);
  });
});

describe("事業主情報", () => {
  test("郵便番号は〒とハイフン付き", () => {
    expect(formatPostalCode("1500001")).toBe("〒150-0001");
  });

  test("サンプルどおりの並び", () => {
    expect(ownerGroups(owner)).toEqual({
      names: { tradeName: "やまだデザイン", name: "山田 太郎" },
      address: ["〒150-0001", "東京都渋谷区神宮前", "1-2-3 サンプルビル4F"],
      contact: ["TEL：03-1234-5678", "taro@example.com"],
    });
  });

  test("登録されていない項目は出さない", () => {
    expect(
      ownerGroups({ ...owner, tradeName: null, address2: null }),
    ).toMatchObject({
      names: { tradeName: null },
      address: ["〒150-0001", "東京都渋谷区神宮前"],
    });
  });
});

test("ご請求金額は ¥ と 3 桁区切りと末尾の -", () => {
  expect(formatBilledAmount(134000)).toBe("¥134,000 -");
});

test("数量は数値と単位の間に半角スペース", () => {
  expect(formatQuantityWithUnit(1200, "時間")).toBe("12 時間");
  expect(formatQuantityWithUnit(150, "時間")).toBe("1.5 時間");
});

test("振込先はサンプルどおりの2行", () => {
  expect(bankLines(owner)).toEqual([
    "やよい銀行（0123） 渋谷支店（456） 普通 1234567",
    "口座名義：ヤマダデザイン ヤマダタロウ",
  ]);
  expect(bankLines({ ...owner, accountType: "checking" })[0]).toContain(
    " 当座 ",
  );
});

describe("備考", () => {
  test("手数料負担が取引先なら文言を先に出し、その下に入力した備考", () => {
    expect(
      noteLines(
        "client",
        "いつもお世話になっております。\nよろしくお願いします。",
      ),
    ).toEqual([
      "振込手数料：恐れ入りますが振込手数料は貴社にてご負担をお願いいたします。",
      "いつもお世話になっております。",
      "よろしくお願いします。",
    ]);
  });

  test("手数料負担が事業主の文言", () => {
    expect(noteLines("owner", null)).toEqual([
      "振込手数料：当方にて負担いたします。手数料分を差し引いた金額をお振込みください。",
    ]);
  });

  test("指定なしなら手数料の文言は出さない", () => {
    expect(noteLines("none", "備考だけ")).toEqual(["備考だけ"]);
    expect(noteLines("none", null)).toEqual([]);
  });
});
