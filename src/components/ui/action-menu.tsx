"use client";

import { EllipsisVertical } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { IconButton } from "./icon-button";

type MenuPosition = { top?: number; bottom?: number; right: number };

/** 画面の端からメニューまでの最小の余白（px） */
const EDGE = 8;

/**
 * メニューを出す位置（画面基準）。ボタンの右下に右端をそろえて出し、画面の右端・左端からはみ出さないようにする。
 * メニューの高さが分かっていて下に収まらず、上のほうが広ければボタンの上に出す
 */
export function menuPosition(
  button: Pick<DOMRect, "top" | "bottom" | "right">,
  menuHeight?: number,
): MenuPosition {
  // position: fixed の right はスクロールバーを除いた幅が基準（取れなければ画面の幅）
  const viewportWidth =
    document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = window.innerHeight;
  // ボタンが横スクロールで隠れていても、メニューは画面の中に出す
  const right = Math.min(
    Math.max(viewportWidth - button.right, EDGE),
    viewportWidth - EDGE,
  );
  const below = viewportHeight - button.bottom;
  if (
    menuHeight !== undefined &&
    below < menuHeight + EDGE &&
    button.top > below
  ) {
    return { bottom: viewportHeight - button.top + 4, right };
  }
  return { top: button.bottom + 4, right };
}

/** 項目を選んだらメニューを閉じるための関数 */
const CloseMenuContext = createContext<() => void>(() => {});

/**
 * 縦三点リーダーのアイコンボタンで開くメニュー。項目を選ぶと閉じる。
 * 行ごとの「その他の操作」（アーカイブ・削除など）を入れる。
 */
export function ActionMenu({
  label = "その他の操作",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  /** メニューを出す位置（画面基準）。表の横スクロールの枠で切れないよう、position: fixed で出す */
  const [position, setPosition] = useState<MenuPosition>();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    // 画面基準の位置で出しているため、スクロールや画面の大きさが変わったら閉じる
    const close = (event: Event) => {
      // メニューの中のスクロールでは閉じない
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setPosition(menuPosition(rect));
    }
    setOpen((v) => !v);
  };

  // 下に収まらなければ、ボタンの上に開く（開いた後にメニューの高さを測って決める）
  useLayoutEffect(() => {
    if (!open) return;
    const button = rootRef.current?.getBoundingClientRect();
    const menu = menuRef.current?.getBoundingClientRect();
    if (button && menu) setPosition(menuPosition(button, menu.height));
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      rootRef.current?.querySelector<HTMLElement>("button")?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      list[(index + 1) % list.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      list[(index - 1 + list.length) % list.length]?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        label={label}
        icon={<EllipsisVertical className="size-5" aria-hidden />}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        active={open}
        onClick={toggle}
      />
      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          style={position}
          className="fixed z-10 min-w-40 rounded border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <CloseMenuContext.Provider value={() => setOpen(false)}>
            {children}
          </CloseMenuContext.Provider>
        </div>
      )}
    </div>
  );
}

const itemClassName =
  "flex w-full items-center gap-2 px-4 py-2 text-left text-sm whitespace-nowrap hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none";

type ActionMenuItemProps = Omit<ComponentProps<"button">, "role"> & {
  icon?: ReactNode;
  danger?: boolean;
  /** 指定すると実行前に確認ダイアログを出す（元に戻せない操作用） */
  confirmMessage?: string;
};

/** ActionMenu の項目。フォーム内に置くと type="submit" でそのフォームを送信する */
export function ActionMenuItem({
  icon,
  danger = false,
  confirmMessage,
  onClick,
  children,
  className = "",
  type = "submit",
  ...props
}: ActionMenuItemProps) {
  const closeMenu = useContext(CloseMenuContext);
  return (
    <button
      type={type}
      role="menuitem"
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
        // フォームの送信が始まってから閉じる
        setTimeout(closeMenu, 0);
      }}
      className={`${itemClassName} disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${danger ? "text-red-600" : ""} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

/** ActionMenu の項目のうち、リンク（ファイルのダウンロードなど）になるもの */
export function ActionMenuAnchor({
  icon,
  onClick,
  children,
  className = "",
  ...props
}: Omit<ComponentProps<"a">, "role"> & { icon?: ReactNode }) {
  const closeMenu = useContext(CloseMenuContext);
  return (
    <a
      role="menuitem"
      onClick={(event) => {
        onClick?.(event);
        setTimeout(closeMenu, 0);
      }}
      className={`${itemClassName} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </a>
  );
}
