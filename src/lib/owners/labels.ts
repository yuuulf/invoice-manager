import type { AccountType } from "@/db/schema";

export const accountTypeLabels: Record<AccountType, string> = {
  ordinary: "普通",
  checking: "当座",
};

/** 事業主の表示名。屋号があれば「屋号（氏名）」、なければ氏名 */
export function ownerDisplayName(owner: {
  name: string;
  tradeName: string | null;
}): string {
  return owner.tradeName ? `${owner.tradeName}（${owner.name}）` : owner.name;
}
