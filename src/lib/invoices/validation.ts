import { periodTypes, type PeriodType } from "@/db/schema";
import { getText, isOneOf } from "@/lib/form-data";
import {
  isValidDate,
  isValidMonth,
  parseQuantity,
  parseUnitPrice,
} from "./calc";

/** 件名の最大文字数。PDF で件名＋対象期間が 3 行に収まる長さ（spec.md 7.1） */
export const SUBJECT_MAX_LENGTH = 34;

/** 明細の最大行数（spec.md 7.3） */
export const MAX_ITEMS = 10;

export type InvoiceItemInput = {
  position: number;
  description: string | null;
  /** 100 倍した整数 */
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
};

/** 作成中の請求書の入力。必須項目がそろっていなくてもよい（spec.md 7.1） */
export type InvoiceDraftInput = {
  clientId: number | null;
  ownerId: number | null;
  issueDate: string | null;
  subject: string | null;
  periodType: PeriodType | null;
  periodMonth: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  dueDateManual: boolean;
  notes: string | null;
  /** 何か入力のある行だけ */
  items: InvoiceItemInput[];
};

export type ItemFormValues = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

export type InvoiceFormValues = {
  clientId: string;
  ownerId: string;
  issueDate: string;
  subject: string;
  periodType: string;
  periodMonth: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  dueDateManual: boolean;
  notes: string;
  items: ItemFormValues[];
};

/** キーは項目名、または明細なら `items.{行番号}.{列名}` */
export type InvoiceFormErrors = Record<string, string>;

export type InvoiceParseResult =
  | { ok: true; data: InvoiceDraftInput; values: InvoiceFormValues }
  | { ok: false; errors: InvoiceFormErrors; values: InvoiceFormValues };

export const itemFieldName = (position: number, key: keyof ItemFormValues) =>
  `items.${position}.${key}`;

function readValues(formData: FormData): InvoiceFormValues {
  const text = (key: string) => getText(formData, key);
  return {
    clientId: text("clientId"),
    ownerId: text("ownerId"),
    issueDate: text("issueDate"),
    subject: text("subject"),
    periodType: text("periodType"),
    periodMonth: text("periodMonth"),
    periodStart: text("periodStart"),
    periodEnd: text("periodEnd"),
    dueDate: text("dueDate"),
    dueDateManual: formData.get("dueDateManual") === "true",
    notes: getNotes(formData),
    items: Array.from({ length: MAX_ITEMS }, (_, i) => ({
      description: text(itemFieldName(i, "description")),
      quantity: text(itemFieldName(i, "quantity")),
      unit: text(itemFieldName(i, "unit")),
      unitPrice: text(itemFieldName(i, "unitPrice")),
    })),
  };
}

/** 備考は改行を保つため、前後の空白行だけを取り除く */
function getNotes(formData: FormData) {
  const value = formData.get("notes");
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

const orNull = (value: string) => value || null;

function parseId(value: string) {
  return /^\d+$/.test(value) ? Number(value) : null;
}

/**
 * 作成中の請求書フォームを検証する。入力済みの値の形式だけをチェックし、
 * 必須項目がそろっているかはチェックしない（spec.md 7.1）。
 */
export function parseInvoiceForm(formData: FormData): InvoiceParseResult {
  const values = readValues(formData);
  const errors: InvoiceFormErrors = {};

  if (values.clientId && parseId(values.clientId) === null) {
    errors.clientId = "取引先を選択し直してください";
  }
  if (values.ownerId && parseId(values.ownerId) === null) {
    errors.ownerId = "事業主を選択し直してください";
  }
  if (values.issueDate && !isValidDate(values.issueDate)) {
    errors.issueDate = "請求日の日付が正しくありません";
  }
  if ([...values.subject].length > SUBJECT_MAX_LENGTH) {
    errors.subject = `件名は${SUBJECT_MAX_LENGTH}文字以内で入力してください`;
  }
  if (values.dueDate && !isValidDate(values.dueDate)) {
    errors.dueDate = "支払い期限の日付が正しくありません";
  }

  const periodType = isOneOf(periodTypes, values.periodType)
    ? values.periodType
    : null;
  if (values.periodType && !periodType) {
    errors.periodType = "対象期間の種類を選択してください";
  }
  if (periodType === "month") {
    if (values.periodMonth && !isValidMonth(values.periodMonth)) {
      errors.periodMonth = "対象期間の年月が正しくありません";
    }
  }
  if (periodType === "range") {
    if (values.periodStart && !isValidDate(values.periodStart)) {
      errors.periodStart = "対象期間の開始日が正しくありません";
    }
    if (values.periodEnd && !isValidDate(values.periodEnd)) {
      errors.periodEnd = "対象期間の終了日が正しくありません";
    }
    if (
      !errors.periodStart &&
      !errors.periodEnd &&
      values.periodStart &&
      values.periodEnd &&
      values.periodStart > values.periodEnd
    ) {
      errors.periodEnd = "対象期間の終了日は開始日以降にしてください";
    }
  }

  const items: InvoiceItemInput[] = [];
  values.items.forEach((item, position) => {
    const quantity = item.quantity ? parseQuantity(item.quantity) : null;
    const unitPrice = item.unitPrice ? parseUnitPrice(item.unitPrice) : null;
    if (item.quantity && quantity === null) {
      errors[itemFieldName(position, "quantity")] =
        "数量は0以上の数値（小数第2位まで）で入力してください";
    }
    if (item.unitPrice && unitPrice === null) {
      errors[itemFieldName(position, "unitPrice")] =
        "単価は0以上の整数で入力してください";
    }
    if (item.description || item.quantity || item.unit || item.unitPrice) {
      items.push({
        position,
        description: orNull(item.description),
        quantity,
        unit: orNull(item.unit),
        unitPrice,
      });
    }
  });

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    values,
    data: {
      clientId: parseId(values.clientId),
      ownerId: parseId(values.ownerId),
      issueDate: orNull(values.issueDate),
      subject: orNull(values.subject),
      periodType,
      periodMonth: periodType === "month" ? orNull(values.periodMonth) : null,
      periodStart: periodType === "range" ? orNull(values.periodStart) : null,
      periodEnd: periodType === "range" ? orNull(values.periodEnd) : null,
      dueDate: orNull(values.dueDate),
      dueDateManual: values.dueDateManual,
      notes: orNull(values.notes),
      items,
    },
  };
}
