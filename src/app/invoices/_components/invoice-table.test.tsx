import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { InvoiceTable } from "./invoice-table";

vi.mock("../actions", () => ({
  archiveInvoiceAction: vi.fn(),
  restoreInvoiceAction: vi.fn(),
  deleteInvoiceAction: vi.fn(),
  copyInvoiceAction: vi.fn(),
}));

test("請求番号・取引先・件名・請求日・合計を表示し、未採番はその旨を出す", () => {
  render(
    <InvoiceTable
      archived={false}
      invoices={[
        {
          id: 2,
          invoiceNumber: "INV-ABC-202611-001",
          clientName: "サンプル産業株式会社",
          subject: "Webサイト保守",
          issueDate: "2026-11-30",
          total: 134000,
        },
        {
          id: 1,
          invoiceNumber: null,
          clientName: null,
          subject: "下書き",
          issueDate: null,
          total: null,
        },
      ]}
    />,
  );
  const [first, second] = screen.getAllByRole("row").slice(1);
  for (const text of [
    "INV-ABC-202611-001",
    "サンプル産業株式会社",
    "Webサイト保守",
    "2026-11-30",
    "134,000",
  ]) {
    expect(within(first).getByText(text)).toBeInTheDocument();
  }
  expect(within(first).getByRole("link", { name: "編集" })).toHaveAttribute(
    "href",
    "/invoices/2/edit",
  );
  expect(within(second).getByText("未採番")).toBeInTheDocument();
});

test("0件のときは案内を表示する", () => {
  const { rerender } = render(<InvoiceTable invoices={[]} archived={false} />);
  expect(screen.getByText("作成中の請求書はありません。")).toBeInTheDocument();
  rerender(<InvoiceTable invoices={[]} archived />);
  expect(
    screen.getByText("アーカイブした請求書はありません。"),
  ).toBeInTheDocument();
});
