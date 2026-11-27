import { expect, test } from "vitest";
import { applyOwnerListQuery, parseOwnerListQuery } from "./list-query";
import type { OwnerSummary } from "./repository";

const owner = (
  id: number,
  name: string,
  tradeName: string | null,
  email: string,
) => ({ id, name, tradeName, phone: "03-0000-0000", email }) as OwnerSummary;
const rows = [
  owner(1, "山田 太郎", "やまだデザイン", "taro@example.com"),
  owner(2, "佐藤 花子", null, "hanako@example.com"),
];

test("キーワード（屋号・氏名・電話番号・メールアドレス）で絞り込み、並べ替える", () => {
  const q = (params: Record<string, string>) =>
    applyOwnerListQuery(rows, parseOwnerListQuery(params)).map((o) => o.id);
  expect(q({ q: "HANAKO" })).toEqual([2]);
  expect(q({ q: "やまだ" })).toEqual([1]);
  expect(q({ sort: "email" })).toEqual([2, 1]);
  // 屋号が空の行は最後
  expect(q({ sort: "tradeName", order: "desc" })).toEqual([1, 2]);
});
