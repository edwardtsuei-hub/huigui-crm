"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const workManagementLinks = [
  { href: "/work-management/home", label: "首页" },
  { href: "/work-management/weekly-reports", label: "周报" },
  { href: "/work-management/monthly-goals", label: "本月目标" },
];

export function WorkManagementSubnav() {
  const pathname = usePathname();

  return (
    <nav className="management-subnav">
      {workManagementLinks.map((item) => {
        const active =
          item.href === "/work-management/home"
            ? pathname === "/work-management" ||
              pathname.startsWith("/work-management/home") ||
              pathname.startsWith("/work-management/overview")
            : pathname.startsWith(item.href);

        return (
          <Link
            className={`management-subnav__item ${active ? "active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
