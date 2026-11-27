import { sql } from "drizzle-orm";
import {
  blob,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

/** 支払い期限の種類（spec.md 5.1） */
export const paymentTermTypes = [
  "next_month_end",
  "month_after_next_end",
  "next_month_day",
] as const;
export type PaymentTermType = (typeof paymentTermTypes)[number];

/** 手数料負担（spec.md 5） */
export const feeBearers = ["client", "owner", "none"] as const;
export type FeeBearer = (typeof feeBearers)[number];

/** 端数処理（spec.md 5） */
export const roundingModes = ["floor", "round", "ceil"] as const;
export type RoundingMode = (typeof roundingModes)[number];

/** 取引先（spec.md 5） */
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  department: text("department"),
  contactName: text("contact_name"),
  paymentTermType: text("payment_term_type", { enum: paymentTermTypes })
    .notNull()
    .default("next_month_end"),
  /** 「翌月 N 日」の N（1〜31）。それ以外の支払い期限では null */
  paymentTermDay: integer("payment_term_day"),
  feeBearer: text("fee_bearer", { enum: feeBearers }).notNull().default("none"),
  rounding: text("rounding", { enum: roundingModes })
    .notNull()
    .default("floor"),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  ...timestamps,
});

export type Client = typeof clients.$inferSelect;

/** 振込先の科目（spec.md 6.1） */
export const accountTypes = ["ordinary", "checking"] as const;
export type AccountType = (typeof accountTypes)[number];

/** 事業主（spec.md 6） */
export const owners = sqliteTable("owners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  tradeName: text("trade_name"),
  /** 7 桁の数字（ハイフンなし） */
  postalCode: text("postal_code").notNull(),
  address1: text("address1").notNull(),
  address2: text("address2"),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code").notNull(),
  branchName: text("branch_name").notNull(),
  branchCode: text("branch_code").notNull(),
  accountType: text("account_type", { enum: accountTypes })
    .notNull()
    .default("ordinary"),
  accountNumber: text("account_number").notNull(),
  accountHolder: text("account_holder").notNull(),
  /** データ印（PNG） */
  seal: blob("seal", { mode: "buffer" }),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  ...timestamps,
});

export type Owner = typeof owners.$inferSelect;

/** 対象期間の種類（spec.md 7.1） */
export const periodTypes = ["month", "range"] as const;
export type PeriodType = (typeof periodTypes)[number];

/**
 * 消費税の扱い（spec.md 7.1）。excluded=税抜（税を表示しない）、included=税込（小計に消費税相当額を足す）
 */
export const taxModes = ["excluded", "included"] as const;
export type TaxMode = (typeof taxModes)[number];

/**
 * 作成中の請求書（spec.md 7）。必須項目がそろっていなくても保存できるため、ほとんどの列は null 可。
 * 日付は "YYYY-MM-DD"、年月は "YYYY-MM" の文字列で持つ。
 */
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "restrict",
  }),
  ownerId: integer("owner_id").references(() => owners.id, {
    onDelete: "restrict",
  }),
  /** 未採番なら null（spec.md 7.2） */
  invoiceNumber: text("invoice_number"),
  issueDate: text("issue_date"),
  subject: text("subject"),
  periodType: text("period_type", { enum: periodTypes }),
  periodMonth: text("period_month"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  dueDate: text("due_date"),
  /** 支払い期限を手動で変更したか。true の間は自動算出で上書きしない */
  dueDateManual: integer("due_date_manual", { mode: "boolean" })
    .notNull()
    .default(false),
  notes: text("notes"),
  taxMode: text("tax_mode", { enum: taxModes }).notNull().default("excluded"),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  ...timestamps,
});

export type Invoice = typeof invoices.$inferSelect;

/** 請求書の明細（spec.md 7.3）。最大 10 行で、行番号 position は 0〜9 */
export const invoiceItems = sqliteTable(
  "invoice_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description"),
    /** 数量を 100 倍した整数（小数第 2 位まで） */
    quantity: integer("quantity"),
    unit: text("unit"),
    unitPrice: integer("unit_price"),
  },
  (table) => [
    uniqueIndex("invoice_items_invoice_position_unique").on(
      table.invoiceId,
      table.position,
    ),
  ],
);

export type InvoiceItem = typeof invoiceItems.$inferSelect;

/**
 * 台帳（spec.md 7.4）。確定した請求書の PDF を、後から取引先・事業主が変わっても
 * 同じ内容で出力できるよう、出力に必要なデータ一式（snapshot）とデータ印を保存する。
 * 一覧表示・検索用に一部の値は列にも持つ。
 */
export const ledgerEntries = sqliteTable("ledger_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  issueDate: text("issue_date").notNull(),
  clientName: text("client_name").notNull(),
  subject: text("subject").notNull(),
  total: integer("total").notNull(),
  snapshot: text("snapshot", { mode: "json" })
    .$type<InvoiceSnapshot>()
    .notNull(),
  seal: blob("seal", { mode: "buffer" }),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  /** 取引先に送信した日（yyyy-MM-dd）。未送信なら null（spec.md 7.6） */
  sentOn: text("sent_on"),
  /** 入金された日（yyyy-MM-dd）。未入金なら null。送信済みのときだけ入る（spec.md 7.6） */
  paidOn: text("paid_on"),
  /** 送信ファイル（署名した PDF など）のリンク。任意。アプリからは取りに行かない（spec.md 7.6） */
  sentFileUrl: text("sent_file_url"),
  /** 台帳の備考（請求書の備考とは別。PDF には出さない） */
  memo: text("memo"),
});

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
