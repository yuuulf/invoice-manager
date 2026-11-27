import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { CheckboxGroup } from "./checkbox-group";

test("見出し付きのまとまりで、初期値の選択肢にチェックを入れる", () => {
  render(
    <CheckboxGroup
      legend="状態"
      name="status"
      options={[
        { value: "unsent", label: "未送信" },
        { value: "paid", label: "入金済" },
      ]}
      defaultValues={["paid"]}
    />,
  );
  expect(screen.getByRole("group", { name: "状態" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "未送信" })).not.toBeChecked();
  const paid = screen.getByRole("checkbox", { name: "入金済" });
  expect(paid).toBeChecked();
  expect(paid).toHaveAttribute("name", "status");
  expect(paid).toHaveAttribute("value", "paid");
});
