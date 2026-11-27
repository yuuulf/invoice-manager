import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { nextSort, sortHref, type SortState } from "@/lib/list-query";

/**
 * 並べ替えできる列見出し（spec.md 3.2）。押すたびに 昇順 → 降順 → 既定の順 に切り替える。
 * 並べ替えの条件以外（キーワードなど）は URL に残す
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  basePath,
  query,
  className = "",
  align = "left",
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  basePath: string;
  /** いまの一覧の検索パラメータ（「?」なし） */
  query: string;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sort?.key === sortKey ? sort.order : null;
  const Icon =
    active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <th
      aria-sort={
        active === "asc"
          ? "ascending"
          : active === "desc"
            ? "descending"
            : undefined
      }
      className={`px-3 py-2 ${align === "right" ? "text-right" : ""} ${className}`}
    >
      <Link
        href={sortHref(basePath, query, nextSort(sort, sortKey))}
        scroll={false}
        className={`inline-flex items-center gap-1 hover:text-zinc-600 ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <Icon
          className={`size-3.5 shrink-0 ${active ? "" : "text-zinc-300"}`}
          aria-hidden
        />
        <span className="sr-only">
          {active === "asc"
            ? "（昇順。押すと降順）"
            : active === "desc"
              ? "（降順。押すと並べ替えを解除）"
              : "（押すと昇順に並べ替え）"}
        </span>
      </Link>
    </th>
  );
}
