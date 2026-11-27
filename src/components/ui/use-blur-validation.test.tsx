import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, test } from "vitest";
import { TextField } from "./text-field";
import { useBlurValidation } from "./use-blur-validation";

function validate(name: string, formData: FormData) {
  if (name !== "name") return null;
  return formData.get("name") ? undefined : "会社名を入力してください";
}

function Form({ serverError }: { serverError?: string }) {
  const [state, setState] = useState({ errors: { name: serverError } });
  const { errors, onBlur } = useBlurValidation(state, state.errors, validate);
  return (
    <form onBlur={onBlur}>
      <TextField label="会社名" name="name" error={errors.name} />
      <TextField label="メモ" name="memo" />
      <button
        type="button"
        onClick={() => setState({ errors: { name: "サーバーのエラー" } })}
      >
        送信
      </button>
    </form>
  );
}

test("フォーカスアウトでチェックしてエラーを出し、直したら消す", () => {
  render(<Form />);
  const name = screen.getByRole("textbox", { name: "会社名" });
  fireEvent.blur(name);
  expect(name).toHaveAccessibleDescription("会社名を入力してください");
  fireEvent.change(name, { target: { value: "A社" } });
  fireEvent.blur(name);
  expect(name).toBeValid();
});

test("チェックしない項目のフォーカスアウトでは何もしない", () => {
  render(<Form serverError="サーバーのエラー" />);
  fireEvent.blur(screen.getByRole("textbox", { name: "メモ" }));
  expect(
    screen.getByRole("textbox", { name: "会社名" }),
  ).toHaveAccessibleDescription("サーバーのエラー");
});

test("送信結果が変わったら、送信結果のエラーを表示する", () => {
  render(<Form />);
  const name = screen.getByRole("textbox", { name: "会社名" });
  fireEvent.change(name, { target: { value: "A社" } });
  fireEvent.blur(name);
  fireEvent.click(screen.getByRole("button", { name: "送信" }));
  expect(name).toHaveAccessibleDescription("サーバーのエラー");
});
