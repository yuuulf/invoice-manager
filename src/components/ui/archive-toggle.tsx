import { Archive } from "lucide-react";
import { IconLink } from "./icon-button";

/**
 * 一覧とアーカイブ一覧を切り替えるアイコンリンク（spec.md 4.2）。
 * アーカイブ一覧の表示中は強調し、押すと通常の一覧に戻る。
 */
export function ArchiveToggle({
  basePath,
  archived,
}: {
  basePath: string;
  archived: boolean;
}) {
  return (
    <IconLink
      href={archived ? basePath : `${basePath}?view=archived`}
      label={archived ? "一覧に戻る" : "アーカイブ一覧"}
      icon={<Archive className="size-5" aria-hidden />}
      active={archived}
      aria-current={archived ? "page" : undefined}
    />
  );
}
