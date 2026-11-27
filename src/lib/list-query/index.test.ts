import { describe, expect, test } from "vitest";
import {
  allParams,
  listHref,
  matchesKeyword,
  nextSort,
  parseSort,
  sortHref,
  sortRows,
  toSearchParams,
  withBack,
} from ".";

describe("parseSort", () => {
  test("許可した列なら並べ替えの条件を返し、向きは desc 以外なら昇順", () => {
    expect(parseSort({ sort: "name", order: "desc" }, ["name"])).toEqual({
      key: "name",
      order: "desc",
    });
    expect(parseSort({ sort: "name", order: "x" }, ["name"])).toEqual({
      key: "name",
      order: "asc",
    });
  });

  test("許可していない列や指定なしなら既定の順（null）", () => {
    expect(parseSort({ sort: "id" }, ["name"])).toBeNull();
    expect(parseSort({}, ["name"])).toBeNull();
  });
});

test("nextSort: 昇順 → 降順 → 既定の順。別の列なら昇順から", () => {
  expect(nextSort(null, "name")).toEqual({ key: "name", order: "asc" });
  expect(nextSort({ key: "name", order: "asc" }, "name")).toEqual({
    key: "name",
    order: "desc",
  });
  expect(nextSort({ key: "name", order: "desc" }, "name")).toBeNull();
  expect(nextSort({ key: "code", order: "desc" }, "name")).toEqual({
    key: "name",
    order: "asc",
  });
});

test("sortHref: 他の条件を残して並べ替えだけ差し替える", () => {
  expect(
    sortHref("/ledger", "q=保守&sort=total&order=asc", {
      key: "issueDate",
      order: "desc",
    }),
  ).toBe(
    `/ledger?${new URLSearchParams({ q: "保守", sort: "issueDate", order: "desc" })}`,
  );
  expect(sortHref("/ledger", "sort=total&order=desc", null)).toBe("/ledger");
});

describe("sortRows", () => {
  const rows = [
    { id: 1, name: "いろは商事", total: 300 },
    { id: 2, name: null, total: 100 },
    { id: 3, name: "あいう産業", total: null },
    { id: 4, name: "いろは商事", total: 200 },
  ];
  const values = {
    name: (r: (typeof rows)[number]) => r.name,
    total: (r: (typeof rows)[number]) => r.total,
  };

  test("文字は五十音順、数値は大小で並べ、同じ値は元の順を保つ", () => {
    expect(
      sortRows(rows, { key: "name", order: "asc" }, values).map((r) => r.id),
    ).toEqual([3, 1, 4, 2]);
    expect(
      sortRows(rows, { key: "total", order: "desc" }, values).map((r) => r.id),
    ).toEqual([1, 4, 2, 3]);
  });

  test("空の値は降順でも最後", () => {
    expect(
      sortRows(rows, { key: "name", order: "desc" }, values).map((r) => r.id),
    ).toEqual([1, 4, 3, 2]);
  });

  test("条件がなければ元の順", () => {
    expect(sortRows(rows, null, values).map((r) => r.id)).toEqual([1, 2, 3, 4]);
  });

  test("番号の中の数字は数値として比べる", () => {
    const codes = [{ c: "A10" }, { c: "A9" }];
    expect(
      sortRows(codes, { key: "c", order: "asc" }, { c: (r) => r.c }).map(
        (r) => r.c,
      ),
    ).toEqual(["A9", "A10"]);
  });
});

describe("matchesKeyword", () => {
  test("空白で区切った語をすべて含めば一致（部分一致）", () => {
    expect(matchesKeyword(["サンプル産業", "保守"], "サンプル 保守")).toBe(
      true,
    );
    expect(matchesKeyword(["サンプル産業", "保守"], "サンプル 開発")).toBe(
      false,
    );
  });

  test("大文字小文字・全角半角を区別しない", () => {
    expect(matchesKeyword(["INV-ABC-202611-001"], "ａｂｃ")).toBe(true);
    expect(matchesKeyword(["taro@example.com"], "TARO")).toBe(true);
  });

  test("キーワードが空なら常に一致し、null の値は無視する", () => {
    expect(matchesKeyword([null], "  ")).toBe(true);
    expect(matchesKeyword([null, undefined], "a")).toBe(false);
  });
});

test("allParams・toSearchParams: 空の値を除く", () => {
  expect(allParams({ status: ["sent", "", "paid"] }, "status")).toEqual([
    "sent",
    "paid",
  ]);
  expect(
    toSearchParams({ q: "", view: "archived", download: "3" }, [
      "download",
    ]).toString(),
  ).toBe("view=archived");
});

describe("戻り先", () => {
  test("withBack で一覧の条件を付け、listHref で一覧の URL に戻す", () => {
    const href = withBack("/clients/1/edit", "q=サンプル&sort=name");
    const back = new URL(href, "http://localhost").searchParams.get("back");
    expect(back).toBe("q=サンプル&sort=name");
    expect(listHref("/clients", back)).toBe(
      `/clients?${new URLSearchParams({ q: "サンプル", sort: "name" })}`,
    );
  });

  test("条件がなければ何も付けない", () => {
    expect(withBack("/clients/new", "")).toBe("/clients/new");
    expect(listHref("/clients", "")).toBe("/clients");
    expect(listHref("/clients", null)).toBe("/clients");
  });

  test("別のサイトやパスには飛ばない", () => {
    expect(listHref("/clients", "//evil.example.com")).toBe(
      "/clients?%2F%2Fevil.example.com=",
    );
    expect(listHref("/clients", "https://evil.example.com/")).toMatch(
      /^\/clients\?/,
    );
  });
});
