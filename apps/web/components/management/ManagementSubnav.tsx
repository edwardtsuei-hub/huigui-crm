"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const managementLinks = [
  { href: "/management", label: "总览" },
  { href: "/management/members", label: "成员管理" },
  { href: "/management/roles", label: "角色权限" },
  { href: "/management/approvals", label: "审批规则" },
  { href: "/management/logs", label: "操作日志" }
];

export function ManagementSubnav() {
  const pathname = usePathname();

  return (
    <nav className="management-subnav">
      {managementLinks.map((item) => {
        const active =
          item.href === "/management"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            className={`management-subnav__item ${active ? "active" : ""}`}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
