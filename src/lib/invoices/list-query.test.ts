import { expect, test } from "vitest";
import { applyInvoiceListQuery, parseInvoiceListQuery } from "./list-query";
import type { InvoiceListRow } from "./repository";

const rows: InvoiceListRow[] = [
  {
    id: 2,
    invoiceNumber: "INV-ABC-202611-001",
    clientName: "サンプル産業株式会社",
    subject: "Webサイト保守",
    issueDate: "2026-11-30",
    total: 134000,
  },
  {
    id: 1,
    invoiceNumber: null,
    clientName: null,
    subject: "下書き",
    issueDate: null,
    total: null,
  },
];

test("キーワード（請求書番号・取引先・件名）で絞り込み、並べ替える（空は最後）", () => {
  const q = (params: Record<string, string>) =>
    applyInvoiceListQuery(rows, parseInvoiceListQuery(params)).map((i) => i.id);
  expect(q({ q: "下書き" })).toEqual([1]);
  expect(q({ q: "abc" })).toEqual([2]);
  expect(q({ sort: "total", order: "desc" })).toEqual([2, 1]);
  expect(q({ sort: "issueDate" })).toEqual([2, 1]);
});
