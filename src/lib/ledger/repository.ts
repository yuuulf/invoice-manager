import { desc, eq } from "drizzle-orm";
import type { Db, DbOrTx } from "@/db/create-db";
import {
  clients,
  invoices,
  ledgerEntries,
  owners,
  type LedgerEntry,
} from "@/db/schema";
import type { RowActionResult } from "@/lib/action-result";
import { invoiceNumberPrefix, nextInvoiceNumber } from "@/lib/invoices/calc";
import { getInvoice, saveInvoice } from "@/lib/invoices/repository";
import {
  buildSnapshot,
  checkCompleteness,
  type InvoiceSnapshot,
} from "@/lib/invoices/snapshot";
import type { InvoiceFormErrors } from "@/lib/invoices/validation";
import { ledgerNumbersWithPrefix } from "./numbers";

export type OutputData = { snapshot: InvoiceSnapshot; seal: Buffer | null };

export type PrepareResult =
  ({ ok: true } & OutputData) | { ok: false; errors: InvoiceFormErrors };

function prepare(db: DbOrTx, invoiceId: number): PrepareResult {
  const invoice = getInvoice(db, invoiceId);
  if (!invoice) throw new Error("請求書が見つかりません");
  const errors = checkCompleteness(invoice);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId!))
    .get()!;
  const owner = db
    .select()
    .from(owners)
    .where(eq(owners.id, invoice.ownerId!))
    .get()!;
  return {
    ok: true,
    snapshot: buildSnapshot(invoice, client, owner),
    seal: owner.seal,
  };
}

/**
 * 作成中の請求書から PDF 用のデータを作る（確定前の出力。spec.md 7.4）。
 * 必須項目がそろっていなければエラーを返す。
 */
export function prepareInvoiceOutput(db: Db, invoiceId: number) {
  return prepare(db, invoiceId);
}

export type ConfirmResult =
  | { ok: true; ledgerId: number }
  | { ok: false; errors: InvoiceFormErrors }
  | { ok: false; renumbered: string };

/**
 * 請求書を確定して台帳に記録し、元の請求書を一覧から消す（spec.md 7.4）。
 * 請求番号が台帳から見て正しい連番でなければ、振り直して確定を止める（spec.md 7.2）。
 */
export function confirmInvoice(db: Db, invoiceId: number): ConfirmResult {
  return db.transaction((tx) => {
    const prepared = prepare(tx, invoiceId);
    if (!prepared.ok) return prepared;
    const { snapshot, seal } = prepared;

    const prefix = invoiceNumberPrefix(
      snapshot.client.code,
      snapshot.issueDate,
    );
    const expected = nextInvoiceNumber(
      prefix,
      ledgerNumbersWithPrefix(tx, prefix),
    );
    if (snapshot.invoiceNumber !== expected) {
      tx.update(invoices)
        .set({ invoiceNumber: expected, updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId))
        .run();
      return { ok: false, renumbered: expected };
    }

    const { id } = tx
      .insert(ledgerEntries)
      .values({
        invoiceNumber: snapshot.invoiceNumber,
        issueDate: snapshot.issueDate,
        clientName: snapshot.client.name,
        subject: snapshot.subject,
        total: snapshot.total,
        snapshot,
        seal,
      })
      .returning({ id: ledgerEntries.id })
      .get();
    tx.delete(invoices).where(eq(invoices.id, invoiceId)).run();
    return { ok: true, ledgerId: id };
  });
}

export type LedgerListRow = Pick<
  LedgerEntry,
  | "id"
  | "invoiceNumber"
  | "issueDate"
  | "clientName"
  | "subject"
  | "total"
  | "confirmedAt"
>;

/** 台帳の一覧（新しい順） */
export function listLedger(db: Db): LedgerListRow[] {
  return db
    .select({
      id: ledgerEntries.id,
      invoiceNumber: ledgerEntries.invoiceNumber,
      issueDate: ledgerEntries.issueDate,
      clientName: ledgerEntries.clientName,
      subject: ledgerEntries.subject,
      total: ledgerEntries.total,
      confirmedAt: ledgerEntries.confirmedAt,
    })
    .from(ledgerEntries)
    .orderBy(desc(ledgerEntries.id))
    .all();
}

/** 台帳から PDF を再出力するためのデータ（spec.md 7.4） */
export function getLedgerOutput(db: Db, id: number): OutputData | undefined {
  return db
    .select({ snapshot: ledgerEntries.snapshot, seal: ledgerEntries.seal })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.id, id))
    .get();
}

/** 台帳を削除する。確認のため請求番号の入力が一致している必要がある（spec.md 4） */
export function deleteLedgerEntry(
  db: Db,
  id: number,
  typedInvoiceNumber: string,
): RowActionResult {
  const entry = db
    .select({ invoiceNumber: ledgerEntries.invoiceNumber })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.id, id))
    .get();
  if (!entry) return { error: "台帳が見つかりません" };
  if (entry.invoiceNumber !== typedInvoiceNumber.trim()) {
    return { error: "請求番号が一致しません" };
  }
  db.delete(ledgerEntries).where(eq(ledgerEntries.id, id)).run();
}

/**
 * 台帳から、請求書画面で設定するデータだけを新しい請求書にコピーする（spec.md 7.4）。
 * 取引先・事業主は、削除・アーカイブされていなければ選択した状態にする。
 * 支払い期限は確定時の日付を保つため、手動変更扱いにする。
 */
export function copyLedgerToInvoice(db: Db, id: number): number {
  const output = getLedgerOutput(db, id);
  if (!output) throw new Error("台帳が見つかりません");
  const { snapshot } = output;

  const activeClient = db
    .select({ archivedAt: clients.archivedAt })
    .from(clients)
    .where(eq(clients.id, snapshot.clientId))
    .get();
  const activeOwner = db
    .select({ archivedAt: owners.archivedAt })
    .from(owners)
    .where(eq(owners.id, snapshot.ownerId))
    .get();

  const result = saveInvoice(db, undefined, {
    clientId:
      activeClient && !activeClient.archivedAt ? snapshot.clientId : null,
    ownerId: activeOwner && !activeOwner.archivedAt ? snapshot.ownerId : null,
    issueDate: snapshot.issueDate,
    subject: snapshot.subject,
    periodType: snapshot.period.type,
    periodMonth:
      snapshot.period.type === "month" ? snapshot.period.month : null,
    periodStart:
      snapshot.period.type === "range" ? snapshot.period.start : null,
    periodEnd: snapshot.period.type === "range" ? snapshot.period.end : null,
    dueDate: snapshot.dueDate,
    dueDateManual: true,
    notes: snapshot.notes,
    items: snapshot.items.map(
      ({ position, description, quantity, unit, unitPrice }) => ({
        position,
        description,
        quantity,
        unit,
        unitPrice,
      }),
    ),
  });
  if (!result.ok) throw new Error("請求書へのコピーに失敗しました");
  return result.id;
}
