import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { TypedConfirmDialog } from "./typed-confirm-dialog";

function renderDialog(
  action = vi.fn<
    (formData: FormData) => Promise<{ error: string } | undefined>
  >(async () => undefined),
  onClose = vi.fn(),
) {
  render(
    <TypedConfirmDialog
      open
      onClose={onClose}
      title="台帳の削除"
      description="削除すると元に戻せません。"
      expected="INV-ABC-202611-001"
      inputLabel="確認のため請求番号を入力してください"
      submitLabel="削除"
      action={action}
      hiddenFields={{ id: "3" }}
    />,
  );
  return { action, onClose };
}

const input = () =>
  screen.getByRole("textbox", { name: "確認のため請求番号を入力してください" });

test("閉じているときは何も表示しない", () => {
  render(
    <TypedConfirmDialog
      open={false}
      onClose={vi.fn()}
      title="台帳の削除"
      description=""
      expected="X"
      inputLabel="入力"
      submitLabel="削除"
      action={vi.fn()}
      hiddenFields={{}}
    />,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("決められた文字列を入力するまで実行できない", async () => {
  renderDialog();
  expect(
    screen.getByRole("dialog", { name: "台帳の削除" }),
  ).toBeInTheDocument();
  expect(input()).toHaveFocus();
  const submit = screen.getByRole("button", { name: "削除" });
  expect(submit).toBeDisabled();
  await userEvent.type(input(), "INV-ABC-202611-00");
  expect(submit).toBeDisabled();
  await userEvent.type(input(), "1");
  expect(submit).toBeEnabled();
});

test("実行すると入力値と hidden の値を送り、成功したら閉じる", async () => {
  const { action, onClose } = renderDialog();
  await userEvent.type(input(), "INV-ABC-202611-001");
  await userEvent.click(screen.getByRole("button", { name: "削除" }));
  await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  const formData = action.mock.calls[0][0];
  expect(formData.get("id")).toBe("3");
  expect(formData.get("confirmation")).toBe("INV-ABC-202611-001");
});

test("失敗したらメッセージを表示して開いたままにする", async () => {
  const { onClose } = renderDialog(
    vi.fn(async () => ({ error: "請求番号が一致しません" })),
  );
  await userEvent.type(input(), "INV-ABC-202611-001");
  await userEvent.click(screen.getByRole("button", { name: "削除" }));
  expect(await screen.findByText("請求番号が一致しません")).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("キャンセルと Escape で閉じる", async () => {
  const { onClose } = renderDialog();
  await userEvent.click(screen.getByRole("button", { name: "キャンセル" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(2);
});
