import type { Client } from "@/db/schema";
import {
  firstParam,
  LIST_PARAM,
  matchesKeyword,
  parseSort,
  sortRows,
  type SearchParams,
  type SortState,
} from "@/lib/list-query";

export const clientSortKeys = [
  "code",
  "name",
  "department",
  "contactName",
] as const;
export type ClientSortKey = (typeof clientSortKeys)[number];

export type ClientListQuery = {
  sort: SortState<ClientSortKey>;
  keyword: string;
};

/** 取引先一覧の並べ替え・絞り込みの条件を読む（spec.md 3.2） */
export function parseClientListQuery(params: SearchParams): ClientListQuery {
  return {
    sort: parseSort(params, clientSortKeys),
    keyword: firstParam(params, LIST_PARAM.keyword),
  };
}

/** キーワード（取引先コード・会社名・部署・担当者名）で絞り込み、並べ替える */
export function applyClientListQuery(
  rows: readonly Client[],
  { sort, keyword }: ClientListQuery,
): Client[] {
  const filtered = rows.filter((c) =>
    matchesKeyword([c.code, c.name, c.department, c.contactName], keyword),
  );
  return sortRows(filtered, sort, {
    code: (c) => c.code,
    name: (c) => c.name,
    department: (c) => c.department,
    contactName: (c) => c.contactName,
  });
}
