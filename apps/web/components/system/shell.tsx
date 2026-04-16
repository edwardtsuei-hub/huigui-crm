"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { hasPermission, type CurrentUser } from "../../lib/api";
import {
  quickCreateGroups,
  searchCatalog,
  type NavigationItem,
  type QuickCreateGroup,
  type WorkspaceIconKey,
} from "../../lib/navigation";
import { QuickWorkspaceComposer } from "../dashboard/QuickWorkspaceComposer";
import { StatusBadge } from "./primitives";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function WorkspaceIcon({ icon }: { icon: WorkspaceIconKey }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.7,
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {icon === "home" ? (
        <>
          <path d="m4 11 8-6 8 6" {...common} />
          <path d="M7 10.7V19h10v-8.3" {...common} />
        </>
      ) : null}
      {icon === "calendar" ? (
        <>
          <path
            d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            {...common}
          />
          <path d="M8 3v4M16 3v4M4 10h16" {...common} />
        </>
      ) : null}
      {icon === "customers" ? (
        <>
          <path d="M8 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" {...common} />
          <path d="M16.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" {...common} />
          <path
            d="M4.5 18a4.5 4.5 0 0 1 7 0M14 18a3.5 3.5 0 0 1 5 0"
            {...common}
          />
        </>
      ) : null}
      {icon === "products" ? (
        <>
          <path d="M4 8 12 4l8 4-8 4-8-4Z" {...common} />
          <path d="M4 8v8l8 4 8-4V8" {...common} />
          <path d="M12 12v8" {...common} />
        </>
      ) : null}
      {icon === "solutions" ? (
        <>
          <path d="M4 6h16M4 12h10M4 18h16" {...common} />
          <path d="M17 9 20 12l-3 3" {...common} />
        </>
      ) : null}
      {icon === "quotations" ? (
        <>
          <path
            d="M7 4h8l4 4v12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            {...common}
          />
          <path d="M15 4v4h4M9 12h6M9 16h6" {...common} />
        </>
      ) : null}
      {icon === "files" ? (
        <>
          <path
            d="M6 5h7l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            {...common}
          />
          <path d="M13 5v5h5" {...common} />
        </>
      ) : null}
      {icon === "management" ? (
        <>
          <circle cx="12" cy="12" r="3.2" {...common} />
          <path
            d="M19 12a7 7 0 0 0-.2-1.6l2-1.6-2-3.4-2.5 1a7 7 0 0 0-2.7-1.6L13 2h-4l-.6 2.8a7 7 0 0 0-2.7 1.6l-2.5-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .5.1 1 .2 1.6l-2 1.6 2 3.4 2.5-1a7 7 0 0 0 2.7 1.6L9 22h4l.6-2.8a7 7 0 0 0 2.7-1.6l2.5 1 2-3.4-2-1.6c.1-.6.2-1.1.2-1.6Z"
            {...common}
          />
        </>
      ) : null}
      {icon === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3.2" {...common} />
          <path
            d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6"
            {...common}
          />
        </>
      ) : null}
      {icon === "plus" ? <path d="M12 5v14M5 12h14" {...common} /> : null}
      {icon === "search" ? (
        <>
          <circle cx="11" cy="11" r="5.5" {...common} />
          <path d="m19 19-3.5-3.5" {...common} />
        </>
      ) : null}
      {icon === "help" ? (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path
            d="M9.5 9.5a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.7 1.1-1.7 2.2"
            {...common}
          />
          <path d="M12 17h.01" {...common} />
        </>
      ) : null}
      {icon === "account" ? (
        <>
          <circle cx="12" cy="8.5" r="3.5" {...common} />
          <path d="M5 19a7 7 0 0 1 14 0" {...common} />
        </>
      ) : null}
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M8 17h8M10 20h4M6.5 17c1.2-1.3 1.8-3.2 1.8-5.6 0-2.4 1.6-4.4 3.7-4.4s3.7 2 3.7 4.4c0 2.4.6 4.3 1.8 5.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M12 4.5v1.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function AppShell({
  children,
  collapsed,
  sidebar,
  topbar,
}: {
  children: ReactNode;
  collapsed?: boolean;
  sidebar: ReactNode;
  topbar: ReactNode;
}) {
  return (
    <div className={cn("app-shell", collapsed && "sidebar-collapsed")}>
      {sidebar}
      <main className="main">
        {topbar}
        {children}
      </main>
    </div>
  );
}

export function SidebarNav({
  collapsed,
  notificationCount,
  onToggleCollapse,
  pathname,
  user,
  items,
}: {
  collapsed: boolean;
  notificationCount: number;
  onToggleCollapse: () => void;
  pathname: string;
  user: CurrentUser;
  items: NavigationItem[];
}) {
  const availableItems = useMemo(
    () =>
      items
        .filter((item) => hasPermission(user, item.permissionCode))
        .map((item) => ({
          ...item,
          children:
            item.children?.filter((child) =>
              hasPermission(user, child.permissionCode),
            ) ?? [],
        })),
    [items, user],
  );

  return (
    <aside className={cn("sidebar", collapsed && "collapsed")}>
      <div className="sidebar-brand">
        <div className="sidebar-brand__eyebrow">Huigui Ecology CRM</div>
        <div className="sidebar-brand__row">
          <div>
            <h1 className="brand-title">洄归生态 CRM</h1>
            {!collapsed ? (
              <p className="brand-subtitle">
                深绿品牌导航与专业工作台内容区统一协同。
              </p>
            ) : null}
          </div>
          <button
            className="icon-button sidebar-toggle"
            onClick={onToggleCollapse}
            type="button"
          >
            {collapsed ? "展开" : "折叠"}
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="sidebar-summary">
          <StatusBadge
            tone={notificationCount ? "warning" : "neutral"}
            variant="badge"
          >
            待处理 {notificationCount}
          </StatusBadge>
          <div className="small muted">
            当前导航仅展开所在模块的二级入口，降低视觉噪音。
          </div>
        </div>
      ) : null}

      <nav className="menu">
        {availableItems.map((item) => {
          const active = item.matchPrefixes.some((prefix) =>
            pathname.startsWith(prefix),
          );
          const showChildren = active && item.children.length > 0 && !collapsed;

          return (
            <div className="menu-group" key={item.key}>
              <Link
                className={cn("menu-item", active && "active")}
                href={item.href}
                title={collapsed ? item.label : undefined}
              >
                <span className="menu-item__icon">
                  <WorkspaceIcon icon={item.icon} />
                </span>
                {!collapsed ? (
                  <>
                    <span className="menu-item__body">
                      <span className="menu-item__label">{item.label}</span>
                      <span className="menu-item__caption">{item.caption}</span>
                    </span>
                    {item.key === "schedule" && notificationCount ? (
                      <span className="menu-item__count">
                        {notificationCount}
                      </span>
                    ) : null}
                  </>
                ) : null}
              </Link>

              {showChildren ? (
                <div className="menu-children">
                  {item.children.map((child) => {
                    const activeChild = child.matchPrefixes.some((prefix) =>
                      pathname.startsWith(prefix),
                    );

                    return (
                      <Link
                        className={cn("menu-child", activeChild && "active")}
                        href={child.href}
                        key={`${item.key}-${child.href}`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {!collapsed ? (
          <>
            <div className="sidebar-footer__links">
              <Link href="/settings">设置</Link>
              <Link href="/settings#help">帮助</Link>
            </div>
            <div className="sidebar-account">
              <div className="user-card__avatar">
                {user.displayName.slice(0, 1)}
              </div>
              <div className="user-card__body">
                <strong>{user.displayName}</strong>
                <span>{user.roleName}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="sidebar-footer__compact">
            <Link className="menu-item__icon" href="/settings" title="设置">
              <WorkspaceIcon icon="settings" />
            </Link>
            <Link
              className="menu-item__icon"
              href="/settings#help"
              title="帮助"
            >
              <WorkspaceIcon icon="help" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

export function QuickCreateMenu({
  groups = quickCreateGroups,
  user,
}: {
  groups?: QuickCreateGroup[];
  user: CurrentUser;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [composerKind, setComposerKind] = useState<
    "reminder" | "schedule" | "todo"
  >("reminder");
  const [composerOpen, setComposerOpen] = useState(false);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            hasPermission(user, item.permissionCode),
          ),
        }))
        .filter((group) => group.items.length > 0),
    [groups, user],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="quick-create" ref={ref}>
        <button
          className="button inline quick-create__trigger"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <WorkspaceIcon icon="plus" />
          <span>新增</span>
        </button>

        {open ? (
          <div className="quick-create__panel">
            {visibleGroups.map((group) => (
              <section className="quick-create__group" key={group.key}>
                <div className="quick-create__group-title">{group.label}</div>
                <div className="quick-create__items">
                  {group.items.map((item) =>
                    item.href ? (
                      <Link
                        className="quick-create__item"
                        href={item.href}
                        key={item.key}
                        onClick={() => setOpen(false)}
                      >
                        <span className="quick-create__icon">
                          <WorkspaceIcon icon={item.icon} />
                        </span>
                        <span className="quick-create__content">
                          <strong>{item.label}</strong>
                          <span>{item.description}</span>
                        </span>
                      </Link>
                    ) : (
                      <button
                        className="quick-create__item"
                        key={item.key}
                        onClick={() => {
                          setComposerKind(item.composeKind ?? "reminder");
                          setComposerOpen(true);
                          setOpen(false);
                        }}
                        type="button"
                      >
                        <span className="quick-create__icon">
                          <WorkspaceIcon icon={item.icon} />
                        </span>
                        <span className="quick-create__content">
                          <strong>{item.label}</strong>
                          <span>{item.description}</span>
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>

      <QuickWorkspaceComposer
        assignee={user.displayName}
        initialKind={composerKind}
        onClose={() => setComposerOpen(false)}
        onCreated={() => {
          router.push("/schedule");
        }}
        open={composerOpen}
        relatedLabel="工作台"
        relatedType="internal"
      />
    </>
  );
}

export function Topbar({
  notificationCount,
  onLogout,
  onToggleNotifications,
  pageMeta,
  pathname,
  user,
}: {
  notificationCount: number;
  onLogout: () => void;
  onToggleNotifications: () => void;
  pageMeta: { title: string; subtitle: string };
  pathname: string;
  user: CurrentUser;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const filteredSearchItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return searchCatalog
      .filter((item) => hasPermission(user, item.permissionCode))
      .filter((item) => {
        if (!keyword) {
          return true;
        }
        return `${item.label} ${item.description} ${item.href}`
          .toLowerCase()
          .includes(keyword);
      })
      .slice(0, 8);
  }, [searchText, user]);

  useEffect(() => {
    setSearchOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__page">
        <h1 className="topbar__page-title">{pageMeta.title}</h1>
        <p className="topbar__page-subtitle">{pageMeta.subtitle}</p>
      </div>

      <div className="topbar__actions">
        <div className="command-search" ref={searchRef}>
          <div className="command-search__field">
            <WorkspaceIcon icon="search" />
            <input
              aria-label="全域搜索"
              className="command-search__input"
              onChange={(event) => {
                setSearchText(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredSearchItems.length) {
                  router.push(filteredSearchItems[0].href);
                  setSearchOpen(false);
                  setSearchText("");
                }
              }}
              placeholder="搜索客户、报价、产品、成员或通知"
              value={searchText}
            />
          </div>

          {searchOpen ? (
            <div className="command-search__panel">
              {filteredSearchItems.length ? (
                filteredSearchItems.map((item) => (
                  <button
                    className="command-search__item"
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setSearchOpen(false);
                      setSearchText("");
                    }}
                    type="button"
                  >
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </button>
                ))
              ) : (
                <div className="command-search__empty">
                  没有匹配的工作台入口。
                </div>
              )}
            </div>
          ) : null}
        </div>

        <QuickCreateMenu groups={quickCreateGroups} user={user} />

        <button
          aria-label="打开通知抽屉"
          className="bell-button"
          onClick={onToggleNotifications}
          type="button"
        >
          <BellIcon />
          {notificationCount ? (
            <span className="bell-button__count">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : null}
        </button>

        <div className="account-menu" ref={accountRef}>
          <button
            className="account-menu__trigger"
            onClick={() => setAccountOpen((current) => !current)}
            type="button"
          >
            <div className="user-card__avatar">
              {user.displayName.slice(0, 1)}
            </div>
            <div className="user-card__body">
              <strong>{user.displayName}</strong>
              <span>{user.roleName}</span>
            </div>
          </button>

          {accountOpen ? (
            <div className="account-menu__panel">
              <div className="account-menu__meta">
                <strong>{user.loginAccount || user.username}</strong>
                <span>{user.department || "未设置部门"}</span>
              </div>
              <Link className="account-menu__item" href="/settings">
                我的账号 / 系统设置
              </Link>
              {hasPermission(user, "menu.management") ? (
                <Link className="account-menu__item" href="/management">
                  进入管理中心
                </Link>
              ) : null}
              <button
                className="account-menu__item danger"
                onClick={onLogout}
                type="button"
              >
                退出登录
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
