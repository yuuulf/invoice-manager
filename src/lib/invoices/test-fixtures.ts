import type { Db } from "@/db/create-db";
import { clients, owners, type Client } from "@/db/schema";
import type { InvoiceDraftInput } from "./validation";

/** テスト用の取引先を作成して ID を返す */
export function insertClient(db: Db, overrides: Partial<Client> = {}) {
  return db
    .insert(clients)
    .values({ name: "サンプル産業株式会社", code: "ABC", ...overrides })
    .returning({ id: clients.id })
    .get().id;
}

/** テスト用の事業主を作成して ID を返す */
export function insertOwner(db: Db) {
  return db
    .insert(owners)
    .values({
      name: "山田 太郎",
      postalCode: "1500001",
      address1: "東京都渋谷区神宮前",
      phone: "03-1234-5678",
      email: "taro@example.com",
      bankName: "やよい銀行",
      bankCode: "0123",
      branchName: "渋谷支店",
      branchCode: "456",
      accountNumber: "1234567",
      accountHolder: "ヤマダタロウ",
    })
    .returning({ id: owners.id })
    .get().id;
}

export function emptyDraft(
  overrides: Partial<InvoiceDraftInput> = {},
): InvoiceDraftInput {
  return {
    clientId: null,
    ownerId: null,
    issueDate: null,
    subject: null,
    periodType: null,
    periodMonth: null,
    periodStart: null,
    periodEnd: null,
    dueDate: null,
    dueDateManual: false,
    notes: null,
    items: [],
    ...overrides,
  };
}
