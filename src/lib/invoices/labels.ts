import type { TaxMode } from "@/db/schema";

/** 消費税の扱いの表示名（spec.md 7.1） */
export const taxModeLabels: Record<TaxMode, string> = {
  excluded: "税抜",
  included: "税込",
};
