import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { RequiredMark } from "./required-mark";

test("赤い * を表示し、読み上げ用に「必須」を添える", () => {
  render(<RequiredMark />);
  const star = screen.getByText("*");
  expect(star).toHaveClass("text-red-600");
  expect(star).toHaveAttribute("aria-hidden");
  expect(screen.getByText("必須")).toHaveClass("sr-only");
});
