import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MonthRangeField } from "./month-range-field";

test("見出し付きのまとまりで、開始・終了の年月を入力できる", () => {
  render(
    <MonthRangeField
      legend="請求日"
      fromName="from"
      toName="to"
      defaultFrom="2026-01"
    />,
  );
  expect(screen.getByRole("group", { name: "請求日" })).toBeInTheDocument();
  const from = screen.getByLabelText("請求日の開始");
  expect(from).toHaveAttribute("type", "month");
  expect(from).toHaveAttribute("name", "from");
  expect(from).toHaveValue("2026-01");
  expect(screen.getByLabelText("請求日の終了")).toHaveAttribute("name", "to");
});
