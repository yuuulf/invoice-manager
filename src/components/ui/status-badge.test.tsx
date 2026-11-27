import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { StatusBadge } from "./status-badge";

test("状態名とアイコンを、状態に合わせた色で表示する", () => {
  render(
    <StatusBadge tone="success" icon={<svg data-testid="icon" />}>
      入金済み
    </StatusBadge>,
  );
  const badge = screen.getByText("入金済み");
  expect(badge).toHaveAttribute("data-tone", "success");
  expect(badge).toHaveClass("bg-emerald-50", "whitespace-nowrap");
  expect(screen.getByTestId("icon").parentElement).toBe(badge);
});
