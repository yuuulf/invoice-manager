import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { LedgerTable } from "./ledger-table";

vi.mock("../actions", () => ({
  copyLedgerAction: vi.fn(),
  deleteLedgerAction: vi.fn(async () => undefined),
}));

const entry = {
  id: 3,
  invoiceNumber: "INV-ABC-202611-001",
  clientName: "サンプル産業株式会社",
  subject: "Webサイト保守・改修",
  issueDate: "2026-11-30",
  total: 134000,
  confirmedAt: new Date(2026, 11, 1, 10, 0),
};

test("請求番号・取引先・件名・請求日・合計・確定日を表示する", () => {
  render(<LedgerTable entries={[entry]} />);
  const row = screen.getAllByRole("row")[1];
  for (const text of [
    "INV-ABC-202611-001",
    "サンプル産業株式会社",
    "Webサイト保守・改修",
    "2026-11-30",
    "134,000",
    "2026-12-01",
  ]) {
    expect(within(row).getByText(text)).toBeInTheDocument();
  }
});

test("PDF出力アイコンで確定済みの PDF をダウンロードできる", () => {
  render(<LedgerTable entries={[entry]} />);
  const link = screen.getByRole("link", { name: "PDF出力" });
  expect(link).toHaveAttribute("href", "/ledger/3/pdf");
  expect(link).toHaveAttribute("download", "請求書_INV-ABC-202611-001.pdf");
  expect(screen.queryByRole("link", { name: "編集" })).not.toBeInTheDocument();
});

test("メニューに請求書にコピー・削除があり、削除は請求番号の入力で確認する", async () => {
  render(<LedgerTable entries={[entry]} />);
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
  expect(items.map((i) => i.textContent)).toEqual(["請求書にコピー", "削除"]);

  await userEvent.click(screen.getByRole("menuitem", { name: "削除" }));
  const dialog = await screen.findByRole("dialog", { name: "台帳の削除" });
  expect(dialog).toHaveTextContent("INV-ABC-202611-001");
  expect(within(dialog).getByRole("button", { name: "削除" })).toBeDisabled();
});

test("0件のときは案内を表示する", () => {
  render(<LedgerTable entries={[]} />);
  expect(screen.getByText("確定した請求書はありません。")).toBeInTheDocument();
});
