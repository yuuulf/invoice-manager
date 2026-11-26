import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { Sidebar, SidebarNav } from "./sidebar";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

beforeEach(() => {
  pathname.current = "/";
});

test("取引先・事業主・請求書・台帳の順にリンクが並ぶ", () => {
  render(<Sidebar />);
  const nav = screen.getByRole("navigation", { name: "メインメニュー" });
  const links = within(nav).getAllByRole("link");
  expect(
    links.map((link) => [link.textContent, link.getAttribute("href")]),
  ).toEqual([
    ["取引先", "/clients"],
    ["事業主", "/owners"],
    ["請求書", "/invoices"],
    ["台帳", "/ledger"],
  ]);
});

test("現在のページのリンクに aria-current が付く", () => {
  pathname.current = "/invoices";
  render(<Sidebar />);
  expect(screen.getByRole("link", { name: "請求書" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "取引先" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("配下のページでも親メニューが現在のページになる", () => {
  pathname.current = "/clients/1/edit";
  render(<Sidebar />);
  expect(screen.getByRole("link", { name: "取引先" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("pathname が不明なとき（プリレンダー時）はどのリンクも強調しない", () => {
  render(<SidebarNav pathname={null} />);
  for (const link of screen.getAllByRole("link")) {
    expect(link).not.toHaveAttribute("aria-current");
  }
});
