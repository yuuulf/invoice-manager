import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { RowActions } from "./row-actions";

function renderActions(archived: boolean) {
  render(
    <RowActions
      id={3}
      archived={archived}
      editHref="/clients/3/edit"
      archiveAction={vi.fn()}
      restoreAction={vi.fn()}
      deleteAction={vi.fn()}
      deleteConfirmMessage="削除しますか？"
    />,
  );
}

function menuItemNames() {
  return within(screen.getByRole("menu"))
    .getAllByRole("menuitem")
    .map((item) => item.textContent);
}

test("通常の一覧では編集アイコンの右のメニューにアーカイブ・削除がある", async () => {
  renderActions(false);
  const edit = screen.getByRole("link", { name: "編集" });
  const menu = screen.getByRole("button", { name: "その他の操作" });
  expect(edit).toHaveAttribute("href", "/clients/3/edit");
  expect(edit.compareDocumentPosition(menu)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  await userEvent.click(menu);
  expect(menuItemNames()).toEqual(["アーカイブ", "削除"]);
});

test("アーカイブ一覧では編集アイコンを出さず、メニューにアーカイブを解除・削除がある", async () => {
  renderActions(true);
  expect(screen.queryByRole("link", { name: "編集" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  expect(menuItemNames()).toEqual(["アーカイブを解除", "削除"]);
});

test("各フォームに対象の ID を送る", async () => {
  renderActions(false);
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  for (const item of screen.getAllByRole("menuitem")) {
    const form = item.closest("form");
    expect(form && new FormData(form).get("id")).toBe("3");
  }
});
