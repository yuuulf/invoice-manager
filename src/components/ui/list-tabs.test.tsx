import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ListTabs } from "./list-tabs";

test("一覧とアーカイブ一覧を切り替えるリンクを表示し、表示中の方に印を付ける", () => {
  const { rerender } = render(
    <ListTabs basePath="/clients" archived={false} />,
  );
  expect(screen.getByRole("link", { name: "一覧" })).toHaveAttribute(
    "href",
    "/clients",
  );
  expect(screen.getByRole("link", { name: "一覧" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "アーカイブ一覧" })).toHaveAttribute(
    "href",
    "/clients?view=archived",
  );

  rerender(<ListTabs basePath="/clients" archived />);
  expect(screen.getByRole("link", { name: "アーカイブ一覧" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "一覧" })).not.toHaveAttribute(
    "aria-current",
  );
});
