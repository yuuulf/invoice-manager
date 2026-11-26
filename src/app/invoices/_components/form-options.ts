import "server-only";
import type { Db } from "@/db/create-db";
import { listClients } from "@/lib/clients/repository";
import { listOwners } from "@/lib/owners/repository";
import type { ClientOption, OwnerOption } from "./invoice-form";

/** 請求書フォームで選べる取引先・事業主（アーカイブ済みは除く。spec.md 7.1） */
export function loadFormOptions(db: Db): {
  clients: ClientOption[];
  owners: OwnerOption[];
} {
  return {
    clients: listClients(db, { archived: false }).map(
      ({ id, name, code, paymentTermType, paymentTermDay, rounding }) => ({
        id,
        name,
        code,
        paymentTermType,
        paymentTermDay,
        rounding,
      }),
    ),
    owners: listOwners(db, { archived: false }).map((owner) => ({
      id: owner.id,
      label: owner.tradeName
        ? `${owner.tradeName}（${owner.name}）`
        : owner.name,
    })),
  };
}
