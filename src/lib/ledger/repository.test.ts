import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import type { Db } from "@/db/create-db";
import { clients, owners } from "@/db/schema";
import { createTestDb } from "@/db/test-utils";
import { deleteClient } from "@/lib/clients/repository";
import {
  getInvoice,
  listInvoices,
  saveInvoice,
} from "@/lib/invoices/repository";
import {
  emptyDraft,
  insertClient,
  insertOwner,
} from "@/lib/invoices/test-fixtures";
import type { InvoiceDraftInput } from "@/lib/invoices/validation";
import { deleteOwner } from "@/lib/owners/repository";
import {
  checkInvoiceNumber,
  confirmInvoice,
  copyLedgerToInvoice,
  deleteLedgerEntry,
  getLedgerOutput,
  listLedger,
  prepareInvoiceOutput,
} from "./repository";

let db: Db;
let clientId: number;
let ownerId: number;

beforeEach(() => {
  db = createTestDb();
  clientId = insertClient(db, { code: "ABC", name: "サンプル産業株式会社" });
  ownerId = insertOwner(db);
});

function completeDraft(
  overrides: Partial<InvoiceDraftInput> = {},
): InvoiceDraftInput {
  return emptyDraft({
    clientId,
    ownerId,
    issueDate: "2026-11-30",
    subject: "Webサイト保守・改修",
    periodType: "month",
    periodMonth: "2026-11",
    notes: "いつもお世話になっております。",
    items: [
      {
        position: 0,
        description: "Webサイト保守",
        quantity: 100,
        unit: "式",
        unitPrice: 50000,
      },
    ],
    ...overrides,
  });
}

function createInvoice(overrides: Partial<InvoiceDraftInput> = {}) {
  const result = saveInvoice(db, undefined, completeDraft(overrides));
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.id;
}

function confirm(invoiceId: number) {
  const result = confirmInvoice(db, invoiceId);
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result.ledgerId;
}

describe("確定前の出力", () => {
  test("必須項目がそろっていれば PDF 用データを返す", () => {
    const result = prepareInvoiceOutput(db, createInvoice());
    expect(result).toMatchObject({
      ok: true,
      snapshot: { invoiceNumber: "IABC-202611-001", total: 50000 },
      seal: null,
    });
  });

  test("そろっていなければエラー", () => {
    const result = prepareInvoiceOutput(db, createInvoice({ subject: null }));
    expect(result).toEqual({
      ok: false,
      errors: { subject: "件名を入力してください" },
    });
  });
});

describe("確定（spec.md 7.4）", () => {
  test("台帳に記録し、元の請求書を消す", () => {
    const invoiceId = createInvoice();
    const ledgerId = confirm(invoiceId);

    expect(getInvoice(db, invoiceId)).toBeUndefined();
    expect(listInvoices(db, { archived: false })).toEqual([]);
    expect(listLedger(db)).toEqual([
      expect.objectContaining({
        id: ledgerId,
        invoiceNumber: "IABC-202611-001",
        clientName: "サンプル産業株式会社",
        subject: "Webサイト保守・改修",
        total: 50000,
      }),
    ]);
  });

  test("必須項目がそろっていなければ確定しない", () => {
    const invoiceId = createInvoice({ items: [] });
    expect(confirmInvoice(db, invoiceId)).toEqual({
      ok: false,
      errors: { "items.0.description": "1行目の内容を入力してください" },
    });
    expect(listLedger(db)).toEqual([]);
  });

  test("後から取引先・事業主を変更・削除しても、確定時と同じ内容とデータ印を出せる", () => {
    const seal = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    db.update(owners).set({ seal }).where(eq(owners.id, ownerId)).run();
    const ledgerId = confirm(createInvoice());

    db.update(clients)
      .set({ name: "変更後の会社名" })
      .where(eq(clients.id, clientId))
      .run();
    expect(deleteOwner(db, ownerId)).toBeUndefined();
    expect(deleteClient(db, clientId)).toBeUndefined();

    expect(getLedgerOutput(db, ledgerId)).toMatchObject({
      snapshot: {
        client: { name: "サンプル産業株式会社" },
        owner: { name: "山田 太郎", bankName: "やよい銀行" },
      },
      seal,
    });
  });
});

describe("請求番号の連番（spec.md 7.2）", () => {
  test("確定済みの番号の次を採番する", () => {
    confirm(createInvoice());
    const second = createInvoice();
    expect(getInvoice(db, second)?.invoiceNumber).toBe("IABC-202611-002");
    confirm(second);
    expect(listLedger(db).map((e) => e.invoiceNumber)).toEqual([
      "IABC-202611-002",
      "IABC-202611-001",
    ]);
  });

  test("作成中に同じ番号の別の請求書が確定されたら、振り直して確定を止める", () => {
    const a = createInvoice();
    const b = createInvoice();
    expect(getInvoice(db, b)?.invoiceNumber).toBe("IABC-202611-001");
    confirm(a);

    expect(confirmInvoice(db, b)).toEqual({
      ok: false,
      renumbered: {
        from: "IABC-202611-001",
        to: "IABC-202611-002",
        reason: "duplicate",
      },
    });
    expect(getInvoice(db, b)?.invoiceNumber).toBe("IABC-202611-002");
    expect(listLedger(db)).toHaveLength(1);

    confirm(b);
    expect(listLedger(db)).toHaveLength(2);
  });

  test("発行前のチェックで振り直しが必要なら振り直して知らせ、台帳には記録しない", () => {
    const a = createInvoice();
    const b = createInvoice();
    confirm(a);

    expect(checkInvoiceNumber(db, b)).toEqual({
      ok: false,
      renumbered: {
        from: "IABC-202611-001",
        to: "IABC-202611-002",
        reason: "duplicate",
      },
    });
    expect(getInvoice(db, b)?.invoiceNumber).toBe("IABC-202611-002");
    expect(listLedger(db)).toHaveLength(1);

    // 振り直した後はチェックを通る
    expect(checkInvoiceNumber(db, b)).toEqual({ ok: true });
  });

  test("発行前のチェックは、必須項目がそろっていなければエラーを返す", () => {
    const id = createInvoice({ subject: null });
    expect(checkInvoiceNumber(db, id)).toEqual({
      ok: false,
      errors: { subject: "件名を入力してください" },
    });
  });

  test("台帳の番号が削除されて空いたら、小さい番号に振り直して確定を止める（空き）", () => {
    const first = confirm(createInvoice());
    const second = confirm(createInvoice());
    const third = createInvoice();
    expect(getInvoice(db, third)?.invoiceNumber).toBe("IABC-202611-003");
    deleteLedgerEntry(db, second, "IABC-202611-002");

    expect(confirmInvoice(db, third)).toEqual({
      ok: false,
      renumbered: {
        from: "IABC-202611-003",
        to: "IABC-202611-002",
        reason: "gap",
      },
    });
    expect(first).toBeGreaterThan(0);
  });

  test("台帳の番号より前の番号なら、台帳の連番に合わせて振り直す（それ以外）", () => {
    const a = createInvoice();
    const b = createInvoice();
    const c = createInvoice(); // 3 件とも IABC-202611-001
    const ledgerA = confirm(a);
    confirmInvoice(db, b); // 002 に振り直される
    confirm(b);
    deleteLedgerEntry(db, ledgerA, "IABC-202611-001"); // 台帳は 002 だけ

    expect(confirmInvoice(db, c)).toEqual({
      ok: false,
      renumbered: {
        from: "IABC-202611-001",
        to: "IABC-202611-003",
        reason: "behind",
      },
    });
  });

  test("保存では台帳との重複を振り直さず、発行時に理由を伝えて振り直す", () => {
    const a = createInvoice();
    const b = createInvoice();
    confirm(a);
    saveInvoice(db, b, completeDraft({ subject: "変更" }));
    expect(getInvoice(db, b)?.invoiceNumber).toBe("IABC-202611-001");
    expect(confirmInvoice(db, b)).toMatchObject({
      ok: false,
      renumbered: { from: "IABC-202611-001", reason: "duplicate" },
    });
  });

  test("台帳を削除するとその番号は採番の対象から外れる", () => {
    const ledgerId = confirm(createInvoice());
    deleteLedgerEntry(db, ledgerId, "IABC-202611-001");
    expect(getInvoice(db, createInvoice())?.invoiceNumber).toBe(
      "IABC-202611-001",
    );
  });
});

describe("台帳の削除", () => {
  test("請求番号の入力が一致したときだけ削除する", () => {
    const ledgerId = confirm(createInvoice());
    expect(deleteLedgerEntry(db, ledgerId, "IABC-202611-002")).toEqual({
      error: "請求番号が一致しません",
    });
    expect(listLedger(db)).toHaveLength(1);

    expect(
      deleteLedgerEntry(db, ledgerId, " IABC-202611-001 "),
    ).toBeUndefined();
    expect(listLedger(db)).toEqual([]);
  });
});

describe("台帳から請求書へのコピー（spec.md 7.4）", () => {
  test("請求書画面で設定するデータを新しい請求書にコピーする", () => {
    const ledgerId = confirm(
      createInvoice({ dueDate: "2027-01-10", dueDateManual: true }),
    );
    const invoiceId = copyLedgerToInvoice(db, ledgerId);

    expect(getInvoice(db, invoiceId)).toMatchObject({
      clientId,
      ownerId,
      issueDate: "2026-11-30",
      subject: "Webサイト保守・改修",
      periodType: "month",
      periodMonth: "2026-11",
      dueDate: "2027-01-10",
      dueDateManual: true,
      notes: "いつもお世話になっております。",
      // 元の番号は台帳にあるため次の番号になる
      invoiceNumber: "IABC-202611-002",
      items: [
        expect.objectContaining({
          position: 0,
          description: "Webサイト保守",
          quantity: 100,
          unit: "式",
          unitPrice: 50000,
        }),
      ],
    });
  });

  test("取引先・事業主が削除・アーカイブされていたら未選択にする", () => {
    const ledgerId = confirm(createInvoice());
    db.update(clients)
      .set({ archivedAt: new Date() })
      .where(eq(clients.id, clientId))
      .run();
    deleteOwner(db, ownerId);

    const invoice = getInvoice(db, copyLedgerToInvoice(db, ledgerId));
    expect(invoice).toMatchObject({
      clientId: null,
      ownerId: null,
      invoiceNumber: null,
    });
  });
});
