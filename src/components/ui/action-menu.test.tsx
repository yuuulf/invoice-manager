import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ActionMenu, ActionMenuItem } from "./action-menu";

afterEach(() => {
  vi.restoreAllMocks();
});

function renderMenu() {
  const onArchive = vi.fn((e: SubmitEvent) => e.preventDefault());
  const onDelete = vi.fn((e: SubmitEvent) => e.preventDefault());
  render(
    <>
      <ActionMenu>
        <form onSubmit={(e) => onArchive(e.nativeEvent as SubmitEvent)}>
          <ActionMenuItem>アーカイブ</ActionMenuItem>
        </form>
        <form onSubmit={(e) => onDelete(e.nativeEvent as SubmitEvent)}>
          <ActionMenuItem danger confirmMessage="削除しますか？">
            削除
          </ActionMenuItem>
        </form>
      </ActionMenu>
      <p>外側</p>
    </>,
  );
  return { onArchive, onDelete };
}

const trigger = () => screen.getByRole("button", { name: "その他の操作" });

test("縦三点リーダーのボタンでメニューを開閉できる", async () => {
  renderMenu();
  expect(trigger()).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();

  await userEvent.click(trigger());
  expect(trigger()).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("menuitem", { name: "アーカイブ" })).toHaveFocus();

  await userEvent.click(trigger());
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("Escape とメニューの外のクリックで閉じる", async () => {
  renderMenu();
  await userEvent.click(trigger());
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger()).toHaveFocus();

  await userEvent.click(trigger());
  await userEvent.click(screen.getByText("外側"));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("矢印キーで項目を移動できる", async () => {
  renderMenu();
  await userEvent.click(trigger());
  await userEvent.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "削除" })).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "アーカイブ" })).toHaveFocus();
  await userEvent.keyboard("{ArrowUp}");
  expect(screen.getByRole("menuitem", { name: "削除" })).toHaveFocus();
});

test("項目を押すとそのフォームを送信する", async () => {
  const { onArchive } = renderMenu();
  await userEvent.click(trigger());
  await userEvent.click(screen.getByRole("menuitem", { name: "アーカイブ" }));
  expect(onArchive).toHaveBeenCalledTimes(1);
});

test("確認付きの項目は OK したときだけ送信する", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
  const { onDelete } = renderMenu();
  await userEvent.click(trigger());
  await userEvent.click(screen.getByRole("menuitem", { name: "削除" }));
  expect(confirm).toHaveBeenCalledWith("削除しますか？");
  expect(onDelete).not.toHaveBeenCalled();

  confirm.mockReturnValueOnce(true);
  await userEvent.click(screen.getByRole("menuitem", { name: "削除" }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});
