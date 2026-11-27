import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import type { Client } from "@/db/schema";
import { ClientForm } from "./client-form";

const client: Client = {
  id: 7,
  name: "サンプル産業株式会社",
  code: "A1B",
  department: "経理部",
  contactName: "山田 花子",
  paymentTermType: "next_month_day",
  paymentTermDay: 15,
  feeBearer: "client",
  rounding: "ceil",
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

test("作成画面では支払い期限=翌月末日、手数料負担=指定なし、端数処理=切り捨てが選ばれている", () => {
  render(<ClientForm action={vi.fn()} mode="create" />);
  expect(screen.getByRole("radio", { name: "翌月末日" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "指定なし" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "切り捨て" })).toBeChecked();
  expect(screen.getByRole("textbox", { name: /会社名/ })).toHaveValue("");
});

test("支払い期限は請求書ごとに変更できる旨の注釈を表示する", () => {
  render(<ClientForm action={vi.fn()} mode="create" />);
  expect(
    screen.getByRole("group", { name: /支払い期限/ }),
  ).toHaveAccessibleDescription("支払い期限は請求書ごとに手動で変更できます。");
});

test("編集では登録済みの内容が入っている", () => {
  render(<ClientForm action={vi.fn()} client={client} mode="edit" />);
  expect(screen.getByRole("textbox", { name: /会社名/ })).toHaveValue(
    "サンプル産業株式会社",
  );
  expect(screen.getByRole("textbox", { name: /取引先コード/ })).toHaveValue(
    "A1B",
  );
  expect(screen.getByRole("textbox", { name: "部署" })).toHaveValue("経理部");
  expect(screen.getByRole("radio", { name: "翌月 N 日" })).toBeChecked();
  expect(screen.getByRole("textbox", { name: "翌月 N 日の N" })).toHaveValue(
    "15",
  );
  expect(screen.getByRole("radio", { name: "取引先" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "切り上げ" })).toBeChecked();
});

test("送信すると入力内容をアクションに渡し、返ってきたエラーを表示する", async () => {
  const action = vi.fn(async (_state: unknown, formData: FormData) => ({
    errors: { code: "この取引先コードは既に使われています" },
    values: {
      name: String(formData.get("name")),
      code: String(formData.get("code")),
      department: "",
      contactName: "",
      paymentTermType: "next_month_end",
      paymentTermDay: "",
      feeBearer: "none",
      rounding: "floor",
    },
  }));
  render(<ClientForm action={action} mode="create" />);

  await userEvent.type(
    screen.getByRole("textbox", { name: /会社名/ }),
    "テスト商事",
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: /取引先コード/ }),
    "ABC",
  );
  await userEvent.click(screen.getByRole("button", { name: "作成" }));

  const formData = action.mock.calls[0][1];
  expect(formData.get("name")).toBe("テスト商事");
  expect(formData.get("code")).toBe("ABC");
  expect(formData.get("paymentTermType")).toBe("next_month_end");
  expect(
    await screen.findByText("この取引先コードは既に使われています"),
  ).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /取引先コード/ })).toHaveValue(
    "ABC",
  );
});

test("取引先コードは英大文字・数字の3桁まで入力でき、小文字は大文字にする", async () => {
  render(<ClientForm action={vi.fn()} mode="create" />);
  const code = screen.getByRole("textbox", { name: /取引先コード/ });
  await userEvent.type(code, "a-1bc");
  expect(code).toHaveValue("A1B");
});

test("翌月N日のNは数字2桁まで", async () => {
  render(<ClientForm action={vi.fn()} mode="create" />);
  const day = screen.getByRole("textbox", { name: "翌月 N 日の N" });
  await userEvent.type(day, "1x23");
  expect(day).toHaveValue("12");
});

test("文字数の上限を超えても入力でき、フォーカスアウトでエラーを表示する", async () => {
  render(<ClientForm action={vi.fn()} mode="create" />);
  const name = screen.getByRole("textbox", { name: /会社名/ });
  expect(name).not.toHaveAttribute("maxLength");
  const department = screen.getByRole("textbox", { name: /部署/ });
  await userEvent.type(department, "あ".repeat(21));
  expect(department).toHaveValue("あ".repeat(21));
  await userEvent.tab();
  expect(department).toHaveAccessibleDescription(
    "部署は20文字以内で入力してください",
  );
  await userEvent.click(name);
  await userEvent.tab();
  expect(name).toHaveAccessibleDescription("会社名を入力してください");

  const code = screen.getByRole("textbox", { name: /取引先コード/ });
  await userEvent.type(code, "AB");
  await userEvent.tab();
  expect(code).toHaveAccessibleDescription(
    "英大文字・数字の3桁（例: ABC、A1B） 取引先コードは英大文字・数字の3桁で入力してください",
  );
});

test("一覧の条件（back）を持ち、キャンセルでその条件の一覧に戻る", () => {
  const { container } = render(
    <ClientForm action={vi.fn()} mode="create" back="q=abc&sort=name" />,
  );
  expect(
    container.querySelector('input[type="hidden"][name="back"]'),
  ).toHaveValue("q=abc&sort=name");
  expect(screen.getByRole("link", { name: "キャンセル" })).toHaveAttribute(
    "href",
    "/clients?q=abc&sort=name",
  );
});
