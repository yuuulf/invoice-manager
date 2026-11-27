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
  totalRows,
} from "./invoice-text";
import { sampleSnapshot } from "./test-snapshot";

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

test("ご請求金額は ¥ と 3 桁区切りと末尾の -（1の位と - の間は空けない）", () => {
  expect(formatBilledAmount(134000)).toBe("¥134,000-");
});

test("数量は数値と単位の間に半角スペース", () => {
  expect(formatQuantityWithUnit(1200, "時間")).toBe("12 時間");
  expect(formatQuantityWithUnit(150, "時間")).toBe("1.5 時間");
});

describe("振込先", () => {
  test("手数料負担が取引先なら、口座名義の下に「貴社ご負担」", () => {
    expect(bankLines(owner, "client")).toEqual([
      "やよい銀行（0123） 渋谷支店（456） 普通 1234567",
      "口座名義：ヤマダデザイン ヤマダタロウ",
      "※振込手数料は貴社ご負担",
    ]);
  });

  test("手数料負担が事業主なら「当方負担（差引振込可）」", () => {
    expect(bankLines(owner, "owner")[2]).toBe(
      "※振込手数料は当方負担（差引振込可）",
    );
  });

  test("指定なしなら手数料の行は出さない", () => {
    expect(bankLines(owner, "none")).toEqual([
      "やよい銀行（0123） 渋谷支店（456） 普通 1234567",
      "口座名義：ヤマダデザイン ヤマダタロウ",
    ]);
  });

  test("科目は表示名", () => {
    expect(
      bankLines({ ...owner, accountType: "checking" }, "none")[0],
    ).toContain(" 当座 ");
  });
});

describe("備考", () => {
  test("入力した備考を行ごとに出し、手数料の文言は入れない", () => {
    expect(
      noteLines("いつもお世話になっております。\nよろしくお願いします。"),
    ).toEqual(["いつもお世話になっております。", "よろしくお願いします。"]);
    expect(noteLines(null)).toEqual([]);
  });
});

describe("合計欄", () => {
  test("税抜なら「合計」だけ（太字）", () => {
    expect(
      totalRows({ ...sampleSnapshot, subtotal: 134000, tax: null }),
    ).toEqual([{ label: "合計", value: "134,000", bold: true }]);
  });

  test("消費税の扱いを追加する前の台帳も「合計」だけ", () => {
    expect(totalRows(sampleSnapshot)).toEqual([
      { label: "合計", value: "134,000", bold: true },
    ]);
  });

  test("税込なら小計（税抜）・消費税相当額（10%）・合計の3行", () => {
    expect(
      totalRows({
        ...sampleSnapshot,
        subtotal: 134000,
        tax: 13400,
        total: 147400,
      }),
    ).toEqual([
      { label: "小計（税抜）", value: "134,000", bold: false },
      { label: "消費税相当額（10%）", value: "13,400", bold: false },
      { label: "合計", value: "147,400", bold: true },
    ]);
  });
});
