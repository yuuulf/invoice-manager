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

test("基本情報と振込先を左右に並べ、データ印はその下に置く", () => {
  render(<OwnerForm action={vi.fn()} mode="create" />);
  const columns = screen.getByTestId("form-columns");
  const sections = Array.from(columns.children).map(
    (child) => child.querySelector("legend")?.textContent,
  );
  expect(sections).toEqual(["基本情報", "振込先"]);
  expect(columns).not.toContainElement(
    screen.getByRole("group", { name: "データ印" }),
  );
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
    "150001",
  );
  await userEvent.click(screen.getByRole("button", { name: "作成" }));

  expect(action.mock.calls[0][1].get("postalCode")).toBe("150001");
  expect(action.mock.calls[0][1].get("accountType")).toBe("ordinary");
  expect(
    await screen.findByText(
      "郵便番号はハイフンなしの7桁の数字で入力してください",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /郵便番号/ })).toHaveValue(
    "150001",
  );
});

test("郵便番号・銀行番号・支店番号・口座番号は数字だけを決まった桁数まで入力できる", async () => {
  render(<OwnerForm action={vi.fn()} mode="create" />);
  const cases: [RegExp, string, string][] = [
    [/郵便番号/, "150-00012", "1500001"],
    [/銀行番号/, "０１２３4", "0123"],
    [/支店番号/, "45a67", "456"],
    [/口座番号/, "1234-5678", "1234567"],
  ];
  for (const [name, typed, expected] of cases) {
    const input = screen.getByRole("textbox", { name });
    await userEvent.type(input, typed);
    expect(input).toHaveValue(expected);
  }
});

test("文字数の上限を超えても入力でき、フォーカスアウトでエラーを表示する", async () => {
  render(<OwnerForm action={vi.fn()} mode="create" />);
  const name = screen.getByRole("textbox", { name: /氏名/ });
  expect(name).not.toHaveAttribute("maxLength");
  const holder = screen.getByRole("textbox", { name: /口座名義/ });
  await userEvent.type(holder, "ア".repeat(51));
  expect(holder).toHaveValue("ア".repeat(51));
  await userEvent.tab();
  expect(holder).toHaveAccessibleDescription(
    "口座名義は50文字以内で入力してください",
  );
  await userEvent.click(name);
  await userEvent.tab();
  expect(name).toHaveAccessibleDescription("氏名を入力してください");
  await userEvent.type(name, "山田 太郎");
  await userEvent.tab();
  expect(name).toBeValid();

  const email = screen.getByRole("textbox", { name: /メールアドレス/ });
  await userEvent.type(email, "taro@");
  await userEvent.tab();
  expect(email).toHaveAccessibleDescription(
    "メールアドレスの形式が正しくありません",
  );
});
