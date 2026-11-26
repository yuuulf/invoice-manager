import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ConfirmButton } from "./confirm-button";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderInForm() {
  const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
  render(
    <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
      <ConfirmButton confirmMessage="削除しますか？">削除</ConfirmButton>
    </form>,
  );
  return onSubmit;
}

test("確認で OK するとフォームを送信する", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const onSubmit = renderInForm();
  await userEvent.click(screen.getByRole("button", { name: "削除" }));
  expect(window.confirm).toHaveBeenCalledWith("削除しますか？");
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test("確認でキャンセルすると送信しない", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  const onSubmit = renderInForm();
  await userEvent.click(screen.getByRole("button", { name: "削除" }));
  expect(onSubmit).not.toHaveBeenCalled();
});
