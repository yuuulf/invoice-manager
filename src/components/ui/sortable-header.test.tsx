import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { SortableHeader } from "./sortable-header";

function renderHeader(
  sort: { key: "name" | "code"; order: "asc" | "desc" } | null,
) {
  render(
    <table>
      <thead>
        <tr>
          <SortableHeader
            label="会社名"
            sortKey="name"
            sort={sort}
            basePath="/clients"
            query="q=abc"
          />
        </tr>
      </thead>
    </table>,
  );
  return {
    header: screen.getByRole("columnheader"),
    link: screen.getByRole("link", { name: /会社名/ }),
  };
}

test("並べ替えていなければ、押すと昇順にする（キーワードは残す）", () => {
  const { header, link } = renderHeader(null);
  expect(header).not.toHaveAttribute("aria-sort");
  expect(link).toHaveAttribute("href", "/clients?q=abc&sort=name&order=asc");
});

test("昇順なら押すと降順、降順なら押すと解除", () => {
  const asc = renderHeader({ key: "name", order: "asc" });
  expect(asc.header).toHaveAttribute("aria-sort", "ascending");
  expect(asc.link).toHaveAttribute(
    "href",
    "/clients?q=abc&sort=name&order=desc",
  );
});

test("降順なら押すと並べ替えを解除する", () => {
  const desc = renderHeader({ key: "name", order: "desc" });
  expect(desc.header).toHaveAttribute("aria-sort", "descending");
  expect(desc.link).toHaveAttribute("href", "/clients?q=abc");
});

test("別の列で並べ替え中なら、この列は並べ替えていない表示", () => {
  const { header, link } = renderHeader({ key: "code", order: "desc" });
  expect(header).not.toHaveAttribute("aria-sort");
  expect(link).toHaveAttribute("href", "/clients?q=abc&sort=name&order=asc");
});
