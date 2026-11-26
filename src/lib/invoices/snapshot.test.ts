import { describe, expect, test } from "vitest";
import type { Client, InvoiceItem, Owner } from "@/db/schema";
import type { InvoiceWithItems } from "./repository";
import { buildSnapshot, checkCompleteness } from "./snapshot";

const client: Client = {
  id: 1,
  name: "サンプル産業株式会社",
  code: "ABC",
  department: "経理部",
  contactName: null,
  paymentTermType: "next_month_end",
  paymentTermDay: null,
  feeBearer: "client",
  rounding: "floor",
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const owner: Owner = {
  id: 2,
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
  seal: null,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function item(
  position: number,
  overrides: Partial<InvoiceItem> = {},
): InvoiceItem {
  return {
    id: position + 1,
    invoiceId: 10,
    position,
    description: `明細${position + 1}`,
    quantity: 100,
    unit: "式",
    unitPrice: 1000,
    ...overrides,
  };
}

function invoice(overrides: Partial<InvoiceWithItems> = {}): InvoiceWithItems {
  return {
    id: 10,
    clientId: 1,
    ownerId: 2,
    invoiceNumber: "IABC-202611-001",
    issueDate: "2026-11-30",
    subject: "Webサイト保守・改修",
    periodType: "month",
    periodMonth: "2026-11",
    periodStart: null,
    periodEnd: null,
    dueDate: "2026-12-31",
    dueDateManual: false,
    notes: "いつもお世話になっております。",
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [item(0)],
    ...overrides,
  };
}

describe("checkCompleteness（spec.md 7.1, 7.3）", () => {
  test("そろっていればエラーなし", () => {
    expect(checkCompleteness(invoice())).toEqual({});
  });

  test("備考以外の必須項目と明細1行目がなければエラー", () => {
    expect(
      checkCompleteness(
        invoice({
          clientId: null,
          ownerId: null,
          issueDate: null,
          subject: null,
          periodType: null,
          periodMonth: null,
          dueDate: null,
          notes: null,
          items: [],
        }),
      ),
    ).toEqual({
      clientId: "取引先を選択してください",
      ownerId: "事業主を選択してください",
      issueDate: "請求日を入力してください",
      subject: "件名を入力してください",
      periodType: "対象期間を選択してください",
      dueDate: "支払い期限を入力してください",
      "items.0.description": "1行目の内容を入力してください",
    });
  });

  test("対象期間は種類に応じた値が必要", () => {
    expect(checkCompleteness(invoice({ periodMonth: null }))).toEqual({
      periodMonth: "対象月を入力してください",
    });
    expect(
      checkCompleteness(
        invoice({
          periodType: "range",
          periodMonth: null,
          periodStart: null,
          periodEnd: null,
        }),
      ),
    ).toEqual({
      periodStart: "開始日を入力してください",
      periodEnd: "終了日を入力してください",
    });
  });

  test("内容がある行は数量・単位・単価が必須", () => {
    expect(
      checkCompleteness(
        invoice({
          items: [
            item(0),
            item(3, { quantity: null, unit: null, unitPrice: null }),
          ],
        }),
      ),
    ).toEqual({
      "items.3.quantity": "数量を入力してください",
      "items.3.unit": "単位を入力してください",
      "items.3.unitPrice": "単価を入力してください",
    });
  });

  test("内容がないのに数量などが入っている行は内容を求める", () => {
    expect(
      checkCompleteness(
        invoice({ items: [item(0), item(1, { description: null })] }),
      ),
    ).toEqual({ "items.1.description": "内容を入力してください" });
  });
});

describe("buildSnapshot", () => {
  test("PDF に必要なデータを取引先・事業主の情報ごと持つ", () => {
    const snapshot = buildSnapshot(
      invoice({
        items: [
          item(2, {
            description: "LP改修作業",
            quantity: 1200,
            unit: "時間",
            unitPrice: 5000,
          }),
          item(0, { description: "保守", quantity: 125, unitPrice: 333 }),
        ],
      }),
      client,
      owner,
    );
    expect(snapshot).toMatchObject({
      invoiceNumber: "IABC-202611-001",
      period: { type: "month", month: "2026-11" },
      clientId: 1,
      ownerId: 2,
      client: {
        name: "サンプル産業株式会社",
        department: "経理部",
        feeBearer: "client",
      },
      owner: { tradeName: "やまだデザイン", bankName: "やよい銀行" },
      items: [
        { position: 0, description: "保守", amount: 416 },
        { position: 2, description: "LP改修作業", amount: 60000 },
      ],
      total: 60416,
    });
    expect(snapshot.owner).not.toHaveProperty("seal");
  });

  test("必須項目がそろっていなければ作れない", () => {
    expect(() =>
      buildSnapshot(invoice({ subject: null }), client, owner),
    ).toThrow();
    expect(() =>
      buildSnapshot(invoice({ invoiceNumber: null }), client, owner),
    ).toThrow();
  });
});
