import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { RadioGroup } from "./radio-group";

const options = [
  { value: "floor", label: "切り捨て" },
  { value: "round", label: "四捨五入" },
  { value: "ceil", label: "切り上げ" },
];

test("初期値の選択肢が選ばれた状態で表示される", () => {
  render(
    <RadioGroup
      legend="端数処理"
      name="rounding"
      options={options}
      defaultValue="floor"
    />,
  );
  expect(screen.getByRole("group", { name: "端数処理" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "切り捨て" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "四捨五入" })).not.toBeChecked();
});

test("エラーと注釈をグループに関連付けて表示する", () => {
  render(
    <RadioGroup
      legend="端数処理"
      name="rounding"
      options={options}
      hint="補足"
      error="端数処理を選択してください"
    />,
  );
  expect(
    screen.getByRole("group", { name: "端数処理" }),
  ).toHaveAccessibleDescription("補足 端数処理を選択してください");
});

test("value を渡すと選択状態を親が管理し、選ぶと onValueChange が呼ばれる", async () => {
  const onValueChange = vi.fn();
  render(
    <RadioGroup
      legend="端数処理"
      name="rounding"
      options={options}
      value="round"
      onValueChange={onValueChange}
    />,
  );
  expect(screen.getByRole("radio", { name: "四捨五入" })).toBeChecked();
  await userEvent.click(screen.getByRole("radio", { name: "切り上げ" }));
  expect(onValueChange).toHaveBeenCalledWith("ceil");
});
