import { asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { Db } from "@/db/create-db";
import {
  clients,
  invoiceItems,
  invoices,
  owners,
  type Client,
  type Invoice,
  type InvoiceItem,
} from "@/db/schema";
import {
  basisMonthOf,
  calcAmount,
  calcDueDate,
  invoiceNumberPrefix,
  nextInvoiceNumber,
  type Period,
} from "./calc";
import type { InvoiceDraftInput, InvoiceFormErrors } from "./validation";

export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

export type InvoiceListRow = Pick<
  Invoice,
  "id" | "invoiceNumber" | "issueDate" | "subject"
> & {
  clientName: string | null;
  /** 金額が計算できる行（数量と単価がある行）の合計。取引先が未選択なら null */
  total: number | null;
};

export type SaveResult =
  { ok: true; id: number } | { ok: false; errors: InvoiceFormErrors };

/** 対象期間が入力しきれていれば Period を返す */
export function periodOf(
  input: Pick<
    InvoiceDraftInput,
    "periodType" | "periodMonth" | "periodStart" | "periodEnd"
  >,
): Period | null {
  if (input.periodType === "month" && input.periodMonth) {
    return { type: "month", month: input.periodMonth };
  }
  if (input.periodType === "range" && input.periodStart && input.periodEnd) {
    return { type: "range", start: input.periodStart, end: input.periodEnd };
  }
  return null;
}

/** 明細の金額の合計。数量か単価が未入力の行は 0 として扱う */
export function calcTotal(
  items: Pick<InvoiceItem, "quantity" | "unitPrice">[],
  rounding: Client["rounding"],
): number {
  return items.reduce(
    (sum, item) =>
      item.quantity === null || item.unitPrice === null
        ? sum
        : sum + calcAmount(item.quantity, item.unitPrice, rounding),
    0,
  );
}

/** 作成中の請求書の一覧（新しい順）。archived=true でアーカイブ一覧 */
export function listInvoices(
  db: Db,
  { archived }: { archived: boolean },
): InvoiceListRow[] {
  const rows = db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      issueDate: invoices.issueDate,
      subject: invoices.subject,
      clientName: clients.name,
      rounding: clients.rounding,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(
      archived ? isNotNull(invoices.archivedAt) : isNull(invoices.archivedAt),
    )
    .orderBy(desc(invoices.id))
    .all();
  if (rows.length === 0) return [];

  const items = db
    .select()
    .from(invoiceItems)
    .where(
      inArray(
        invoiceItems.invoiceId,
        rows.map((r) => r.id),
      ),
    )
    .all();

  return rows.map(({ rounding, ...row }) => ({
    ...row,
    total:
      rounding === null
        ? null
        : calcTotal(
            items.filter((item) => item.invoiceId === row.id),
            rounding,
          ),
  }));
}

export function getInvoice(db: Db, id: number): InvoiceWithItems | undefined {
  const invoice = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice) return undefined;
  const items = db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.position))
    .all();
  return { ...invoice, items };
}

/**
 * 請求書を保存する（id がなければ作成）。
 * - 取引先・事業主はアーカイブされていないものだけ選べる
 * - 請求番号は取引先と請求日がそろったら採番し、どちらかが変わったら振り直す（spec.md 7.2）
 * - 支払い期限は手動変更していなければ取引先と対象期間から算出する（spec.md 7.1）
 */
export function saveInvoice(
  db: Db,
  id: number | undefined,
  input: InvoiceDraftInput,
): SaveResult {
  return db.transaction((tx) => {
    const errors: InvoiceFormErrors = {};
    const client =
      input.clientId === null
        ? undefined
        : tx.select().from(clients).where(eq(clients.id, input.clientId)).get();
    if (input.clientId !== null && (!client || client.archivedAt)) {
      errors.clientId = "選択した取引先は使えません。選択し直してください";
    }
    if (input.ownerId !== null) {
      const owner = tx
        .select({ archivedAt: owners.archivedAt })
        .from(owners)
        .where(eq(owners.id, input.ownerId))
        .get();
      if (!owner || owner.archivedAt) {
        errors.ownerId = "選択した事業主は使えません。選択し直してください";
      }
    }
    const current =
      id === undefined
        ? undefined
        : tx.select().from(invoices).where(eq(invoices.id, id)).get();
    if (id !== undefined && !current) {
      throw new Error("請求書が見つかりません");
    }
    if (Object.keys(errors).length > 0) return { ok: false, errors };

    let invoiceNumber: string | null = null;
    if (client && input.issueDate) {
      const prefix = invoiceNumberPrefix(client.code, input.issueDate);
      invoiceNumber = current?.invoiceNumber?.startsWith(prefix)
        ? current.invoiceNumber
        : // 確定していない請求書の番号は連番に含めない（spec.md 7.2）。
          // TODO(台帳): 台帳を実装したら台帳の請求番号を渡す
          nextInvoiceNumber(prefix, []);
    }

    const period = periodOf(input);
    const dueDate =
      !input.dueDateManual && client && period
        ? calcDueDate(client, basisMonthOf(period))
        : input.dueDate;

    const { items, ...fields } = input;
    const values = { ...fields, dueDate, invoiceNumber };
    let invoiceId: number;
    if (id === undefined) {
      invoiceId = tx
        .insert(invoices)
        .values(values)
        .returning({ id: invoices.id })
        .get().id;
    } else {
      tx.update(invoices)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(invoices.id, id))
        .run();
      tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id)).run();
      invoiceId = id;
    }
    if (items.length > 0) {
      tx.insert(invoiceItems)
        .values(items.map((item) => ({ ...item, invoiceId })))
        .run();
    }
    return { ok: true, id: invoiceId };
  });
}

export function archiveInvoice(db: Db, id: number) {
  db.update(invoices)
    .set({ archivedAt: new Date() })
    .where(eq(invoices.id, id))
    .run();
}

export function restoreInvoice(db: Db, id: number) {
  db.update(invoices)
    .set({ archivedAt: null })
    .where(eq(invoices.id, id))
    .run();
}

export function deleteInvoice(db: Db, id: number) {
  db.delete(invoices).where(eq(invoices.id, id)).run();
}

/** 請求書（アーカイブ済みを含む）で使われている取引先か（spec.md 4.1） */
export function isClientInUse(db: Db, clientId: number) {
  return (
    db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.clientId, clientId))
      .get() !== undefined
  );
}

/** 請求書（アーカイブ済みを含む）で使われている事業主か（spec.md 4.1） */
export function isOwnerInUse(db: Db, ownerId: number) {
  return (
    db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.ownerId, ownerId))
      .get() !== undefined
  );
}
