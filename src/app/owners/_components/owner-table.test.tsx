import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { OwnerSummary } from "@/lib/owners/repository";
import { OwnerTable } from "./owner-table";
import type { OwnerSortKey } from "@/lib/owners/list-query";
import type { ListView } from "@/lib/list-query";

const view: ListView<OwnerSortKey> = {
  basePath: "/owners",
  sort: null,
  query: "",
  filtered: false,
};

vi.mock("../actions", () => ({
  archiveOwnerAction: vi.fn(),
  restoreOwnerAction: vi.fn(),
  deleteOwnerAction: vi.fn(),
}));

const owner = {
  id: 5,
  name: "山田 太郎",
  tradeName: "やまだデザイン",
  phone: "03-1234-5678",
  email: "taro@example.com",
} as OwnerSummary;

test("屋号・氏名・電話番号・メールアドレスと編集リンクを表示する", () => {
  render(<OwnerTable view={view} owners={[owner]} archived={false} />);
  const row = screen.getByRole("row", { name: /山田 太郎/ });
  for (const text of ["やまだデザイン", "03-1234-5678", "taro@example.com"]) {
    expect(within(row).getByText(text)).toBeInTheDocument();
  }
  expect(within(row).getByRole("link", { name: "編集" })).toHaveAttribute(
    "href",
    "/owners/5/edit",
  );
});

test("0件のときは案内を表示する", () => {
  const { rerender } = render(
    <OwnerTable view={view} owners={[]} archived={false} />,
  );
  expect(screen.getByText("事業主が登録されていません。")).toBeInTheDocument();
  rerender(<OwnerTable view={view} owners={[]} archived />);
  expect(
    screen.getByText("アーカイブした事業主はありません。"),
  ).toBeInTheDocument();
});
