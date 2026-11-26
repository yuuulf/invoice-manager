"use client";

import { EllipsisVertical } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { IconButton } from "./icon-button";

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
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
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
        onClick={() => setOpen((v) => !v)}
      />
      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-10 mt-1 min-w-40 rounded border border-zinc-200 bg-white py-1 shadow-lg"
        >
          <CloseMenuContext.Provider value={() => setOpen(false)}>
            {children}
          </CloseMenuContext.Provider>
        </div>
      )}
    </div>
  );
}

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
      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm whitespace-nowrap hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none ${danger ? "text-red-600" : ""} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
