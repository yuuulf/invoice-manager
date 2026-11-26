import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { SelectField } from "./select-field";

const options = [
  { value: "1", label: "A社" },
  { value: "2", label: "B社" },
];

test("未選択の選択肢を先頭に出し、ラベルで取得できる", () => {
  render(
    <SelectField label="取引先" name="clientId" options={options} required />,
  );
  const select = screen.getByRole("combobox", { name: /取引先/ });
  expect(select).toHaveValue("");
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
    "選択してください",
    "A社",
    "B社",
  ]);
});

test("初期値とエラーを表示する", () => {
  render(
    <SelectField
      label="取引先"
      name="clientId"
      options={options}
      defaultValue="2"
      error="選択し直してください"
    />,
  );
  const select = screen.getByRole("combobox", { name: "取引先" });
  expect(select).toHaveValue("2");
  expect(select).toBeInvalid();
  expect(select).toHaveAccessibleDescription("選択し直してください");
});
