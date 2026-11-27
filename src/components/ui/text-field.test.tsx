import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { TextField } from "./text-field";

test("ラベルで入力欄を取得でき、必須マークが付く", () => {
  render(<TextField label="会社名" name="name" required />);
  const input = screen.getByRole("textbox", { name: /会社名/ });
  expect(input).toBeRequired();
  expect(screen.getByText("必須")).toBeInTheDocument();
});

test("エラーがあると入力欄に関連付けて表示する", () => {
  render(
    <TextField label="会社名" name="name" error="会社名を入力してください" />,
  );
  const input = screen.getByRole("textbox", { name: "会社名" });
  expect(input).toBeInvalid();
  expect(input).toHaveAccessibleDescription("会社名を入力してください");
});

test("エラーがなければ入力欄は有効", () => {
  render(<TextField label="部署" name="department" />);
  expect(screen.getByRole("textbox", { name: "部署" })).toBeValid();
  expect(screen.queryByText("必須")).not.toBeInTheDocument();
});

test("入力制限: 入力のたびに値を変換する", () => {
  render(
    <TextField
      label="郵便番号"
      name="postalCode"
      inputFilter={(v) => v.replace(/\D/g, "").slice(0, 7)}
    />,
  );
  const input = screen.getByRole("textbox", { name: "郵便番号" });
  fireEvent.input(input, { target: { value: "150-00012" } });
  expect(input).toHaveValue("1500001");
});

test("addon を入力欄の右に並べる", () => {
  render(<TextField label="URL" addon={<a href="/x">開く</a>} />);
  const input = screen.getByRole("textbox", { name: "URL" });
  const link = screen.getByRole("link", { name: "開く" });
  expect(input.compareDocumentPosition(link)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(input.parentElement?.parentElement).toContainElement(link);
});
