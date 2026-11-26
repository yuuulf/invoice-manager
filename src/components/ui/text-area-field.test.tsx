import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { TextAreaField } from "./text-area-field";

test("ラベルで取得でき、複数行の初期値を表示する", () => {
  render(
    <TextAreaField label="備考" name="notes" defaultValue={"1行目\n2行目"} />,
  );
  expect(screen.getByRole("textbox", { name: "備考" })).toHaveValue(
    "1行目\n2行目",
  );
});

test("エラーを関連付けて表示する", () => {
  render(<TextAreaField label="備考" name="notes" error="エラー" />);
  expect(
    screen.getByRole("textbox", { name: "備考" }),
  ).toHaveAccessibleDescription("エラー");
});
