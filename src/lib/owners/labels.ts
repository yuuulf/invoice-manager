import type { AccountType } from "@/db/schema";

export const accountTypeLabels: Record<AccountType, string> = {
  ordinary: "普通",
  checking: "当座",
};
