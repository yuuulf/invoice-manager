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
