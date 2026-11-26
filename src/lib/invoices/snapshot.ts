import type { Client, Owner } from "@/db/schema";
import { calcAmount, type Period } from "./calc";
import { periodOf, type InvoiceWithItems } from "./repository";
import { itemFieldName, type InvoiceFormErrors } from "./validation";

/**
 * PDF を出力するのに必要なデータ一式。確定時は台帳にこのまま保存し、
 * 後から取引先・事業主を変更・削除しても同じ PDF を出せるようにする（spec.md 7.4）。
 */
export type InvoiceSnapshot = {
  invoiceNumber: string;
  issueDate: string;
  subject: string;
  period: Period;
  dueDate: string;
  notes: string | null;
  /** 台帳から請求書にコピーするときに使う（spec.md 7.4） */
  clientId: number;
  ownerId: number;
  client: Pick<
    Client,
    "code" | "name" | "department" | "contactName" | "feeBearer" | "rounding"
  >;
  owner: Pick<
    Owner,
    | "name"
    | "tradeName"
    | "postalCode"
    | "address1"
    | "address2"
    | "phone"
    | "email"
    | "bankName"
    | "bankCode"
    | "branchName"
    | "branchCode"
    | "accountType"
    | "accountNumber"
    | "accountHolder"
  >;
  items: {
    position: number;
    description: string;
    /** 100 倍した整数 */
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
  }[];
  total: number;
};

/**
 * PDF 出力（確定を含む）の前に、必須項目がそろっているかをチェックする（spec.md 7.1, 7.3）。
 * エラーのキーは請求書フォームの項目名に合わせる。
 */
export function checkCompleteness(
  invoice: InvoiceWithItems,
): InvoiceFormErrors {
  const errors: InvoiceFormErrors = {};
  if (invoice.clientId === null) errors.clientId = "取引先を選択してください";
  if (invoice.ownerId === null) errors.ownerId = "事業主を選択してください";
  if (!invoice.issueDate) errors.issueDate = "請求日を入力してください";
  if (!invoice.subject) errors.subject = "件名を入力してください";
  if (!invoice.periodType) {
    errors.periodType = "対象期間を選択してください";
  } else if (invoice.periodType === "month") {
    if (!invoice.periodMonth) errors.periodMonth = "対象月を入力してください";
  } else {
    if (!invoice.periodStart) errors.periodStart = "開始日を入力してください";
    if (!invoice.periodEnd) errors.periodEnd = "終了日を入力してください";
  }
  if (!invoice.dueDate) errors.dueDate = "支払い期限を入力してください";

  const first = invoice.items.find((item) => item.position === 0);
  if (!first?.description) {
    errors[itemFieldName(0, "description")] = "1行目の内容を入力してください";
  }
  for (const item of invoice.items) {
    const name = (key: Parameters<typeof itemFieldName>[1]) =>
      itemFieldName(item.position, key);
    if (!item.description) {
      if (item.position !== 0)
        errors[name("description")] = "内容を入力してください";
      continue;
    }
    if (item.quantity === null)
      errors[name("quantity")] = "数量を入力してください";
    if (!item.unit) errors[name("unit")] = "単位を入力してください";
    if (item.unitPrice === null)
      errors[name("unitPrice")] = "単価を入力してください";
  }
  return errors;
}

/** 必須項目がそろった請求書から PDF 用のデータを作る。そろっていなければ例外 */
export function buildSnapshot(
  invoice: InvoiceWithItems,
  client: Client,
  owner: Owner,
): InvoiceSnapshot {
  const period = periodOf(invoice);
  if (
    Object.keys(checkCompleteness(invoice)).length > 0 ||
    !period ||
    !invoice.invoiceNumber ||
    invoice.clientId !== client.id ||
    invoice.ownerId !== owner.id
  ) {
    throw new Error("請求書の必須項目がそろっていません");
  }

  const items = invoice.items
    .toSorted((a, b) => a.position - b.position)
    .map((item) => {
      const quantity = item.quantity!;
      const unitPrice = item.unitPrice!;
      return {
        position: item.position,
        description: item.description!,
        quantity,
        unit: item.unit!,
        unitPrice,
        amount: calcAmount(quantity, unitPrice, client.rounding),
      };
    });

  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate!,
    subject: invoice.subject!,
    period,
    dueDate: invoice.dueDate!,
    notes: invoice.notes,
    clientId: client.id,
    ownerId: owner.id,
    client: {
      code: client.code,
      name: client.name,
      department: client.department,
      contactName: client.contactName,
      feeBearer: client.feeBearer,
      rounding: client.rounding,
    },
    owner: {
      name: owner.name,
      tradeName: owner.tradeName,
      postalCode: owner.postalCode,
      address1: owner.address1,
      address2: owner.address2,
      phone: owner.phone,
      email: owner.email,
      bankName: owner.bankName,
      bankCode: owner.bankCode,
      branchName: owner.branchName,
      branchCode: owner.branchCode,
      accountType: owner.accountType,
      accountNumber: owner.accountNumber,
      accountHolder: owner.accountHolder,
    },
    items,
    total: items.reduce((sum, item) => sum + item.amount, 0),
  };
}
