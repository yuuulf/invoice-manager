import { sql } from "drizzle-orm";
import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
