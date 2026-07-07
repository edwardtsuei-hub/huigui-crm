"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NotificationDrawer } from "../../components/dashboard/NotificationDrawer";
import { SiteBrandProvider } from "../../components/system/SiteBrandContext";
import {
  AppShell,
  MobileDockNav,
  SidebarNav,
  Topbar,
} from "../../components/system/shell";
import {
  getQuickCreateGroupsForUser,
  getNavigationWorkspaceConfig,
  resolvePageMeta,
  type WorkspaceIconKey,
} from "../../lib/navigation";
import {
  normalizeNotifications,
  type WorkspaceNotification,
} from "../../lib/workspace";
import {
  DATA_MODE_CHANGED_EVENT,
  NOTIFICATIONS_CHANGED_EVENT,
  apiFetch,
  clearAuth,
  fetchApi,
  getCurrentUser,
  getRecordDataMode,
  getToken,
  type CurrentUser,
  type RecordDataMode,
} from "../../lib/api";
import type { SiteBrand } from "../../lib/site-brand";
import {
  buildWecomLoginUrl,
  type WecomConfig,
} from "../../lib/wecom-auth";

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

export default function DashboardLayoutClient({
  brand,
  children,
}: {
  brand: SiteBrand;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationVersion, setNotificationVersion] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [drawerItems, setDrawerItems] = useState<WorkspaceNotification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(false);
  const [mobileChromeCondensed, setMobileChromeCondensed] = useState(false);
  const [wecomConfig, setWecomConfig] = useState<WecomConfig | null>(null);
  const [wecomBindingLoading, setWecomBindingLoading] = useState(false);
  const [wecomBindingError, setWecomBindingError] = useState("");
  const [dataMode, setDataMode] = useState<RecordDataMode>({
    scope: "REAL",
    testBatchId: null,
    testBatchName: null,
  });

  useEffect(() => {
    const token = getToken();
    const currentUser = getCurrentUser();

    if (!token || !currentUser) {
      clearAuth();
      setUser(null);
      setAuthChecked(true);

      router.replace("/login");

      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          if (window.location.pathname !== "/login") {
            window.location.replace("/login");
          }
        }, 160);
      }

      return;
    }

    setUser(currentUser);
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadWecomConfig() {
      try {
        const response = await fetchApi("/wecom/config");
        if (!response.ok) {
          return;
        }

        const config = (await response.json()) as WecomConfig;
        if (!cancelled) {
          setWecomConfig(config);
        }
      } catch {
        if (!cancelled) {
          setWecomConfig(null);
        }
      }
    }

    void loadWecomConfig();

    return () => {
      cancelled = true;
    };
  }, []);

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
    if (typeof document === "undefined" || !mobileViewport || !mobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen, mobileViewport]);

  useEffect(() => {
    setDrawerOpen(false);
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    setSidebarCollapsed(stored === "1");
    setDataMode(getRecordDataMode());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => {
      setMobileViewport(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setMobileSidebarOpen(false);
        setMobileChromeCondensed(false);
      }
    };

    syncViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);

      return () => {
        mediaQuery.removeEventListener("change", syncViewport);
      };
    }

    mediaQuery.addListener(syncViewport);

    return () => {
      mediaQuery.removeListener(syncViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !mobileViewport) {
      return;
    }

    let frameId = 0;
    const collapseThreshold = 72;
    const expandThreshold = 20;

    const syncCondensedState = () => {
      frameId = 0;
      const nextScrollTop = window.scrollY;
      setMobileChromeCondensed((current) => {
        if (nextScrollTop >= collapseThreshold) {
          return true;
        }

        if (nextScrollTop <= expandThreshold) {
          return false;
        }

        return current;
      });
    };

    const handleScroll = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(syncCondensedState);
    };

    syncCondensedState();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [mobileViewport]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleDataModeChanged = () => {
      setDataMode(getRecordDataMode());
    };

    window.addEventListener(DATA_MODE_CHANGED_EVENT, handleDataModeChanged);

    return () => {
      window.removeEventListener(DATA_MODE_CHANGED_EVENT, handleDataModeChanged);
    };
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

  const navigationConfig = useMemo(
    () => getNavigationWorkspaceConfig(brand.key),
    [brand.key],
  );
  const pageMeta = useMemo(
    () => resolvePageMeta(pathname, brand.key),
    [brand.key, pathname],
  );
  const quickCreateMenuGroups = useMemo(
    () => getQuickCreateGroupsForUser(brand.key, user, pathname),
    [brand.key, pathname, user],
  );
  const requiresWecomBinding = Boolean(user && !user.wecomUserId);
  const mobileDockItems = useMemo(() => {
    if (brand.key !== "management") {
      return [];
    }

    const dashboardItem = navigationConfig.items.find(
      (item) => item.key === "dashboard",
    );
    const workManagementItem = navigationConfig.items.find(
      (item) => item.key === "work-management",
    );
    const scheduleItem = navigationConfig.items.find(
      (item) => item.key === "schedule",
    );
    const managementItem = navigationConfig.items.find(
      (item) => item.key === "management",
    );

    const items: Array<{
      key: string;
      href?: string;
      icon: WorkspaceIconKey;
      label: string;
      matchPrefixes: string[];
      badgeCount?: number;
      onClick?: () => void;
    }> = [];

    if (dashboardItem) {
      items.push({
        key: dashboardItem.key,
        href: dashboardItem.href,
        icon: dashboardItem.icon,
        label: dashboardItem.label,
        matchPrefixes: dashboardItem.matchPrefixes,
      });
    }

    if (workManagementItem) {
      items.push({
        key: workManagementItem.key,
        href: workManagementItem.href,
        icon: workManagementItem.icon,
        label: "工作",
        matchPrefixes: workManagementItem.matchPrefixes,
      });
    }

    if (scheduleItem) {
      items.push({
        key: scheduleItem.key,
        href: scheduleItem.href,
        icon: scheduleItem.icon,
        label: "日程",
        matchPrefixes: ["/schedule", "/notifications"],
        badgeCount: unreadCount || undefined,
      });
    }

    items.push({
      key: "more",
      icon: managementItem?.icon ?? "management",
      label: "更多",
      matchPrefixes: ["/management", "/settings"],
      onClick: () => {
        setMobileSidebarOpen(true);
      },
    });

    return items;
  }, [brand.key, navigationConfig.items, unreadCount]);

  if (!authChecked) {
    return (
      <main className="screen-center">
        <div className="panel compact">正在加载权限信息...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="screen-center">
        <div className="panel compact">
          登录信息已失效，正在返回登录页...
        </div>
      </main>
    );
  }

  return (
    <SiteBrandProvider brandKey={brand.key}>
      <AppShell
      collapsed={sidebarCollapsed}
      mobileChromeCondensed={mobileChromeCondensed}
      mobileDock={
        mobileDockItems.length ? (
          <MobileDockNav
            items={mobileDockItems}
            pathname={pathname}
          />
        ) : null
      }
      mobileViewport={mobileViewport}
      sidebar={
        <SidebarNav
          brand={brand}
          collapsed={sidebarCollapsed}
          items={navigationConfig.items}
          mobileOpen={mobileSidebarOpen}
          mobileViewport={mobileViewport}
          notificationCount={unreadCount}
          onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
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
          notificationsOpen={drawerOpen}
          notificationCount={unreadCount}
          mobileChromeCondensed={mobileChromeCondensed}
          mobileViewport={mobileViewport}
          onLogout={() => {
            clearAuth();
            router.replace("/login");
          }}
          onToggleMobileSidebar={() =>
            setMobileSidebarOpen((current) => !current)
          }
          onToggleNotifications={() => setDrawerOpen((current) => !current)}
          entrySearchCatalog={navigationConfig.searchCatalog}
          pageMeta={pageMeta}
          pathname={pathname}
          quickCreateGroups={quickCreateMenuGroups}
          recordDataMode={dataMode}
          searchDescription={navigationConfig.searchDescription}
          searchEmptyState={navigationConfig.searchEmptyState}
          searchFooter={navigationConfig.searchFooter}
          searchModules={navigationConfig.searchModules}
          searchNoResults={navigationConfig.searchNoResults}
          searchPlaceholder={navigationConfig.searchPlaceholder}
          user={user}
          />
      }
    >
      {children}

      {requiresWecomBinding ? (
        <div className="wecom-bind-modal" role="dialog" aria-modal="true">
          <div className="wecom-bind-modal__card">
            <div className="wecom-bind-modal__badge">企业微信绑定</div>
            <div className="section-heading">
              <h3>请先绑定本人企业微信</h3>
              <p>
                {user.displayName || user.name || user.username}，你的系统账号已经通过密码登录。
                完成企业微信绑定后，后续可以接收通知、同步日程，并使用扫码登录。
              </p>
            </div>

            {wecomBindingError ? (
              <div className="danger-text small">{wecomBindingError}</div>
            ) : null}

            <div className="drawer-footer-actions">
              <button
                className="button secondary"
                onClick={() => {
                  clearAuth();
                  router.replace("/login");
                }}
                type="button"
              >
                退出当前账号
              </button>
              <button
                className="button"
                disabled={wecomBindingLoading || !wecomConfig?.enabled}
                onClick={() => {
                  if (!wecomConfig?.enabled || !wecomConfig.corpId || !wecomConfig.agentId) {
                    setWecomBindingError("企业微信登录尚未配置完整，请联系管理员。");
                    return;
                  }

                  setWecomBindingLoading(true);
                  setWecomBindingError("");

                  try {
                    window.location.assign(buildWecomLoginUrl(wecomConfig, "bind"));
                  } catch (requestError) {
                    setWecomBindingLoading(false);
                    setWecomBindingError(
                      requestError instanceof Error
                        ? requestError.message
                        : "企业微信登录回调地址不可用",
                    );
                  }
                }}
                type="button"
              >
                {!wecomConfig?.enabled
                  ? "企业微信入口未配置"
                  : wecomBindingLoading
                    ? "正在打开扫码..."
                    : "扫码绑定企业微信"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <NotificationDrawer
        error={drawerError}
        items={drawerItems}
        loading={drawerLoading}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        unreadCount={unreadCount}
      />
      </AppShell>
    </SiteBrandProvider>
  );
}
