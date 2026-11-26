import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FormMessage } from "./form-message";

test("メッセージがあれば警告として表示する", () => {
  render(<FormMessage message="必須項目をすべて入力してください" />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "必須項目をすべて入力してください",
  );
});

test("メッセージがなければ何も出さない", () => {
  const { container } = render(<FormMessage />);
  expect(container).toBeEmptyDOMElement();
});
