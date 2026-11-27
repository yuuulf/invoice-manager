import { accountTypeLabels } from "@/lib/owners/labels";
import { formatAmount, formatQuantity, type Period } from "@/lib/invoices/calc";
import type { InvoiceSnapshot } from "@/lib/invoices/snapshot";

// PDF に出す文言（spec.md 8 章）。コロン・括弧は全角、月日は 2 桁 0 埋め（8.3）

/** "2026-11-30" → "2026年11月30日"（FMT-5） */
export function formatJapaneseDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}年${month}月${day}日`;
}

/** 件名の後ろに付ける対象期間（8.4 件名） */
export function formatPeriod(period: Period): string {
  if (period.type === "month") {
    const [year, month] = period.month.split("-");
    return `（${year}年${month}月分）`;
  }
  return `（${formatJapaneseDate(period.start)}〜${formatJapaneseDate(period.end)}）`;
}

/** 宛名の行（8.4 宛名）。担当者名があれば 2 行で「様」、なければ 1 行で「御中」 */
export function recipientLines(client: InvoiceSnapshot["client"]): string[] {
  const company = [client.name, client.department].filter(Boolean).join(" ");
  return client.contactName
    ? [company, `${client.contactName} 様`]
    : [`${company} 御中`];
}

/** "1500001" → "〒150-0001" */
export function formatPostalCode(postalCode: string): string {
  return `〒${postalCode.slice(0, 3)}-${postalCode.slice(3)}`;
}

/** 事業主情報のグループ（8.4 事業主情報）。登録されていない項目は除く */
export function ownerGroups(owner: InvoiceSnapshot["owner"]) {
  return {
    names: { tradeName: owner.tradeName, name: owner.name },
    address: [
      formatPostalCode(owner.postalCode),
      owner.address1,
      owner.address2,
    ].filter((line): line is string => Boolean(line)),
    contact: [`TEL：${owner.phone}`, owner.email],
  };
}

/** "¥134,000 -"（8.4 ご請求金額） */
export function formatBilledAmount(total: number): string {
  return `¥${formatAmount(total)} -`;
}

/** 数量は数値と単位の間に半角スペース（8.4 明細・合計） */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  return `${formatQuantity(quantity)} ${unit}`;
}

const feeTexts: Record<InvoiceSnapshot["client"]["feeBearer"], string | null> =
  {
    client: "※振込手数料は貴社ご負担",
    owner: "※振込手数料は当方負担（差引振込可）",
    none: null,
  };

/**
 * 振込先の行（8.4 振込先）。口座、口座名義、その下に手数料負担の文言（指定なしなら出さない）
 */
export function bankLines(
  owner: InvoiceSnapshot["owner"],
  feeBearer: InvoiceSnapshot["client"]["feeBearer"],
): string[] {
  const fee = feeTexts[feeBearer];
  return [
    `${owner.bankName}（${owner.bankCode}） ${owner.branchName}（${owner.branchCode}） ${accountTypeLabels[owner.accountType]} ${owner.accountNumber}`,
    `口座名義：${owner.accountHolder}`,
    ...(fee ? [fee] : []),
  ];
}

/** 備考の本文（8.4 備考）。入力した備考を行ごとに */
export function noteLines(notes: string | null): string[] {
  return notes ? notes.split("\n") : [];
}
