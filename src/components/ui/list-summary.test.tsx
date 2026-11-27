import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ListSummary } from "./list-summary";

test("件数と合計金額を出す", () => {
  render(<ListSummary totals={[134000, 88000, 22000]} />);
  expect(screen.getByText("3件")).toBeInTheDocument();
  expect(screen.getByText("244,000")).toBeInTheDocument();
  expect(screen.queryByText(/計算できない/)).not.toBeInTheDocument();
});

test("金額を計算できない行は合計から除き、件数を添える", () => {
  render(<ListSummary totals={[1000, null, null]} />);
  expect(screen.getByText("3件")).toBeInTheDocument();
  expect(screen.getByText("1,000")).toBeInTheDocument();
  expect(
    screen.getByText("（金額を計算できない2件を除く）"),
  ).toBeInTheDocument();
});

test("0件なら合計は 0", () => {
  render(<ListSummary totals={[]} />);
  expect(screen.getByText("0件")).toBeInTheDocument();
  expect(screen.getByText("0")).toBeInTheDocument();
});
