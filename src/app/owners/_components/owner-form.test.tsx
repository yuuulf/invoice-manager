import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { OwnerSummary } from "@/lib/owners/repository";
import { OwnerForm } from "./owner-form";

const owner: OwnerSummary = {
  id: 2,
  name: "山田 太郎",
  tradeName: "やまだデザイン",
  postalCode: "1500001",
  address1: "東京都渋谷区神宮前",
  address2: null,
  phone: "03-1234-5678",
  email: "taro@example.com",
  bankName: "やよい銀行",
  bankCode: "0123",
  branchName: "渋谷支店",
  branchCode: "456",
  accountType: "checking",
  accountNumber: "1234567",
  accountHolder: "ヤマダタロウ",
  hasSeal: true,
  archivedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(1000),
};

test("基本情報・振込先・データ印のまとまりで表示し、科目の初期値は普通", () => {
  render(<OwnerForm action={vi.fn()} mode="create" />);
  for (const name of ["基本情報", "振込先", "データ印"]) {
    expect(screen.getByRole("group", { name })).toBeInTheDocument();
  }
  expect(screen.getByRole("radio", { name: "普通" })).toBeChecked();
  expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
});

test("編集では登録済みの内容とデータ印を表示する", () => {
  render(<OwnerForm action={vi.fn()} owner={owner} mode="edit" />);
  expect(screen.getByRole("textbox", { name: /氏名/ })).toHaveValue(
    "山田 太郎",
  );
  expect(screen.getByRole("textbox", { name: "屋号" })).toHaveValue(
    "やまだデザイン",
  );
  expect(screen.getByRole("textbox", { name: "住所（2行目）" })).toHaveValue(
    "",
  );
  expect(screen.getByRole("radio", { name: "当座" })).toBeChecked();
  expect(screen.getByRole("img", { name: "データ印" })).toHaveAttribute(
    "src",
    "/owners/2/seal?v=1000",
  );
  expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
});

test("送信すると入力内容をアクションに渡し、返ってきたエラーを表示する", async () => {
  const action = vi.fn(async (_state: unknown, formData: FormData) => ({
    errors: {
      postalCode: "郵便番号はハイフンなしの7桁の数字で入力してください",
    },
    values: {
      ...Object.fromEntries(
        [
          "name",
          "tradeName",
          "postalCode",
          "address1",
          "address2",
          "phone",
          "email",
          "bankName",
          "bankCode",
          "branchName",
          "branchCode",
          "accountType",
          "accountNumber",
          "accountHolder",
        ].map((k) => [k, String(formData.get(k) ?? "")]),
      ),
    } as never,
  }));
  render(<OwnerForm action={action} mode="create" />);

  await userEvent.type(
    screen.getByRole("textbox", { name: /郵便番号/ }),
    "150-001",
  );
  await userEvent.click(screen.getByRole("button", { name: "作成" }));

  expect(action.mock.calls[0][1].get("postalCode")).toBe("150-001");
  expect(action.mock.calls[0][1].get("accountType")).toBe("ordinary");
  expect(
    await screen.findByText(
      "郵便番号はハイフンなしの7桁の数字で入力してください",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /郵便番号/ })).toHaveValue(
    "150-001",
  );
});
