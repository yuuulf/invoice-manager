import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { preventEnterSubmit } from "./prevent-enter-submit";

function renderForm() {
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
  render(
    <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit}>
      <input aria-label="会社名" />
      <input aria-label="請求日" type="date" />
      <textarea aria-label="備考" />
      <button type="submit">保存</button>
    </form>,
  );
  return { onSubmit };
}

test("文字を入力する欄で Enter を押しても既定の動き（送信）を止める", () => {
  renderForm();
  for (const name of ["会社名", "請求日"]) {
    const event = fireEvent.keyDown(screen.getByLabelText(name), {
      key: "Enter",
    });
    // fireEvent は preventDefault されると false を返す
    expect(event).toBe(false);
  }
});

test("複数行の入力欄の改行と、ボタンでの Enter は止めない", () => {
  renderForm();
  expect(
    fireEvent.keyDown(screen.getByLabelText("備考"), { key: "Enter" }),
  ).toBe(true);
  expect(
    fireEvent.keyDown(screen.getByRole("button", { name: "保存" }), {
      key: "Enter",
    }),
  ).toBe(true);
});

test("Enter 以外のキーは止めない", () => {
  renderForm();
  expect(fireEvent.keyDown(screen.getByLabelText("会社名"), { key: "a" })).toBe(
    true,
  );
});
