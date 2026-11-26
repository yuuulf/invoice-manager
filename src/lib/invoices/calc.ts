import type { PaymentTermType, RoundingMode } from "@/db/schema";

/** 数量は小数第 2 位まで（spec.md 7.3）。内部では 100 倍した整数で扱う */
export const QUANTITY_SCALE = 100;

const QUANTITY_PATTERN = /^\d+(\.\d{1,2})?$/;
const UNIT_PRICE_PATTERN = /^\d+$/;

/** "1.5" → 150。数量として不正なら null */
export function parseQuantity(text: string): number | null {
  if (!QUANTITY_PATTERN.test(text)) return null;
  const [int, frac = ""] = text.split(".");
  return Number(int) * QUANTITY_SCALE + Number(frac.padEnd(2, "0"));
}

/** 150 → "1.5"、1200 → "12" */
export function formatQuantity(scaled: number): string {
  const int = Math.floor(scaled / QUANTITY_SCALE);
  const frac = String(scaled % QUANTITY_SCALE)
    .padStart(2, "0")
    .replace(/0+$/, "");
  return frac ? `${int}.${frac}` : String(int);
}

/** 単価は 0 以上の整数（spec.md 7.3）。不正なら null */
export function parseUnitPrice(text: string): number | null {
  return UNIT_PRICE_PATTERN.test(text) ? Number(text) : null;
}

/** 金額 = 数量 × 単価。端数は取引先の端数処理に従う（spec.md 7.3） */
export function calcAmount(
  scaledQuantity: number,
  unitPrice: number,
  rounding: RoundingMode,
): number {
  const scaled = scaledQuantity * unitPrice;
  switch (rounding) {
    case "floor":
      return Math.floor(scaled / QUANTITY_SCALE);
    case "ceil":
      return Math.ceil(scaled / QUANTITY_SCALE);
    case "round":
      return Math.floor((scaled + QUANTITY_SCALE / 2) / QUANTITY_SCALE);
  }
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "YYYY-MM-DD" として正しい日付か */
export function isValidDate(text: string): boolean {
  const m = DATE_PATTERN.exec(text);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
  );
}

/** "YYYY-MM" として正しい年月か */
export function isValidMonth(text: string): boolean {
  const m = MONTH_PATTERN.exec(text);
  return m !== null && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

function pad(n: number, width = 2) {
  return String(n).padStart(width, "0");
}

/** 年月に n か月を足す */
function addMonths(year: number, month: number, n: number) {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export type PaymentTerm = {
  paymentTermType: PaymentTermType;
  paymentTermDay: number | null;
};

/**
 * 支払い期限を算出する（spec.md 5.1）。
 * @param basisMonth 基準月 "YYYY-MM"（対象期間が月ならその月、期間なら終了日の月）
 */
export function calcDueDate(term: PaymentTerm, basisMonth: string): string {
  const [year, month] = basisMonth.split("-").map(Number);
  const offset = term.paymentTermType === "month_after_next_end" ? 2 : 1;
  const target = addMonths(year, month, offset);
  const lastDay = daysInMonth(target.year, target.month);
  const day =
    term.paymentTermType === "next_month_day"
      ? Math.min(term.paymentTermDay ?? lastDay, lastDay)
      : lastDay;
  return `${target.year}-${pad(target.month)}-${pad(day)}`;
}

export type Period =
  | { type: "month"; month: string }
  | { type: "range"; start: string; end: string };

/** 支払い期限の基準月（spec.md 5.1） */
export function basisMonthOf(period: Period): string {
  return period.type === "month" ? period.month : period.end.slice(0, 7);
}

/** 請求番号の先頭 12 桁 `I{取引先コード}-yyyyMM-`（spec.md 7.2） */
export function invoiceNumberPrefix(clientCode: string, issueDate: string) {
  return `I${clientCode}-${issueDate.slice(0, 4)}${issueDate.slice(5, 7)}-`;
}

/**
 * 次の請求番号。先頭 12 桁が一致する既存番号の最大 +1、なければ 001（spec.md 7.2）
 * @param existingNumbers 台帳の請求番号
 */
export function nextInvoiceNumber(
  prefix: string,
  existingNumbers: readonly string[],
): string {
  const serials = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter(Number.isInteger);
  const next = serials.length === 0 ? 1 : Math.max(...serials) + 1;
  return `${prefix}${pad(next, 3)}`;
}
