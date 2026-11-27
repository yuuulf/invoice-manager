import {
  allParams,
  firstParam,
  LIST_PARAM,
  matchesKeyword,
  parseSort,
  sortRows,
  type SearchParams,
  type SortState,
} from "@/lib/list-query";
import type { LedgerListRow } from "./repository";
import { ledgerStatuses, ledgerStatusOf, type LedgerStatus } from "./status";

export const ledgerSortKeys = [
  "invoiceNumber",
  "clientName",
  "subject",
  "issueDate",
  "total",
  "status",
] as const;
export type LedgerSortKey = (typeof ledgerSortKeys)[number];

/** 台帳一覧の絞り込みの条件として URL に持たせるパラメータ */
export const LEDGER_FILTER_PARAM = {
  client: "client",
  from: "from",
  to: "to",
  status: "status",
} as const;

export type LedgerListQuery = {
  sort: SortState<LedgerSortKey>;
  keyword: string;
  /** 取引先（確定時の会社名）。空ならすべて */
  client: string;
  /** 請求日の範囲（yyyy-MM）。空なら指定なし */
  from: string;
  to: string;
  /** 状態。空ならすべて */
  statuses: LedgerStatus[];
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 台帳一覧の並べ替え・絞り込みの条件を読む（spec.md 3.2・7.6） */
export function parseLedgerListQuery(params: SearchParams): LedgerListQuery {
  const month = (key: string) => {
    const value = firstParam(params, key);
    return MONTH.test(value) ? value : "";
  };
  return {
    sort: parseSort(params, ledgerSortKeys),
    keyword: firstParam(params, LIST_PARAM.keyword),
    client: firstParam(params, LEDGER_FILTER_PARAM.client),
    from: month(LEDGER_FILTER_PARAM.from),
    to: month(LEDGER_FILTER_PARAM.to),
    statuses: allParams(params, LEDGER_FILTER_PARAM.status).filter(
      (s): s is LedgerStatus =>
        (ledgerStatuses as readonly string[]).includes(s),
    ),
  };
}

/** 絞り込みの条件（並べ替え以外）が 1 つでもあるか */
export function hasLedgerFilter(query: LedgerListQuery): boolean {
  return Boolean(
    query.keyword ||
    query.client ||
    query.from ||
    query.to ||
    query.statuses.length > 0,
  );
}

/**
 * 絞り込み、並べ替える。キーワードは請求書番号・取引先・件名・備考から探す。
 * 状態は 未送信 → 未入金 → 入金済 の順、同じ状態どうしは送信日・入金日の順に並べる
 */
export function applyLedgerListQuery(
  rows: readonly LedgerListRow[],
  query: LedgerListQuery,
): LedgerListRow[] {
  const filtered = rows.filter((e) => {
    const month = e.issueDate.slice(0, 7);
    return (
      matchesKeyword(
        [e.invoiceNumber, e.clientName, e.subject, e.memo],
        query.keyword,
      ) &&
      (!query.client || e.clientName === query.client) &&
      (!query.from || month >= query.from) &&
      (!query.to || month <= query.to) &&
      (query.statuses.length === 0 ||
        query.statuses.includes(ledgerStatusOf(e)))
    );
  });
  return sortRows(filtered, query.sort, {
    invoiceNumber: (e) => e.invoiceNumber,
    clientName: (e) => e.clientName,
    subject: (e) => e.subject,
    issueDate: (e) => e.issueDate,
    total: (e) => e.total,
    status: (e) => {
      const status = ledgerStatusOf(e);
      const date = status === "paid" ? e.paidOn : e.sentOn;
      return `${ledgerStatuses.indexOf(status)}-${date ?? ""}`;
    },
  });
}

/** 取引先の選択肢（台帳にある会社名を五十音順で） */
export function ledgerClientNames(rows: readonly LedgerListRow[]): string[] {
  return [...new Set(rows.map((e) => e.clientName))].sort(
    new Intl.Collator("ja").compare,
  );
}
