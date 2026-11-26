import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { Client } from "@/db/schema";
import { ClientTable } from "./client-table";

vi.mock("../actions", () => ({
  archiveClientAction: vi.fn(),
  restoreClientAction: vi.fn(),
  deleteClientAction: vi.fn(),
}));

const client: Client = {
  id: 1,
  name: "サンプル産業株式会社",
  code: "ABC",
  department: "経理部",
  contactName: null,
  paymentTermType: "next_month_end",
  paymentTermDay: null,
  feeBearer: "none",
  rounding: "floor",
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function menuItemNames() {
  return within(screen.getByRole("menu"))
    .getAllByRole("menuitem")
    .map((item) => item.textContent);
}

test("一覧では編集アイコンの右のメニューにアーカイブ・削除がある", async () => {
  render(<ClientTable clients={[client]} archived={false} />);
  const row = screen.getByRole("row", { name: /サンプル産業株式会社/ });
  const edit = within(row).getByRole("link", { name: "編集" });
  const menu = within(row).getByRole("button", { name: "その他の操作" });
  expect(edit).toHaveAttribute("href", "/clients/1/edit");
  expect(edit.compareDocumentPosition(menu)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );

  await userEvent.click(menu);
  expect(menuItemNames()).toEqual(["アーカイブ", "削除"]);
});

test("アーカイブ一覧では編集アイコンを出さず、メニューにアーカイブを解除・削除がある", async () => {
  render(<ClientTable clients={[client]} archived />);
  const row = screen.getByRole("row", { name: /サンプル産業株式会社/ });
  expect(
    within(row).queryByRole("link", { name: "編集" }),
  ).not.toBeInTheDocument();

  await userEvent.click(
    within(row).getByRole("button", { name: "その他の操作" }),
  );
  expect(menuItemNames()).toEqual(["アーカイブを解除", "削除"]);
});

test("0件のときは案内を表示する", () => {
  const { rerender } = render(<ClientTable clients={[]} archived={false} />);
  expect(screen.getByText("取引先が登録されていません。")).toBeInTheDocument();
  rerender(<ClientTable clients={[]} archived />);
  expect(
    screen.getByText("アーカイブした取引先はありません。"),
  ).toBeInTheDocument();
});
