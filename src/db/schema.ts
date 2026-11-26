import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
