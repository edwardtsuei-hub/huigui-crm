"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NotificationDrawer } from "../../components/dashboard/NotificationDrawer";
import { AppShell, SidebarNav, Topbar } from "../../components/system/shell";
import { navigationTree, resolvePageMeta } from "../../lib/navigation";
import {
  normalizeNotifications,
  type WorkspaceNotification,
} from "../../lib/workspace";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  apiFetch,
  clearAuth,
  getCurrentUser,
  getToken,
  type CurrentUser,
} from "../../lib/api";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "huigui-sidebar-collapsed";

type NotificationResponse = {
  items: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: string;
    readAt: string | null;
  }>;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationVersion, setNotificationVersion] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [drawerItems, setDrawerItems] = useState<WorkspaceNotification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    window.addEventListener(
      NOTIFICATIONS_CHANGED_EVENT,
      handleNotificationsChanged,
    );
    return () => {
      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        handleNotificationsChanged,
      );
    };
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    setSidebarCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    if (!getToken()) {
      return;
    }

    let cancelled = false;

    async function loadNotificationSummary() {
      try {
        const summary = await apiFetch<{ unreadCount: number }>(
          "/notifications/summary",
        );
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

  useEffect(() => {
    if (!drawerOpen || !getToken()) {
      return;
    }

    let cancelled = false;
    setDrawerLoading(true);
    setDrawerError("");

    async function loadNotifications() {
      try {
        const response = await apiFetch<NotificationResponse>(
          "/notifications?page=1&pageSize=16",
        );
        if (!cancelled) {
          setDrawerItems(normalizeNotifications(response.items));
        }
      } catch (requestError) {
        if (!cancelled) {
          setDrawerError(
            requestError instanceof Error
              ? requestError.message
              : "加载通知失败",
          );
        }
      } finally {
        if (!cancelled) {
          setDrawerLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [drawerOpen, notificationVersion]);

  const pageMeta = useMemo(() => resolvePageMeta(pathname), [pathname]);

  if (!user) {
    return (
      <main className="screen-center">
        <div className="panel compact">正在加载权限信息...</div>
      </main>
    );
  }

  return (
    <AppShell
      collapsed={sidebarCollapsed}
      sidebar={
        <SidebarNav
          collapsed={sidebarCollapsed}
          items={navigationTree}
          notificationCount={unreadCount}
          onToggleCollapse={() => {
            const next = !sidebarCollapsed;
            setSidebarCollapsed(next);
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                SIDEBAR_COLLAPSED_STORAGE_KEY,
                next ? "1" : "0",
              );
            }
          }}
          pathname={pathname}
          user={user}
        />
      }
      topbar={
        <Topbar
          notificationCount={unreadCount}
          onLogout={() => {
            clearAuth();
            router.replace("/login");
          }}
          onToggleNotifications={() => setDrawerOpen((current) => !current)}
          pageMeta={pageMeta}
          pathname={pathname}
          user={user}
        />
      }
    >
      {children}

      <NotificationDrawer
        error={drawerError}
        items={drawerItems}
        loading={drawerLoading}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        unreadCount={unreadCount}
      />
    </AppShell>
  );
}
