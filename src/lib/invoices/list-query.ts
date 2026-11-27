import {
  firstParam,
  LIST_PARAM,
  matchesKeyword,
  parseSort,
  sortRows,
  type SearchParams,
  type SortState,
} from "@/lib/list-query";
import type { InvoiceListRow } from "./repository";

export const invoiceSortKeys = [
  "invoiceNumber",
  "clientName",
  "subject",
  "issueDate",
  "total",
] as const;
export type InvoiceSortKey = (typeof invoiceSortKeys)[number];

export type InvoiceListQuery = {
  sort: SortState<InvoiceSortKey>;
  keyword: string;
};

/** 請求書一覧の並べ替え・絞り込みの条件を読む（spec.md 3.2） */
export function parseInvoiceListQuery(params: SearchParams): InvoiceListQuery {
  return {
    sort: parseSort(params, invoiceSortKeys),
    keyword: firstParam(params, LIST_PARAM.keyword),
  };
}

/** キーワード（請求書番号・取引先・件名）で絞り込み、並べ替える */
export function applyInvoiceListQuery(
  rows: readonly InvoiceListRow[],
  { sort, keyword }: InvoiceListQuery,
): InvoiceListRow[] {
  const filtered = rows.filter((i) =>
    matchesKeyword([i.invoiceNumber, i.clientName, i.subject], keyword),
  );
  return sortRows(filtered, sort, {
    invoiceNumber: (i) => i.invoiceNumber,
    clientName: (i) => i.clientName,
    subject: (i) => i.subject,
    issueDate: (i) => i.issueDate,
    total: (i) => i.total,
  });
}
