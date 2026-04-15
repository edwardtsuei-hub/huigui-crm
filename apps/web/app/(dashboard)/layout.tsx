"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  apiFetch,
  clearAuth,
  getCurrentUser,
  getToken,
  type CurrentUser
} from "../../lib/api";

const menuItems = [
  { href: "/dashboard", label: "首页" },
  { href: "/notifications", label: "通知中心" },
  { href: "/customers", label: "客户管理" },
  { href: "/products", label: "产品管理" },
  { href: "/solutions/agriculture/new", label: "农业方案" },
  { href: "/solutions/industry/new", label: "通用报价" },
  { href: "/quotations", label: "报价记录" },
  { href: "/settings", label: "系统设置" }
];

function titleFromPath(pathname: string) {
  const match = menuItems.find((item) => pathname.startsWith(item.href));
  return match?.label ?? "业务后台";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationVersion, setNotificationVersion] = useState(0);

  useEffect(() => {
    const token = getToken();
    const currentUser = getCurrentUser();
    if (!token || !currentUser) {
      router.replace("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleNotificationsChanged = () => {
      setNotificationVersion((current) => current + 1);
    };

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationsChanged);
    };
  }, []);

  useEffect(() => {
    if (!getToken()) {
      return;
    }

    let cancelled = false;

    async function loadNotificationSummary() {
      try {
        const summary = await apiFetch<{ unreadCount: number }>("/notifications/summary");
        if (!cancelled) {
          setUnreadCount(summary.unreadCount);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    }

    void loadNotificationSummary();

    return () => {
      cancelled = true;
    };
  }, [pathname, notificationVersion]);

  const breadcrumb = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return ["后台"].concat(segments).join(" / ");
  }, [pathname]);

  if (!user) {
    return (
      <main className="screen-center">
        <div className="panel compact">正在加载权限信息...</div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 className="brand-title">洄归生态</h1>
        <p className="brand-subtitle">客户管理与报价协同系统</p>

        <nav className="menu">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              className={`menu-item ${pathname.startsWith(item.href) ? "active" : ""}`}
              href={item.href}
            >
              <span>{item.label}</span>
              {item.href === "/notifications" && unreadCount > 0 ? (
                <span className="menu-item__count">{unreadCount > 99 ? "99+" : unreadCount}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="breadcrumb">{breadcrumb}</div>
            <h2>{titleFromPath(pathname)}</h2>
          </div>

          <div className="toolbar">
            <Link className="button secondary inline notification-trigger" href="/notifications">
              <span className={`notification-dot ${unreadCount > 0 ? "active" : ""}`} />
              <span>通知中心</span>
              {unreadCount > 0 ? (
                <span className="notification-pill">{unreadCount > 99 ? "99+" : unreadCount}</span>
              ) : null}
            </Link>
            <div className="status-badge">
              {user.displayName} · {user.roleName}
            </div>
            <button
              className="button secondary inline"
              onClick={() => {
                clearAuth();
                router.replace("/login");
              }}
            >
              退出登录
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
