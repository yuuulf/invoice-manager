import { like } from "drizzle-orm";
import type { DbOrTx } from "@/db/create-db";
import { ledgerEntries } from "@/db/schema";

/** 台帳にある、先頭が prefix の請求書番号（spec.md 7.2 の採番に使う） */
export function ledgerNumbersWithPrefix(db: DbOrTx, prefix: string): string[] {
  return db
    .select({ invoiceNumber: ledgerEntries.invoiceNumber })
    .from(ledgerEntries)
    .where(like(ledgerEntries.invoiceNumber, `${prefix}%`))
    .all()
    .map((row) => row.invoiceNumber);
}
