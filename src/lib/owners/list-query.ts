import {
  firstParam,
  LIST_PARAM,
  matchesKeyword,
  parseSort,
  sortRows,
  type SearchParams,
  type SortState,
} from "@/lib/list-query";
import type { OwnerSummary } from "./repository";

export const ownerSortKeys = ["tradeName", "name", "phone", "email"] as const;
export type OwnerSortKey = (typeof ownerSortKeys)[number];

export type OwnerListQuery = {
  sort: SortState<OwnerSortKey>;
  keyword: string;
};

/** 事業主一覧の並べ替え・絞り込みの条件を読む（spec.md 3.2） */
export function parseOwnerListQuery(params: SearchParams): OwnerListQuery {
  return {
    sort: parseSort(params, ownerSortKeys),
    keyword: firstParam(params, LIST_PARAM.keyword),
  };
}

/** キーワード（屋号・氏名・電話番号・メールアドレス）で絞り込み、並べ替える */
export function applyOwnerListQuery(
  rows: readonly OwnerSummary[],
  { sort, keyword }: OwnerListQuery,
): OwnerSummary[] {
  const filtered = rows.filter((o) =>
    matchesKeyword([o.tradeName, o.name, o.phone, o.email], keyword),
  );
  return sortRows(filtered, sort, {
    tradeName: (o) => o.tradeName,
    name: (o) => o.name,
    phone: (o) => o.phone,
    email: (o) => o.email,
  });
}
