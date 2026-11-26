import { and, asc, eq, isNotNull, isNull, ne } from "drizzle-orm";
import type { Db } from "@/db/create-db";
import type { RowActionResult } from "@/lib/action-result";
import { isClientInUse } from "@/lib/invoices/repository";
import { clients, type Client } from "@/db/schema";
import type { ClientFormErrors, ClientInput } from "./validation";

export type MutationResult =
  { ok: true } | { ok: false; errors: ClientFormErrors };

const DUPLICATE_CODE_ERROR = "この取引先コードは既に使われています";

/** 取引先の一覧。archived=true でアーカイブ一覧（spec.md 4.2） */
export function listClients(
  db: Db,
  { archived }: { archived: boolean },
): Client[] {
  return db
    .select()
    .from(clients)
    .where(
      archived ? isNotNull(clients.archivedAt) : isNull(clients.archivedAt),
    )
    .orderBy(asc(clients.code))
    .all();
}

export function getClient(db: Db, id: number): Client | undefined {
  return db.select().from(clients).where(eq(clients.id, id)).get();
}

/** 取引先コードはアーカイブ済みを含めて重複不可（spec.md 5） */
function isCodeTaken(db: Db, code: string, excludeId?: number) {
  const row = db
    .select({ id: clients.id })
    .from(clients)
    .where(
      excludeId === undefined
        ? eq(clients.code, code)
        : and(eq(clients.code, code), ne(clients.id, excludeId)),
    )
    .get();
  return row !== undefined;
}

export function createClient(db: Db, input: ClientInput): MutationResult {
  if (isCodeTaken(db, input.code)) {
    return { ok: false, errors: { code: DUPLICATE_CODE_ERROR } };
  }
  db.insert(clients).values(input).run();
  return { ok: true };
}

export function updateClient(
  db: Db,
  id: number,
  input: ClientInput,
): MutationResult {
  if (isCodeTaken(db, input.code, id)) {
    return { ok: false, errors: { code: DUPLICATE_CODE_ERROR } };
  }
  db.update(clients)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .run();
  return { ok: true };
}

/** 請求書で使っている取引先はアーカイブできない（spec.md 4.1） */
export function archiveClient(db: Db, id: number): RowActionResult {
  if (isClientInUse(db, id)) {
    return {
      error: "この取引先は請求書で使われているため、アーカイブできません",
    };
  }
  db.update(clients)
    .set({ archivedAt: new Date() })
    .where(eq(clients.id, id))
    .run();
}

export function restoreClient(db: Db, id: number) {
  db.update(clients).set({ archivedAt: null }).where(eq(clients.id, id)).run();
}

/** 請求書で使っている取引先は削除できない（spec.md 4.1） */
export function deleteClient(db: Db, id: number): RowActionResult {
  if (isClientInUse(db, id)) {
    return { error: "この取引先は請求書で使われているため、削除できません" };
  }
  db.delete(clients).where(eq(clients.id, id)).run();
}
