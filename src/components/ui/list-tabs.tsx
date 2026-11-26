import Link from "next/link";

/** 一覧とアーカイブ一覧の切り替え（spec.md 4.2） */
export function ListTabs({
  basePath,
  archived,
}: {
  basePath: string;
  archived: boolean;
}) {
  const tabs = [
    { href: basePath, label: "一覧", current: !archived },
    {
      href: `${basePath}?view=archived`,
      label: "アーカイブ一覧",
      current: archived,
    },
  ];
  return (
    <nav
      aria-label="表示切り替え"
      className="mb-4 flex gap-4 border-b border-zinc-300"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.current ? "page" : undefined}
          className={
            tab.current
              ? "-mb-px border-b-2 border-zinc-900 px-1 pb-2 font-bold"
              : "px-1 pb-2 text-zinc-500 hover:text-zinc-900"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
