import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { RowActions } from "./row-actions";

afterEach(() => {
  vi.restoreAllMocks();
});

type RowAction = (formData: FormData) => Promise<{ error: string } | undefined>;

function renderActions(
  archived: boolean,
  archiveAction: RowAction = vi.fn(async () => undefined),
) {
  render(
    <RowActions
      id={3}
      archived={archived}
      editHref="/clients/3/edit"
      archiveAction={archiveAction}
      restoreAction={vi.fn(async () => undefined)}
      deleteAction={vi.fn(async () => undefined)}
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

test("操作が失敗したらメッセージを表示する", async () => {
  const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
  const archiveAction = vi.fn(async (formData: FormData) => {
    expect(formData.get("id")).toBe("3");
    return { error: "使われているため、アーカイブできません" };
  });
  renderActions(false, archiveAction);
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "アーカイブ" }));
  await vi.waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      "使われているため、アーカイブできません",
    ),
  );
});

test("操作が成功したらメッセージは出さない", async () => {
  const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
  const archiveAction = vi.fn(async () => undefined);
  renderActions(false, archiveAction);
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "アーカイブ" }));
  await vi.waitFor(() => expect(archiveAction).toHaveBeenCalled());
  expect(alert).not.toHaveBeenCalled();
});

test("copyAction を渡すと、通常の一覧のメニューの先頭に「コピー」を出す", async () => {
  const copyAction = vi.fn(async () => undefined);
  render(
    <RowActions
      id={3}
      archived={false}
      editHref="/invoices/3/edit"
      archiveAction={vi.fn(async () => undefined)}
      restoreAction={vi.fn(async () => undefined)}
      deleteAction={vi.fn(async () => undefined)}
      deleteConfirmMessage="削除しますか？"
      copyAction={copyAction}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "その他の操作" }));
  expect(menuItemNames()).toEqual(["コピー", "アーカイブ", "削除"]);
  await userEvent.click(screen.getByRole("menuitem", { name: "コピー" }));
  expect(copyAction).toHaveBeenCalledTimes(1);
  const formData = (copyAction.mock.calls[0] as unknown[])[0] as FormData;
  expect(formData.get("id")).toBe("3");
});
