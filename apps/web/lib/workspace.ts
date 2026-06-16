"use client";

import type { SiteBrandKey } from "./site-brand";

export type WorkspaceNotification = {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  createdAtLabel: string;
  readAt: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
};

export const WORKSPACE_ITEMS_CHANGED_EVENT = "huigui:workspace-items-changed";
const WORKSPACE_ITEMS_STORAGE_KEY = "huigui-workspace-items";

export type WorkspacePriority = "high" | "medium" | "low";
export type WorkspaceItemStatus = "pending" | "done" | "snoozed";
export type WorkspaceItemKind =
  | "reminder"
  | "schedule"
  | "todo"
  | "member"
  | "role"
  | "approval_rule";

export type LocalWorkspaceItem = {
  id: string;
  title: string;
  kind: WorkspaceItemKind;
  summary: string;
  dueAt?: string;
  relatedId?: string;
  relatedLabel?: string;
  relatedHref?: string;
  relatedType?: "customer" | "quotation" | "contract" | "solution" | "internal";
  assignee?: string;
  priority: WorkspacePriority;
  status: WorkspaceItemStatus;
  createdAt: string;
  snoozedUntil?: string;
};

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "¥0";
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) {
    return "¥0";
  }

  return `¥${amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateLabel(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  }).format(new Date(value));
}

export function formatDayLabel(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

export function formatTimeLabel(value: string | Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function notificationTypeLabel(
  type: string,
  brandKey: SiteBrandKey = "public",
) {
  if (brandKey === "management") {
    switch (type) {
      case "FOLLOW_UP_REMINDER":
        return "跟进提醒";
      case "TASK_REMINDER":
        return "计划提醒";
      case "CONTRACT_EXPIRY_REMINDER":
        return "到期提醒";
      case "TASK_ASSIGNED":
      case "TASK_REASSIGNED":
        return "计划指派";
      case "APPROVAL_REQUEST_CREATED":
      case "CUSTOMER_APPROVAL_REQUEST_CREATED":
        return "待办审批";
      case "APPROVAL_REQUEST_DECIDED":
      case "CUSTOMER_APPROVAL_REQUEST_DECIDED":
        return "审批结果";
      case "WEEKLY_REPORT_SUBMITTED":
        return "周报待审";
      case "WEEKLY_REPORT_REVIEWED":
        return "周报审阅";
      case "MONTHLY_GOAL_SUBMITTED":
        return "月目标";
      case "QUOTATION_REMINDER":
        return "系统提醒";
      case "DISCUSSION_COMMENT":
        return "协作留言";
      default:
        return "系统通知";
    }
  }

  switch (type) {
    case "FOLLOW_UP_REMINDER":
      return "客户跟进提醒";
    case "TASK_REMINDER":
      return "工作计划提醒";
    case "CONTRACT_EXPIRY_REMINDER":
      return "合同到期";
    case "TASK_ASSIGNED":
    case "TASK_REASSIGNED":
      return "工作计划指派";
    case "APPROVAL_REQUEST_CREATED":
    case "CUSTOMER_APPROVAL_REQUEST_CREATED":
      return "待审批";
    case "APPROVAL_REQUEST_DECIDED":
    case "CUSTOMER_APPROVAL_REQUEST_DECIDED":
      return "审批结果";
    case "WEEKLY_REPORT_SUBMITTED":
      return "周报待审阅";
    case "WEEKLY_REPORT_REVIEWED":
      return "周报审阅结果";
    case "MONTHLY_GOAL_SUBMITTED":
      return "月目标提交";
    case "QUOTATION_REMINDER":
      return "报价通知";
    case "DISCUSSION_COMMENT":
      return "协作留言";
    default:
      return "系统通知";
  }
}

export function buildNotificationHref(notification: {
  relatedType?: string | null;
  relatedId?: string | null;
}) {
  switch (notification.relatedType) {
    case "TASK":
      return notification.relatedId
        ? `/schedule?taskId=${notification.relatedId}#discussion`
        : "/schedule";
    case "WEEKLY_REPORT":
      return notification.relatedId
        ? `/work-management/weekly-reports?reportId=${notification.relatedId}#discussion`
        : "/work-management/weekly-reports";
    case "MONTHLY_GOAL":
      return notification.relatedId
        ? `/work-management/monthly-goals?goalId=${notification.relatedId}#discussion`
        : "/work-management/monthly-goals";
    case "QUOTATION":
      return notification.relatedId
        ? `/quotations/${notification.relatedId}`
        : "/quotations";
    case "CUSTOMER":
      return notification.relatedId
        ? `/customers/${notification.relatedId}`
        : "/customers";
    default:
      return "/notifications";
  }
}

export function workspacePriorityLabel(priority: WorkspacePriority) {
  switch (priority) {
    case "high":
      return "高优先级";
    case "medium":
      return "中优先级";
    default:
      return "普通";
  }
}

export function workspacePriorityTone(priority: WorkspacePriority) {
  switch (priority) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

export function workspaceKindLabel(kind: WorkspaceItemKind) {
  switch (kind) {
    case "reminder":
      return "提醒";
    case "schedule":
      return "临时日程";
    case "todo":
      return "待办";
    case "member":
      return "成员";
    case "role":
      return "角色";
    case "approval_rule":
      return "审批规则";
    default:
      return "协作项";
  }
}

export function normalizeNotifications(
  items: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: string;
    readAt: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
  }>,
) {
  return items.map((item) => ({
    ...item,
    createdAtLabel: formatDateLabel(item.createdAt),
  }));
}

function canUseWorkspaceStorage() {
  return typeof window !== "undefined";
}

export function listLocalWorkspaceItems() {
  if (!canUseWorkspaceStorage()) {
    return [] as LocalWorkspaceItem[];
  }

  const raw = window.localStorage.getItem(WORKSPACE_ITEMS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as LocalWorkspaceItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

function saveWorkspaceItems(items: LocalWorkspaceItem[]) {
  if (!canUseWorkspaceStorage()) {
    return;
  }

  window.localStorage.setItem(
    WORKSPACE_ITEMS_STORAGE_KEY,
    JSON.stringify(items),
  );
  window.dispatchEvent(new Event(WORKSPACE_ITEMS_CHANGED_EVENT));
}

export function createLocalWorkspaceItem(
  input: Omit<LocalWorkspaceItem, "createdAt" | "id" | "status">,
) {
  const item: LocalWorkspaceItem = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  const nextItems = [item, ...listLocalWorkspaceItems()].slice(0, 80);
  saveWorkspaceItems(nextItems);
  return item;
}

export function updateLocalWorkspaceItemStatus(
  id: string,
  status: WorkspaceItemStatus,
  patch?: Partial<Pick<LocalWorkspaceItem, "dueAt" | "snoozedUntil">>,
) {
  const nextItems = listLocalWorkspaceItems().map((item) =>
    item.id === id
      ? {
          ...item,
          ...patch,
          status,
        }
      : item,
  );

  saveWorkspaceItems(nextItems);
}

export function removeLocalWorkspaceItem(id: string) {
  const nextItems = listLocalWorkspaceItems().filter((item) => item.id !== id);
  saveWorkspaceItems(nextItems);
}

export function filterVisibleWorkspaceItems(items: LocalWorkspaceItem[]) {
  const now = Date.now();

  return items.filter((item) => {
    if (item.status === "done") {
      return false;
    }

    if (item.status === "snoozed" && item.snoozedUntil) {
      return new Date(item.snoozedUntil).getTime() <= now;
    }

    return true;
  });
}

export function bucketDueLabel(value?: string) {
  if (!value) {
    return "待安排";
  }

  const due = new Date(value);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const diffDays = Math.floor((due.getTime() - startOfToday) / 86400000);

  if (diffDays <= 0) {
    return "今日到期";
  }

  if (diffDays <= 3) {
    return "3 天内";
  }

  if (diffDays <= 7) {
    return "7 天内";
  }

  return "后续事项";
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function getNotificationCategoryMeta(
  brandKey: SiteBrandKey = "public",
) {
  return [
    {
      key: "today",
      label: "今日提醒",
      description: "今天新增或需要优先处理的提醒。",
      emptyText: "今天暂时没有新增提醒。",
      match: (item: WorkspaceNotification) => isToday(item.createdAt),
    },
    {
      key: "expiry",
      label: brandKey === "management" ? "时间提醒" : "即将到期",
      description:
        brandKey === "management"
          ? "临近时间节点、到期日与其他时间敏感事项。"
          : "合同、有效期与时间敏感事项。",
      emptyText:
        brandKey === "management"
          ? "当前没有临近时间节点的提醒。"
          : "当前没有临近到期事项。",
      match: (item: WorkspaceNotification) =>
        item.type === "CONTRACT_EXPIRY_REMINDER" ||
        /到期|有效期/i.test(`${item.title} ${item.content}`),
    },
    {
      key: "followup",
      label: "跟进提醒",
      description:
        brandKey === "management"
          ? "需要继续推进的协作动作与后续安排。"
          : "客户下一步动作与回访提醒。",
      emptyText:
        brandKey === "management"
          ? "当前没有待继续推进的提醒。"
          : "当前没有待跟进提醒。",
      match: (item: WorkspaceNotification) => item.type === "FOLLOW_UP_REMINDER",
    },
    {
      key: "special",
      label: brandKey === "management" ? "系统提醒" : "报价通知",
      description:
        brandKey === "management"
          ? "系统同步、留言互动与其他需要额外留意的动态。"
          : "与报价、方案确认相关的动态。",
      emptyText:
        brandKey === "management"
          ? "当前没有额外系统提醒。"
          : "当前没有报价相关提醒。",
      match: (item: WorkspaceNotification) =>
        brandKey === "management"
          ? item.type === "QUOTATION_REMINDER" || item.type === "DISCUSSION_COMMENT"
          : item.type === "QUOTATION_REMINDER" ||
            /报价|方案/i.test(`${item.title} ${item.content}`),
    },
  ] as const;
}

export function buildMonthMatrix(baseDate = new Date()) {
  const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startOffset);
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const endOffset = (7 - ((lastDay.getDay() + 6) % 7) - 1 + 7) % 7;
  const totalDays = startOffset + lastDay.getDate() + endOffset;
  const cellCount = totalDays <= 35 ? 35 : 42;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      iso: date.toISOString(),
      day: date.getDate(),
      currentMonth: date.getMonth() === baseDate.getMonth(),
      isToday: isToday(date.toISOString()),
    };
  });
}
