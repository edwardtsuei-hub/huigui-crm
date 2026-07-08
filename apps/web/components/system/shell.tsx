"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  hasPermission,
  type CurrentUser,
  type RecordDataMode,
} from "../../lib/api";
import type { SiteBrand } from "../../lib/site-brand";
import {
  type NavigationSearchModules,
  type SearchCatalogItem,
  type PageMeta,
  quickCreateGroups,
  searchCatalog,
  type NavigationItem,
  type QuickCreateGroup,
  type WorkspaceIconKey,
} from "../../lib/navigation";
import { fetchOrders, type OrderListItem } from "../../lib/orders";
import { customerStatusLabelMap } from "../customers/types";
import {
  inspectionStatusLabel,
  type InspectionListResponse,
} from "../inspections/types";
import { QuickWorkspaceComposer } from "../dashboard/QuickWorkspaceComposer";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getMatchScore(pathname: string, prefixes: string[]) {
  return prefixes.reduce((best, prefix) => {
    return pathname.startsWith(prefix) ? Math.max(best, prefix.length) : best;
  }, 0);
}

type GlobalSearchGroupKey =
  | "customer"
  | "quotation"
  | "order"
  | "inspection"
  | "member"
  | "entry";

type GlobalSearchItem = {
  id: string;
  group: GlobalSearchGroupKey;
  title: string;
  subtitle: string;
  hint: string;
  href: string;
};

type GlobalSearchGroup = {
  group: GlobalSearchGroupKey;
  items: GlobalSearchItem[];
};

type MobileDockItem = {
  key: string;
  href?: string;
  icon: WorkspaceIconKey;
  label: string;
  matchPrefixes: string[];
  badgeCount?: number;
  onClick?: () => void;
};

type CustomerSearchRecord = {
  id: string;
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  status: string;
  owner: { displayName: string };
  industryGroup?: { id: string; name: string } | null;
};

type CustomerSearchResponse = {
  items: CustomerSearchRecord[];
};

type QuotationSearchRecord = {
  id: string;
  quotationNo: string;
  type: "AGRICULTURE" | "GENERAL" | "INDUSTRY" | "SERVICE" | "BREEDING";
  totalAmount: string;
  status?: string;
  customer: { id: string; name: string };
  creator: { displayName: string };
};

type MemberSearchRecord = {
  id: string;
  name: string;
  loginAccount?: string | null;
  department?: string | null;
  title?: string | null;
  status: "ACTIVE" | "DISABLED";
  role: { id: string; code: string; name: string };
};

type MemberSearchResponse = {
  items: MemberSearchRecord[];
};

const GLOBAL_SEARCH_RESULT_LIMIT = 4;
const GLOBAL_ORDER_SEARCH_PAGE_SIZE = 80;
const globalSearchGroupOrder: GlobalSearchGroupKey[] = [
  "customer",
  "quotation",
  "order",
  "inspection",
  "member",
  "entry",
];

const globalSearchGroupMeta: Record<
  GlobalSearchGroupKey,
  { label: string; accent: string; background: string }
> = {
  customer: {
    label: "客户",
    accent: "var(--brand-strong)",
    background: "rgba(61, 151, 96, 0.12)",
  },
  quotation: {
    label: "报价",
    accent: "var(--warning)",
    background: "rgba(255, 200, 110, 0.2)",
  },
  order: {
    label: "订单",
    accent: "var(--success)",
    background: "rgba(59, 176, 108, 0.14)",
  },
  inspection: {
    label: "检测",
    accent: "var(--danger)",
    background: "rgba(184, 73, 63, 0.12)",
  },
  member: {
    label: "成员",
    accent: "var(--text-strong)",
    background: "rgba(16, 33, 23, 0.08)",
  },
  entry: {
    label: "入口",
    accent: "var(--muted-strong)",
    background: "rgba(111, 127, 115, 0.12)",
  },
};

const globalSearchMoneyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

function normalizeSearchKeyword(value: string) {
  return value.trim().toLowerCase();
}

function joinSearchMeta(values: Array<string | null | undefined | false>) {
  return values.filter(Boolean).join(" · ");
}

function matchesSearchKeyword(
  keyword: string,
  values: Array<string | null | undefined>,
) {
  if (!keyword) {
    return false;
  }

  return values.some((value) =>
    String(value ?? "").toLowerCase().includes(keyword),
  );
}

function formatSearchMoney(value?: string | null) {
  const amount = Number(value ?? 0);
  return globalSearchMoneyFormatter.format(
    Number.isFinite(amount) ? amount : 0,
  );
}

function quotationTypeLabel(type: QuotationSearchRecord["type"]) {
  switch (type) {
    case "AGRICULTURE":
      return "农业方案";
    case "GENERAL":
      return "通用报价";
    case "INDUSTRY":
      return "行业报价";
    case "SERVICE":
      return "服务报价";
    case "BREEDING":
      return "养殖报价";
    default:
      return "报价";
  }
}

function quotationStatusLabel(status?: string) {
  switch (status) {
    case "GENERATED":
      return "已生成";
    case "SENT":
      return "已发送";
    case "WON":
      return "已成交";
    case "LOST":
      return "已失效";
    default:
      return "草稿";
  }
}

function orderStatusLabel(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "已确认";
    case "IN_FULFILLMENT":
      return "履约中";
    case "COMPLETED":
      return "已完成";
    case "CANCELED":
      return "已取消";
    default:
      return "草稿";
  }
}

function shipmentStatusLabel(status: string) {
  switch (status) {
    case "DELIVERED":
      return "已签收";
    case "SHIPPED":
      return "已发货";
    case "PARTIAL":
      return "部分待发";
    case "NOT_REQUIRED":
      return "无需发货";
    case "PENDING":
    default:
      return "待发货";
  }
}

function buildEntrySearchItems(
  keyword: string,
  user: CurrentUser,
  entrySearchCatalog: SearchCatalogItem[],
) {
  return entrySearchCatalog
    .filter((item) => hasPermission(user, item.permissionCode))
    .filter((item) =>
      matchesSearchKeyword(keyword, [item.label, item.description, item.href]),
    )
    .slice(0, GLOBAL_SEARCH_RESULT_LIMIT)
    .map(
      (item): GlobalSearchItem => ({
        id: item.href,
        group: "entry",
        title: item.label,
        subtitle: item.description,
        hint: "工作台入口",
        href: item.href,
      }),
    );
}

async function loadCustomerSearchItems(keyword: string) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(GLOBAL_SEARCH_RESULT_LIMIT),
    keyword,
  });
  const response = await apiFetch<CustomerSearchResponse>(
    `/customers?${params.toString()}`,
  );

  return response.items.slice(0, GLOBAL_SEARCH_RESULT_LIMIT).map(
    (item): GlobalSearchItem => ({
      id: item.id,
      group: "customer",
      title: item.name,
      subtitle: joinSearchMeta([
        item.companyName || "个人客户",
        item.industryGroup?.name,
        customerStatusLabelMap[item.status] ?? "客户",
      ]),
      hint: joinSearchMeta([item.contactName, `负责人 ${item.owner.displayName}`]),
      href: `/customers/${item.id}`,
    }),
  );
}

async function loadQuotationSearchCatalog() {
  const response = await apiFetch<QuotationSearchRecord[]>("/quotations");
  return Array.isArray(response) ? response : [];
}

function filterQuotationSearchItems(
  records: QuotationSearchRecord[],
  keyword: string,
) {
  return records
    .filter((item) =>
      matchesSearchKeyword(keyword, [
        item.quotationNo,
        item.customer.name,
        item.creator.displayName,
        quotationTypeLabel(item.type),
      ]),
    )
    .slice(0, GLOBAL_SEARCH_RESULT_LIMIT)
    .map(
      (item): GlobalSearchItem => ({
        id: item.id,
        group: "quotation",
        title: item.quotationNo,
        subtitle: joinSearchMeta([
          item.customer.name,
          quotationTypeLabel(item.type),
          formatSearchMoney(item.totalAmount),
        ]),
        hint: joinSearchMeta([
          quotationStatusLabel(item.status),
          `创建人 ${item.creator.displayName}`,
        ]),
        href: `/quotations/${item.id}`,
      }),
    );
}

async function loadOrderSearchCatalog() {
  const response = await fetchOrders(
    new URLSearchParams({
      page: "1",
      pageSize: String(GLOBAL_ORDER_SEARCH_PAGE_SIZE),
    }),
  );

  return response.items;
}

function filterOrderSearchItems(records: OrderListItem[], keyword: string) {
  return records
    .filter((item) =>
      matchesSearchKeyword(keyword, [
        item.orderNo,
        item.customer.name,
        item.recipientName,
        item.sourceLabel,
      ]),
    )
    .slice(0, GLOBAL_SEARCH_RESULT_LIMIT)
    .map(
      (item): GlobalSearchItem => ({
        id: item.id,
        group: "order",
        title: item.orderNo,
        subtitle: joinSearchMeta([
          item.customer.name,
          orderStatusLabel(item.status),
          shipmentStatusLabel(item.shipmentStatus),
        ]),
        hint: joinSearchMeta([
          `应收 ${formatSearchMoney(item.receivableAmount)}`,
          item.recipientName,
        ]),
        href: `/orders/${item.id}`,
      }),
    );
}

async function loadInspectionSearchItems(keyword: string) {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(GLOBAL_SEARCH_RESULT_LIMIT),
    keyword,
  });
  const response = await apiFetch<InspectionListResponse>(
    `/inspections?${params.toString()}`,
  );

  return response.items.slice(0, GLOBAL_SEARCH_RESULT_LIMIT).map(
    (item): GlobalSearchItem => ({
      id: item.id,
      group: "inspection",
      title: item.inspectionNo,
      subtitle: joinSearchMeta([
        item.title,
        item.labName,
        inspectionStatusLabel(item.status),
      ]),
      hint: joinSearchMeta([
        item.customer?.name,
        item.product?.name,
      ]),
      href: `/inspections/${item.id}`,
    }),
  );
}

async function loadMemberSearchItems(keyword: string) {
  const params = new URLSearchParams({
    keyword,
  });
  const response = await apiFetch<MemberSearchResponse>(
    `/management/members?${params.toString()}`,
  );

  return response.items.slice(0, GLOBAL_SEARCH_RESULT_LIMIT).map(
    (item): GlobalSearchItem => ({
      id: item.id,
      group: "member",
      title: item.name,
      subtitle: joinSearchMeta([
        item.role.name,
        item.department || "未设置部门",
        item.status === "ACTIVE" ? "启用中" : "已停用",
      ]),
      hint: joinSearchMeta([item.loginAccount, item.title]),
      href: `/management/members?memberId=${item.id}`,
    }),
  );
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
      {icon === "work" ? (
        <>
          <rect x="4" y="7" width="16" height="12" rx="2.5" {...common} />
          <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" {...common} />
          <path d="M4 11.5h16" {...common} />
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
      {icon === "orders" ? (
        <>
          <path d="M7 5h10l3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" {...common} />
          <path d="M17 5v3h3" {...common} />
          <path d="M8.5 11h7M8.5 15h7M8.5 19H13" {...common} />
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
      {icon === "finance" ? (
        <>
          <circle cx="12" cy="12" r="8" {...common} />
          <path
            d="M12 7v10M9.25 9.5c.55-1 1.45-1.5 2.75-1.5 1.75 0 2.9.85 2.9 2.1 0 1.35-1.05 1.9-2.9 1.9s-2.9.55-2.9 1.9c0 1.25 1.15 2.1 2.9 2.1 1.3 0 2.2-.5 2.75-1.5"
            {...common}
          />
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

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4.5 7.25h15M4.5 12h15M4.5 16.75h15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M6.75 6.75 17.25 17.25M17.25 6.75 6.75 17.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function AppShell({
  children,
  collapsed,
  mobileChromeCondensed = false,
  mobileDock,
  mobileViewport = false,
  sidebar,
  topbar,
}: {
  children: ReactNode;
  collapsed?: boolean;
  mobileChromeCondensed?: boolean;
  mobileDock?: ReactNode;
  mobileViewport?: boolean;
  sidebar: ReactNode;
  topbar: ReactNode;
}) {
  return (
    <div
      className={cn(
        "app-shell",
        collapsed && "sidebar-collapsed",
        mobileViewport && "app-shell--mobile",
        mobileChromeCondensed && "app-shell--mobile-condensed",
      )}
    >
      {sidebar}
      <main className="main">
        {topbar}
        {children}
      </main>
      {mobileViewport ? mobileDock : null}
    </div>
  );
}

export function SidebarNav({
  brand,
  collapsed,
  mobileOpen = false,
  mobileViewport = false,
  notificationCount,
  onCloseMobileSidebar,
  onToggleCollapse,
  pathname,
  user,
  items,
}: {
  brand: SiteBrand;
  collapsed: boolean;
  mobileOpen?: boolean;
  mobileViewport?: boolean;
  notificationCount: number;
  onCloseMobileSidebar?: () => void;
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
  const canAccessSettings = availableItems.some((item) => item.key === "settings");
  const effectiveCollapsed = mobileViewport ? false : collapsed;

  const activeItemScore = useMemo(() => {
    return availableItems.reduce((best, item) => {
      const ownScore = getMatchScore(pathname, item.matchPrefixes);
      const childScore = item.children.reduce(
        (childBest, child) =>
          Math.max(childBest, getMatchScore(pathname, child.matchPrefixes)),
        0,
      );

      return Math.max(best, ownScore, childScore);
    }, 0);
  }, [availableItems, pathname]);

  function handleNavSelect() {
    if (mobileViewport) {
      onCloseMobileSidebar?.();
    }
  }

  return (
    <>
      {mobileViewport ? (
        <button
          aria-hidden={!mobileOpen}
          className={cn(
            "sidebar-mobile-backdrop",
            mobileOpen && "sidebar-mobile-backdrop--visible",
          )}
          onClick={onCloseMobileSidebar}
          tabIndex={mobileOpen ? 0 : -1}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "sidebar",
          effectiveCollapsed && "collapsed",
          mobileViewport && "sidebar--mobile-drawer",
          mobileOpen && "mobile-open",
        )}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand__eyebrow">{brand.sidebarEyebrow}</div>
          <div className="sidebar-brand__row">
            <div>
              <h1 className="brand-title">{brand.sidebarTitle}</h1>
              {!effectiveCollapsed ? (
                <p className="brand-subtitle">{brand.sidebarSubtitle}</p>
              ) : null}
            </div>
            {mobileViewport ? (
              <button
                aria-label="关闭导航"
                className="icon-button sidebar-toggle sidebar-toggle--close"
                onClick={onCloseMobileSidebar}
                type="button"
              >
                <CloseIcon />
              </button>
            ) : (
              <button
                className="icon-button sidebar-toggle"
                onClick={onToggleCollapse}
                type="button"
              >
                {collapsed ? "展开" : "折叠"}
              </button>
            )}
          </div>
        </div>

        <nav className="menu">
          {availableItems.map((item) => {
            const active =
              Math.max(
                getMatchScore(pathname, item.matchPrefixes),
                item.children.reduce(
                  (best, child) =>
                    Math.max(best, getMatchScore(pathname, child.matchPrefixes)),
                  0,
                ),
              ) === activeItemScore && activeItemScore > 0;
            const showChildren =
              active && item.children.length > 0 && !effectiveCollapsed;

            return (
              <div className="menu-group" key={item.key}>
                <Link
                  className={cn("menu-item", active && "active")}
                  href={item.href}
                  onClick={handleNavSelect}
                  title={effectiveCollapsed ? item.label : undefined}
                >
                  <span className="menu-item__icon">
                    <WorkspaceIcon icon={item.icon} />
                  </span>
                  {!effectiveCollapsed ? (
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
                      const activeChild =
                        getMatchScore(pathname, child.matchPrefixes) > 0;

                      return (
                        <Link
                          className={cn("menu-child", activeChild && "active")}
                          href={child.href}
                          key={`${item.key}-${child.href}`}
                          onClick={handleNavSelect}
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
          {!effectiveCollapsed ? (
            <>
              {canAccessSettings ? (
                <div className="sidebar-footer__links">
                  <Link href="/settings" onClick={handleNavSelect}>
                    设置
                  </Link>
                  <Link href="/settings#help" onClick={handleNavSelect}>
                    帮助
                  </Link>
                </div>
              ) : null}
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
              {canAccessSettings ? (
                <Link className="menu-item__icon" href="/settings" title="设置">
                  <WorkspaceIcon icon="settings" />
                </Link>
              ) : null}
              {canAccessSettings ? (
                <Link
                  className="menu-item__icon"
                  href="/settings#help"
                  title="帮助"
                >
                  <WorkspaceIcon icon="help" />
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export function QuickCreateMenu({
  dock = false,
  groups = quickCreateGroups,
  mobileViewport = false,
  onOpenChange,
  user,
}: {
  dock?: boolean;
  groups?: QuickCreateGroup[];
  mobileViewport?: boolean;
  onOpenChange?: (open: boolean) => void;
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
        onOpenChange?.(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onOpenChange]);

  if (!visibleGroups.length) {
    return null;
  }

  return (
    <>
      {mobileViewport && open ? (
        <button
          aria-label="关闭快捷创建"
          className="quick-create__backdrop"
          onClick={() => {
            setOpen(false);
            onOpenChange?.(false);
          }}
          type="button"
        />
      ) : null}

      <div
        className={cn(
          "quick-create",
          mobileViewport && "quick-create--mobile",
          dock && "quick-create--dock",
        )}
        ref={ref}
      >
        <button
          className={cn(
            "button inline quick-create__trigger",
            mobileViewport && "quick-create__trigger--mobile",
          )}
          onClick={() => {
            const next = !open;
            setOpen(next);
            onOpenChange?.(next);
          }}
          type="button"
        >
          <WorkspaceIcon icon="plus" />
          {!mobileViewport ? <span>快捷创建</span> : null}
        </button>

        {open ? (
          <div
            className={cn(
              "quick-create__panel",
              mobileViewport && "quick-create__panel--mobile",
            )}
          >
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
                        onClick={() => {
                          setOpen(false);
                          onOpenChange?.(false);
                        }}
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
                          onOpenChange?.(false);
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
  entrySearchCatalog = searchCatalog,
  mobileChromeCondensed = false,
  mobileViewport = false,
  notificationsOpen,
  notificationCount,
  onLogout,
  onToggleMobileSidebar,
  onToggleNotifications,
  recordDataMode,
  pageMeta,
  pathname,
  quickCreateGroups: quickCreateMenuGroups = quickCreateGroups,
  searchDescription,
  searchEmptyState,
  searchFooter,
  searchModules,
  searchNoResults,
  searchPlaceholder,
  user,
}: {
  entrySearchCatalog?: SearchCatalogItem[];
  mobileChromeCondensed?: boolean;
  mobileViewport?: boolean;
  notificationsOpen: boolean;
  notificationCount: number;
  onLogout: () => void;
  onToggleMobileSidebar?: () => void;
  onToggleNotifications: () => void;
  recordDataMode: RecordDataMode;
  pageMeta: PageMeta;
  pathname: string;
  quickCreateGroups?: QuickCreateGroup[];
  searchDescription?: string;
  searchEmptyState?: string;
  searchFooter?: string;
  searchModules?: NavigationSearchModules;
  searchNoResults?: string;
  searchPlaceholder?: string;
  user: CurrentUser;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchCacheRef = useRef<{
    orders: OrderListItem[] | null;
    quotations: QuotationSearchRecord[] | null;
  }>({
    orders: null,
    quotations: null,
  });
  const accountRef = useRef<HTMLDivElement | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchGroups, setSearchGroups] = useState<GlobalSearchGroup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const deferredSearchText = useDeferredValue(searchText);
  const deferredKeyword = normalizeSearchKeyword(deferredSearchText);
  const resolvedSearchModules = searchModules ?? {
    customers: true,
    quotations: true,
    orders: true,
    inspections: true,
    members: true,
  };

  const canSearchCustomers =
    resolvedSearchModules.customers &&
    hasPermission(user, "page.customers.list");
  const canSearchQuotations =
    resolvedSearchModules.quotations &&
    hasPermission(user, "menu.quotations");
  const canSearchOrders =
    resolvedSearchModules.orders && hasPermission(user, "page.orders.list");
  const canSearchInspections =
    resolvedSearchModules.inspections &&
    hasPermission(user, "page.inspections.list");
  const canSearchMembers =
    resolvedSearchModules.members &&
    hasPermission(user, "page.management.members");
  const canAccessSettings =
    hasPermission(user, "menu.settings") &&
    entrySearchCatalog.some((item) => item.href === "/settings");
  const canAccessManagement =
    hasPermission(user, "menu.management") &&
    entrySearchCatalog.some((item) => item.href === "/management");

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

  useEffect(() => {
    if (!mobileViewport || !searchOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mobileViewport, searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchLoading(false);
      setSearchError("");
      setSearchGroups([]);
      return;
    }

    if (!deferredKeyword) {
      setSearchLoading(false);
      setSearchError("");
      setSearchGroups([]);
      return;
    }

    let cancelled = false;
    const entryItems = buildEntrySearchItems(
      deferredKeyword,
      user,
      entrySearchCatalog,
    );

    setSearchGroups(
      entryItems.length ? [{ group: "entry", items: entryItems }] : [],
    );
    setSearchLoading(true);
    setSearchError("");

    async function loadSearchResults() {
      const tasks: Array<Promise<[GlobalSearchGroupKey, GlobalSearchItem[]]>> = [];

      if (canSearchCustomers) {
        tasks.push(
          loadCustomerSearchItems(deferredKeyword).then((items) => [
            "customer",
            items,
          ]),
        );
      }

      if (canSearchQuotations) {
        tasks.push(
          (async () => {
            if (!searchCacheRef.current.quotations) {
              searchCacheRef.current.quotations = await loadQuotationSearchCatalog();
            }

            return [
              "quotation",
              filterQuotationSearchItems(
                searchCacheRef.current.quotations,
                deferredKeyword,
              ),
            ] satisfies [GlobalSearchGroupKey, GlobalSearchItem[]];
          })(),
        );
      }

      if (canSearchOrders) {
        tasks.push(
          (async () => {
            if (!searchCacheRef.current.orders) {
              searchCacheRef.current.orders = await loadOrderSearchCatalog();
            }

            return [
              "order",
              filterOrderSearchItems(searchCacheRef.current.orders, deferredKeyword),
            ] satisfies [GlobalSearchGroupKey, GlobalSearchItem[]];
          })(),
        );
      }

      if (canSearchInspections) {
        tasks.push(
          loadInspectionSearchItems(deferredKeyword).then((items) => [
            "inspection",
            items,
          ]),
        );
      }

      if (canSearchMembers) {
        tasks.push(
          loadMemberSearchItems(deferredKeyword).then((items) => [
            "member",
            items,
          ]),
        );
      }

      const settled = await Promise.allSettled(tasks);
      if (cancelled) {
        return;
      }

      const groupsMap = new Map<GlobalSearchGroupKey, GlobalSearchItem[]>();

      if (entryItems.length) {
        groupsMap.set("entry", entryItems);
      }

      let hadFailure = false;

      settled.forEach((result) => {
        if (result.status === "fulfilled") {
          const [group, items] = result.value;
          if (items.length) {
            groupsMap.set(group, items);
          }
          return;
        }

        hadFailure = true;
      });

      setSearchGroups(
        globalSearchGroupOrder
          .map((group) => ({
            group,
            items: groupsMap.get(group) ?? [],
          }))
          .filter((entry) => entry.items.length > 0),
      );
      setSearchError(
        hadFailure ? "部分搜索结果暂时未能加载，先展示可用内容。" : "",
      );
      setSearchLoading(false);
    }

    void loadSearchResults();

    return () => {
      cancelled = true;
    };
  }, [
    canSearchCustomers,
    canSearchInspections,
    canSearchMembers,
    canSearchOrders,
    canSearchQuotations,
    deferredKeyword,
    entrySearchCatalog,
    searchOpen,
    user,
  ]);

  const showPageInfo = pageMeta.showPageInfo !== false;
  const showMobileDataMode = pageMeta.showMobileDataMode !== false;
  const trimmedSearchText = searchText.trim();
  const hasSearchKeyword = trimmedSearchText.length > 0;
  const totalSearchResults = searchGroups.reduce(
    (sum, entry) => sum + entry.items.length,
    0,
  );
  const firstSearchResult = searchGroups[0]?.items[0] ?? null;
  const pageTitle = pageMeta.title || "工作台";
  const pageSubtitle = pageMeta.subtitle || "";

  const searchField = (
    <div
      className={cn(
        "command-search__field",
        mobileViewport && "command-search__field--mobile",
      )}
    >
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
          if (event.key === "Escape") {
            handleCloseSearch();
            searchInputRef.current?.blur();
            return;
          }

          if (event.key === "Enter" && firstSearchResult) {
            handleSelectSearchResult(firstSearchResult);
          }
        }}
        placeholder={
          searchPlaceholder ?? "搜索客户、报价、订单、检测、成员或入口"
        }
        ref={searchInputRef}
        value={searchText}
      />
      {searchText ? (
        <button
          aria-label="清空搜索词"
          className="command-search__clear"
          onClick={() => {
            setSearchText("");
            setSearchOpen(true);
            searchInputRef.current?.focus();
          }}
          type="button"
        >
          ×
        </button>
      ) : null}
    </div>
  );

  function handleSelectSearchResult(item: GlobalSearchItem) {
    router.push(item.href);
    setSearchOpen(false);
    setSearchText("");
    setSearchError("");
  }

  function handleCloseSearch() {
    setSearchOpen(false);
  }

  return (
    <div
      className={cn(
        "topbar-stack",
        mobileViewport && "topbar-stack--mobile",
        mobileChromeCondensed && "topbar-stack--mobile-condensed",
      )}
      ref={searchRef}
    >
      <header
        className={cn(
          "topbar",
          !showPageInfo && !mobileViewport && "compact",
          mobileViewport && "topbar--mobile",
          mobileChromeCondensed && "topbar--mobile-condensed",
        )}
      >
        {mobileViewport ? (
          <div
            className={cn(
              "topbar__mobile-rail",
              !showPageInfo && "topbar__mobile-rail--compact",
            )}
          >
            <button
              aria-label="打开导航"
              className="icon-button topbar__menu-trigger"
              onClick={onToggleMobileSidebar}
              type="button"
            >
              <MenuIcon />
            </button>

            {showPageInfo ? (
              <div className="topbar__page topbar__page--mobile">
                <h1 className="topbar__page-title">{pageTitle}</h1>
                {pageSubtitle ? (
                  <p className="topbar__page-subtitle">{pageSubtitle}</p>
                ) : null}
              </div>
            ) : null}

            <div className="topbar__actions topbar__actions--mobile">
              <button
                aria-label="打开搜索"
                className="icon-button topbar__search-trigger"
                onClick={() => {
                  setSearchOpen(true);
                  setAccountOpen(false);
                }}
                type="button"
              >
                <WorkspaceIcon icon="search" />
              </button>

              <QuickCreateMenu
                groups={quickCreateMenuGroups}
                mobileViewport={mobileViewport}
                onOpenChange={(open) => {
                  if (open) {
                    setSearchOpen(false);
                    setAccountOpen(false);
                  }
                }}
                user={user}
              />

              <button
                aria-label={notificationsOpen ? "关闭通知抽屉" : "打开通知抽屉"}
                className="bell-button"
                onClick={() => {
                  setSearchOpen(false);
                  setAccountOpen(false);
                  onToggleNotifications();
                }}
                title={notificationsOpen ? "关闭通知抽屉" : "打开通知抽屉"}
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
                  onClick={() => {
                    setSearchOpen(false);
                    setAccountOpen((current) => !current);
                  }}
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
                    {canAccessSettings ? (
                      <Link className="account-menu__item" href="/settings">
                        我的账号 / 系统设置
                      </Link>
                    ) : null}
                    {canAccessManagement ? (
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
          </div>
        ) : (
          <>
            {showPageInfo ? (
              <div className="topbar__page">
                <h1 className="topbar__page-title">{pageTitle}</h1>
                <p className="topbar__page-subtitle">{pageSubtitle}</p>
              </div>
            ) : null}

            <div className="topbar__actions">
              {hasPermission(user, "menu.management") ? (
                <Link
                  className={`data-mode-badge ${recordDataMode.scope === "TEST" ? "test" : "real"}`}
                  href="/management/test-data"
                >
                  <strong>{recordDataMode.scope === "TEST" ? "测试数据" : "正式数据"}</strong>
                  <span>
                    {recordDataMode.scope === "TEST"
                      ? (recordDataMode.testBatchName ?? "未命名批次")
                      : "员工可见"}
                  </span>
                </Link>
              ) : null}

              <div className="command-search">{searchField}</div>

              <QuickCreateMenu
                groups={quickCreateMenuGroups}
                onOpenChange={(open) => {
                  if (open) {
                    setSearchOpen(false);
                    setAccountOpen(false);
                  }
                }}
                user={user}
              />

              <button
                aria-label={notificationsOpen ? "关闭通知抽屉" : "打开通知抽屉"}
                className="bell-button"
                onClick={() => {
                  setSearchOpen(false);
                  setAccountOpen(false);
                  onToggleNotifications();
                }}
                title={notificationsOpen ? "关闭通知抽屉" : "打开通知抽屉"}
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
                  onClick={() => {
                    setSearchOpen(false);
                    setAccountOpen((current) => !current);
                  }}
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
                    {canAccessSettings ? (
                      <Link className="account-menu__item" href="/settings">
                        我的账号 / 系统设置
                      </Link>
                    ) : null}
                    {canAccessManagement ? (
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
          </>
        )}
      </header>

      {mobileViewport &&
      showMobileDataMode &&
      hasPermission(user, "menu.management") &&
      !mobileChromeCondensed ? (
        <Link
          className={`data-mode-badge data-mode-badge--mobile ${recordDataMode.scope === "TEST" ? "test" : "real"}`}
          href="/management/test-data"
        >
          <strong>{recordDataMode.scope === "TEST" ? "测试数据" : "正式数据"}</strong>
          <span>
            {recordDataMode.scope === "TEST"
              ? (recordDataMode.testBatchName ?? "未命名批次")
              : "员工可见"}
          </span>
        </Link>
      ) : null}

      {searchOpen ? (
        <section
          className={cn(
            "global-search-layer",
            mobileViewport && "global-search-layer--mobile",
          )}
        >
          {mobileViewport ? (
            <div className="global-search-layer__mobile-search">
              {searchField}
            </div>
          ) : null}

          <div className="global-search-layer__header">
            <div className="global-search-layer__copy">
              <strong>全局搜索</strong>
              <p>
                {searchDescription ??
                  "业务对象优先，结果进入独立搜索层，正文会自然后移，不再直接被压住。"}
              </p>
            </div>

            <div className="global-search-layer__meta">
              <span>
                关键词：{hasSearchKeyword ? trimmedSearchText : "未输入"}
              </span>
              <span>·</span>
              <span>
                {searchLoading ? "正在整理结果" : `${totalSearchResults} 条结果`}
              </span>
              <button
                className="button ghost inline"
                onClick={handleCloseSearch}
                type="button"
              >
                关闭
              </button>
            </div>
          </div>

          {!hasSearchKeyword ? (
            <div className="global-search-layer__placeholder">
              {searchEmptyState ??
                "输入客户名称、报价单号、订单号、检测单号、成员姓名，或直接搜索工作台入口。"}
            </div>
          ) : null}

          {searchError ? (
            <div className="global-search-layer__status">{searchError}</div>
          ) : null}

          {hasSearchKeyword && !searchGroups.length && searchLoading ? (
            <div className="global-search-layer__status">
              正在整理这次搜索的分组结果...
            </div>
          ) : null}

          {searchGroups.length ? (
            <div className="global-search-layer__groups">
              {searchGroups.map((entry, index) => (
                <section
                  className="global-search-layer__section"
                  key={entry.group}
                >
                  <div className="global-search-layer__section-head">
                    <strong>{globalSearchGroupMeta[entry.group].label}</strong>
                    <span>{entry.items.length} 条</span>
                  </div>

                  <div className="global-search-layer__items">
                    {entry.items.map((item) => (
                      <button
                        className="global-search-layer__item"
                        key={`${item.group}-${item.id}`}
                        onClick={() => handleSelectSearchResult(item)}
                        type="button"
                      >
                        <div className="global-search-layer__item-body">
                          <strong>{item.title}</strong>
                          <span>{item.subtitle}</span>
                          <small>{item.hint}</small>
                        </div>
                        <span
                          className="global-search-layer__tag"
                          style={{
                            background:
                              globalSearchGroupMeta[item.group].background,
                            color: globalSearchGroupMeta[item.group].accent,
                          }}
                        >
                          {globalSearchGroupMeta[item.group].label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {index < searchGroups.length - 1 ? (
                    <div className="global-search-layer__divider" />
                  ) : null}
                </section>
              ))}
            </div>
          ) : null}

          {hasSearchKeyword && !searchLoading && !searchGroups.length ? (
            <div className="global-search-layer__placeholder">
              {searchNoResults ??
                "没有找到匹配的业务对象或入口，可以换客户名、单号、成员账号再试一次。"}
            </div>
          ) : null}

          <div className="global-search-layer__footer">
            {searchFooter ??
              "Enter 打开首结果 · Esc 关闭搜索层 · 第一版优先顺序：客户、报价、订单、检测、成员、入口"}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function MobileDockNav({
  items,
  pathname,
  quickCreateGroups,
  user,
}: {
  items: MobileDockItem[];
  pathname: string;
  quickCreateGroups?: QuickCreateGroup[];
  user: CurrentUser;
}) {
  if (!items.length) {
    return null;
  }

  const leadingItems = items.slice(0, 2);
  const trailingItems = items.slice(2);

  function renderDockItem(item: MobileDockItem) {
    const active = getMatchScore(pathname, item.matchPrefixes) > 0;

    if (item.href) {
      return (
        <Link
          className={cn("mobile-dock__item", active && "active")}
          href={item.href}
          key={item.key}
        >
          <span className="mobile-dock__icon">
            <WorkspaceIcon icon={item.icon} />
            {item.badgeCount ? (
              <span className="mobile-dock__badge">
                {item.badgeCount > 99 ? "99+" : item.badgeCount}
              </span>
            ) : null}
          </span>
          <span className="mobile-dock__label">{item.label}</span>
        </Link>
      );
    }

    return (
      <button
        className={cn("mobile-dock__item", active && "active")}
        key={item.key}
        onClick={item.onClick}
        type="button"
      >
        <span className="mobile-dock__icon">
          <WorkspaceIcon icon={item.icon} />
          {item.badgeCount ? (
            <span className="mobile-dock__badge">
              {item.badgeCount > 99 ? "99+" : item.badgeCount}
            </span>
          ) : null}
        </span>
        <span className="mobile-dock__label">{item.label}</span>
      </button>
    );
  }

  return (
    <nav className="mobile-dock" aria-label="移动导航">
      {leadingItems.map(renderDockItem)}
      {quickCreateGroups?.length ? (
        <div className="mobile-dock__create">
          <QuickCreateMenu
            dock
            groups={quickCreateGroups}
            mobileViewport
            user={user}
          />
        </div>
      ) : null}
      {trailingItems.map(renderDockItem)}
    </nav>
  );
}
