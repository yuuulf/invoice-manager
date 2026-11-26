"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const navItems = [
  { href: "/clients", label: "取引先" },
  { href: "/owners", label: "事業主" },
  { href: "/invoices", label: "請求書" },
  { href: "/ledger", label: "台帳" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインメニュー"
      className="w-48 shrink-0 border-r border-zinc-200 bg-zinc-50"
    >
      <p className="px-4 py-5 text-lg font-bold">請求書管理</p>
      <ul>
        {navItems.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "block bg-zinc-200 px-4 py-2 font-bold"
                    : "block px-4 py-2 hover:bg-zinc-100"
                }
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
