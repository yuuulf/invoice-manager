import type { FeeBearer, PaymentTermType, RoundingMode } from "@/db/schema";

export const paymentTermLabels: Record<PaymentTermType, string> = {
  next_month_end: "翌月末日",
  month_after_next_end: "翌々月末",
  next_month_day: "翌月 N 日",
};

export const feeBearerLabels: Record<FeeBearer, string> = {
  client: "取引先",
  owner: "事業主",
  none: "指定なし",
};

export const roundingLabels: Record<RoundingMode, string> = {
  floor: "切り捨て",
  round: "四捨五入",
  ceil: "切り上げ",
};
