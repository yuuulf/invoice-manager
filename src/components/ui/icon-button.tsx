import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex size-9 items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50";
const activeClass = "bg-zinc-200 text-zinc-900";

type CommonProps = {
  /** 読み上げ・ツールチップに使う操作名（必須） */
  label: string;
  icon: ReactNode;
  active?: boolean;
};

/** アイコンだけのボタン。操作名は aria-label とツールチップで示す */
export function IconButton({
  label,
  icon,
  active = false,
  className = "",
  type = "button",
  ...props
}: CommonProps & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`${base} ${active ? activeClass : ""} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}

/** アイコンだけのリンク。操作名は aria-label とツールチップで示す */
export function IconLink({
  label,
  icon,
  active = false,
  className = "",
  ...props
}: CommonProps & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={`${base} ${active ? activeClass : ""} ${className}`}
      {...props}
    >
      {icon}
    </Link>
  );
}

/** アイコンだけの通常のリンク。ファイルのダウンロードなど、画面遷移しないリンクに使う */
export function IconAnchor({
  label,
  icon,
  className = "",
  ...props
}: Omit<CommonProps, "active"> & Omit<ComponentProps<"a">, "children">) {
  return (
    <a
      aria-label={label}
      title={label}
      className={`${base} ${className}`}
      {...props}
    >
      {icon}
    </a>
  );
}
