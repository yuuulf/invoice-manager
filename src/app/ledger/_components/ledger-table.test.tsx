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
  sentOn: null,
  paidOn: null,
  sentFileUrl: null,
  memo: null,
};

test("請求書番号・取引先・件名・請求日・合計・状態を表示する", () => {
  render(<LedgerTable entries={[entry]} />);
  const row = screen.getAllByRole("row")[1];
  for (const text of [
    "INV-ABC-202611-001",
    "サンプル産業株式会社",
    "Webサイト保守・改修",
    "2026-11-30",
    "134,000",
    "未送信",
  ]) {
    expect(within(row).getByText(text)).toBeInTheDocument();
  }
});

test("未入金は送信日を、入金済みは入金日を状態の横に出す（spec.md 7.6）", () => {
  render(
    <LedgerTable
      entries={[
        { ...entry, id: 2, sentOn: "2026-12-02" },
        { ...entry, id: 1, sentOn: "2026-12-02", paidOn: "2026-12-25" },
      ]}
    />,
  );
  const [sent, paid] = screen.getAllByRole("row").slice(1);
  expect(within(sent).getByText("未入金")).toHaveAttribute(
    "data-tone",
    "warning",
  );
  expect(within(sent).getByText("送信日")).toHaveClass("sr-only");
  expect(within(sent).getByText("送信日").parentElement).toHaveTextContent(
    "送信日 2026-12-02",
  );
  expect(within(paid).getByText("入金済")).toHaveAttribute(
    "data-tone",
    "success",
  );
  expect(within(paid).getByText("入金日")).toHaveClass("sr-only");
  expect(within(paid).getByText("入金日").parentElement).toHaveTextContent(
    "入金日 2026-12-25",
  );
});

test("編集アイコンの右にメニューがあり、PDF出力はメニューからダウンロードする", async () => {
  render(<LedgerTable entries={[entry]} />);
  const row = screen.getAllByRole("row")[1];
  expect(
    within(row).queryByRole("link", { name: "PDF出力" }),
  ).not.toBeInTheDocument();
  const edit = within(row).getByRole("link", { name: "編集" });
  expect(edit).toHaveAttribute("href", "/ledger/3/edit");
  const menu = within(row).getByRole("button", { name: "その他の操作" });
  expect(edit.compareDocumentPosition(menu)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );

  await userEvent.click(menu);
  const pdf = screen.getByRole("menuitem", { name: "PDF出力" });
  expect(pdf).toHaveAttribute("href", "/ledger/3/pdf");
  expect(pdf).toHaveAttribute("download", "請求書_INV-ABC-202611-001.pdf");
});

test("備考がある行だけ備考の列にアイコンを出す（spec.md 7.6）", () => {
  render(
    <LedgerTable
      entries={[
        { ...entry, id: 2, memo: "取り消し。INV-ABC-202611-002 で再発行" },
        { ...entry, id: 1 },
      ]}
    />,
  );
  expect(
    screen.getByRole("columnheader", { name: "備考" }),
  ).toBeInTheDocument();
  const [withMemo, withoutMemo] = screen.getAllByRole("row").slice(1);
  expect(
    within(withMemo).getByText("備考: 取り消し。INV-ABC-202611-002 で再発行")
      .parentElement,
  ).toHaveAttribute("title", "取り消し。INV-ABC-202611-002 で再発行");
  expect(within(withoutMemo).queryByText(/^備考:/)).not.toBeInTheDocument();
});

test("送信ファイルがあれば、メニューから新しいタブで開ける", async () => {
  const { rerender } = render(<LedgerTable entries={[entry]} />);
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  expect(
    screen.queryByRole("menuitem", { name: "送信ファイルを開く" }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));

  const url = "https://drive.google.com/file/d/abc/view";
  rerender(
    <LedgerTable
      entries={[{ ...entry, sentOn: "2026-12-02", sentFileUrl: url }]}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
  expect(items.map((i) => i.textContent)).toEqual([
    "PDF出力",
    "送信ファイルを開く",
    "請求書にコピー",
    "削除（送信済みのため不可）",
  ]);
  const link = screen.getByRole("menuitem", { name: "送信ファイルを開く" });
  expect(link).toHaveAttribute("href", url);
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("送信済みの台帳は削除を押せない（spec.md 7.6）", async () => {
  render(<LedgerTable entries={[{ ...entry, sentOn: "2026-11-30" }]} />);
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  expect(screen.getByRole("menuitem", { name: /削除/ })).toBeDisabled();
});

test("メニューに PDF出力・請求書にコピー・削除があり、削除は請求書番号の入力で確認する", async () => {
  render(<LedgerTable entries={[entry]} />);
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
  expect(items.map((i) => i.textContent)).toEqual([
    "PDF出力",
    "請求書にコピー",
    "削除",
  ]);

  await userEvent.click(screen.getByRole("menuitem", { name: "削除" }));
  const dialog = await screen.findByRole("dialog", { name: "台帳の削除" });
  expect(dialog).toHaveTextContent("INV-ABC-202611-001");
  expect(within(dialog).getByRole("button", { name: "削除" })).toBeDisabled();
});

test("0件のときは案内を表示する", () => {
  render(<LedgerTable entries={[]} />);
  expect(screen.getByText("確定した請求書はありません。")).toBeInTheDocument();
});
