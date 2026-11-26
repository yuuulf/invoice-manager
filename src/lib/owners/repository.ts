import { asc, eq, getTableColumns, isNotNull, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db/create-db";
import type { RowActionResult } from "@/lib/action-result";
import { isOwnerInUse } from "@/lib/invoices/repository";
import { owners } from "@/db/schema";
import type { OwnerInput, SealChange } from "./validation";

// データ印の画像は大きいため、一覧・編集では読み込まず有無だけを返す（seal は除外用）
const { seal, ...summaryColumns } = getTableColumns(owners);
const columns = {
  ...summaryColumns,
  hasSeal: sql<number>`${owners.seal} is not null`.mapWith(Boolean),
};

export type OwnerSummary = Omit<typeof owners.$inferSelect, "seal"> & {
  hasSeal: boolean;
};

/** 事業主の一覧。archived=true でアーカイブ一覧（spec.md 4.2） */
export function listOwners(
  db: Db,
  { archived }: { archived: boolean },
): OwnerSummary[] {
  return db
    .select(columns)
    .from(owners)
    .where(archived ? isNotNull(owners.archivedAt) : isNull(owners.archivedAt))
    .orderBy(asc(owners.id))
    .all();
}

export function getOwner(db: Db, id: number): OwnerSummary | undefined {
  return db.select(columns).from(owners).where(eq(owners.id, id)).get();
}

/** データ印の PNG。未登録なら undefined */
export function getOwnerSeal(db: Db, id: number): Buffer | undefined {
  const row = db
    .select({ seal: owners.seal })
    .from(owners)
    .where(eq(owners.id, id))
    .get();
  return row?.seal ?? undefined;
}

function sealValue(seal: SealChange) {
  if (seal.type === "keep") return {};
  return { seal: seal.type === "replace" ? seal.data : null };
}

export function createOwner(db: Db, input: OwnerInput, seal: SealChange) {
  db.insert(owners)
    .values({ ...input, ...sealValue(seal) })
    .run();
}

export function updateOwner(
  db: Db,
  id: number,
  input: OwnerInput,
  seal: SealChange,
) {
  db.update(owners)
    .set({ ...input, ...sealValue(seal), updatedAt: new Date() })
    .where(eq(owners.id, id))
    .run();
}

/** 請求書で使っている事業主はアーカイブできない（spec.md 4.1） */
export function archiveOwner(db: Db, id: number): RowActionResult {
  if (isOwnerInUse(db, id)) {
    return {
      error: "この事業主は請求書で使われているため、アーカイブできません",
    };
  }
  db.update(owners)
    .set({ archivedAt: new Date() })
    .where(eq(owners.id, id))
    .run();
}

export function restoreOwner(db: Db, id: number) {
  db.update(owners).set({ archivedAt: null }).where(eq(owners.id, id)).run();
}

/** 請求書で使っている事業主は削除できない（spec.md 4.1） */
export function deleteOwner(db: Db, id: number): RowActionResult {
  if (isOwnerInUse(db, id)) {
    return { error: "この事業主は請求書で使われているため、削除できません" };
  }
  db.delete(owners).where(eq(owners.id, id)).run();
}
