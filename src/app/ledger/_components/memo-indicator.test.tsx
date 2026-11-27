import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MemoIndicator } from "./memo-indicator";

test("備考があればアイコンを出し、ツールチップと読み上げで全文を伝える", () => {
  render(<MemoIndicator memo={"取り消し\nINV-ABC-202611-002 で再発行"} />);
  const text = screen.getByText(/^備考:/);
  expect(text).toHaveClass("sr-only");
  expect(text).toHaveTextContent("取り消し INV-ABC-202611-002 で再発行");
  expect(text.parentElement).toHaveAttribute(
    "title",
    "取り消し\nINV-ABC-202611-002 で再発行",
  );
  expect(text.parentElement?.querySelector("svg")).not.toBeNull();
});

test("備考が空なら何も出さない", () => {
  const { container } = render(<MemoIndicator memo={null} />);
  expect(container).toBeEmptyDOMElement();
});
