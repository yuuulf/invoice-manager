import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FormActions } from "./form-actions";

test("新規は左からキャンセル・作成の順に並ぶ", () => {
  render(<FormActions mode="create" cancelHref="/clients" />);
  const cancel = screen.getByRole("link", { name: "キャンセル" });
  const submit = screen.getByRole("button", { name: "作成" });
  expect(cancel).toHaveAttribute("href", "/clients");
  expect(submit).toHaveAttribute("type", "submit");
  expect(cancel.compareDocumentPosition(submit)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
});

test("編集の送信ボタンは「保存」", () => {
  render(<FormActions mode="edit" cancelHref="/clients" />);
  expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
});

test("送信中は送信ボタンを押せない", () => {
  render(<FormActions mode="edit" cancelHref="/clients" pending />);
  expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
});
