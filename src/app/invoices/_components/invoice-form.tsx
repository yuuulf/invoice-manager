"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { FormActions, type FormMode } from "@/components/ui/form-actions";
import { FormMessage } from "@/components/ui/form-message";
import { FormSection } from "@/components/ui/form-section";
import { RadioGroup } from "@/components/ui/radio-group";
import { SelectField } from "@/components/ui/select-field";
import { TextAreaField } from "@/components/ui/text-area-field";
import { TextField } from "@/components/ui/text-field";
import { useBlurValidation } from "@/components/ui/use-blur-validation";
import { taxModes, type Client, type TaxMode } from "@/db/schema";
import {
  basisMonthOf,
  calcAmount,
  calcDueDate,
  calcTotals,
  formatAmount,
  formatQuantity,
  isValidDate,
  isValidMonth,
  parseQuantity,
  parseUnitPrice,
  TAX_RATE,
  type Period,
  type Totals,
} from "@/lib/invoices/calc";
import { roundingLabels } from "@/lib/clients/labels";
import { taxModeLabels } from "@/lib/invoices/labels";
import type { InvoiceWithItems } from "@/lib/invoices/repository";
import {
  ITEM_MAX_LENGTHS,
  itemFieldName,
  MAX_ITEMS,
  NOTES_LINE_WIDTH,
  NOTES_MAX_LINES,
  readInvoiceValues,
  SUBJECT_MAX_LENGTH,
  validateInvoiceField,
  type InvoiceFormValues,
  type ItemFormValues,
} from "@/lib/invoices/validation";
import type { InvoiceFormState } from "../actions";

type Action = (
  state: InvoiceFormState,
  formData: FormData,
) => Promise<InvoiceFormState>;

export type ClientOption = Pick<
  Client,
  "id" | "name" | "code" | "paymentTermType" | "paymentTermDay" | "rounding"
>;
export type OwnerOption = { id: number; label: string };

const emptyItem: ItemFormValues = {
  description: "",
  quantity: "",
  unit: "",
  unitPrice: "",
};

/** 作成時の初期値。請求日は今日、対象期間は未入力（spec.md 7.1） */
function newInvoiceValues(today: string): InvoiceFormValues {
  return {
    clientId: "",
    ownerId: "",
    issueDate: today,
    subject: "",
    periodType: "",
    periodMonth: "",
    periodStart: "",
    periodEnd: "",
    dueDate: "",
    dueDateManual: false,
    notes: "",
    taxMode: "excluded",
    items: Array.from({ length: MAX_ITEMS }, () => emptyItem),
  };
}

function valuesOf(invoice: InvoiceWithItems): InvoiceFormValues {
  const items = Array.from({ length: MAX_ITEMS }, (_, position) => {
    const item = invoice.items.find((i) => i.position === position);
    return item
      ? {
          description: item.description ?? "",
          quantity: item.quantity === null ? "" : formatQuantity(item.quantity),
          unit: item.unit ?? "",
          unitPrice: item.unitPrice?.toString() ?? "",
        }
      : emptyItem;
  });
  return {
    clientId: invoice.clientId?.toString() ?? "",
    ownerId: invoice.ownerId?.toString() ?? "",
    issueDate: invoice.issueDate ?? "",
    subject: invoice.subject ?? "",
    periodType: invoice.periodType ?? "",
    periodMonth: invoice.periodMonth ?? "",
    periodStart: invoice.periodStart ?? "",
    periodEnd: invoice.periodEnd ?? "",
    dueDate: invoice.dueDate ?? "",
    dueDateManual: invoice.dueDateManual,
    notes: invoice.notes ?? "",
    taxMode: invoice.taxMode,
    items,
  };
}

/** 入力途中の対象期間から、支払い期限の算出に使える Period を作る */
function periodFrom(values: {
  periodType: string;
  periodMonth: string;
  periodStart: string;
  periodEnd: string;
}): Period | null {
  if (values.periodType === "month" && isValidMonth(values.periodMonth)) {
    return { type: "month", month: values.periodMonth };
  }
  if (
    values.periodType === "range" &&
    isValidDate(values.periodStart) &&
    isValidDate(values.periodEnd) &&
    values.periodStart <= values.periodEnd
  ) {
    return { type: "range", start: values.periodStart, end: values.periodEnd };
  }
  return null;
}

function isTaxMode(value: string): value is TaxMode {
  return (taxModes as readonly string[]).includes(value);
}

/** 明細行の金額。数量・単価がそろわない、または取引先が未選択なら null */
function amountOf(item: ItemFormValues, client: ClientOption | undefined) {
  const quantity = parseQuantity(item.quantity);
  const unitPrice = parseUnitPrice(item.unitPrice);
  if (!client || quantity === null || unitPrice === null) return null;
  return calcAmount(quantity, unitPrice, client.rounding);
}

export function InvoiceForm({
  action,
  invoice,
  clients,
  owners,
  today,
  mode,
}: {
  action: Action;
  invoice?: InvoiceWithItems;
  clients: ClientOption[];
  owners: OwnerOption[];
  /** 請求日の初期値 "YYYY-MM-DD" */
  today: string;
  mode: FormMode;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const values =
    state?.values ?? (invoice ? valuesOf(invoice) : newInvoiceValues(today));
  const { errors, onBlur } = useBlurValidation(
    state,
    state?.errors ?? {},
    (name, formData) => validateInvoiceField(name, readInvoiceValues(formData)),
  );

  return (
    <form
      action={formAction}
      onBlur={onBlur}
      noValidate
      className="max-w-4xl space-y-10"
    >
      {invoice && <input type="hidden" name="id" value={invoice.id} />}
      <FormMessage message={state?.message} />
      {/* 送信結果が返ったら、返ってきた値で入力欄を作り直す */}
      <InvoiceFields
        key={JSON.stringify(state)}
        initial={values}
        errors={errors}
        invoiceNumber={invoice?.invoiceNumber ?? null}
        clients={clients}
        owners={owners}
      />
      <OutputSection pending={pending} />
      <FormActions mode={mode} cancelHref="/invoices" pending={pending} />
    </form>
  );
}

/** PDF 出力。保存してプレビュー画面を開き、確定はそこで行う（spec.md 7.4） */
function OutputSection({ pending }: { pending: boolean }) {
  return (
    <FormSection title="出力">
      <div className="space-y-2">
        <Button
          type="submit"
          name="intent"
          value="output"
          variant="secondary"
          disabled={pending}
        >
          PDF出力
        </Button>
        <p className="text-sm text-zinc-500">
          入力内容を保存して、PDFのプレビューを表示します。ダウンロードと確定はプレビュー画面で行います。
        </p>
      </div>
    </FormSection>
  );
}

function InvoiceFields({
  initial,
  errors,
  invoiceNumber,
  clients,
  owners,
}: {
  initial: InvoiceFormValues;
  errors: Record<string, string | undefined>;
  invoiceNumber: string | null;
  clients: ClientOption[];
  owners: OwnerOption[];
}) {
  const [clientId, setClientId] = useState(initial.clientId);
  const [period, setPeriod] = useState({
    periodType: initial.periodType,
    periodMonth: initial.periodMonth,
    periodStart: initial.periodStart,
    periodEnd: initial.periodEnd,
  });
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [dueDateManual, setDueDateManual] = useState(initial.dueDateManual);
  const [items, setItems] = useState(initial.items);
  const [taxMode, setTaxMode] = useState(initial.taxMode);

  const client = clients.find((c) => String(c.id) === clientId);
  const validPeriod = periodFrom(period);
  const autoDueDate =
    client && validPeriod
      ? calcDueDate(client, basisMonthOf(validPeriod))
      : null;
  const shownDueDate = dueDateManual ? dueDate : (autoDueDate ?? dueDate);

  const amounts = items.map((item) => amountOf(item, client));
  const totals = client
    ? calcTotals(
        amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0),
        isTaxMode(taxMode) ? taxMode : "excluded",
        client.rounding,
      )
    : null;

  const updatePeriod = (key: keyof typeof period, value: string) =>
    setPeriod((p) => ({ ...p, [key]: value }));
  const updateItem = (
    position: number,
    key: keyof ItemFormValues,
    value: string,
  ) =>
    setItems((current) =>
      current.map((item, i) =>
        i === position ? { ...item, [key]: value } : item,
      ),
    );

  return (
    <>
      <FormSection title="基本情報">
        <div>
          <p className="text-sm font-bold">請求番号</p>
          <p className="mt-1 font-mono">
            {invoiceNumber ?? <span className="text-zinc-500">未採番</span>}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            取引先と請求日を入力して保存すると採番されます。取引先か請求日の年月を変えると振り直します。
          </p>
        </div>
        <SelectField
          label="取引先"
          name="clientId"
          required
          // value で固定すると、送信後に React がフォームをリセットしたとき選択が外れて見える。
          // defaultValue（送信結果の値で作り直される）にし、変更だけを state に反映する
          defaultValue={initial.clientId}
          onChange={(e) => setClientId(e.target.value)}
          error={errors.clientId}
          options={clients.map((c) => ({
            value: String(c.id),
            label: `${c.code} ${c.name}`,
          }))}
        />
        <SelectField
          label="事業主"
          name="ownerId"
          required
          defaultValue={initial.ownerId}
          error={errors.ownerId}
          options={owners.map((o) => ({ value: String(o.id), label: o.label }))}
        />
        <div className="w-48">
          <TextField
            label="請求日"
            name="issueDate"
            type="date"
            required
            defaultValue={initial.issueDate}
            error={errors.issueDate}
          />
        </div>
        <TextField
          label="件名"
          name="subject"
          required
          maxLength={SUBJECT_MAX_LENGTH}
          hint={`${SUBJECT_MAX_LENGTH}文字以内`}
          defaultValue={initial.subject}
          error={errors.subject}
        />
      </FormSection>

      <FormSection title="対象期間・支払い期限">
        <div>
          <RadioGroup
            legend="対象期間"
            name="periodType"
            required
            value={period.periodType}
            onValueChange={(value) => updatePeriod("periodType", value)}
            error={errors.periodType}
            options={[
              { value: "month", label: "月" },
              { value: "range", label: "期間" },
            ]}
          />
          {period.periodType === "month" && (
            <div className="mt-3 w-48">
              <TextField
                label="対象月"
                name="periodMonth"
                type="month"
                value={period.periodMonth}
                onChange={(e) => updatePeriod("periodMonth", e.target.value)}
                error={errors.periodMonth}
              />
            </div>
          )}
          {period.periodType === "range" && (
            <div className="mt-3 flex items-start gap-3">
              <div className="w-48">
                <TextField
                  label="開始日"
                  name="periodStart"
                  type="date"
                  value={period.periodStart}
                  onChange={(e) => updatePeriod("periodStart", e.target.value)}
                  error={errors.periodStart}
                />
              </div>
              <span className="pt-9">〜</span>
              <div className="w-48">
                <TextField
                  label="終了日"
                  name="periodEnd"
                  type="date"
                  value={period.periodEnd}
                  onChange={(e) => updatePeriod("periodEnd", e.target.value)}
                  error={errors.periodEnd}
                />
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-end gap-2">
            <div className="w-48">
              <TextField
                label="支払い期限"
                name="dueDate"
                type="date"
                required
                value={shownDueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  setDueDateManual(true);
                }}
                error={errors.dueDate}
              />
            </div>
            <Button
              variant="secondary"
              disabled={!dueDateManual || autoDueDate === null}
              onClick={() => setDueDateManual(false)}
            >
              再計算
            </Button>
          </div>
          <input
            type="hidden"
            name="dueDateManual"
            value={String(dueDateManual)}
          />
          <p className="mt-1 text-sm text-zinc-500">
            {dueDateManual
              ? "手動で変更しています。取引先や対象期間を変えても自動では変わりません。"
              : "取引先の支払い期限の設定と対象期間から自動で算出します。"}
          </p>
        </div>
      </FormSection>

      <FormSection title="明細">
        <RadioGroup
          legend="消費税"
          name="taxMode"
          required
          value={taxMode}
          onValueChange={setTaxMode}
          error={errors.taxMode}
          hint={`税込にすると、合計欄を小計（税抜）・消費税相当額（${TAX_RATE}%）・合計にします。単価は税抜きで入力します。`}
          options={taxModes.map((value) => ({
            value,
            label: taxModeLabels[value],
          }))}
        />
        <ItemsTable
          items={items}
          amounts={amounts}
          totals={totals}
          errors={errors}
          onChange={updateItem}
          rounding={client?.rounding}
        />
      </FormSection>

      <FormSection title="備考">
        <TextAreaField
          label="備考"
          name="notes"
          hint={`1行${NOTES_LINE_WIDTH}文字（半角は0.5文字）で折り返して${NOTES_MAX_LINES}行まで`}
          defaultValue={initial.notes}
          rows={NOTES_MAX_LINES}
          // 全角 50 文字で折り返す幅（左右の余白と枠線、カーソルの分として半角 1 文字を足す）。英単語の途中でも折り返す。
          // 半角は文字によって幅が違うため、見た目の折り返しと行数（半角 = 0.5 文字）は多少ずれる
          style={{ width: `calc(${NOTES_LINE_WIDTH + 0.5}em + 1.5rem + 2px)` }}
          className="max-w-full [line-break:anywhere]"
          error={errors.notes}
        />
      </FormSection>
    </>
  );
}

const cellInput =
  "w-full rounded border px-2 py-1 aria-invalid:border-red-600 border-zinc-300";

function ItemsTable({
  items,
  amounts,
  totals,
  errors,
  onChange,
  rounding,
}: {
  items: ItemFormValues[];
  amounts: (number | null)[];
  /** 取引先が未選択なら null */
  totals: Totals | null;
  errors: Record<string, string | undefined>;
  onChange: (
    position: number,
    key: keyof ItemFormValues,
    value: string,
  ) => void;
  /** 選択中の取引先の端数処理。未選択なら undefined */
  rounding: ClientOption["rounding"] | undefined;
}) {
  const input = (
    position: number,
    key: keyof ItemFormValues,
    label: string,
  ) => {
    const name = itemFieldName(position, key);
    const error = errors[name];
    const errorId = `${name}-error`;
    const numeric = key === "quantity" || key === "unitPrice";
    return (
      <>
        <input
          name={name}
          aria-label={`${position + 1}行目の${label}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          inputMode={
            key === "quantity"
              ? "decimal"
              : key === "unitPrice"
                ? "numeric"
                : undefined
          }
          value={items[position][key]}
          maxLength={ITEM_MAX_LENGTHS[key]}
          onChange={(e) => onChange(position, key, e.target.value)}
          className={`${cellInput} ${numeric ? "text-right" : ""}`}
        />
        <FieldError id={errorId} message={error} />
      </>
    );
  };

  return (
    <div>
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left">
            <th className="w-10 px-1 py-2 text-center">
              <span className="sr-only">行</span>
            </th>
            <th className="px-1 py-2">内容</th>
            <th className="w-24 px-1 py-2 text-right">数量</th>
            <th className="w-20 px-1 py-2">単位</th>
            <th className="w-28 px-1 py-2 text-right">単価</th>
            <th className="w-28 px-1 py-2 text-right">金額</th>
          </tr>
        </thead>
        <tbody>
          {items.map((_, position) => (
            <tr key={position} className="border-b border-zinc-100 align-top">
              <td className="px-1 py-1 pt-2.5 text-center text-zinc-500">
                {position + 1}
              </td>
              <td className="px-1 py-1">
                {input(position, "description", "内容")}
              </td>
              <td className="px-1 py-1">
                {input(position, "quantity", "数量")}
              </td>
              <td className="px-1 py-1">{input(position, "unit", "単位")}</td>
              <td className="px-1 py-1">
                {input(position, "unitPrice", "単価")}
              </td>
              <td
                className="px-1 py-1 pt-2.5 text-right"
                aria-label={`${position + 1}行目の金額`}
              >
                {amounts[position] === null
                  ? ""
                  : formatAmount(amounts[position])}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {totals?.tax != null && (
            <>
              <TotalRow label="小計（税抜）" value={totals.subtotal} />
              <TotalRow
                label={`消費税相当額（${TAX_RATE}%）`}
                value={totals.tax}
              />
            </>
          )}
          <TotalRow label="合計" value={totals?.total ?? null} bold />
        </tfoot>
      </table>
      <p className="mt-2 text-sm text-zinc-500">
        {rounding
          ? `金額は数量×単価を取引先の端数処理（${roundingLabels[rounding]}）で計算します。${totals?.tax != null ? `消費税相当額も小計の${TAX_RATE}%を同じ端数処理で計算します。` : ""}最大10行です。`
          : "取引先を選択すると金額と合計を計算します。最大10行です。"}
      </p>
    </div>
  );
}

/** 明細表の合計欄の1行。値が null（取引先が未選択）なら「—」 */
function TotalRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number | null;
  bold?: boolean;
}) {
  return (
    <tr>
      <th colSpan={5} className="px-1 py-2 text-right">
        {label}
      </th>
      <td
        className={`px-1 py-2 text-right ${bold ? "font-bold" : ""}`}
        aria-label={label}
      >
        {value === null ? "—" : formatAmount(value)}
      </td>
    </tr>
  );
}
