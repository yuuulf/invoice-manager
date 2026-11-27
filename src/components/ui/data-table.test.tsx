import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ClampedText } from "./data-table";

test("1 行で「…」に省略し、全文をツールチップに出す", () => {
  render(<ClampedText>とても長い部署名</ClampedText>);
  const text = screen.getByText("とても長い部署名");
  expect(text).toHaveClass("truncate");
  expect(text).toHaveAttribute("title", "とても長い部署名");
});

test("空なら何も表示しない", () => {
  const { container } = render(<ClampedText>{null}</ClampedText>);
  expect(container).toBeEmptyDOMElement();
});
