import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { IconAnchor, IconButton, IconLink } from "./icon-button";

test("アイコンボタンは操作名で取得でき、ツールチップにも操作名を出す", () => {
  render(<IconButton label="編集" icon={<svg aria-hidden />} />);
  const button = screen.getByRole("button", { name: "編集" });
  expect(button).toHaveAttribute("title", "編集");
  expect(button).toHaveAttribute("type", "button");
});

test("アイコンリンクは操作名で取得できる", () => {
  render(
    <IconLink href="/clients/1/edit" label="編集" icon={<svg aria-hidden />} />,
  );
  expect(screen.getByRole("link", { name: "編集" })).toHaveAttribute(
    "href",
    "/clients/1/edit",
  );
});

test("アイコンの通常リンクはダウンロード用に使える", () => {
  render(
    <IconAnchor
      href="/ledger/1/pdf"
      download
      label="PDF出力"
      icon={<svg aria-hidden />}
    />,
  );
  const link = screen.getByRole("link", { name: "PDF出力" });
  expect(link).toHaveAttribute("href", "/ledger/1/pdf");
  expect(link).toHaveAttribute("download");
});
