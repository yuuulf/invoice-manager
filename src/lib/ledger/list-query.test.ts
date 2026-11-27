import { describe, expect, test } from "vitest";
import {
  applyLedgerListQuery,
  hasLedgerFilter,
  ledgerClientNames,
  parseLedgerListQuery,
} from "./list-query";
import type { LedgerListRow } from "./repository";

function row(id: number, overrides: Partial<LedgerListRow>): LedgerListRow {
  return {
    id,
    invoiceNumber: `INV-ABC-202611-00${id}`,
    issueDate: "2026-11-30",
    clientName: "サンプル産業株式会社",
    subject: "Webサイト保守",
    total: 1000,
    confirmedAt: new Date(0),
    sentOn: null,
    paidOn: null,
    sentFileUrl: null,
    memo: null,
    ...overrides,
  };
}

const rows = [
  row(1, { issueDate: "2026-10-31", total: 3000 }),
  row(2, {
    clientName: "テスト商事",
    subject: "開発",
    sentOn: "2026-12-01",
    total: 1000,
  }),
  row(3, {
    sentOn: "2026-11-30",
    paidOn: "2026-12-20",
    memo: "取り消し。004で再発行",
    total: 2000,
  }),
  row(4, { issueDate: "2026-12-15", sentOn: "2026-12-16" }),
];
const ids = (list: LedgerListRow[]) => list.map((e) => e.id);

describe("parseLedgerListQuery", () => {
  test("条件を読み、不正な年月や状態は無視する", () => {
    expect(
      parseLedgerListQuery({
        q: " 保守 ",
        client: "テスト商事",
        from: "2026-01",
        to: "2026-13",
        status: ["sent", "x", "paid"],
        sort: "status",
        order: "desc",
      }),
    ).toEqual({
      keyword: "保守",
      client: "テスト商事",
      from: "2026-01",
      to: "",
      statuses: ["sent", "paid"],
      sort: { key: "status", order: "desc" },
    });
  });

  test("hasLedgerFilter: 並べ替えだけなら絞り込みなし", () => {
    expect(hasLedgerFilter(parseLedgerListQuery({ sort: "total" }))).toBe(
      false,
    );
    expect(hasLedgerFilter(parseLedgerListQuery({ status: "paid" }))).toBe(
      true,
    );
  });
});

describe("applyLedgerListQuery", () => {
  const apply = (params: Record<string, string | string[]>) =>
    ids(applyLedgerListQuery(rows, parseLedgerListQuery(params)));

  test("条件がなければ元の順のまま全件", () => {
    expect(apply({})).toEqual([1, 2, 3, 4]);
  });

  test("キーワードは請求書番号・取引先・件名・備考から探す", () => {
    expect(apply({ q: "テスト" })).toEqual([2]);
    expect(apply({ q: "取り消し" })).toEqual([3]);
    expect(apply({ q: "202611-004" })).toEqual([4]);
  });

  test("取引先・請求日の範囲（年月）・状態で絞り込む", () => {
    expect(apply({ client: "テスト商事" })).toEqual([2]);
    expect(apply({ from: "2026-11" })).toEqual([2, 3, 4]);
    expect(apply({ to: "2026-11" })).toEqual([1, 2, 3]);
    expect(apply({ from: "2026-11", to: "2026-11" })).toEqual([2, 3]);
    expect(apply({ status: "unsent" })).toEqual([1]);
    expect(apply({ status: ["unsent", "sent"] })).toEqual([1, 2, 4]);
  });

  test("状態は 未送信 → 未入金 → 入金済 の順、同じ状態は日付順", () => {
    expect(apply({ sort: "status" })).toEqual([1, 2, 4, 3]);
    expect(apply({ sort: "status", order: "desc" })).toEqual([3, 4, 2, 1]);
  });

  test("合計・請求日で並べ替える", () => {
    expect(apply({ sort: "total", order: "desc" })).toEqual([1, 3, 2, 4]);
    expect(apply({ sort: "issueDate" })).toEqual([1, 2, 3, 4]);
  });
});

test("取引先の選択肢は台帳にある会社名（重複なし・五十音順）", () => {
  expect(ledgerClientNames(rows)).toEqual([
    "サンプル産業株式会社",
    "テスト商事",
  ]);
});
