import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ArchiveToggle } from "./archive-toggle";

test("通常の一覧ではアーカイブ一覧へのアイコンリンクを出す", () => {
  render(<ArchiveToggle basePath="/clients" archived={false} />);
  const link = screen.getByRole("link", { name: "アーカイブ一覧" });
  expect(link).toHaveAttribute("href", "/clients?view=archived");
  expect(link).not.toHaveAttribute("aria-current");
});

test("アーカイブ一覧では強調し、押すと通常の一覧に戻る", () => {
  render(<ArchiveToggle basePath="/clients" archived />);
  const link = screen.getByRole("link", { name: "一覧に戻る" });
  expect(link).toHaveAttribute("href", "/clients");
  expect(link).toHaveAttribute("aria-current", "page");
});
