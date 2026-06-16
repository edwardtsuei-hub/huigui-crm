"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FormEvent,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DayWorkbenchPanel,
  type DayWorkbenchFilter,
} from "../../../components/schedule/DayWorkbenchPanel";
import { ScheduleEventDigestCard } from "../../../components/schedule/ScheduleEventDigestCard";
import { ScheduleConflictModal } from "../../../components/schedule/ScheduleConflictModal";
import { ScheduleImportPlanModal } from "../../../components/schedule/ScheduleImportPlanModal";
import { ScheduleMonthGrid } from "../../../components/schedule/ScheduleMonthGrid";
import { ScheduleToolbar } from "../../../components/schedule/ScheduleToolbar";
import { ScheduleWeekView } from "../../../components/schedule/ScheduleWeekView";
import type {
  CalendarEvent,
  EventVisualTone,
  ScheduleDisplayCategory,
  ScheduleDensityMode,
  ScheduleDisplayThemeKey,
  ScheduleImportCandidate,
  ScheduleMemberView,
  ScheduleMonthCellModel,
  ScheduleSourceFilter,
  ScheduleStatusFilter,
  ScheduleViewMode,
} from "../../../components/schedule/types";
import { DiscussionPanel } from "../../../components/discussions/DiscussionPanel";
import { ManagementDrawer } from "../../../components/management/ManagementDrawer";
import { useSiteBrandKey } from "../../../components/system/SiteBrandContext";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "../../../components/system/SearchableSelect";
import { EmptyState, StatusBadge } from "../../../components/system/primitives";
import {
  apiFetch,
  emitNotificationsChanged,
  getCurrentUser,
  hasPermission,
  type CurrentUser,
} from "../../../lib/api";
import {
  WORKSPACE_ITEMS_CHANGED_EVENT,
  buildNotificationHref,
  buildMonthMatrix,
  filterVisibleWorkspaceItems,
  formatDateLabel,
  formatTimeLabel,
  listLocalWorkspaceItems,
  normalizeNotifications,
  notificationTypeLabel,
  removeLocalWorkspaceItem,
  updateLocalWorkspaceItemStatus,
  workspaceKindLabel,
  type LocalWorkspaceItem,
  type WorkspaceNotification,
} from "../../../lib/workspace";
import {
  getChinaCalendarInfo,
  type ChinaCalendarInfo,
} from "../../../lib/china-holidays";
import {
  buildScheduleRoute,
  normalizeScheduleMember,
  normalizeScheduleSource,
  normalizeScheduleStatus,
  normalizeScheduleView,
} from "../../../lib/schedule";
import type { SiteBrandKey } from "../../../lib/site-brand";
import type {
  MonthlyGoalDetail,
  MonthlyGoalSummary,
  PendingMonthlyGoalSummary,
  PendingWeeklyReportSummary,
  WeeklyReportDetail,
  WeeklyReportSummary,
} from "../../../lib/work-management";

type UserOption = {
  id: string;
  name: string;
  displayName: string;
  department?: string | null;
  title?: string | null;
};

type CustomerOption = {
  id: string;
  name: string;
  companyName?: string | null;
};

type QuotationOption = {
  id: string;
  quotationNo: string;
  type: string;
  totalAmount?: string;
  agriculturePlan?: {
    id: string;
    planName: string;
    quotationId: string;
  } | null;
  customer: {
    id: string;
    name: string;
  };
};

type AgriculturePlanOption = SearchableSelectOption & {
  quotationId: string;
  customer: {
    id: string;
    name: string;
  };
};

type TaskRecord = {
  id: string;
  title: string;
  type: string;
  status: string;
  startAt: string;
  createdAt: string;
  updatedAt: string;
  endAt?: string | null;
  reminderAt?: string | null;
  content?: string | null;
  customer?: { id: string; name: string } | null;
  quotation?: {
    id: string;
    quotationNo: string;
    customer?: { id: string; name: string } | null;
  } | null;
  agriculturePlan?: {
    id: string;
    quotationId: string;
    planName: string;
    customer?: { id: string; name: string } | null;
  } | null;
  assignee?: { id: string; name: string; displayName: string } | null;
  creator?: { id: string; name: string; displayName: string } | null;
};

type TaskListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: TaskRecord[];
};

type TaskSubmitPayload = {
  title: string;
  type: string;
  status: string;
  assigneeUserId: string;
  customerId: string;
  quotationId: string;
  agriculturePlanId: string;
  startAt: string;
  endAt?: string;
  reminderAt?: string;
  content: string;
};

type NotificationListResponse = {
  items: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: string;
    readAt: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
  }>;
};

async function fetchAllTaskPages(params: URLSearchParams) {
  const pageSize = 100;
  const firstParams = new URLSearchParams(params);
  firstParams.set("page", "1");
  firstParams.set("pageSize", String(pageSize));

  const firstPage = await apiFetch<TaskListResponse>(
    `/tasks?${firstParams.toString()}`,
  );
  if (firstPage.total <= firstPage.items.length) {
    return firstPage.items;
  }

  const totalPages = Math.ceil(firstPage.total / pageSize);
  const restPages = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => {
      const nextParams = new URLSearchParams(params);
      nextParams.set("page", String(index + 2));
      nextParams.set("pageSize", String(pageSize));
      return apiFetch<TaskListResponse>(`/tasks?${nextParams.toString()}`);
    }),
  );

  return [firstPage, ...restPages].flatMap((page) => page.items);
}

type WeeklyReportListResponse = {
  pendingWeeklyReport: PendingWeeklyReportSummary;
  items: WeeklyReportSummary[];
  teamItems: WeeklyReportSummary[];
};

type MonthlyGoalListResponse = {
  pendingMonthlyGoal: PendingMonthlyGoalSummary;
  items: MonthlyGoalSummary[];
  teamItems: MonthlyGoalSummary[];
};

type TaskFormState = {
  title: string;
  type: string;
  status: string;
  priority: "NORMAL" | "IMPORTANT" | "URGENT";
  assigneeUserId: string;
  visibility: "PRIVATE" | "TEAM" | "ALL";
  customerId: string;
  quotationId: string;
  agriculturePlanId: string;
  solutionLabel: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  hasReminder: boolean;
  reminderAt: string;
  repeatEnabled: boolean;
  repeatRule: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  sourceModule: string;
  content: string;
  summary: string;
  nextAction: string;
};

type NotificationEvent = WorkspaceNotification & {
  relatedType?: string | null;
  relatedId?: string | null;
};

const memberAllValue = "__all__";
const taskTypeOptions = [
  { value: "FOLLOW_UP", label: "客户跟进" },
  { value: "MEETING", label: "会议 / 拜访" },
  { value: "PLAN", label: "计划事项" },
  { value: "CONTRACT", label: "合同节点" },
  { value: "QUOTATION", label: "报价动作" },
  { value: "OTHER", label: "其他" },
];
const scheduleSourceOptions: Array<{
  value: ScheduleSourceFilter;
  label: string;
}> = [
  { value: "all", label: "全部来源" },
  { value: "manual", label: "手动创建" },
  { value: "weekly_report", label: "周报同步" },
  { value: "monthly_goal", label: "月目标同步" },
  { value: "customer_followup", label: "客户跟进" },
  { value: "quotation", label: "报价推进" },
  { value: "contract_node", label: "合同节点" },
  { value: "system_reminder", label: "系统提醒" },
  { value: "local_reminder", label: "本地提醒" },
];
const scheduleStatusOptions: Array<{
  value: ScheduleStatusFilter;
  label: string;
}> = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待处理" },
  { value: "completed", label: "已完成" },
  { value: "reminder", label: "提醒" },
];
const scheduleDensityOptions: Array<{
  value: ScheduleDensityMode;
  label: string;
}> = [
  { value: "compact", label: "精简" },
  { value: "standard", label: "标准" },
  { value: "detailed", label: "详细" },
];
const taskStatusOptions = [
  { value: "TODO", label: "未开始" },
  { value: "DOING", label: "进行中" },
  { value: "DONE", label: "已完成" },
  { value: "CANCELED", label: "已取消" },
] as const;
const priorityOptions = [
  { value: "NORMAL", label: "普通" },
  { value: "IMPORTANT", label: "重要" },
  { value: "URGENT", label: "紧急" },
] as const;
const visibilityOptions = [
  { value: "PRIVATE", label: "仅自己可见" },
  { value: "TEAM", label: "团队可见" },
  { value: "ALL", label: "全员共享" },
] as const;
const repeatRuleOptions = [
  { value: "NONE", label: "不重复" },
  { value: "DAILY", label: "每天" },
  { value: "WEEKLY", label: "每周" },
  { value: "MONTHLY", label: "每月" },
] as const;
const sourceModuleOptions = [
  { value: "日程中心手动创建", label: "日程中心手动创建" },
  { value: "客户跟进", label: "客户跟进" },
  { value: "报价推进", label: "报价推进" },
  { value: "方案协同", label: "方案协同" },
  { value: "系统提醒转办", label: "系统提醒转办" },
] as const;
const TASK_META_PREFIX = "__HUIGUI_TASK_META__";

function getTaskTypeOptions(brandKey: SiteBrandKey) {
  if (brandKey !== "management") {
    return taskTypeOptions;
  }

  return [
    { value: "FOLLOW_UP", label: "协同跟进" },
    { value: "MEETING", label: "会议 / 沟通" },
    { value: "PLAN", label: "计划事项" },
    { value: "CONTRACT", label: "时间节点" },
    { value: "QUOTATION", label: "协作安排" },
    { value: "OTHER", label: "其他" },
  ];
}

function getScheduleSourceOptions(brandKey: SiteBrandKey) {
  if (brandKey !== "management") {
    return scheduleSourceOptions;
  }

  return [
    { value: "all", label: "全部来源" },
    { value: "manual", label: "手动创建" },
    { value: "weekly_report", label: "周报同步" },
    { value: "monthly_goal", label: "月目标同步" },
    { value: "customer_followup", label: "协同跟进" },
    { value: "quotation", label: "协作安排" },
    { value: "contract_node", label: "时间节点" },
    { value: "system_reminder", label: "系统提醒" },
    { value: "local_reminder", label: "本地提醒" },
  ];
}

function getSourceModuleOptions(brandKey: SiteBrandKey) {
  if (brandKey !== "management") {
    return sourceModuleOptions;
  }

  return [
    { value: "日程中心手动创建", label: "日程中心手动创建" },
    { value: "协同跟进", label: "协同跟进" },
    { value: "协作安排", label: "协作安排" },
    { value: "班表协同", label: "班表协同" },
    { value: "系统提醒转办", label: "系统提醒转办" },
  ];
}

function resolveRelatedSourceModule(
  brandKey: SiteBrandKey,
  flags: {
    hasAgriculturePlan?: boolean;
    hasQuotation?: boolean;
    hasCustomer?: boolean;
  },
) {
  if (flags.hasAgriculturePlan) {
    return brandKey === "management" ? "班表协同" : "方案协同";
  }

  if (flags.hasQuotation) {
    return brandKey === "management" ? "协作安排" : "报价推进";
  }

  if (flags.hasCustomer) {
    return brandKey === "management" ? "协同跟进" : "客户跟进";
  }

  return "日程中心手动创建";
}

type TaskContentMeta = {
  note: string;
  summary: string;
  nextAction: string;
  priority: TaskFormState["priority"];
  visibility: TaskFormState["visibility"];
  allDay: boolean;
  repeatRule: TaskFormState["repeatRule"];
  sourceModule: string;
  solutionLabel: string;
};

function formatMonthTitle(value: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(value);
}

function toDateKey(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateValue(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTimeValue(value: string | Date) {
  const date = new Date(value);
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${hour}:${minute}`;
}

function formatInputValue(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hour = `${value.getHours()}`.padStart(2, "0");
  const minute = `${value.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function decodeTaskContent(content?: string | null): TaskContentMeta {
  if (content?.startsWith(TASK_META_PREFIX)) {
    try {
      const parsed = JSON.parse(
        content.slice(TASK_META_PREFIX.length),
      ) as Partial<TaskContentMeta>;
      return {
        note: parsed.note ?? "",
        summary: parsed.summary ?? "",
        nextAction: parsed.nextAction ?? "",
        priority: parsed.priority ?? "NORMAL",
        visibility: parsed.visibility ?? "PRIVATE",
        allDay: parsed.allDay ?? false,
        repeatRule: parsed.repeatRule ?? "NONE",
        sourceModule: parsed.sourceModule ?? "",
        solutionLabel: parsed.solutionLabel ?? "",
      };
    } catch {
      return {
        note: content,
        summary: "",
        nextAction: "",
        priority: "NORMAL",
        visibility: "PRIVATE",
        allDay: false,
        repeatRule: "NONE",
        sourceModule: "",
        solutionLabel: "",
      };
    }
  }

  return {
    note: content ?? "",
    summary: "",
    nextAction: "",
    priority: "NORMAL",
    visibility: "PRIVATE",
    allDay: false,
    repeatRule: "NONE",
    sourceModule: "",
    solutionLabel: "",
  };
}

function encodeTaskContent(form: TaskFormState) {
  const meta: TaskContentMeta = {
    note: form.content.trim(),
    summary: form.summary.trim(),
    nextAction: form.nextAction.trim(),
    priority: form.priority,
    visibility: form.visibility,
    allDay: form.allDay,
    repeatRule: form.repeatEnabled ? form.repeatRule : "NONE",
    sourceModule: form.sourceModule.trim(),
    solutionLabel: form.solutionLabel.trim(),
  };

  return `${TASK_META_PREFIX}${JSON.stringify(meta)}`;
}

function createDefaultTaskForm(
  dateKey: string,
  currentUserId?: string,
  brandKey: SiteBrandKey = "public",
) {
  const reminderAt = new Date(`${dateKey}T08:30:00`);

  return {
    title: "",
    type: "PLAN",
    status: "TODO",
    priority: "NORMAL",
    assigneeUserId: currentUserId ?? "",
    visibility: "ALL",
    customerId: "",
    quotationId: "",
    agriculturePlanId: "",
    solutionLabel: "",
    date: dateKey,
    endDate: dateKey,
    startTime: "09:00",
    endTime: "",
    allDay: false,
    hasReminder: true,
    reminderAt: formatInputValue(reminderAt),
    repeatEnabled: false,
    repeatRule: "NONE",
    sourceModule: resolveRelatedSourceModule(brandKey, {}),
    content: "",
    summary: "",
    nextAction: "",
  } satisfies TaskFormState;
}

function createPrefilledTaskForm(
  dateKey: string,
  currentUserId: string | undefined,
  brandKey: SiteBrandKey,
  prefill?: Partial<TaskFormState>,
) {
  return {
    ...createDefaultTaskForm(dateKey, currentUserId, brandKey),
    ...prefill,
  } satisfies TaskFormState;
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) {
    return "未设置";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatWeekRangeLabel(dateKey: string) {
  const start = new Date(`${dateKey}T12:00:00`);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatScheduleListDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function listDateKeysBetween(startDateKey: string, endDateKey: string) {
  const keys: string[] = [];
  const start = new Date(`${startDateKey}T12:00:00`);
  const end = new Date(`${endDateKey}T12:00:00`);

  for (
    let cursor = new Date(start);
    cursor.getTime() <= end.getTime();
    cursor = addDays(cursor, 1)
  ) {
    keys.push(toDateKey(cursor));
  }

  return keys;
}

function withDateKey(
  dateKey: string,
  sourceValue?: string | null,
  fallbackHour = 9,
  fallbackMinute = 0,
) {
  const target = new Date(`${dateKey}T00:00:00`);

  if (sourceValue) {
    const source = new Date(sourceValue);
    if (!Number.isNaN(source.getTime())) {
      target.setHours(source.getHours(), source.getMinutes(), 0, 0);
      return formatInputValue(target);
    }
  }

  target.setHours(fallbackHour, fallbackMinute, 0, 0);
  return formatInputValue(target);
}

function getTaskSeriesColor(
  task: TaskRecord,
): NonNullable<CalendarEvent["seriesColor"]> {
  if (task.status === "DONE" || task.status === "CANCELED") {
    return "done";
  }

  switch (task.type) {
    case "FOLLOW_UP":
      return "followup";
    case "MEETING":
      return "meeting";
    case "PLAN":
      return "plan";
    case "CONTRACT":
      return "contract";
    case "QUOTATION":
      return "quotation";
    default:
      return "other";
  }
}

const travelKeywords = [
  "行程",
  "出差",
  "差旅",
  "旅程",
  "航班",
  "机票",
  "酒店",
  "住宿",
  "高铁",
  "车次",
  "接机",
  "返程",
  "去程",
  "登机",
  "落地",
  "候机",
];

const themeVariantCountMap: Record<
  "formal" | "travel" | "meeting" | "followup" | "plan" | "quotation",
  number
> = {
  formal: 3,
  travel: 3,
  meeting: 3,
  followup: 3,
  plan: 3,
  quotation: 3,
};

function stableHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function includesKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function resolveBucketedThemeKey(
  category: "formal" | "travel" | "meeting" | "followup" | "plan" | "quotation",
  seed: string,
): ScheduleDisplayThemeKey {
  const variantCount = themeVariantCountMap[category];
  const bucket = (stableHash(seed) % variantCount) + 1;
  return `${category}-${bucket}` as ScheduleDisplayThemeKey;
}

function resolveTaskDisplayCategory(
  task: TaskRecord,
  meta: TaskContentMeta,
): ScheduleDisplayCategory {
  if (task.status === "DONE") {
    return "done";
  }

  if (task.type === "CONTRACT" || isPastEvent(task.endAt ?? task.startAt)) {
    return "risk";
  }

  const searchableText = [
    task.title,
    meta.sourceModule,
    meta.note,
    meta.summary,
    meta.nextAction,
    meta.solutionLabel,
  ]
    .filter(Boolean)
    .join(" ");

  if (includesKeyword(searchableText, travelKeywords)) {
    return "travel";
  }

  switch (task.type) {
    case "FOLLOW_UP":
      return "followup";
    case "MEETING":
      return "meeting";
    case "PLAN":
      return "plan";
    case "QUOTATION":
      return "quotation";
    default:
      return "formal";
  }
}

function buildTaskDisplayTheme(
  task: TaskRecord,
  meta: TaskContentMeta,
): {
  displayCategory: ScheduleDisplayCategory;
  displayThemeKey: ScheduleDisplayThemeKey;
} {
  const displayCategory = resolveTaskDisplayCategory(task, meta);

  if (displayCategory === "risk") {
    return { displayCategory, displayThemeKey: "risk" };
  }

  if (displayCategory === "done") {
    return { displayCategory, displayThemeKey: "done" };
  }

  const seed = [
    task.id,
    task.title,
    task.assignee?.id,
    task.customer?.id,
    task.quotation?.id,
    task.agriculturePlan?.id,
  ]
    .filter(Boolean)
    .join("|");

  return {
    displayCategory,
    displayThemeKey: resolveBucketedThemeKey(
      displayCategory as
        | "formal"
        | "travel"
        | "meeting"
        | "followup"
        | "plan"
        | "quotation",
      seed,
    ),
  };
}

function buildWorkspaceDisplayTheme(item: LocalWorkspaceItem): {
  displayCategory: ScheduleDisplayCategory;
  displayThemeKey: ScheduleDisplayThemeKey;
} {
  if (item.status === "done") {
    return { displayCategory: "done", displayThemeKey: "done" };
  }

  if (isPastEvent(item.dueAt ?? item.createdAt)) {
    return { displayCategory: "risk", displayThemeKey: "risk" };
  }

  if (item.kind === "schedule") {
    return {
      displayCategory: "plan",
      displayThemeKey: resolveBucketedThemeKey("plan", item.id),
    };
  }

  return { displayCategory: "reminder", displayThemeKey: "reminder" };
}

function buildNotificationDisplayTheme(type: string): {
  displayCategory: ScheduleDisplayCategory;
  displayThemeKey: ScheduleDisplayThemeKey;
} {
  if (type === "CONTRACT_EXPIRY_REMINDER") {
    return { displayCategory: "risk", displayThemeKey: "risk" };
  }

  return { displayCategory: "reminder", displayThemeKey: "reminder" };
}

function buildRangeTimeLabel(
  task: TaskRecord,
  meta: TaskContentMeta,
  dateKey: string,
) {
  const startKey = toDateKey(task.startAt);
  const endKey = toDateKey(task.endAt ?? task.startAt);

  if (meta.allDay) {
    return "全天";
  }

  if (dateKey === startKey) {
    return formatTimeLabel(task.startAt);
  }

  if (dateKey === endKey && task.endAt) {
    return `至 ${formatTimeLabel(task.endAt)}`;
  }

  return "跨日";
}

function isPastEvent(value?: string | null) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function getTaskTypeLabel(type: string, brandKey: SiteBrandKey) {
  return (
    getTaskTypeOptions(brandKey).find((item) => item.value === type)?.label ?? "其他"
  );
}

function getTaskStatusLabel(task: TaskRecord) {
  switch (task.status) {
    case "DONE":
      return "已完成";
    case "DOING":
      return "进行中";
    case "CANCELED":
      return "已取消";
    default:
      if (isPastEvent(task.endAt ?? task.startAt)) {
        return "已延期";
      }
      return "待处理";
  }
}

function getTaskTone(task: TaskRecord): CalendarEvent["tone"] {
  if (task.status === "DONE") {
    return "success";
  }

  if (task.type === "CONTRACT" || isPastEvent(task.endAt ?? task.startAt)) {
    return "danger";
  }

  if (task.status === "DOING") {
    return "warning";
  }

  return "neutral";
}

function getWorkspaceStatusLabel(item: LocalWorkspaceItem) {
  if (item.status === "done") {
    return "已完成";
  }

  if (isPastEvent(item.dueAt ?? item.createdAt)) {
    return "已延期";
  }

  return "处理中";
}

function getWorkspaceTone(item: LocalWorkspaceItem): CalendarEvent["tone"] {
  if (item.status === "done") {
    return "success";
  }

  if (item.kind === "todo" || isPastEvent(item.dueAt ?? item.createdAt)) {
    return "danger";
  }

  if (item.kind === "schedule") {
    return "warning";
  }

  return "neutral";
}

function getEventVisualTone(event: CalendarEvent): EventVisualTone {
  if (
    event.source === "festival" ||
    event.displayCategory === "festival" ||
    event.displayThemeKey === "festival"
  ) {
    return "festival";
  }

  if (
    event.displayCategory === "done" ||
    event.displayThemeKey === "done" ||
    isCompletedEvent(event)
  ) {
    return "done";
  }

  if (
    event.displayCategory === "risk" ||
    event.displayThemeKey === "risk" ||
    isDelayedEvent(event) ||
    event.marker === "contract" ||
    (!event.displayThemeKey && event.tone === "danger")
  ) {
    return "risk";
  }

  if (
    isReminderEvent(event) ||
    (!event.displayThemeKey && event.tone === "warning")
  ) {
    return "reminder";
  }

  return "formal";
}

function isCompletedEvent(event: CalendarEvent) {
  return event.statusLabel === "已完成" || event.statusLabel === "已读";
}

function isDelayedEvent(event: CalendarEvent) {
  return event.statusLabel === "已延期";
}

function isReminderEvent(event: CalendarEvent) {
  return (
    event.displayCategory === "reminder" ||
    event.displayThemeKey === "reminder" ||
    (!event.displayThemeKey && event.source === "notification")
  );
}

function isActionableEvent(event: CalendarEvent) {
  return event.source !== "festival" && !isCompletedEvent(event);
}

function getEventSourceKey(event: CalendarEvent): ScheduleSourceFilter {
  if (event.source === "notification") {
    return "system_reminder";
  }

  if (event.source === "workspace") {
    return "local_reminder";
  }

  if (event.source === "festival") {
    return "all";
  }

  const task = event.raw as TaskRecord | undefined;
  const meta = decodeTaskContent(task?.content);
  const sourceText = [
    meta.sourceModule,
    meta.note,
    meta.summary,
    meta.nextAction,
    task?.content,
  ]
    .filter(Boolean)
    .join(" ");

  if (sourceText.includes("周报计划") || sourceText.includes("周报")) {
    return "weekly_report";
  }

  if (sourceText.includes("月目标")) {
    return "monthly_goal";
  }

  if (
    task?.type === "CONTRACT" ||
    meta.sourceModule.includes("合同") ||
    meta.sourceModule.includes("时间节点") ||
    sourceText.includes("合同")
  ) {
    return "contract_node";
  }

  if (
    task?.type === "QUOTATION" ||
    meta.sourceModule.includes("报价") ||
    meta.sourceModule.includes("协作安排") ||
    meta.sourceModule.includes("班表协同") ||
    task?.quotation?.id ||
    task?.agriculturePlan?.quotationId
  ) {
    return "quotation";
  }

  if (
    task?.type === "FOLLOW_UP" ||
    meta.sourceModule.includes("客户") ||
    meta.sourceModule.includes("协同跟进") ||
    (!!task?.customer?.id && !task?.quotation?.id && !task?.agriculturePlan?.id)
  ) {
    return "customer_followup";
  }

  return "manual";
}

function getEventSourceLabel(event: CalendarEvent, brandKey: SiteBrandKey) {
  return (
    getScheduleSourceOptions(brandKey).find(
      (option) => option.value === getEventSourceKey(event),
    )?.label ?? "手动创建"
  );
}

function matchesEventStatusFilter(
  event: CalendarEvent,
  filter: ScheduleStatusFilter,
) {
  switch (filter) {
    case "pending":
      return isActionableEvent(event) && !isDelayedEvent(event);
    case "completed":
      return isCompletedEvent(event);
    case "reminder":
      return isReminderEvent(event);
    default:
      return true;
  }
}

function matchesEventSourceFilter(
  event: CalendarEvent,
  filter: ScheduleSourceFilter,
) {
  if (filter === "all") {
    return true;
  }

  return getEventSourceKey(event) === filter;
}

function formatCalendarRangeDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildCalendarRangeProgressLabel(event: CalendarEvent) {
  if (
    !event.isMultiDay ||
    !event.rangeStartDateKey ||
    !event.rangeEndDateKey ||
    event.rangeStartDateKey === event.rangeEndDateKey
  ) {
    return null;
  }

  const start = new Date(`${event.rangeStartDateKey}T12:00:00`).getTime();
  const current = new Date(`${event.dateKey}T12:00:00`).getTime();
  const end = new Date(`${event.rangeEndDateKey}T12:00:00`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((end - start) / dayMs) + 1);
  const currentDay = Math.min(
    totalDays,
    Math.max(1, Math.round((current - start) / dayMs) + 1),
  );

  return `连续第 ${currentDay} / ${totalDays} 天`;
}

function buildEventFullLabel(event: CalendarEvent, showAssignee: boolean) {
  const parts = [
    `${event.isAllDay ? "全天" : event.timeLabel} ${event.title}`.trim(),
  ];

  if (showAssignee && event.assigneeLabel) {
    parts.push(`#${event.assigneeLabel}`);
  }

  if (
    event.isMultiDay &&
    event.rangeStartDateKey &&
    event.rangeEndDateKey &&
    event.rangeStartDateKey !== event.rangeEndDateKey
  ) {
    parts.push(
      `连续：${formatCalendarRangeDate(event.rangeStartDateKey)} - ${formatCalendarRangeDate(event.rangeEndDateKey)}`,
    );
  }

  const progressLabel = buildCalendarRangeProgressLabel(event);
  if (progressLabel) {
    parts.push(progressLabel);
  }

  if (event.statusLabel) {
    parts.push(event.statusLabel);
  }

  return parts.join(" · ");
}

function buildEventMetaLabel(event: CalendarEvent, showAssignee: boolean) {
  const parts = [event.isAllDay ? "全天" : event.timeLabel];
  if (showAssignee && event.assigneeLabel) {
    parts.push(`#${event.assigneeLabel}`);
  }
  if (event.statusLabel) {
    parts.push(event.statusLabel);
  }

  return parts.join(" · ");
}

function buildEventConflictLabel(event: CalendarEvent) {
  const timeLabel = event.isAllDay ? "全天" : event.timeLabel;
  return `${timeLabel} ${event.title}`.trim();
}

function formatDateInputValue(value: Date) {
  return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, "0")}-${`${value.getDate()}`.padStart(2, "0")}`;
}

function formatImportDateTime(date: string, time: string, allDay: boolean) {
  return allDay ? `${date}T09:00` : `${date}T${time || "09:00"}`;
}

function buildImportTaskContent(item: ScheduleImportCandidate) {
  return [
    `来源：${item.sourceLabel}`,
    `周期：${item.periodLabel}`,
    item.description ? `说明：${item.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function duplicateTaskForm(
  task: TaskRecord,
  dateKey: string,
  currentUserId?: string,
  brandKey: SiteBrandKey = "public",
): TaskFormState {
  const meta = decodeTaskContent(task.content);
  const taskStartDate = new Date(`${getDateValue(task.startAt)}T12:00:00`);
  const taskEndDate = new Date(
    `${task.endAt ? getDateValue(task.endAt) : getDateValue(task.startAt)}T12:00:00`,
  );
  const dayOffset = Math.max(
    0,
    Math.round(
      (taskEndDate.getTime() - taskStartDate.getTime()) / (24 * 60 * 60 * 1000),
    ),
  );
  const duplicateEndDate = getDateValue(
    addDays(new Date(`${dateKey}T12:00:00`), dayOffset),
  );
  return {
    title: `${task.title}（复制）`,
    type: task.type,
    status: "TODO",
    priority: meta.priority,
    assigneeUserId: task.assignee?.id ?? currentUserId ?? "",
    visibility: meta.visibility,
    customerId: task.customer?.id ?? task.quotation?.customer?.id ?? "",
    quotationId: task.quotation?.id ?? "",
    agriculturePlanId: task.agriculturePlan?.id ?? "",
    solutionLabel: task.agriculturePlan?.planName ?? meta.solutionLabel,
    date: dateKey,
    endDate: duplicateEndDate,
    startTime: meta.allDay ? "" : getTimeValue(task.startAt),
    endTime: meta.allDay ? "" : task.endAt ? getTimeValue(task.endAt) : "",
    allDay: meta.allDay,
    hasReminder: Boolean(task.reminderAt),
    reminderAt: task.reminderAt
      ? withDateKey(dateKey, task.reminderAt, 8, 30)
      : "",
    repeatEnabled: meta.repeatRule !== "NONE",
    repeatRule: meta.repeatRule,
    sourceModule:
      meta.sourceModule ||
      resolveRelatedSourceModule(brandKey, {
        hasAgriculturePlan: Boolean(task.agriculturePlan),
        hasQuotation: Boolean(task.quotation),
        hasCustomer: Boolean(task.customer),
      }),
    content: meta.note,
    summary: meta.summary,
    nextAction: meta.nextAction,
  };
}

function getTaskStatusLabelText(status: string) {
  switch (status) {
    case "DONE":
      return "已完成";
    case "DOING":
      return "进行中";
    case "CANCELED":
      return "已取消";
    default:
      return "待处理";
  }
}

function getTaskMarker(task: TaskRecord): CalendarEvent["marker"] {
  switch (task.type) {
    case "FOLLOW_UP":
      return "followup";
    case "MEETING":
      return "meeting";
    case "CONTRACT":
      return "contract";
    case "QUOTATION":
      return "quotation";
    default:
      return "plan";
  }
}

function getWorkspaceDate(item: LocalWorkspaceItem) {
  return item.dueAt ?? item.createdAt;
}

function parseReminderTime(content: string, fallback: string) {
  const matched = content.match(
    /时间[:：]\s*(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2})/,
  );
  if (!matched?.[1]) {
    return fallback;
  }

  const normalized = matched[1].replace(/\//g, "-").replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function getNotificationTone(type: string): CalendarEvent["tone"] {
  switch (type) {
    case "CONTRACT_EXPIRY_REMINDER":
      return "danger";
    case "TASK_REMINDER":
      return "warning";
    default:
      return "neutral";
  }
}

function getNotificationMarker(type: string): CalendarEvent["marker"] {
  switch (type) {
    case "CONTRACT_EXPIRY_REMINDER":
      return "contract";
    case "TASK_REMINDER":
      return "plan";
    default:
      return "notification";
  }
}

function matchesLocalAssignee(
  item: LocalWorkspaceItem,
  assigneeId: string,
  users: UserOption[],
  currentUser: CurrentUser | null,
) {
  if (assigneeId === memberAllValue) {
    return true;
  }

  const matchedUser = users.find((user) => user.id === assigneeId);
  const assigneeLabel = item.assignee?.trim();
  if (!assigneeLabel) {
    return assigneeId === currentUser?.id;
  }

  return [
    matchedUser?.displayName,
    matchedUser?.name,
    currentUser?.name,
    currentUser?.wecomName,
  ]
    .filter(Boolean)
    .includes(assigneeLabel);
}

function buildTaskHref(task: TaskRecord, brandKey: SiteBrandKey) {
  if (brandKey === "management") {
    return "/schedule";
  }

  if (task.agriculturePlan?.quotationId) {
    return `/solutions/agriculture/${task.agriculturePlan.quotationId}`;
  }

  if (task.customer?.id) {
    return `/customers/${task.customer.id}`;
  }

  if (task.quotation?.id) {
    return `/quotations/${task.quotation.id}`;
  }

  return "/schedule";
}

function buildTaskCalendarEvent(
  task: TaskRecord,
  brandKey: SiteBrandKey,
): CalendarEvent {
  const meta = decodeTaskContent(task.content);
  const startDateKey = toDateKey(task.startAt);
  const endDateKey = toDateKey(task.endAt ?? task.startAt);
  const isMultiDay = startDateKey !== endDateKey;
  const displayTheme = buildTaskDisplayTheme(task, meta);

  return {
    id: `task-${task.id}`,
    canonicalId: `task-${task.id}`,
    seriesId: `task-${task.id}`,
    source: "task",
    dateKey: startDateKey,
    sortTime: new Date(task.startAt).getTime(),
    timeLabel: meta.allDay ? "全天" : formatTimeLabel(task.startAt),
    title: task.title,
    detail: meta.note || meta.summary || meta.nextAction || "暂未填写说明。",
    href: buildTaskHref(task, brandKey),
    relationLabel:
      brandKey === "management"
        ? undefined
        : task.agriculturePlan
          ? `${task.agriculturePlan.planName}${task.agriculturePlan.customer?.name ? ` · ${task.agriculturePlan.customer.name}` : ""}`
          : task.quotation
            ? `${task.quotation.quotationNo}${task.quotation.customer?.name ? ` · ${task.quotation.customer.name}` : ""}`
            : task.customer?.name,
    assigneeId: task.assignee?.id,
    assigneeLabel: task.assignee?.displayName,
    marker: getTaskMarker(task),
    tone: getTaskTone(task),
    badgeLabel: getTaskTypeLabel(task.type, brandKey),
    statusLabel: getTaskStatusLabel(task),
    isAllDay: meta.allDay,
    isMultiDay,
    rangeStartDateKey: startDateKey,
    rangeEndDateKey: endDateKey,
    rangeSegment: isMultiDay ? "start" : "single",
    spanStart: isMultiDay,
    spanMiddle: false,
    spanEnd: false,
    seriesColor: getTaskSeriesColor(task),
    displayCategory: displayTheme.displayCategory,
    displayThemeKey: displayTheme.displayThemeKey,
    raw: task,
  };
}

function buildCalendarEvents(
  tasks: TaskRecord[],
  workspaceItems: LocalWorkspaceItem[],
  notifications: NotificationEvent[],
  selectedAssigneeId: string,
  users: UserOption[],
  currentUser: CurrentUser | null,
  brandKey: SiteBrandKey,
) {
  const taskEvents: CalendarEvent[] = tasks.map((task) =>
    buildTaskCalendarEvent(task, brandKey),
  );

  const localEvents: CalendarEvent[] = workspaceItems
    .filter((item) =>
      matchesLocalAssignee(item, selectedAssigneeId, users, currentUser),
    )
    .map((item) => {
      const scheduledAt = getWorkspaceDate(item);
      const displayTheme = buildWorkspaceDisplayTheme(item);
      return {
        id: `workspace-${item.id}`,
        canonicalId: `workspace-${item.id}`,
        source: "workspace",
        dateKey: toDateKey(scheduledAt),
        sortTime: new Date(scheduledAt).getTime(),
        timeLabel: item.dueAt ? formatTimeLabel(item.dueAt) : "待安排",
        title: item.title,
        detail: item.summary,
        href: item.relatedHref || "/schedule",
        relationLabel: item.relatedLabel,
        assigneeLabel: item.assignee || currentUser?.name || "当前成员",
        marker: "local",
        tone: getWorkspaceTone(item),
        badgeLabel: workspaceKindLabel(item.kind),
        statusLabel: getWorkspaceStatusLabel(item),
        displayCategory: displayTheme.displayCategory,
        displayThemeKey: displayTheme.displayThemeKey,
        raw: item,
      } satisfies CalendarEvent;
    });

  const notificationEvents: CalendarEvent[] =
    selectedAssigneeId !== memberAllValue &&
    selectedAssigneeId !== currentUser?.id
      ? []
      : notifications.map((item) => {
          const eventDate = parseReminderTime(item.content, item.createdAt);
          const displayTheme = buildNotificationDisplayTheme(item.type);
          return {
            id: `notification-${item.id}`,
            canonicalId: `notification-${item.id}`,
            source: "notification",
            dateKey: toDateKey(eventDate),
            sortTime: new Date(eventDate).getTime(),
            timeLabel: formatTimeLabel(eventDate),
            title: item.title,
            detail: item.content,
            href: buildNotificationHref(item),
            assigneeId: currentUser?.id,
            assigneeLabel:
              currentUser?.wecomName ?? currentUser?.name ?? "我的提醒",
            marker: getNotificationMarker(item.type),
            tone: getNotificationTone(item.type),
            badgeLabel: notificationTypeLabel(item.type, brandKey),
            statusLabel: item.readAt ? "已读" : "未读",
            displayCategory: displayTheme.displayCategory,
            displayThemeKey: displayTheme.displayThemeKey,
            raw: item,
          } satisfies CalendarEvent;
        });

  return [...taskEvents, ...localEvents, ...notificationEvents];
}

export default function SchedulePage() {
  const brandKey = useSiteBrandKey();
  const isManagementBrand = brandKey === "management";
  const pageTitle = isManagementBrand ? "协同日程" : "日程管理";
  const pageDescription = isManagementBrand
    ? "把周报、月目标、班表与提醒放进同一条时间轴，方便安排每天、本周和整个月的协同节奏。"
    : "安排今天、本周和月份视角下的重点事项，并同步到执行时间轴。";
  const resolvedTaskTypeOptions = useMemo(
    () => getTaskTypeOptions(brandKey),
    [brandKey],
  );
  const resolvedScheduleSourceOptions = useMemo(
    () => getScheduleSourceOptions(brandKey),
    [brandKey],
  );
  const resolvedSourceModuleOptions = useMemo(
    () => getSourceModuleOptions(brandKey),
    [brandKey],
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [quotations, setQuotations] = useState<QuotationOption[]>([]);
  const [workspaceItems, setWorkspaceItems] = useState<LocalWorkspaceItem[]>(
    [],
  );
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date()),
  );
  const openedTaskQueryRef = useRef<string | null>(null);
  const [calendarView, setCalendarView] = useState<ScheduleViewMode>("month");
  const [monthDensity, setMonthDensity] =
    useState<ScheduleDensityMode>("standard");
  const [scopeMode, setScopeMode] = useState<ScheduleMemberView>("me");
  const [dayPanelFilter, setDayPanelFilter] =
    useState<DayWorkbenchFilter>("all");
  const [memberFilter, setMemberFilter] = useState(memberAllValue);
  const [sourceFilter, setSourceFilter] = useState<ScheduleSourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorTaskId, setEditorTaskId] = useState<string | null>(null);
  const [editorSubmitAction, setEditorSubmitAction] = useState<
    "save" | "save_and_continue"
  >("save");
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(() =>
    createDefaultTaskForm(toDateKey(new Date()), undefined, brandKey),
  );
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingConflictPayload, setPendingConflictPayload] = useState<{
    payload: TaskSubmitPayload;
    conflicts: CalendarEvent[];
  } | null>(null);
  const [weeklyImportDetail, setWeeklyImportDetail] =
    useState<WeeklyReportDetail | null>(null);
  const [monthlyImportDetail, setMonthlyImportDetail] =
    useState<MonthlyGoalDetail | null>(null);
  const [importCandidates, setImportCandidates] = useState<
    ScheduleImportCandidate[]
  >([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [importDraftDate, setImportDraftDate] = useState(() =>
    toDateKey(new Date()),
  );
  const [importDraftTime, setImportDraftTime] = useState("09:00");
  const [importDraftAllDay, setImportDraftAllDay] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const deferredKeyword = useDeferredValue(keyword.trim());
  const handledPrefillKeyRef = useRef("");

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    function syncWorkspaceItems() {
      setWorkspaceItems(filterVisibleWorkspaceItems(listLocalWorkspaceItems()));
    }

    syncWorkspaceItems();
    window.addEventListener(WORKSPACE_ITEMS_CHANGED_EVENT, syncWorkspaceItems);
    return () => {
      window.removeEventListener(
        WORKSPACE_ITEMS_CHANGED_EVENT,
        syncWorkspaceItems,
      );
    };
  }, []);

  useEffect(() => {
    setImportDraftDate(selectedDateKey);
  }, [selectedDateKey]);

  const canViewTeam = hasPermission(currentUser, "action.schedule.view_team");
  const canAssign = hasPermission(currentUser, "action.schedule.assign");
  const otherUsers = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [currentUser?.id, users],
  );

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      try {
        const [customerResponse, quotationResponse, userResponse] =
          await Promise.all([
            isManagementBrand
              ? Promise.resolve({ items: [] as CustomerOption[] })
              : apiFetch<{ items: CustomerOption[] }>(
                  "/customers?page=1&pageSize=200",
                ),
            isManagementBrand
              ? Promise.resolve([] as QuotationOption[])
              : apiFetch<QuotationOption[]>("/quotations"),
            canViewTeam || canAssign
              ? apiFetch<UserOption[]>("/meta/users").catch(() => [])
              : Promise.resolve([] as UserOption[]),
          ]);

        if (cancelled) {
          return;
        }

        setCustomers(customerResponse.items);
        setQuotations(quotationResponse);
        setUsers(userResponse);
      } catch {}
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [canAssign, canViewTeam, currentUser, isManagementBrand]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const nextView = normalizeScheduleView(searchParams.get("view"));
    const nextDate = searchParams.get("date") || toDateKey(new Date());
    const nextMember = canViewTeam
      ? normalizeScheduleMember(searchParams.get("member"))
      : "me";
    const nextAssignee =
      nextMember === "team" && canViewTeam
        ? searchParams.get("assignee") || memberAllValue
        : currentUser.id;

    setCalendarView((current) => (current === nextView ? current : nextView));
    setSelectedDateKey((current) =>
      current === nextDate ? current : nextDate,
    );
    setSelectedMonth((current) => {
      const nextMonth = new Date(`${nextDate}T12:00:00`);
      if (
        current.getFullYear() === nextMonth.getFullYear() &&
        current.getMonth() === nextMonth.getMonth()
      ) {
        return current;
      }

      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    });
    setScopeMode((current) => (current === nextMember ? current : nextMember));
    setMemberFilter((current) =>
      current === nextAssignee ? current : nextAssignee,
    );
    setSourceFilter((current) => {
      const nextSource = normalizeScheduleSource(searchParams.get("source"));
      return current === nextSource ? current : nextSource;
    });
    setStatusFilter((current) => {
      const nextStatus = normalizeScheduleStatus(searchParams.get("status"));
      return current === nextStatus ? current : nextStatus;
    });
  }, [canViewTeam, currentUser, searchParams]);

  const monthCells = useMemo(
    () => buildMonthMatrix(selectedMonth),
    [selectedMonth],
  );
  const rangeStart = monthCells[0] ? toDateKey(monthCells[0].iso) : undefined;
  const rangeEnd = monthCells[monthCells.length - 1]
    ? toDateKey(monthCells[monthCells.length - 1].iso)
    : undefined;
  const effectiveAssigneeId = canViewTeam
    ? memberFilter
    : (currentUser?.id ?? memberFilter);

  useEffect(() => {
    if (!currentUser || !rangeStart || !rangeEnd) {
      return;
    }

    const queryRangeStart = rangeStart;
    const queryRangeEnd = rangeEnd;
    let cancelled = false;
    setLoading(true);
    setError("");

    async function loadData() {
      try {
        const taskParams = new URLSearchParams();
        taskParams.set("startDate", queryRangeStart);
        taskParams.set("endDate", queryRangeEnd);
        taskParams.set("includeArchived", "true");

        if (effectiveAssigneeId && effectiveAssigneeId !== memberAllValue) {
          taskParams.set("assigneeUserId", effectiveAssigneeId);
        }

        const [taskResponse, notificationResponse] = await Promise.all([
          fetchAllTaskPages(taskParams),
          apiFetch<NotificationListResponse>(
            "/notifications?page=1&pageSize=80",
          ),
        ]);

        if (cancelled) {
          return;
        }

        setTasks(taskResponse);
        setNotifications(
          normalizeNotifications(
            notificationResponse.items,
          ) as NotificationEvent[],
        );
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "日程数据加载失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [currentUser, effectiveAssigneeId, rangeEnd, rangeStart, reloadVersion]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let cancelled = false;
    setImportLoading(true);

    async function loadImportables() {
      try {
        const [weeklyList, monthlyList] = await Promise.all([
          apiFetch<WeeklyReportListResponse>("/work-management/weekly-reports"),
          apiFetch<MonthlyGoalListResponse>("/work-management/monthly-goals"),
        ]);

        const weeklyTargetId =
          weeklyList.pendingWeeklyReport?.reportId ||
          weeklyList.items[0]?.id ||
          "";
        const monthlyTargetId =
          monthlyList.pendingMonthlyGoal?.goalId ||
          monthlyList.items[0]?.id ||
          "";

        const [weeklyDetail, monthlyDetail] = await Promise.all([
          weeklyTargetId
            ? apiFetch<WeeklyReportDetail>(
                `/work-management/weekly-reports/${weeklyTargetId}`,
              ).catch(() => null)
            : Promise.resolve(null),
          monthlyTargetId
            ? apiFetch<MonthlyGoalDetail>(
                `/work-management/monthly-goals/${monthlyTargetId}`,
              ).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (cancelled) {
          return;
        }

        setWeeklyImportDetail(weeklyDetail);
        setMonthlyImportDetail(monthlyDetail);
        setImportCandidates([
          ...(weeklyDetail?.planItems
            .filter((item) => !item.taskId)
            .map((item) => ({
              id: `weekly-${item.id ?? item.title}`,
              source: "weekly_report" as const,
              sourceLabel: "周报同步",
              parentId: weeklyDetail.id,
              title: item.title,
              description: item.description ?? "",
              ownerId: weeklyDetail.owner.id,
              ownerLabel: weeklyDetail.owner.displayName,
              periodLabel: weeklyDetail.label,
              plannedAt: item.plannedAt,
            })) ?? []),
          ...(monthlyDetail?.items
            .filter((item) => !item.dueAt)
            .map((item) => ({
              id: `monthly-${item.id ?? item.title}`,
              source: "monthly_goal" as const,
              sourceLabel: "月目标同步",
              parentId: monthlyDetail.id,
              title: item.title,
              description:
                item.progressNote ?? item.riskNote ?? item.metric ?? "",
              ownerId: monthlyDetail.owner.id,
              ownerLabel: monthlyDetail.owner.displayName,
              periodLabel: monthlyDetail.label,
              dueAt: item.dueAt,
            })) ?? []),
        ]);
      } catch {
        if (!cancelled) {
          setWeeklyImportDetail(null);
          setMonthlyImportDetail(null);
          setImportCandidates([]);
        }
      } finally {
        if (!cancelled) {
          setImportLoading(false);
        }
      }
    }

    void loadImportables();

    return () => {
      cancelled = true;
    };
  }, [currentUser, reloadVersion]);

  const calendarEvents = useMemo(
    () =>
      buildCalendarEvents(
        tasks,
        workspaceItems,
        notifications,
        effectiveAssigneeId,
        users,
        currentUser,
        brandKey,
      ),
    [
      brandKey,
      currentUser,
      effectiveAssigneeId,
      notifications,
      tasks,
      users,
      workspaceItems,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    const targetTaskId = searchParams.get("taskId");
    if (!targetTaskId) {
      openedTaskQueryRef.current = null;
      return;
    }

    if (openedTaskQueryRef.current === targetTaskId) {
      return;
    }

    if (
      detailOpen &&
      detailEvent?.source === "task" &&
      (detailEvent.raw as TaskRecord | undefined)?.id === targetTaskId
    ) {
      return;
    }

    const existingEvent = calendarEvents.find(
      (event) =>
        event.source === "task" &&
        (event.raw as TaskRecord | undefined)?.id === targetTaskId,
    );

    if (existingEvent) {
      openedTaskQueryRef.current = targetTaskId;
      openEventDetail(existingEvent);
      return;
    }

    apiFetch<TaskRecord>(`/tasks/${targetTaskId}`)
      .then((task) => {
        if (!cancelled) {
          openedTaskQueryRef.current = targetTaskId;
          openEventDetail(buildTaskCalendarEvent(task, brandKey));
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "日程详情加载失败",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [calendarEvents, detailEvent, detailOpen, searchParams]);

  const visibleEvents = useMemo(() => {
    return calendarEvents
      .filter((event) => matchesEventSourceFilter(event, sourceFilter))
      .filter((event) => matchesEventStatusFilter(event, statusFilter))
      .filter((event) => {
        if (!deferredKeyword) {
          return true;
        }

        const haystack = [
          event.title,
          event.detail,
          event.relationLabel,
          event.assigneeLabel,
        ]
          .filter(Boolean)
          .join(" ");
        return haystack.includes(deferredKeyword);
      });
  }, [calendarEvents, deferredKeyword, sourceFilter, statusFilter]);

  const festivalMap = useMemo(() => {
    const map = new Map<string, ChinaCalendarInfo>();
    monthCells.forEach((cell) => {
      const info = getChinaCalendarInfo(toDateKey(cell.iso));
      if (info) {
        map.set(toDateKey(cell.iso), info);
      }
    });
    return map;
  }, [monthCells]);

  const allEvents = useMemo(() => {
    const eventMap = new Map<string, CalendarEvent[]>();

    visibleEvents.forEach((event) => {
      if (
        event.source === "task" &&
        event.isMultiDay &&
        event.rangeStartDateKey &&
        event.rangeEndDateKey
      ) {
        listDateKeysBetween(
          event.rangeStartDateKey,
          event.rangeEndDateKey,
        ).forEach((dateKey) => {
          const existing = eventMap.get(dateKey) ?? [];
          const rangeSegment =
            dateKey === event.rangeStartDateKey
              ? "start"
              : dateKey === event.rangeEndDateKey
                ? "end"
                : "middle";
          existing.push({
            ...event,
            id: `${event.id}::${dateKey}`,
            dateKey,
            sortTime:
              dateKey === event.rangeStartDateKey
                ? event.sortTime
                : new Date(`${dateKey}T00:00:00`).getTime(),
            timeLabel: buildRangeTimeLabel(
              event.raw as TaskRecord,
              decodeTaskContent((event.raw as TaskRecord).content),
              dateKey,
            ),
            rangeSegment,
            spanStart: rangeSegment === "start",
            spanMiddle: rangeSegment === "middle",
            spanEnd: rangeSegment === "end",
          });
          eventMap.set(dateKey, existing);
        });
        return;
      }

      const existing = eventMap.get(event.dateKey) ?? [];
      existing.push(event);
      eventMap.set(event.dateKey, existing);
    });

    festivalMap.forEach((festival, dateKey) => {
      const existing = eventMap.get(dateKey) ?? [];
      existing.push({
        id: `festival-${dateKey}`,
        canonicalId: `festival-${dateKey}`,
        source: "festival",
        dateKey,
        sortTime: new Date(`${dateKey}T00:00:00`).getTime(),
        timeLabel: "全天",
        title: festival.label,
        detail: festival.note,
        marker: "festival",
        tone:
          festival.type === "holiday"
            ? "danger"
            : festival.type === "festival"
              ? "warning"
              : "neutral",
        badgeLabel:
          festival.type === "adjusted_workday"
            ? "调休上班"
            : festival.type === "weekend"
              ? "周末"
              : festival.official
                ? "法定节假日"
                : "节日信息",
        isAllDay: true,
        raw: festival,
      });
      eventMap.set(dateKey, existing);
    });

    eventMap.forEach((items, dateKey) => {
      eventMap.set(
        dateKey,
        items.slice().sort((left, right) => {
          if (left.isMultiDay !== right.isMultiDay) {
            return left.isMultiDay ? -1 : 1;
          }

          return left.sortTime - right.sortTime;
        }),
      );
    });

    return eventMap;
  }, [festivalMap, visibleEvents]);

  const selectedDateEvents = useMemo(
    () => allEvents.get(selectedDateKey) ?? [],
    [allEvents, selectedDateKey],
  );
  const todayKey = toDateKey(new Date());

  const weekSummary = useMemo(() => {
    const start = new Date(`${selectedDateKey}T12:00:00`);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateKey = toDateKey(date);
      const items = allEvents.get(dateKey) ?? [];
      return {
        dateKey,
        label: new Intl.DateTimeFormat("zh-CN", {
          month: "numeric",
          day: "numeric",
          weekday: "short",
        }).format(date),
        items,
      };
    });
  }, [allEvents, selectedDateKey]);

  const selectedDateBusinessEvents = useMemo(
    () => selectedDateEvents.filter((item) => item.source !== "festival"),
    [selectedDateEvents],
  );

  const dayPanelEvents = useMemo(() => {
    return selectedDateBusinessEvents.filter((event) => {
      if (dayPanelFilter === "all") {
        return true;
      }

      if (dayPanelFilter === "pending") {
        return isActionableEvent(event) && !isDelayedEvent(event);
      }

      if (dayPanelFilter === "completed") {
        return isCompletedEvent(event);
      }

      if (dayPanelFilter === "reminder") {
        return isReminderEvent(event);
      }

      return isDelayedEvent(event);
    });
  }, [dayPanelFilter, selectedDateBusinessEvents]);

  const selectedDateStats = useMemo(
    () => ({
      total: selectedDateBusinessEvents.length,
      pending: selectedDateBusinessEvents.filter(
        (event) => isActionableEvent(event) && !isDelayedEvent(event),
      ).length,
      completed: selectedDateBusinessEvents.filter((event) =>
        isCompletedEvent(event),
      ).length,
      reminders: selectedDateBusinessEvents.filter((event) =>
        isReminderEvent(event),
      ).length,
      overdue: selectedDateBusinessEvents.filter((event) =>
        isDelayedEvent(event),
      ).length,
    }),
    [selectedDateBusinessEvents],
  );
  const monthDensityVisibleCount = useMemo(() => {
    if (monthDensity === "compact") {
      return 1;
    }

    if (monthDensity === "detailed") {
      return 4;
    }

    return 2;
  }, [monthDensity]);

  const monthGridCells = useMemo<ScheduleMonthCellModel[]>(() => {
    return monthCells.map((cell) => {
      const dateKey = toDateKey(cell.iso);
      const items = allEvents.get(dateKey) ?? [];
      const businessItems = items.filter((item) => item.source !== "festival");
      const festival = festivalMap.get(dateKey) ?? null;
      const weekend = new Date(`${dateKey}T12:00:00`).getDay();
      const isAdjustedWorkday = festival?.type === "adjusted_workday";

      return {
        dateKey,
        day: cell.day,
        isCurrentMonth: cell.currentMonth,
        isToday: cell.isToday,
        isSelected: selectedDateKey === dateKey,
        isWeekend: weekend === 0 || weekend === 6,
        isHoliday: festival?.type === "holiday",
        isAdjustedWorkday,
        businessCount: businessItems.length,
        entries: businessItems,
        moreCount: Math.max(0, businessItems.length - monthDensityVisibleCount),
        festival,
      };
    });
  }, [
    allEvents,
    festivalMap,
    monthCells,
    monthDensityVisibleCount,
    selectedDateKey,
  ]);
  const listViewGroups = useMemo(() => {
    return monthCells
      .map((cell) => {
        const dateKey = toDateKey(cell.iso);
        const businessItems = (allEvents.get(dateKey) ?? []).filter(
          (item) => item.source !== "festival",
        );

        return {
          dateKey,
          isSelected: selectedDateKey === dateKey,
          isToday: todayKey === dateKey,
          items: businessItems,
          label: formatScheduleListDateLabel(dateKey),
        };
      })
      .filter((group) => group.items.length > 0);
  }, [allEvents, monthCells, selectedDateKey, todayKey]);

  const visibleImportCandidates = useMemo(() => {
    return importCandidates
      .filter((item) => item.ownerId === currentUser?.id)
      .filter((item) => {
        if (!deferredKeyword) {
          return true;
        }

        return `${item.title} ${item.description} ${item.periodLabel}`.includes(
          deferredKeyword,
        );
      })
      .filter((item) => {
        if (sourceFilter === "all") {
          return true;
        }

        return sourceFilter === item.source;
      });
  }, [currentUser?.id, deferredKeyword, importCandidates, sourceFilter]);

  const summaryMeta = useMemo(
    () => [
      {
        label: "本月事项",
        value: String(
          new Set(
            visibleEvents
              .filter((item) => item.source !== "festival")
              .map((item) => item.canonicalId),
          ).size,
        ),
      },
      {
        label: "今日待处理",
        tone:
          visibleEvents.filter(
            (item) =>
              item.dateKey === toDateKey(new Date()) &&
              item.source !== "festival",
          ).length > 0
            ? ("warning" as const)
            : ("neutral" as const),
        value: String(
          visibleEvents.filter(
            (item) =>
              item.dateKey === toDateKey(new Date()) &&
              item.source !== "festival",
          ).length,
        ),
      },
      {
        label: "未读提醒",
        tone:
          notifications.filter((item) => !item.readAt).length > 0
            ? ("warning" as const)
            : ("neutral" as const),
        value: String(notifications.filter((item) => !item.readAt).length),
      },
      {
        label: "可切换成员",
        value: String(canViewTeam ? otherUsers.length + 1 : 1),
      },
    ],
    [canViewTeam, notifications, otherUsers.length, visibleEvents],
  );

  const selectedFestival = festivalMap.get(selectedDateKey) ?? null;
  const customerSearchOptions = useMemo<SearchableSelectOption[]>(
    () =>
      customers.map((customer) => ({
        id: customer.id,
        label: customer.name,
        description: customer.companyName
          ? `企业：${customer.companyName}`
          : "客户档案",
        keywords: `${customer.name} ${customer.companyName ?? ""}`,
      })),
    [customers],
  );
  const quotationSearchOptions = useMemo<
    Array<SearchableSelectOption & { customerId: string }>
  >(
    () =>
      quotations.map((quotation) => ({
        id: quotation.id,
        label: quotation.quotationNo,
        description: `${quotation.customer.name}${quotation.totalAmount ? ` · ¥${quotation.totalAmount}` : ""}`,
        keywords: `${quotation.quotationNo} ${quotation.customer.name} ${quotation.type}`,
        customerId: quotation.customer.id,
      })),
    [quotations],
  );
  const agriculturePlanOptions = useMemo<AgriculturePlanOption[]>(
    () =>
      quotations
        .filter(
          (
            quotation,
          ): quotation is QuotationOption & {
            agriculturePlan: NonNullable<QuotationOption["agriculturePlan"]>;
          } => Boolean(quotation.agriculturePlan),
        )
        .map((quotation) => ({
          id: quotation.agriculturePlan.id,
          label: quotation.agriculturePlan.planName,
          description: `${quotation.quotationNo} · ${quotation.customer.name}`,
          keywords: `${quotation.agriculturePlan.planName} ${quotation.quotationNo} ${quotation.customer.name}`,
          quotationId: quotation.id,
          customer: quotation.customer,
        })),
    [quotations],
  );
  const availableQuotationOptions = useMemo(() => {
    if (!taskForm.customerId) {
      return quotationSearchOptions;
    }

    return quotationSearchOptions.filter(
      (quotation) => quotation.customerId === taskForm.customerId,
    );
  }, [quotationSearchOptions, taskForm.customerId]);
  const availableAgriculturePlanOptions = useMemo(() => {
    return agriculturePlanOptions.filter((plan) => {
      if (taskForm.customerId && plan.customer.id !== taskForm.customerId) {
        return false;
      }

      if (taskForm.quotationId && plan.quotationId !== taskForm.quotationId) {
        return false;
      }

      return true;
    });
  }, [agriculturePlanOptions, taskForm.customerId, taskForm.quotationId]);
  const selectedCustomer =
    customers.find((customer) => customer.id === taskForm.customerId) ?? null;
  const selectedQuotation =
    quotations.find((quotation) => quotation.id === taskForm.quotationId) ??
    null;
  const selectedAgriculturePlan =
    agriculturePlanOptions.find(
      (plan) => plan.id === taskForm.agriculturePlanId,
    ) ?? null;
  const selectedSolutionLabel =
    selectedAgriculturePlan?.label ?? taskForm.solutionLabel;
  const detailTask =
    detailEvent?.source === "task" ? (detailEvent.raw as TaskRecord) : null;
  const detailTaskMeta = detailTask
    ? decodeTaskContent(detailTask.content)
    : null;
  const detailSourceLabel = detailEvent
    ? detailTaskMeta?.sourceModule || getEventSourceLabel(detailEvent, brandKey)
    : "";
  const detailRecordLabel = detailEvent
    ? detailEvent.source === "task"
      ? "内部协同事项"
      : detailEvent.source === "notification"
        ? "通知同步提醒"
        : detailEvent.source === "workspace"
          ? "工作台同步"
          : "手动建立"
    : "";
  const toolbarMemberOptions = useMemo<Array<{ id: string; label: string }>>(
    () => [
      { id: memberAllValue, label: "全部成员" },
      ...(currentUser
        ? [
            {
              id: currentUser.id,
              label: currentUser.wecomName ?? currentUser.name ?? "当前成员",
            },
          ]
        : []),
      ...otherUsers.map((user) => ({
        id: user.id,
        label: user.displayName,
      })),
    ],
    [currentUser, otherUsers],
  );

  function syncScheduleRoute(
    overrides: Partial<{
      view: ScheduleViewMode;
      date: string;
      member: ScheduleMemberView;
      source: ScheduleSourceFilter;
      status: ScheduleStatusFilter;
      assignee: string;
    }>,
  ) {
    const nextView = overrides.view ?? calendarView;
    const nextDate = overrides.date ?? selectedDateKey;
    const nextMember = overrides.member ?? scopeMode;
    const nextAssignee =
      nextMember === "team"
        ? (overrides.assignee ?? memberFilter)
        : (currentUser?.id ?? memberFilter);

    startTransition(() => {
      router.replace(
        buildScheduleRoute({
          view: nextView,
          date: nextDate,
          member: nextMember,
          source: overrides.source ?? sourceFilter,
          status: overrides.status ?? statusFilter,
          assignee: nextAssignee,
        }),
        { scroll: false },
      );
    });
  }

  function resetScheduleFilters() {
    setKeyword("");
    setSourceFilter("all");
    setStatusFilter("all");
    setDayPanelFilter("all");
    setScopeMode("me");
    setMemberFilter(currentUser?.id ?? memberAllValue);
    syncScheduleRoute({
      member: "me",
      source: "all",
      status: "all",
      assignee: currentUser?.id ?? memberAllValue,
    });
  }

  function jumpToToday() {
    const today = new Date();
    const nextDateKey = toDateKey(today);
    setSelectedMonth(today);
    setSelectedDateKey(nextDateKey);
    syncScheduleRoute({ date: nextDateKey });
  }

  function moveCalendar(offset: number) {
    const anchor = new Date(`${selectedDateKey}T12:00:00`);

    if (calendarView === "month" || calendarView === "list") {
      const next = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() + offset,
        1,
      );
      setSelectedMonth(next);
      const nextDateKey = toDateKey(next);
      setSelectedDateKey(nextDateKey);
      syncScheduleRoute({ date: nextDateKey });
      return;
    }

    const next = new Date(anchor);
    next.setDate(anchor.getDate() + offset * (calendarView === "week" ? 7 : 1));
    const nextDateKey = toDateKey(next);
    setSelectedDateKey(nextDateKey);
    setSelectedMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    syncScheduleRoute({ date: nextDateKey });
  }

  function openEventDetail(event: CalendarEvent) {
    setDetailEvent(event);
    setDetailEditMode(false);
    setDetailOpen(true);
  }

  function handleDateCellSelect(dateKey: string, openCreate = false) {
    const anchor = new Date(`${dateKey}T12:00:00`);
    setSelectedDateKey(dateKey);
    setSelectedMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    syncScheduleRoute({ date: dateKey });
    if (openCreate) {
      openTaskEditor(dateKey);
    }
  }

  function loadTaskIntoForm(task: TaskRecord) {
    const meta = decodeTaskContent(task.content);
    const endDate = task.endAt
      ? getDateValue(task.endAt)
      : getDateValue(task.startAt);
    setEditorMode("edit");
    setEditorTaskId(task.id);
    setTaskForm({
      title: task.title,
      type: task.type,
      status: task.status,
      priority: meta.priority,
      assigneeUserId: task.assignee?.id ?? currentUser?.id ?? "",
      visibility: meta.visibility,
      customerId: task.customer?.id ?? task.quotation?.customer?.id ?? "",
      quotationId: task.quotation?.id ?? "",
      agriculturePlanId: task.agriculturePlan?.id ?? "",
      solutionLabel: task.agriculturePlan?.planName ?? meta.solutionLabel,
      date: getDateValue(task.startAt),
      endDate,
      startTime: meta.allDay ? "" : getTimeValue(task.startAt),
      endTime: meta.allDay ? "" : task.endAt ? getTimeValue(task.endAt) : "",
      allDay: meta.allDay,
      hasReminder: Boolean(task.reminderAt),
      reminderAt: task.reminderAt
        ? formatInputValue(new Date(task.reminderAt))
        : "",
      repeatEnabled: meta.repeatRule !== "NONE",
      repeatRule: meta.repeatRule,
      sourceModule:
        meta.sourceModule ||
        resolveRelatedSourceModule(brandKey, {
          hasAgriculturePlan: Boolean(task.agriculturePlan),
          hasQuotation: Boolean(task.quotation),
          hasCustomer: Boolean(task.customer),
        }),
      content: meta.note,
      summary: meta.summary,
      nextAction: meta.nextAction,
    });
  }

  function openTaskEditor(
    dateKey: string,
    task?: TaskRecord,
    prefill?: Partial<TaskFormState>,
  ) {
    if (task) {
      loadTaskIntoForm(task);
    } else {
      setEditorMode("create");
      setEditorTaskId(null);
      setTaskForm(
        createPrefilledTaskForm(dateKey, currentUser?.id, brandKey, prefill),
      );
    }

    setEditorSubmitAction("save");
    setTaskEditorOpen(true);
  }

  useEffect(() => {
    const prefillKey = searchParams.toString();

    if (!currentUser || searchParams.get("compose") !== "task") {
      if (!prefillKey) {
        handledPrefillKeyRef.current = "";
      }
      return;
    }

    if (handledPrefillKeyRef.current === prefillKey) {
      return;
    }

    const startAtParam = searchParams.get("startAt");
    const endAtParam = searchParams.get("endAt");
    const reminderAtParam = searchParams.get("reminderAt");
    const dateKey =
      searchParams.get("date") ||
      (startAtParam ? getDateValue(startAtParam) : null) ||
      (reminderAtParam ? getDateValue(reminderAtParam) : null) ||
      toDateKey(new Date());
    const sourceModule =
      searchParams.get("sourceModule") ||
      resolveRelatedSourceModule(brandKey, {
        hasAgriculturePlan: Boolean(searchParams.get("agriculturePlanId")),
        hasQuotation: Boolean(searchParams.get("quotationId")),
        hasCustomer: Boolean(searchParams.get("customerId")),
      });
    const defaultReminderAt = createDefaultTaskForm(
      dateKey,
      currentUser.id,
      brandKey,
    ).reminderAt;

    handledPrefillKeyRef.current = prefillKey;
    setSelectedDateKey(dateKey);
    setSelectedMonth(new Date(`${dateKey}T12:00:00`));
    openTaskEditor(dateKey, undefined, {
      title: searchParams.get("title") ?? "",
      customerId: searchParams.get("customerId") ?? "",
      quotationId: searchParams.get("quotationId") ?? "",
      agriculturePlanId: searchParams.get("agriculturePlanId") ?? "",
      solutionLabel: searchParams.get("solutionLabel") ?? "",
      sourceModule,
      content: searchParams.get("content") ?? "",
      summary: searchParams.get("summary") ?? "",
      nextAction: searchParams.get("nextAction") ?? "",
      date: dateKey,
      endDate: endAtParam ? getDateValue(endAtParam) : dateKey,
      startTime: startAtParam ? getTimeValue(startAtParam) : "09:00",
      endTime: endAtParam ? getTimeValue(endAtParam) : "",
      hasReminder: true,
      reminderAt: reminderAtParam
        ? formatInputValue(new Date(reminderAtParam))
        : defaultReminderAt,
    });
    router.replace("/schedule", { scroll: false });
  }, [currentUser, router, searchParams]);

  function buildTaskPayload(): TaskSubmitPayload {
    const startAt = taskForm.allDay
      ? `${taskForm.date}T00:00`
      : `${taskForm.date}T${taskForm.startTime || "09:00"}`;
    const endAt = taskForm.allDay
      ? `${taskForm.endDate || taskForm.date}T23:59`
      : taskForm.endTime
        ? `${taskForm.endDate || taskForm.date}T${taskForm.endTime}`
        : taskForm.endDate && taskForm.endDate !== taskForm.date
          ? `${taskForm.endDate}T${taskForm.startTime || "09:00"}`
          : undefined;

    return {
      title: taskForm.title.trim(),
      type: taskForm.type,
      status: taskForm.status,
      assigneeUserId: taskForm.assigneeUserId,
      customerId: taskForm.customerId || "",
      quotationId: taskForm.quotationId || "",
      agriculturePlanId: taskForm.agriculturePlanId || "",
      startAt,
      endAt,
      reminderAt: taskForm.hasReminder
        ? taskForm.reminderAt || undefined
        : undefined,
      content: encodeTaskContent(taskForm),
    };
  }

  function findTaskConflicts(payload: TaskSubmitPayload) {
    if (
      effectiveAssigneeId !== memberAllValue &&
      payload.assigneeUserId !== effectiveAssigneeId
    ) {
      return [] as CalendarEvent[];
    }

    const start = new Date(payload.startAt).getTime();
    const end = payload.endAt
      ? new Date(payload.endAt).getTime()
      : new Date(payload.startAt).getTime() + 30 * 60 * 1000;

    return calendarEvents
      .filter((event) => event.source === "task")
      .filter(
        (event) =>
          (event.raw as TaskRecord).assignee?.id === payload.assigneeUserId,
      )
      .filter((event) => (event.raw as TaskRecord).id !== editorTaskId)
      .filter((event) => !isCompletedEvent(event))
      .filter((event) => {
        const raw = event.raw as TaskRecord;
        const currentStart = new Date(raw.startAt).getTime();
        const currentEnd = raw.endAt
          ? new Date(raw.endAt).getTime()
          : new Date(raw.startAt).getTime() + 30 * 60 * 1000;

        return start < currentEnd && end > currentStart;
      })
      .sort((left, right) => left.sortTime - right.sortTime)
      .slice(0, 3);
  }

  async function submitTaskPayload(payload: TaskSubmitPayload) {
    setSaving(true);
    setError("");

    try {
      if (editorMode === "create") {
        await apiFetch("/tasks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (editorTaskId) {
        await apiFetch(`/tasks/${editorTaskId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      setPendingConflictPayload(null);

      if (detailEditMode && detailOpen) {
        setDetailEditMode(false);
        setDetailOpen(false);
      } else if (
        editorSubmitAction === "save_and_continue" &&
        editorMode === "create"
      ) {
        setTaskForm(createDefaultTaskForm(taskForm.date, currentUser?.id, brandKey));
      } else {
        setTaskEditorOpen(false);
      }
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "日程保存失败",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildTaskPayload();
    const conflicts = findTaskConflicts(payload);

    if (conflicts.length) {
      setPendingConflictPayload({ payload, conflicts });
      return;
    }

    await submitTaskPayload(payload);
  }

  async function updateTaskStatus(
    task: TaskRecord,
    status: "TODO" | "DOING" | "DONE",
  ) {
    setActionLoading(true);
    setError("");

    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setDetailOpen(false);
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "日程状态更新失败",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function delayTask(task: TaskRecord, days: number) {
    setActionLoading(true);
    setError("");

    try {
      const startAt = new Date(task.startAt);
      startAt.setDate(startAt.getDate() + days);
      const endAt = task.endAt ? new Date(task.endAt) : null;
      endAt?.setDate(endAt.getDate() + days);
      const reminderAt = task.reminderAt ? new Date(task.reminderAt) : null;
      reminderAt?.setDate(reminderAt.getDate() + days);

      await apiFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          startAt: formatInputValue(startAt),
          endAt: endAt ? formatInputValue(endAt) : undefined,
          reminderAt: reminderAt ? formatInputValue(reminderAt) : undefined,
          status: "TODO",
        }),
      });

      setDetailOpen(false);
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "日程延后失败",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteTask(task: TaskRecord) {
    setActionLoading(true);
    setError("");

    try {
      await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
      setDetailOpen(false);
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "日程删除失败",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleNotificationRead(item: NotificationEvent) {
    setActionLoading(true);
    setError("");

    try {
      await apiFetch(
        `/notifications/${item.id}/${item.readAt ? "unread" : "read"}`,
        {
          method: "PATCH",
        },
      );
      emitNotificationsChanged();
      setDetailOpen(false);
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "提醒状态更新失败",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWorkspaceAction(item: LocalWorkspaceItem) {
    setActionLoading(true);

    try {
      if (item.status === "done") {
        updateLocalWorkspaceItemStatus(item.id, "pending");
      } else {
        updateLocalWorkspaceItemStatus(item.id, "done");
      }
      setDetailOpen(false);
    } finally {
      setActionLoading(false);
    }
  }

  function handleDigestTaskEdit(event: CalendarEvent) {
    if (event.source === "task") {
      openTaskEditor(event.dateKey, event.raw as TaskRecord);
    }
  }

  function handleDigestTaskDelete(event: CalendarEvent) {
    if (event.source === "task") {
      void deleteTask(event.raw as TaskRecord);
    }
  }

  function handleDigestTaskStatusChange(
    event: CalendarEvent,
    status: "TODO" | "DOING" | "DONE",
  ) {
    if (event.source === "task") {
      void updateTaskStatus(event.raw as TaskRecord, status);
    }
  }

  function handleDigestTaskDelay(event: CalendarEvent, days: number) {
    if (event.source === "task") {
      void delayTask(event.raw as TaskRecord, days);
    }
  }

  function handleDigestWorkspaceToggle(event: CalendarEvent) {
    if (event.source === "workspace") {
      void handleWorkspaceAction(event.raw as LocalWorkspaceItem);
    }
  }

  function handleDigestNotificationToggle(event: CalendarEvent) {
    if (event.source === "notification") {
      void toggleNotificationRead(event.raw as NotificationEvent);
    }
  }

  const sharedQuickActionHandlers = {
    onQuickNotificationToggle: handleDigestNotificationToggle,
    onQuickTaskDelay: handleDigestTaskDelay,
    onQuickTaskDelete: handleDigestTaskDelete,
    onQuickTaskEdit: handleDigestTaskEdit,
    onQuickTaskStatusChange: handleDigestTaskStatusChange,
    onQuickWorkspaceToggle: handleDigestWorkspaceToggle,
  };

  function openImportModal(
    initialIds: string[] = [],
    date = selectedDateKey,
    allDay = true,
  ) {
    setImportDraftDate(date);
    setImportDraftAllDay(allDay);
    setImportDraftTime("09:00");
    setSelectedImportIds(initialIds);
    setImportModalOpen(true);
  }

  function toggleImportSelection(id: string) {
    setSelectedImportIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function importSelectedPlans() {
    if (!currentUser || selectedImportIds.length === 0) {
      return;
    }

    setImportSaving(true);
    setError("");

    try {
      const selectedItems = importCandidates.filter((item) =>
        selectedImportIds.includes(item.id),
      );
      const scheduledAt = formatImportDateTime(
        importDraftDate,
        importDraftTime,
        importDraftAllDay,
      );

      const weeklyIds = new Set(
        selectedItems
          .filter((item) => item.source === "weekly_report")
          .map((item) => item.id.replace(/^weekly-/, "")),
      );
      const monthlyIds = new Set(
        selectedItems
          .filter((item) => item.source === "monthly_goal")
          .map((item) => item.id.replace(/^monthly-/, "")),
      );

      if (weeklyImportDetail && weeklyIds.size > 0) {
        await apiFetch(
          `/work-management/weekly-reports/${weeklyImportDetail.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              completedSummary: weeklyImportDetail.completedSummary ?? "",
              focusSummary: weeklyImportDetail.focusSummary ?? "",
              reviewItems: weeklyImportDetail.reviewItems.map((item) => ({
                id: item.id,
                status: item.status,
                incompleteReason: item.incompleteReason ?? "",
              })),
              planItems: weeklyImportDetail.planItems.map((item) => ({
                id: item.id,
                sourceReviewItemId: item.sourceReviewItemId ?? "",
                title: item.title,
                description: item.description ?? "",
                plannedAt:
                  item.id && weeklyIds.has(item.id)
                    ? scheduledAt
                    : (item.plannedAt ?? ""),
                sortOrder: item.sortOrder,
              })),
            }),
          },
        );
      }

      if (monthlyImportDetail && monthlyIds.size > 0) {
        const matchingMonthlyItems = monthlyImportDetail.items.filter(
          (item) => item.id && monthlyIds.has(item.id),
        );

        await Promise.all(
          matchingMonthlyItems.map((item) =>
            apiFetch("/tasks", {
              method: "POST",
              body: JSON.stringify({
                title: `月目标 · ${item.title}`,
                type: "PLAN",
                status: "TODO",
                assigneeUserId: currentUser.id,
                customerId: "",
                quotationId: "",
                agriculturePlanId: "",
                startAt: scheduledAt,
                endAt: importDraftAllDay
                  ? `${importDraftDate}T23:59`
                  : undefined,
                reminderAt: scheduledAt,
                content: `${TASK_META_PREFIX}${JSON.stringify({
                  note: buildImportTaskContent({
                    id: item.id ?? item.title,
                    source: "monthly_goal",
                    sourceLabel: "月目标同步",
                    parentId: monthlyImportDetail.id,
                    title: item.title,
                    description:
                      item.progressNote ?? item.riskNote ?? item.metric ?? "",
                    ownerId: currentUser.id,
                    ownerLabel: monthlyImportDetail.owner.displayName,
                    periodLabel: monthlyImportDetail.label,
                  } satisfies ScheduleImportCandidate),
                  summary: "",
                  nextAction: "",
                  priority: "NORMAL",
                  visibility: "ALL",
                  allDay: importDraftAllDay,
                  repeatRule: "NONE",
                  sourceModule: "月目标同步",
                  solutionLabel: "",
                })}`,
              }),
            }),
          ),
        );

        await apiFetch(
          `/work-management/monthly-goals/${monthlyImportDetail.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              summary: monthlyImportDetail.summary ?? "",
              items: monthlyImportDetail.items.map((item) => ({
                id: item.id,
                title: item.title,
                metric: item.metric ?? "",
                dueAt:
                  item.id && monthlyIds.has(item.id)
                    ? scheduledAt
                    : (item.dueAt ?? ""),
                progressNote: item.progressNote ?? "",
                riskNote: item.riskNote ?? "",
                sortOrder: item.sortOrder,
              })),
            }),
          },
        );
      }

      setImportModalOpen(false);
      setSelectedImportIds([]);
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "计划导入失败",
      );
    } finally {
      setImportSaving(false);
    }
  }

  const selectedMemberLabel =
    effectiveAssigneeId === memberAllValue
      ? "全员日程"
      : users.find((user) => user.id === effectiveAssigneeId)?.displayName ||
        currentUser?.wecomName ||
        currentUser?.name ||
        "我的日程";
  const showInlineAssignee =
    scopeMode === "team" && effectiveAssigneeId === memberAllValue;
  const calendarRangeTitle =
    calendarView === "month"
      ? formatMonthTitle(selectedMonth)
      : calendarView === "week"
        ? `${formatWeekRangeLabel(selectedDateKey)} · 本周`
        : calendarView === "list"
          ? `${formatMonthTitle(selectedMonth)} · 列表`
          : formatScheduleListDateLabel(selectedDateKey);
  const calendarViewDescription =
    calendarView === "month"
      ? "月历格直接显示事项分类、时间层级、连续安排与更多提示。"
      : calendarView === "week"
        ? "一周视角适合看推进节奏、集中识别冲突与空白日。"
        : calendarView === "list"
          ? "列表按日期汇总本月筛选结果，适合快速巡检、打开详情和批量推进。"
          : "日视图适合细看单天内容，右侧仍保留执行工作台。";
  const selectedDateIsWeekend = useMemo(() => {
    const weekday = new Date(`${selectedDateKey}T12:00:00`).getDay();
    return weekday === 0 || weekday === 6;
  }, [selectedDateKey]);

  return (
    <div className="workspace-stack schedule-workbench-page">
      {error ? <div className="danger-text small">{error}</div> : null}

      <ScheduleToolbar
        assigneeId={memberFilter}
        assigneeOptions={toolbarMemberOptions}
        canViewTeam={canViewTeam}
        currentLabel={calendarRangeTitle}
        description={pageDescription}
        keyword={keyword}
        memberView={scopeMode}
        meta={summaryMeta}
        onAssigneeChange={(value) => {
          setMemberFilter(value);
          syncScheduleRoute({ member: "team", assignee: value });
        }}
        onCreate={() => openTaskEditor(selectedDateKey)}
        onKeywordChange={setKeyword}
        onMemberViewChange={(value) => {
          const nextAssignee =
            value === "team"
              ? memberAllValue
              : (currentUser?.id ?? memberFilter);
          setScopeMode(value);
          setMemberFilter(nextAssignee);
          syncScheduleRoute({ member: value, assignee: nextAssignee });
        }}
        onNext={() => moveCalendar(1)}
        onOpenImport={() => openImportModal()}
        onPrev={() => moveCalendar(-1)}
        onRefresh={() => setReloadVersion((current) => current + 1)}
        onResetFilters={resetScheduleFilters}
        onSourceFilterChange={(value) => {
          setSourceFilter(value);
          syncScheduleRoute({ source: value });
        }}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setDayPanelFilter(
            value === "completed"
              ? "completed"
              : value === "pending"
                ? "pending"
                : value === "reminder"
                  ? "reminder"
                  : "all",
          );
          syncScheduleRoute({ status: value });
        }}
        onToday={jumpToToday}
        onViewModeChange={(value) => {
          setCalendarView(value);
          syncScheduleRoute({ view: value });
        }}
        sourceFilter={sourceFilter}
        sourceOptions={resolvedScheduleSourceOptions}
        statusFilter={statusFilter}
        statusOptions={scheduleStatusOptions}
        title={pageTitle}
        viewMode={calendarView}
      />

      <section className="layout-grid schedule-layout schedule-workbench-grid">
        <div className="workspace-main">
          <section className="panel stack calendar-workbench">
            <div className="calendar-toolbar">
              <div className="calendar-toolbar__title">
                <div className="calendar-toolbar__title-main">
                  <h3>{calendarRangeTitle}</h3>
                  <p>{calendarViewDescription}</p>
                </div>

                <div className="calendar-toolbar__meta">
                  <StatusBadge tone="neutral">
                    {selectedMemberLabel}
                  </StatusBadge>
                  {sourceFilter !== "all" ? (
                    <StatusBadge tone="warning">
                      {
                        resolvedScheduleSourceOptions.find(
                          (option) => option.value === sourceFilter,
                        )?.label
                      }
                    </StatusBadge>
                  ) : null}
                  {statusFilter !== "all" ? (
                    <StatusBadge tone="warning">
                      {
                        scheduleStatusOptions.find(
                          (option) => option.value === statusFilter,
                        )?.label
                      }
                    </StatusBadge>
                  ) : null}
                </div>
              </div>

              <div className="calendar-toolbar__actions">
                {calendarView === "month" ? (
                  <div className="calendar-density-switch">
                    <span className="calendar-density-switch__label">
                      月视图密度
                    </span>
                    <div className="segmented-control compact">
                      {scheduleDensityOptions.map((option) => (
                        <button
                          className={`segmented-control__item ${
                            monthDensity === option.value ? "active" : ""
                          }`}
                          key={option.value}
                          onClick={() => setMonthDensity(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="calendar-legend calendar-legend--compact">
              <span className="legend-item">
                <i className="legend-dot plan" />
                计划 / 执行排期
              </span>
              <span className="legend-item">
                <i className="legend-dot meeting" />
                会议 / 拜访
              </span>
              <span className="legend-item">
                <i className="legend-dot followup" />
                {isManagementBrand ? "协同跟进" : "客户跟进"}
              </span>
              <span className="legend-item">
                <i className="legend-dot travel" />
                行程
              </span>
              <span className="legend-item">
                <i className="legend-dot quotation" />
                {isManagementBrand ? "协作 / 班表" : "报价 / 方案"}
              </span>
              <span className="legend-item">
                <i className="legend-dot reminder" />
                提醒
              </span>
              <span className="legend-item">
                <i className="legend-dot risk" />
                逾期
              </span>
              <span className="legend-item">
                <i className="legend-dot done" />
                已完成
              </span>
            </div>

            {calendarView === "month" ? (
              <ScheduleMonthGrid
                actionLoading={actionLoading}
                buildEventFullLabel={buildEventFullLabel}
                cells={monthGridCells}
                density={monthDensity}
                getEventSourceLabel={(event) =>
                  getEventSourceLabel(event, brandKey)
                }
                getEventVisualTone={getEventVisualTone}
                onDateCreate={(dateKey) => openTaskEditor(dateKey)}
                onDateSelect={handleDateCellSelect}
                onEventOpen={openEventDetail}
                showInlineAssignee={showInlineAssignee}
                {...sharedQuickActionHandlers}
              />
            ) : null}

            {calendarView === "week" ? (
              <ScheduleWeekView
                actionLoading={actionLoading}
                buildEventFullLabel={buildEventFullLabel}
                days={weekSummary}
                getEventSourceLabel={(event) =>
                  getEventSourceLabel(event, brandKey)
                }
                getEventVisualTone={getEventVisualTone}
                onCreateDate={(dateKey) => openTaskEditor(dateKey)}
                onDateSelect={handleDateCellSelect}
                onEventOpen={openEventDetail}
                selectedDateKey={selectedDateKey}
                showInlineAssignee={showInlineAssignee}
                {...sharedQuickActionHandlers}
              />
            ) : null}

            {calendarView === "day" ? (
              <section className="panel stack schedule-day-focus">
                <div className="section-heading">
                  <h3>单日视图</h3>
                  <p>
                    适合在左侧细看这一天的内容，右侧继续负责执行、完成与延期动作。
                  </p>
                </div>

                {selectedDateBusinessEvents.length ? (
                  <div className="agenda-list">
                    {selectedDateBusinessEvents.map((event) => (
                      <ScheduleEventDigestCard
                        actionLoading={actionLoading}
                        event={event}
                        fullLabel={buildEventFullLabel(
                          event,
                          showInlineAssignee,
                        )}
                        key={event.id}
                        onOpen={openEventDetail}
                        showInlineAssignee={showInlineAssignee}
                        sourceLabel={getEventSourceLabel(event, brandKey)}
                        tone={getEventVisualTone(event)}
                        variant="day"
                        {...sharedQuickActionHandlers}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="这一天暂时没有正式日程，可以直接新增，也可以从右侧待安排池补进来。"
                    title="单日视图还是空的"
                  />
                )}
              </section>
            ) : null}

            {calendarView === "list" ? (
              <section className="schedule-list-view">
                {listViewGroups.length ? (
                  listViewGroups.map((group) => (
                    <section
                      className={`schedule-list-day ${
                        group.isSelected ? "is-selected" : ""
                      }`}
                      key={group.dateKey}
                    >
                      <button
                        className="schedule-list-day__header"
                        onClick={() => handleDateCellSelect(group.dateKey)}
                        type="button"
                      >
                        <div>
                          <strong>{group.label}</strong>
                          <span>
                            {group.isToday ? "今天 · " : ""}
                            {group.items.length} 项安排
                          </span>
                        </div>
                        <span>{group.dateKey.slice(5)}</span>
                      </button>

                      <div className="agenda-list schedule-list-day__events">
                        {group.items.map((event) => (
                          <ScheduleEventDigestCard
                            actionLoading={actionLoading}
                            event={event}
                            fullLabel={buildEventFullLabel(
                              event,
                              showInlineAssignee,
                            )}
                            key={event.id}
                            onOpen={openEventDetail}
                            showInlineAssignee={showInlineAssignee}
                            sourceLabel={getEventSourceLabel(event, brandKey)}
                            tone={getEventVisualTone(event)}
                            variant="day"
                            {...sharedQuickActionHandlers}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <EmptyState
                    description="当前筛选下没有列表结果，可以切回月视图查看空白日期，或重置筛选条件。"
                    title="列表视图暂无日程"
                  />
                )}
              </section>
            ) : null}
          </section>
        </div>

        <aside className="workspace-side sticky-side">
          <DayWorkbenchPanel
            actionLoading={actionLoading}
            dateKey={selectedDateKey}
            events={dayPanelEvents}
            festival={selectedFestival}
            getEventVisualTone={getEventVisualTone}
            getEventSourceLabel={(event) => getEventSourceLabel(event, brandKey)}
            isToday={selectedDateKey === toDateKey(new Date())}
            isWeekend={selectedDateIsWeekend}
            onCreate={() => openTaskEditor(selectedDateKey)}
            onEventOpen={openEventDetail}
            onQuickImportCandidate={(item) =>
              openImportModal([item.id], selectedDateKey, true)
            }
            onImport={() => openImportModal()}
            onOpenDayView={() => {
              setCalendarView("day");
              syncScheduleRoute({ view: "day" });
            }}
            onFilterChange={(value: DayWorkbenchFilter) =>
              setDayPanelFilter(value)
            }
            filter={dayPanelFilter}
            showAssignee={scopeMode === "team"}
            showTeamScope={scopeMode === "team"}
            stats={selectedDateStats}
            unscheduledItems={visibleImportCandidates.slice(0, 6)}
            {...sharedQuickActionHandlers}
          />
        </aside>
      </section>

      <ScheduleImportPlanModal
        allDay={importDraftAllDay}
        date={importDraftDate}
        error={error}
        items={visibleImportCandidates}
        loading={importLoading}
        onAllDayChange={setImportDraftAllDay}
        onClose={() => {
          setImportModalOpen(false);
          setSelectedImportIds([]);
        }}
        onConfirm={importSelectedPlans}
        onDateChange={setImportDraftDate}
        onTimeChange={setImportDraftTime}
        onToggle={toggleImportSelection}
        open={importModalOpen}
        saving={importSaving}
        selectedIds={selectedImportIds}
        time={importDraftTime}
      />

      <ScheduleConflictModal
        conflicts={
          pendingConflictPayload?.conflicts.map((item) => ({
            id: item.id,
            title: item.title,
            timeRange: buildEventConflictLabel(item),
          })) ?? []
        }
        onClose={() => setPendingConflictPayload(null)}
        onConfirm={() => {
          if (!pendingConflictPayload) {
            return;
          }
          void submitTaskPayload(pendingConflictPayload.payload);
        }}
        open={Boolean(pendingConflictPayload)}
      />

      <ManagementDrawer
        actions={
          <>
            <button
              className="button secondary inline"
              onClick={() => {
                setPendingConflictPayload(null);
                setTaskEditorOpen(false);
              }}
              type="button"
            >
              取消
            </button>
            {editorMode === "create" ? (
              <button
                className="button ghost inline"
                disabled={saving || !taskForm.title.trim()}
                form="schedule-task-form"
                onClick={() => setEditorSubmitAction("save_and_continue")}
                type="submit"
              >
                {saving && editorSubmitAction === "save_and_continue"
                  ? "创建中..."
                  : "创建并继续新增"}
              </button>
            ) : null}
            <button
              className="button inline"
              disabled={saving || !taskForm.title.trim()}
              form="schedule-task-form"
              onClick={() => setEditorSubmitAction("save")}
              type="submit"
            >
              {saving
                ? "保存中..."
                : editorMode === "create"
                  ? "创建日程"
                  : "保存修改"}
            </button>
          </>
        }
        eyebrow="日程"
        onClose={() => {
          setPendingConflictPayload(null);
          setTaskEditorOpen(false);
        }}
        open={taskEditorOpen}
        size={editorMode === "create" ? "medium" : "large"}
        subtitle={
          editorMode === "create"
            ? `已自动带入日期：${taskForm.date}${taskForm.endDate !== taskForm.date ? ` 至 ${taskForm.endDate}` : ""}`
            : "在弹窗内完成编辑，不必离开当前月历视图。"
        }
        title={editorMode === "create" ? "新增日程" : "编辑日程"}
      >
        <form
          className="stack"
          id="schedule-task-form"
          onSubmit={handleSubmitTask}
        >
          <section className="drawer-section">
            <h4>基础信息</h4>
            <div className="field">
              <label htmlFor="task-title">日程标题</label>
              <input
                id="task-title"
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder={
                  isManagementBrand
                    ? "例如：周二班表确认会"
                    : "例如：华穗农场报价确认会"
                }
                value={taskForm.title}
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="task-type">日程类型</label>
                <select
                  id="task-type"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  value={taskForm.type}
                >
                  {resolvedTaskTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="task-status">状态</label>
                <select
                  id="task-status"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  value={taskForm.status}
                >
                  {taskStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="task-priority">优先级</label>
                <select
                  id="task-priority"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      priority: event.target.value as TaskFormState["priority"],
                    }))
                  }
                  value={taskForm.priority}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="task-source-module">来源模块</label>
                <select
                  id="task-source-module"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      sourceModule: event.target.value,
                    }))
                  }
                  value={taskForm.sourceModule}
                >
                  {resolvedSourceModuleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <h4>时间信息</h4>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="task-date">开始日期</label>
                <input
                  id="task-date"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      date: event.target.value,
                      endDate:
                        current.endDate && current.endDate >= event.target.value
                          ? current.endDate
                          : event.target.value,
                    }))
                  }
                  type="date"
                  value={taskForm.date}
                />
              </div>

              <div className="field">
                <label htmlFor="task-end-date">结束日期</label>
                <input
                  id="task-end-date"
                  min={taskForm.date}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      endDate: event.target.value || current.date,
                    }))
                  }
                  type="date"
                  value={taskForm.endDate}
                />
              </div>
            </div>

            <label className="checkbox-row drawer-checkbox">
              <input
                checked={taskForm.allDay}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    allDay: event.target.checked,
                    startTime: event.target.checked
                      ? ""
                      : current.startTime || "09:00",
                    endTime: event.target.checked ? "" : current.endTime,
                  }))
                }
                type="checkbox"
              />
              <span>全天事项</span>
            </label>

            {!taskForm.allDay ? (
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="task-start-time">开始时间</label>
                  <input
                    id="task-start-time"
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                    }
                    type="time"
                    value={taskForm.startTime}
                  />
                </div>

                <div className="field">
                  <label htmlFor="task-end-time">结束时间</label>
                  <input
                    id="task-end-time"
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        endTime: event.target.value,
                      }))
                    }
                    type="time"
                    value={taskForm.endTime}
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="drawer-section">
            <h4>负责人与可见范围</h4>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="task-assignee">负责人</label>
                <select
                  disabled={!canAssign}
                  id="task-assignee"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      assigneeUserId: event.target.value,
                    }))
                  }
                  value={taskForm.assigneeUserId}
                >
                  {currentUser ? (
                    <option value={currentUser.id}>
                      {currentUser.wecomName ?? currentUser.name}
                    </option>
                  ) : null}
                  {canAssign
                    ? otherUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.displayName}
                        </option>
                      ))
                    : null}
                </select>
              </div>

              <div className="field">
                <label htmlFor="task-visibility">可见范围</label>
                <select
                  disabled={!canViewTeam}
                  id="task-visibility"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      visibility: event.target
                        .value as TaskFormState["visibility"],
                    }))
                  }
                  value={taskForm.visibility}
                >
                  {visibilityOptions
                    .filter(
                      (option) => canViewTeam || option.value === "PRIVATE",
                    )
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </section>

          {!isManagementBrand ? (
            <section className="drawer-section">
              <h4>关联对象</h4>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="task-customer">关联客户</label>
                  <SearchableSelect
                    emptyText="没有匹配的客户"
                    id="task-customer"
                    onChange={(nextCustomerId) => {
                      setTaskForm((current) => {
                        const keepQuotation =
                          current.quotationId &&
                          quotations.some(
                            (quotation) =>
                              quotation.id === current.quotationId &&
                              quotation.customer.id === nextCustomerId,
                          );
                        const keepAgriculturePlan =
                          current.agriculturePlanId &&
                          agriculturePlanOptions.some(
                            (plan) =>
                              plan.id === current.agriculturePlanId &&
                              plan.customer.id === nextCustomerId,
                          );

                        return {
                          ...current,
                          customerId: nextCustomerId,
                          quotationId: keepQuotation ? current.quotationId : "",
                          agriculturePlanId: keepAgriculturePlan
                            ? current.agriculturePlanId
                            : "",
                          solutionLabel: keepAgriculturePlan
                            ? current.solutionLabel
                            : "",
                        };
                      });
                    }}
                    options={customerSearchOptions}
                    placeholder="搜索客户名称 / 企业"
                    value={taskForm.customerId}
                  />
                </div>

                <div className="field">
                  <label htmlFor="task-quotation">关联报价</label>
                  <SearchableSelect
                    emptyText="没有匹配的报价"
                    id="task-quotation"
                    onChange={(nextQuotationId) => {
                      const matchedQuotation = quotations.find(
                        (quotation) => quotation.id === nextQuotationId,
                      );
                      setTaskForm((current) => {
                        const keepAgriculturePlan =
                          current.agriculturePlanId &&
                          agriculturePlanOptions.some(
                            (plan) =>
                              plan.id === current.agriculturePlanId &&
                              plan.quotationId === nextQuotationId,
                          );

                        return {
                          ...current,
                          quotationId: nextQuotationId,
                          customerId:
                            matchedQuotation?.customer.id ?? current.customerId,
                          agriculturePlanId: keepAgriculturePlan
                            ? current.agriculturePlanId
                            : "",
                          solutionLabel: keepAgriculturePlan
                            ? current.solutionLabel
                            : "",
                        };
                      });
                    }}
                    options={availableQuotationOptions}
                    placeholder="搜索报价单号 / 客户"
                    value={taskForm.quotationId}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="task-solution">关联方案</label>
                <SearchableSelect
                  emptyText="没有匹配的正式方案"
                  id="task-solution"
                  onChange={(nextAgriculturePlanId) => {
                    const matchedPlan = agriculturePlanOptions.find(
                      (plan) => plan.id === nextAgriculturePlanId,
                    );
                    setTaskForm((current) => ({
                      ...current,
                      agriculturePlanId: nextAgriculturePlanId,
                      quotationId:
                        matchedPlan?.quotationId ?? current.quotationId,
                      customerId: matchedPlan?.customer.id ?? current.customerId,
                      solutionLabel: matchedPlan?.label ?? "",
                    }));
                  }}
                  options={availableAgriculturePlanOptions}
                  placeholder="搜索方案名称 / 方案报价单号"
                  value={taskForm.agriculturePlanId}
                />
                {!taskForm.agriculturePlanId && taskForm.solutionLabel ? (
                  <div className="small muted">
                    历史记录：{taskForm.solutionLabel}
                  </div>
                ) : null}
              </div>

              {selectedCustomer || selectedQuotation || selectedSolutionLabel ? (
                <div className="summary-card">
                  <div className="summary-list">
                    {selectedCustomer ? (
                      <div className="summary-row">
                        <span>客户</span>
                        <strong>
                          {selectedCustomer.name}
                          {selectedCustomer.companyName
                            ? ` · ${selectedCustomer.companyName}`
                            : ""}
                        </strong>
                      </div>
                    ) : null}
                    {selectedQuotation ? (
                      <div className="summary-row">
                        <span>报价</span>
                        <strong>
                          {selectedQuotation.quotationNo} ·{" "}
                          {selectedQuotation.customer.name}
                        </strong>
                      </div>
                    ) : null}
                    {selectedSolutionLabel ? (
                      <div className="summary-row">
                        <span>方案</span>
                        <strong>{selectedSolutionLabel}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="drawer-section">
            <h4>内容与提醒</h4>
            <div className="field">
              <label htmlFor="task-content">事项说明</label>
              <textarea
                id="task-content"
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder="补充背景、准备材料、会议目的"
                rows={4}
                value={taskForm.content}
              />
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="task-summary">沟通摘要</label>
                <textarea
                  id="task-summary"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="记录已沟通到哪一步"
                  rows={4}
                  value={taskForm.summary}
                />
              </div>

              <div className="field">
                <label htmlFor="task-next-action">下一步动作</label>
                <textarea
                  id="task-next-action"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      nextAction: event.target.value,
                    }))
                  }
                  placeholder={
                    isManagementBrand
                      ? "例如：周五前确认值班安排、下周二跟进培训时间"
                      : "例如：周五前补报价、下周二回访"
                  }
                  rows={4}
                  value={taskForm.nextAction}
                />
              </div>
            </div>

            <div className="grid-2">
              <label className="checkbox-row drawer-checkbox">
                <input
                  checked={taskForm.hasReminder}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      hasReminder: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>是否提醒</span>
              </label>

              <label className="checkbox-row drawer-checkbox">
                <input
                  checked={taskForm.repeatEnabled}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      repeatEnabled: event.target.checked,
                      repeatRule: event.target.checked
                        ? current.repeatRule
                        : "NONE",
                    }))
                  }
                  type="checkbox"
                />
                <span>是否重复</span>
              </label>
            </div>

            {taskForm.hasReminder ? (
              <div className="field">
                <label htmlFor="task-reminder-at">提醒时间</label>
                <input
                  id="task-reminder-at"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      reminderAt: event.target.value,
                    }))
                  }
                  type="datetime-local"
                  value={taskForm.reminderAt}
                />
              </div>
            ) : null}

            {taskForm.repeatEnabled ? (
              <div className="field">
                <label htmlFor="task-repeat-rule">重复规则</label>
                <select
                  id="task-repeat-rule"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      repeatRule: event.target
                        .value as TaskFormState["repeatRule"],
                    }))
                  }
                  value={taskForm.repeatRule}
                >
                  {repeatRuleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </section>
        </form>
      </ManagementDrawer>

      <ManagementDrawer
        actions={
          detailEvent?.source === "task" && detailEditMode ? (
            <>
              <button
                className="button secondary inline"
                onClick={() => setDetailEditMode(false)}
                type="button"
              >
                取消编辑
              </button>
              <button
                className="button inline"
                disabled={saving || !taskForm.title.trim()}
                form="schedule-task-form"
                onClick={() => setEditorSubmitAction("save")}
                type="submit"
              >
                {saving ? "保存中..." : "保存修改"}
              </button>
            </>
          ) : detailEvent?.source === "task" ? (
            <>
              <button
                className="button secondary inline"
                onClick={() => setDetailOpen(false)}
                type="button"
              >
                关闭
              </button>
              <button
                className="button ghost inline"
                onClick={() => {
                  loadTaskIntoForm(detailEvent.raw as TaskRecord);
                  setDetailEditMode(true);
                }}
                type="button"
              >
                编辑
              </button>
              <button
                className="button ghost inline"
                disabled={actionLoading}
                onClick={() =>
                  updateTaskStatus(
                    detailEvent.raw as TaskRecord,
                    (detailEvent.raw as TaskRecord).status === "DONE"
                      ? "TODO"
                      : "DONE",
                  )
                }
                type="button"
              >
                {(detailEvent.raw as TaskRecord).status === "DONE"
                  ? "恢复未完成"
                  : "标记完成"}
              </button>
              <button
                className="button ghost inline"
                onClick={() => {
                  const task = detailEvent.raw as TaskRecord;
                  setEditorMode("create");
                  setEditorTaskId(null);
                  setTaskForm(
                    duplicateTaskForm(
                      task,
                      selectedDateKey,
                      currentUser?.id,
                      brandKey,
                    ),
                  );
                  setTaskEditorOpen(true);
                }}
                type="button"
              >
                复制事项
              </button>
              <button
                className="button ghost inline"
                onClick={() => {
                  const task = detailEvent.raw as TaskRecord;
                  loadTaskIntoForm(task);
                  setTaskForm((current) => ({
                    ...current,
                    hasReminder: true,
                    reminderAt:
                      current.reminderAt ||
                      withDateKey(current.date, task.startAt, 8, 30),
                  }));
                  setTaskEditorOpen(true);
                }}
                type="button"
              >
                新增关联提醒
              </button>
              <button
                className="button ghost inline"
                disabled={actionLoading}
                onClick={() => delayTask(detailEvent.raw as TaskRecord, 1)}
                type="button"
              >
                延后到明天
              </button>
              <button
                className="button ghost inline"
                disabled={actionLoading}
                onClick={() => delayTask(detailEvent.raw as TaskRecord, 3)}
                type="button"
              >
                延后 3 天
              </button>
              <button
                className="button ghost inline"
                disabled={actionLoading}
                onClick={() => delayTask(detailEvent.raw as TaskRecord, 7)}
                type="button"
              >
                延后下周
              </button>
              <button
                className="button ghost inline danger-text"
                disabled={actionLoading}
                onClick={() => deleteTask(detailEvent.raw as TaskRecord)}
                type="button"
              >
                删除
              </button>
            </>
          ) : detailEvent?.source === "workspace" ? (
            <>
              <button
                className="button secondary inline"
                onClick={() => setDetailOpen(false)}
                type="button"
              >
                关闭
              </button>
              <button
                className="button ghost inline"
                disabled={actionLoading}
                onClick={() =>
                  handleWorkspaceAction(detailEvent.raw as LocalWorkspaceItem)
                }
                type="button"
              >
                {(detailEvent.raw as LocalWorkspaceItem).status === "done"
                  ? "恢复待处理"
                  : "标记完成"}
              </button>
              <button
                className="button ghost inline danger-text"
                onClick={() => {
                  removeLocalWorkspaceItem(
                    (detailEvent.raw as LocalWorkspaceItem).id,
                  );
                  setDetailOpen(false);
                }}
                type="button"
              >
                移除本地项
              </button>
            </>
          ) : detailEvent?.source === "notification" ? (
            <>
              <button
                className="button secondary inline"
                onClick={() => setDetailOpen(false)}
                type="button"
              >
                关闭
              </button>
              <button
                className="button ghost inline"
                disabled={actionLoading}
                onClick={() =>
                  toggleNotificationRead(detailEvent.raw as NotificationEvent)
                }
                type="button"
              >
                {(detailEvent.raw as NotificationEvent).readAt
                  ? "标记未读"
                  : "标记已读"}
              </button>
              <Link
                className="button inline"
                href={detailEvent.href ?? "/notifications"}
              >
                打开来源
              </Link>
            </>
          ) : detailEvent?.source === "festival" &&
            typeof detailEvent.raw === "object" &&
            detailEvent.raw !== null &&
            "sourceUrl" in detailEvent.raw &&
            (detailEvent.raw as ChinaCalendarInfo).sourceUrl ? (
            <>
              <button
                className="button secondary inline"
                onClick={() => setDetailOpen(false)}
                type="button"
              >
                关闭
              </button>
              <a
                className="button inline"
                href={(detailEvent.raw as ChinaCalendarInfo).sourceUrl!}
                rel="noreferrer"
                target="_blank"
              >
                查看官方通知
              </a>
            </>
          ) : (
            <button
              className="button secondary inline"
              onClick={() => setDetailOpen(false)}
              type="button"
            >
              关闭
            </button>
          )
        }
        eyebrow="日程详情"
        onClose={() => {
          setDetailEditMode(false);
          setDetailOpen(false);
        }}
        open={detailOpen}
        size="large"
        subtitle={
          detailEvent
            ? `${detailEvent.rangeStartDateKey && detailEvent.rangeEndDateKey && detailEvent.rangeStartDateKey !== detailEvent.rangeEndDateKey ? `${detailEvent.rangeStartDateKey} 至 ${detailEvent.rangeEndDateKey}` : detailEvent.dateKey} · ${detailEvent.isAllDay ? "全天" : detailEvent.timeLabel} · ${detailEvent.badgeLabel}`
            : "在这里快速处理状态，不需要离开月历页面。"
        }
        title={detailEvent?.title ?? "事项详情"}
      >
        {detailEvent ? (
          detailEvent.source === "task" && detailEditMode && detailTask ? (
            <form
              className="stack"
              id="schedule-task-form"
              onSubmit={handleSubmitTask}
            >
              <section className="drawer-section">
                <h4>基础信息</h4>
                <div className="field">
                  <label htmlFor="detail-task-title">日程标题</label>
                  <input
                    id="detail-task-title"
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    value={taskForm.title}
                  />
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="detail-task-type">类型</label>
                    <select
                      id="detail-task-type"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          type: event.target.value,
                        }))
                      }
                      value={taskForm.type}
                    >
                      {resolvedTaskTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="detail-task-status">状态</label>
                    <select
                      id="detail-task-status"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      value={taskForm.status}
                    >
                      {taskStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="detail-task-priority">优先级</label>
                    <select
                      id="detail-task-priority"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          priority: event.target
                            .value as TaskFormState["priority"],
                        }))
                      }
                      value={taskForm.priority}
                    >
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="checkbox-row drawer-checkbox">
                    <input
                      checked={taskForm.allDay}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          allDay: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>全天事项</span>
                  </label>
                </div>
              </section>

              <section className="drawer-section">
                <h4>时间与协作</h4>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="detail-task-date">开始日期</label>
                    <input
                      id="detail-task-date"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          date: event.target.value,
                          endDate:
                            current.endDate &&
                            current.endDate >= event.target.value
                              ? current.endDate
                              : event.target.value,
                        }))
                      }
                      type="date"
                      value={taskForm.date}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="detail-task-end-date">结束日期</label>
                    <input
                      id="detail-task-end-date"
                      min={taskForm.date}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          endDate: event.target.value || current.date,
                        }))
                      }
                      type="date"
                      value={taskForm.endDate}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="detail-task-assignee">负责人</label>
                    <select
                      disabled={!canAssign}
                      id="detail-task-assignee"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          assigneeUserId: event.target.value,
                        }))
                      }
                      value={taskForm.assigneeUserId}
                    >
                      {currentUser ? (
                        <option value={currentUser.id}>
                          {currentUser.wecomName ?? currentUser.name}
                        </option>
                      ) : null}
                      {canAssign
                        ? otherUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.displayName}
                            </option>
                          ))
                        : null}
                    </select>
                  </div>
                  <label className="checkbox-row drawer-checkbox">
                    <input
                      checked={taskForm.allDay}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          allDay: event.target.checked,
                          startTime: event.target.checked
                            ? ""
                            : current.startTime || "09:00",
                          endTime: event.target.checked ? "" : current.endTime,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>全天事项</span>
                  </label>
                </div>

                {!taskForm.allDay ? (
                  <div className="grid-2">
                    <div className="field">
                      <label htmlFor="detail-task-start-time">开始时间</label>
                      <input
                        id="detail-task-start-time"
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            startTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={taskForm.startTime}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="detail-task-end-time">结束时间</label>
                      <input
                        id="detail-task-end-time"
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                        type="time"
                        value={taskForm.endTime}
                      />
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="drawer-section">
                <h4>{isManagementBrand ? "内容记录" : "关联与内容"}</h4>
                {!isManagementBrand ? (
                  <>
                    <div className="grid-2">
                      <div className="field">
                        <label htmlFor="detail-task-customer">关联客户</label>
                        <SearchableSelect
                          emptyText="没有匹配的客户"
                          id="detail-task-customer"
                          onChange={(nextCustomerId) => {
                            setTaskForm((current) => {
                              const keepQuotation =
                                current.quotationId &&
                                quotations.some(
                                  (quotation) =>
                                    quotation.id === current.quotationId &&
                                    quotation.customer.id === nextCustomerId,
                                );
                              const keepAgriculturePlan =
                                current.agriculturePlanId &&
                                agriculturePlanOptions.some(
                                  (plan) =>
                                    plan.id === current.agriculturePlanId &&
                                    plan.customer.id === nextCustomerId,
                                );

                              return {
                                ...current,
                                customerId: nextCustomerId,
                                quotationId: keepQuotation
                                  ? current.quotationId
                                  : "",
                                agriculturePlanId: keepAgriculturePlan
                                  ? current.agriculturePlanId
                                  : "",
                                solutionLabel: keepAgriculturePlan
                                  ? current.solutionLabel
                                  : "",
                              };
                            });
                          }}
                          options={customerSearchOptions}
                          placeholder="搜索客户名称 / 企业"
                          value={taskForm.customerId}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="detail-task-quotation">关联报价</label>
                        <SearchableSelect
                          emptyText="没有匹配的报价"
                          id="detail-task-quotation"
                          onChange={(nextQuotationId) => {
                            const matchedQuotation = quotations.find(
                              (quotation) => quotation.id === nextQuotationId,
                            );
                            setTaskForm((current) => {
                              const keepAgriculturePlan =
                                current.agriculturePlanId &&
                                agriculturePlanOptions.some(
                                  (plan) =>
                                    plan.id === current.agriculturePlanId &&
                                    plan.quotationId === nextQuotationId,
                                );

                              return {
                                ...current,
                                quotationId: nextQuotationId,
                                customerId:
                                  matchedQuotation?.customer.id ??
                                  current.customerId,
                                agriculturePlanId: keepAgriculturePlan
                                  ? current.agriculturePlanId
                                  : "",
                                solutionLabel: keepAgriculturePlan
                                  ? current.solutionLabel
                                  : "",
                              };
                            });
                          }}
                          options={availableQuotationOptions}
                          placeholder="搜索报价单号 / 客户"
                          value={taskForm.quotationId}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="detail-task-solution">关联方案</label>
                      <SearchableSelect
                        emptyText="没有匹配的正式方案"
                        id="detail-task-solution"
                        onChange={(nextAgriculturePlanId) => {
                          const matchedPlan = agriculturePlanOptions.find(
                            (plan) => plan.id === nextAgriculturePlanId,
                          );
                          setTaskForm((current) => ({
                            ...current,
                            agriculturePlanId: nextAgriculturePlanId,
                            quotationId:
                              matchedPlan?.quotationId ?? current.quotationId,
                            customerId:
                              matchedPlan?.customer.id ?? current.customerId,
                            solutionLabel: matchedPlan?.label ?? "",
                          }));
                        }}
                        options={availableAgriculturePlanOptions}
                        placeholder="搜索方案名称 / 方案报价单号"
                        value={taskForm.agriculturePlanId}
                      />
                      {!taskForm.agriculturePlanId && taskForm.solutionLabel ? (
                        <div className="small muted">
                          历史记录：{taskForm.solutionLabel}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}

                <div className="field">
                  <label htmlFor="detail-task-content">事项说明</label>
                  <textarea
                    id="detail-task-content"
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                    rows={4}
                    value={taskForm.content}
                  />
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="detail-task-summary">沟通摘要</label>
                    <textarea
                      id="detail-task-summary"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          summary: event.target.value,
                        }))
                      }
                      rows={4}
                      value={taskForm.summary}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="detail-task-next-action">下一步动作</label>
                    <textarea
                      id="detail-task-next-action"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          nextAction: event.target.value,
                        }))
                      }
                      rows={4}
                      value={taskForm.nextAction}
                    />
                  </div>
                </div>
              </section>
            </form>
          ) : (
            <div className="stack">
              <section className="drawer-section">
                <h4>基础信息</h4>
                <div className="summary-card">
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>类型</span>
                      <strong>{detailEvent.badgeLabel}</strong>
                    </div>
                    <div className="summary-row">
                      <span>状态</span>
                      <strong>{detailEvent.statusLabel ?? "未设置"}</strong>
                    </div>
                    <div className="summary-row">
                      <span>时间</span>
                      <strong>
                        {detailEvent.isAllDay
                          ? detailEvent.dateKey
                          : `${detailEvent.dateKey} ${detailEvent.timeLabel}`}
                      </strong>
                    </div>
                    {detailEvent.assigneeLabel ? (
                      <div className="summary-row">
                        <span>负责人</span>
                        <strong>{detailEvent.assigneeLabel}</strong>
                      </div>
                    ) : null}
                    {detailTaskMeta ? (
                      <>
                        <div className="summary-row">
                          <span>优先级</span>
                          <strong>
                            {priorityOptions.find(
                              (item) => item.value === detailTaskMeta.priority,
                            )?.label ?? "普通"}
                          </strong>
                        </div>
                        <div className="summary-row">
                          <span>可见范围</span>
                          <strong>
                            {visibilityOptions.find(
                              (item) =>
                                item.value === detailTaskMeta.visibility,
                            )?.label ?? "仅自己可见"}
                          </strong>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="drawer-section">
                <h4>{isManagementBrand ? "协同来源" : "关联对象"}</h4>
                <div className="summary-card">
                  <div className="summary-list">
                    {isManagementBrand ? (
                      <>
                        <div className="summary-row">
                          <span>来源模块</span>
                          <strong>{detailSourceLabel || "手动创建"}</strong>
                        </div>
                        <div className="summary-row">
                          <span>记录方式</span>
                          <strong>{detailRecordLabel || "内部协同事项"}</strong>
                        </div>
                        {!detailSourceLabel && !detailRecordLabel ? (
                          <div className="summary-row">
                            <span>协同来源</span>
                            <strong>当前为手动建立的内部事项</strong>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {detailTask?.customer ? (
                          <div className="summary-row">
                            <span>客户</span>
                            <Link href={`/customers/${detailTask.customer.id}`}>
                              {detailTask.customer.name}
                            </Link>
                          </div>
                        ) : (
                          <div className="summary-row">
                            <span>客户</span>
                            <strong>未关联</strong>
                          </div>
                        )}
                        {detailTask?.quotation ? (
                          <div className="summary-row">
                            <span>报价</span>
                            <Link href={`/quotations/${detailTask.quotation.id}`}>
                              {detailTask.quotation.quotationNo}
                            </Link>
                          </div>
                        ) : null}
                        {detailTask?.agriculturePlan ? (
                          <div className="summary-row">
                            <span>方案</span>
                            <Link
                              href={`/solutions/agriculture/${detailTask.agriculturePlan.quotationId}`}
                            >
                              {detailTask.agriculturePlan.planName}
                            </Link>
                          </div>
                        ) : detailTaskMeta?.solutionLabel ? (
                          <div className="summary-row">
                            <span>方案</span>
                            <strong>{detailTaskMeta.solutionLabel}</strong>
                          </div>
                        ) : null}
                      </>
                    )}
                    {!isManagementBrand && detailTaskMeta?.sourceModule ? (
                      <div className="summary-row">
                        <span>来源模块</span>
                        <strong>{detailTaskMeta.sourceModule}</strong>
                      </div>
                    ) : null}
                    {!isManagementBrand && !detailTask && detailEvent.relationLabel ? (
                      <div className="summary-row">
                        <span>关联对象</span>
                        <strong>{detailEvent.relationLabel}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="drawer-section">
                <h4>内容说明</h4>
                <div className="field">
                  <label>事项说明</label>
                  <div className="detail-note">
                    {detailTaskMeta?.note || detailEvent.detail}
                  </div>
                </div>
                {detailTaskMeta?.summary ? (
                  <div className="field">
                    <label>沟通摘要</label>
                    <div className="detail-note">{detailTaskMeta.summary}</div>
                  </div>
                ) : null}
                {detailTaskMeta?.nextAction ? (
                  <div className="field">
                    <label>下一步动作</label>
                    <div className="detail-note">
                      {detailTaskMeta.nextAction}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="drawer-section">
                <h4>提醒与协作</h4>
                <div className="summary-card">
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>是否提醒</span>
                      <strong>{detailTask?.reminderAt ? "是" : "否"}</strong>
                    </div>
                    {detailTask?.reminderAt ? (
                      <div className="summary-row">
                        <span>提醒时间</span>
                        <strong>
                          {formatDateTimeLabel(detailTask.reminderAt)}
                        </strong>
                      </div>
                    ) : null}
                    {detailTaskMeta ? (
                      <div className="summary-row">
                        <span>重复规则</span>
                        <strong>
                          {repeatRuleOptions.find(
                            (item) => item.value === detailTaskMeta.repeatRule,
                          )?.label ?? "不重复"}
                        </strong>
                      </div>
                    ) : null}
                    {detailTask?.creator ? (
                      <div className="summary-row">
                        <span>创建人</span>
                        <strong>{detailTask.creator.displayName}</strong>
                      </div>
                    ) : null}
                    {detailTask ? (
                      <>
                        <div className="summary-row">
                          <span>创建时间</span>
                          <strong>
                            {formatDateTimeLabel(detailTask.createdAt)}
                          </strong>
                        </div>
                        <div className="summary-row">
                          <span>更新时间</span>
                          <strong>
                            {formatDateTimeLabel(detailTask.updatedAt)}
                          </strong>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              {detailTask ? (
                <DiscussionPanel
                  commentsPath={`/tasks/${detailTask.id}/comments`}
                  description="這裡用來討論日程安排、補充交接與跟進回覆，新增留言後會進入通知中心。"
                  title="日程討論"
                />
              ) : null}

              {detailEvent.href && detailEvent.href !== "/schedule" ? (
                <Link
                  className="button secondary inline"
                  href={detailEvent.href}
                >
                  打开关联页面
                </Link>
              ) : null}
            </div>
          )
        ) : null}
      </ManagementDrawer>

      <ScheduleConflictModal
        conflicts={
          pendingConflictPayload?.conflicts.map((item) => ({
            id: item.id,
            title: item.title,
            timeRange: buildEventConflictLabel(item),
          })) ?? []
        }
        onClose={() => setPendingConflictPayload(null)}
        onConfirm={() => {
          if (!pendingConflictPayload) {
            return;
          }

          const nextPayload = pendingConflictPayload.payload;
          setPendingConflictPayload(null);
          void submitTaskPayload(nextPayload);
        }}
        open={Boolean(pendingConflictPayload)}
      />
    </div>
  );
}
