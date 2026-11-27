import {
  periodTypes,
  taxModes,
  type PeriodType,
  type TaxMode,
} from "@/db/schema";
import { getText, isOneOf } from "@/lib/form-data";
import { exceeds, maxLengthMessage } from "@/lib/text-rules";
import {
  AMOUNT_MAX,
  isValidDate,
  isValidMonth,
  parseQuantity,
  parseUnitPrice,
  QUANTITY_SCALE,
} from "./calc";

/** 件名の最大文字数。PDF で件名＋対象期間が 3 行に収まる長さ（spec.md 7.1） */
export const SUBJECT_MAX_LENGTH = 34;

/** 明細の文字数の上限（spec.md 7.3）。数量は小数点も 1 文字、単価は桁数 */
export const ITEM_MAX_LENGTHS = {
  description: 60,
  quantity: 10,
  unit: 5,
  unitPrice: 10,
} as const;

/** 備考の 1 行の文字数（全角換算。spec.md 7.1）。これを超えると折り返す */
export const NOTES_LINE_WIDTH = 50;
/** 備考の最大行数（折り返しを含む。spec.md 7.1） */
export const NOTES_MAX_LINES = 5;

/** 全角換算の文字幅。半角（ASCII・半角カナ）は 0.5、それ以外は 1 */
function charWidth(char: string) {
  const code = char.codePointAt(0)!;
  return code <= 0x7e || (code >= 0xff61 && code <= 0xff9f) ? 0.5 : 1;
}

/**
 * 備考の行数。改行で区切った各行を、1 行 50 文字（全角換算）で折り返して数える（spec.md 7.1）。
 * 空の行も 1 行と数える。備考が空なら 0
 */
export function countNoteLines(notes: string): number {
  if (!notes) return 0;
  return notes.split("\n").reduce((total, line) => {
    let lines = 1;
    let width = 0;
    for (const char of line) {
      const w = charWidth(char);
      if (width + w > NOTES_LINE_WIDTH) {
        lines += 1;
        width = 0;
      }
      width += w;
    }
    return total + lines;
  }, 0);
}

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
  /** 消費税の扱い（税抜／税込） */
  taxMode: TaxMode;
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
  taxMode: string;
  items: ItemFormValues[];
};

/** キーは項目名、または明細なら `items.{行番号}.{列名}` */
export type InvoiceFormErrors = Record<string, string>;

export type InvoiceParseResult =
  | { ok: true; data: InvoiceDraftInput; values: InvoiceFormValues }
  | { ok: false; errors: InvoiceFormErrors; values: InvoiceFormValues };

export const itemFieldName = (position: number, key: keyof ItemFormValues) =>
  `items.${position}.${key}`;

/** FormData から請求書フォームの値を読む */
export function readInvoiceValues(formData: FormData): InvoiceFormValues {
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
    taxMode: text("taxMode"),
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

/** 金額（数量 × 単価）が上限を超えたときのメッセージ */
export const AMOUNT_TOO_LARGE =
  "金額（数量×単価）は10桁（9,999,999,999）以内にしてください";
/** 合計が上限を超えたときのメッセージ */
export const TOTAL_TOO_LARGE = "合計は10桁（9,999,999,999）以内にしてください";

const ITEM_FIELD_PATTERN =
  /^items\.(\d+)\.(description|quantity|unit|unitPrice)$/;

/**
 * 請求書フォームの 1 項目をチェックする（spec.md 7.1, 7.3）。保存時とフォーカスアウト時に使う。
 * 入力済みの値の形式・文字数だけを見て、未入力（必須）はチェックしない（必須は PDF 出力時）。
 * 問題なければ undefined、チェックしない項目なら null
 */
export function validateInvoiceField(
  name: string,
  values: InvoiceFormValues,
): string | undefined | null {
  const item = ITEM_FIELD_PATTERN.exec(name);
  if (item) {
    const key = item[2] as keyof ItemFormValues;
    const value = values.items[Number(item[1])]?.[key] ?? "";
    if (!value) return undefined;
    switch (key) {
      case "description":
        return exceeds(value, ITEM_MAX_LENGTHS.description)
          ? maxLengthMessage("内容", ITEM_MAX_LENGTHS.description)
          : undefined;
      case "unit":
        return exceeds(value, ITEM_MAX_LENGTHS.unit)
          ? maxLengthMessage("単位", ITEM_MAX_LENGTHS.unit)
          : undefined;
      case "quantity":
        if (exceeds(value, ITEM_MAX_LENGTHS.quantity))
          return `数量は${ITEM_MAX_LENGTHS.quantity}文字以内（小数点を含む）で入力してください`;
        return parseQuantity(value) === null
          ? "数量は0以上の数値（小数第2位まで）で入力してください"
          : undefined;
      case "unitPrice": {
        const unitPrice = parseUnitPrice(value);
        if (unitPrice === null) return "単価は0以上の整数で入力してください";
        if (exceeds(value, ITEM_MAX_LENGTHS.unitPrice))
          return `単価は${ITEM_MAX_LENGTHS.unitPrice}桁以内で入力してください`;
        // 金額（数量 × 単価）も 10 桁まで。端数処理によらず超えないよう、切り上げで見る
        const quantity = parseQuantity(values.items[Number(item[1])].quantity);
        return quantity !== null &&
          Math.ceil((quantity * unitPrice) / QUANTITY_SCALE) > AMOUNT_MAX
          ? AMOUNT_TOO_LARGE
          : undefined;
      }
    }
  }

  const periodType = values.periodType;
  switch (name) {
    case "clientId":
      return values.clientId && parseId(values.clientId) === null
        ? "取引先を選択し直してください"
        : undefined;
    case "ownerId":
      return values.ownerId && parseId(values.ownerId) === null
        ? "事業主を選択し直してください"
        : undefined;
    case "issueDate":
      return values.issueDate && !isValidDate(values.issueDate)
        ? "請求日の日付が正しくありません"
        : undefined;
    case "subject":
      return exceeds(values.subject, SUBJECT_MAX_LENGTH)
        ? maxLengthMessage("件名", SUBJECT_MAX_LENGTH)
        : undefined;
    case "notes":
      return countNoteLines(values.notes) > NOTES_MAX_LINES
        ? `備考は1行${NOTES_LINE_WIDTH}文字で折り返して${NOTES_MAX_LINES}行以内で入力してください`
        : undefined;
    case "dueDate":
      return values.dueDate && !isValidDate(values.dueDate)
        ? "支払い期限の日付が正しくありません"
        : undefined;
    case "periodType":
      return periodType && !isOneOf(periodTypes, periodType)
        ? "対象期間の種類を選択してください"
        : undefined;
    case "periodMonth":
      return periodType === "month" &&
        values.periodMonth &&
        !isValidMonth(values.periodMonth)
        ? "対象期間の年月が正しくありません"
        : undefined;
    case "periodStart":
      return periodType === "range" &&
        values.periodStart &&
        !isValidDate(values.periodStart)
        ? "対象期間の開始日が正しくありません"
        : undefined;
    case "periodEnd":
      if (periodType !== "range" || !values.periodEnd) return undefined;
      if (!isValidDate(values.periodEnd))
        return "対象期間の終了日が正しくありません";
      return isValidDate(values.periodStart) &&
        values.periodStart > values.periodEnd
        ? "対象期間の終了日は開始日以降にしてください"
        : undefined;
    case "taxMode":
      return values.taxMode && !isOneOf(taxModes, values.taxMode)
        ? "消費税を選択してください"
        : undefined;
    default:
      return null;
  }
}

const FIELD_NAMES = [
  "clientId",
  "ownerId",
  "issueDate",
  "subject",
  "periodType",
  "periodMonth",
  "periodStart",
  "periodEnd",
  "dueDate",
  "notes",
  "taxMode",
] as const;

/**
 * 作成中の請求書フォームを検証する。入力済みの値の形式だけをチェックし、
 * 必須項目がそろっているかはチェックしない（spec.md 7.1）。
 */
export function parseInvoiceForm(formData: FormData): InvoiceParseResult {
  const values = readInvoiceValues(formData);
  const errors: InvoiceFormErrors = {};
  const fieldNames = [
    ...FIELD_NAMES,
    ...values.items.flatMap((_, position) =>
      (["description", "quantity", "unit", "unitPrice"] as const).map((key) =>
        itemFieldName(position, key),
      ),
    ),
  ];
  for (const name of fieldNames) {
    const error = validateInvoiceField(name, values);
    if (error) errors[name] = error;
  }

  const periodType = isOneOf(periodTypes, values.periodType)
    ? values.periodType
    : null;

  // 未送信なら税抜（spec.md 7.1 のデフォルト）
  const taxMode: TaxMode | null = !values.taxMode
    ? "excluded"
    : isOneOf(taxModes, values.taxMode)
      ? values.taxMode
      : null;

  const items: InvoiceItemInput[] = [];
  values.items.forEach((item, position) => {
    const quantity = item.quantity ? parseQuantity(item.quantity) : null;
    const unitPrice = item.unitPrice ? parseUnitPrice(item.unitPrice) : null;
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
      taxMode: taxMode!,
      items,
    },
  };
}
