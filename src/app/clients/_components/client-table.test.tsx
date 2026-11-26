import { render, screen, within } from "@testing-library/react";
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

test("一覧では編集・アーカイブ・削除ができる", () => {
  render(<ClientTable clients={[client]} archived={false} />);
  const row = screen.getByRole("row", { name: /サンプル産業株式会社/ });
  expect(within(row).getByRole("link", { name: "編集" })).toHaveAttribute(
    "href",
    "/clients/1/edit",
  );
  expect(
    within(row).getByRole("button", { name: "アーカイブ" }),
  ).toBeInTheDocument();
  expect(within(row).getByRole("button", { name: "削除" })).toBeInTheDocument();
  expect(
    within(row).queryByRole("button", { name: "元に戻す" }),
  ).not.toBeInTheDocument();
});

test("アーカイブ一覧では元に戻す・削除ができる", () => {
  render(<ClientTable clients={[client]} archived />);
  const row = screen.getByRole("row", { name: /サンプル産業株式会社/ });
  expect(
    within(row).getByRole("button", { name: "元に戻す" }),
  ).toBeInTheDocument();
  expect(within(row).getByRole("button", { name: "削除" })).toBeInTheDocument();
  expect(
    within(row).queryByRole("link", { name: "編集" }),
  ).not.toBeInTheDocument();
});

test("0件のときは案内を表示する", () => {
  const { rerender } = render(<ClientTable clients={[]} archived={false} />);
  expect(screen.getByText("取引先が登録されていません。")).toBeInTheDocument();
  rerender(<ClientTable clients={[]} archived />);
  expect(
    screen.getByText("アーカイブした取引先はありません。"),
  ).toBeInTheDocument();
});
