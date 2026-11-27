import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AutoDownload } from "./auto-download";

afterEach(() => {
  vi.restoreAllMocks();
});

test("表示するとダウンロードを始め、URL からダウンロード指定を消す", () => {
  const clicked: (string | null)[][] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push([this.getAttribute("href"), this.getAttribute("download")]);
  });
  const replaceState = vi.spyOn(window.history, "replaceState");
  render(
    <AutoDownload
      href="/ledger/3/pdf"
      fileName="請求書_INV-ABC-202611-001.pdf"
      cleanUrl="/ledger"
    />,
  );
  expect(clicked).toEqual([["/ledger/3/pdf", "請求書_INV-ABC-202611-001.pdf"]]);
  expect(replaceState).toHaveBeenCalledWith(null, "", "/ledger");
});

test("始まらないときのためにダウンロードのリンクを表示する", () => {
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(
    <AutoDownload
      href="/ledger/3/pdf"
      fileName="請求書_INV-ABC-202611-001.pdf"
      cleanUrl="/ledger"
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("PDFを出力しました");
  const link = screen.getByRole("link", { name: "こちら" });
  expect(link).toHaveAttribute("href", "/ledger/3/pdf");
  expect(link).toHaveAttribute("download", "請求書_INV-ABC-202611-001.pdf");
});
