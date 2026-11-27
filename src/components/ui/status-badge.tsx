import type { ReactNode } from "react";

export type StatusTone = "neutral" | "warning" | "success";

const toneClass: Record<StatusTone, string> = {
  neutral: "border-zinc-300 bg-zinc-50 text-zinc-600",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
};

/** 状態を色とアイコンで示す小さなラベル（例: 台帳の未送信・未入金・入金済み） */
export function StatusBadge({
  tone,
  icon,
  children,
}: {
  tone: StatusTone;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      data-tone={tone}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold whitespace-nowrap ${toneClass[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
