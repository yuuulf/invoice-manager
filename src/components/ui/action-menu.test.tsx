import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  ActionMenu,
  ActionMenuAnchor,
  ActionMenuItem,
  menuPosition,
} from "./action-menu";

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

test("項目を選ぶとメニューを閉じる", async () => {
  const { onArchive } = renderMenu();
  await userEvent.click(trigger());
  await userEvent.click(screen.getByRole("menuitem", { name: "アーカイブ" }));
  expect(onArchive).toHaveBeenCalledTimes(1);
  await vi.waitFor(() =>
    expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
  );
});

test("リンクの項目はダウンロード用のリンクになり、選ぶとメニューを閉じる", async () => {
  render(
    <ActionMenu>
      <ActionMenuAnchor
        href="/files/a.pdf"
        download="a.pdf"
        // jsdom はページ遷移できないため、リンクの既定の動作を止める
        onClick={(e) => e.preventDefault()}
      >
        PDF出力
      </ActionMenuAnchor>
    </ActionMenu>,
  );
  await userEvent.click(trigger());
  const link = screen.getByRole("menuitem", { name: "PDF出力" });
  expect(link.tagName).toBe("A");
  expect(link).toHaveAttribute("href", "/files/a.pdf");
  expect(link).toHaveAttribute("download", "a.pdf");
  await userEvent.click(link);
  await vi.waitFor(() =>
    expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
  );
});

test("表の横スクロールの枠で切れないよう、メニューは画面基準の位置（ボタンの右下）に出す", async () => {
  renderMenu();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 100,
    bottom: 136,
    left: 900,
    right: 936,
    width: 36,
    height: 36,
    x: 900,
    y: 100,
    toJSON: () => ({}),
  });
  await userEvent.click(trigger());
  const menu = screen.getByRole("menu");
  expect(menu).toHaveClass("fixed");
  expect(menu.style.top).toBe("140px");
  expect(menu.style.right).toBe(`${window.innerWidth - 936}px`);
});

test("スクロールしたらメニューを閉じる", async () => {
  renderMenu();
  await userEvent.click(trigger());
  expect(screen.getByRole("menu")).toBeInTheDocument();
  fireEvent.scroll(window);
  await vi.waitFor(() =>
    expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
  );
});

describe("menuPosition", () => {
  test("ボタンの右下に出し、画面の右端からはみ出すときは画面の中におさえる", () => {
    // jsdom ではスクロールバーを除いた幅が 0 になるため、画面の幅が基準になる
    const width = window.innerWidth;
    expect(menuPosition({ top: 100, bottom: 136, right: 500 })).toEqual({
      top: 140,
      right: width - 500,
    });
    // ボタンが横スクロールで画面の右の外にある
    expect(menuPosition({ top: 100, bottom: 136, right: width + 50 })).toEqual({
      top: 140,
      right: 8,
    });
  });

  test("下に収まらず上のほうが広ければ、ボタンの上に出す", () => {
    const height = window.innerHeight;
    expect(
      menuPosition({ top: height - 40, bottom: height - 4, right: 500 }, 120),
    ).toMatchObject({ bottom: 44 });
    expect(
      menuPosition({ top: 100, bottom: 136, right: 500 }, 120),
    ).toMatchObject({ top: 140 });
  });
});
