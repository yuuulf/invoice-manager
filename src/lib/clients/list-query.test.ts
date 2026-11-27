import { expect, test } from "vitest";
import type { Client } from "@/db/schema";
import { applyClientListQuery, parseClientListQuery } from "./list-query";

const client = (
  id: number,
  code: string,
  name: string,
  department: string | null,
) => ({ id, code, name, department, contactName: null }) as Client;
const rows = [
  client(1, "ABC", "サンプル産業", "経理部"),
  client(2, "T01", "テスト商事", null),
  client(3, "A10", "あいう工業", "総務部"),
];

test("キーワード（コード・会社名・部署・担当者名）で絞り込む", () => {
  const q = (params: Record<string, string>) =>
    applyClientListQuery(rows, parseClientListQuery(params)).map((c) => c.id);
  expect(q({ q: "abc" })).toEqual([1]);
  expect(q({ q: "総務" })).toEqual([3]);
  expect(q({ sort: "name" })).toEqual([3, 1, 2]);
  expect(q({ sort: "department", order: "desc" })).toEqual([3, 1, 2]);
});
