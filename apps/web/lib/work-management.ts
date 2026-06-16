"use client";

export type WorkManagementOwner = {
  id: string;
  name: string;
  displayName: string;
};

export type PendingWeeklyReportSummary = {
  needsAttention: boolean;
  status: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED" | "MISSING";
  weekStartDate: string;
  weekEndDate: string;
  label: string;
  href: string;
  openReviewCount: number;
  planItemCount: number;
  reportId: string | null;
};

export type PendingMonthlyGoalSummary = {
  needsAttention: boolean;
  status: "DRAFT" | "SUBMITTED" | "MISSING";
  targetYear: number;
  targetMonth: number;
  label: string;
  href: string;
  itemCount: number;
  goalId: string | null;
};

export type WeeklyReportReviewItem = {
  id: string;
  sourcePlanItemId?: string | null;
  title: string;
  description?: string | null;
  plannedAt?: string | null;
  status: "PENDING" | "COMPLETED" | "INCOMPLETE";
  incompleteReason?: string | null;
  sortOrder: number;
};

export type WeeklyReportPlanItem = {
  id?: string;
  sourceReviewItemId?: string | null;
  taskId?: string | null;
  title: string;
  description?: string | null;
  plannedAt?: string | null;
  sortOrder: number;
};

export type WeeklyReportSummary = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  label: string;
  status: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED";
  owner: WorkManagementOwner;
  updatedAt?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  reviewer?: WorkManagementOwner | null;
  completedSummary?: string | null;
  focusSummary?: string | null;
  reviewItemCount: number;
  openReviewCount: number;
  incompleteCarryOverCount: number;
  planItemCount: number;
  scheduledPlanCount: number;
};

export type WeeklyReportDetail = WeeklyReportSummary & {
  canEdit: boolean;
  canReview: boolean;
  reviewItems: WeeklyReportReviewItem[];
  planItems: WeeklyReportPlanItem[];
};

export type WeeklyReportTeamClosureStatus = WeeklyReportSummary["status"] | "MISSING";

export type WeeklyReportTeamClosureRow = {
  userId: string;
  displayName: string;
  department?: string | null;
  status: WeeklyReportTeamClosureStatus;
  reportId?: string | null;
  label: string;
  href: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
  openReviewCount: number;
  planItemCount: number;
  needsReminder: boolean;
};

export type WeeklyReportTeamClosureResponse = {
  weekStartDate: string;
  weekEndDate: string;
  label: string;
  summary: {
    totalMembers: number;
    missingCount: number;
    draftCount: number;
    returnedCount: number;
    submittedCount: number;
    approvedCount: number;
    needsReminderCount: number;
  };
  rows: WeeklyReportTeamClosureRow[];
};

export type RemindWeeklyReportsResponse = {
  success: boolean;
  remindedCount: number;
  targets: WeeklyReportTeamClosureRow[];
};

export type DeriveWeeklyReportTasksResponse = {
  success: boolean;
  createdCount: number;
  tasks: Array<{
    id: string;
    title: string;
    planItemId: string;
    startAt: string;
  }>;
  report?: WeeklyReportDetail;
};

export type WeeklyPublicDigestSourceReport = {
  id: string;
  label: string;
  status: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED";
  submittedAt?: string | null;
  href: string;
  owner: WorkManagementOwner;
};

export type WeeklyPublicDigest = {
  id: string;
  label: string;
  weekStartDate: string;
  weekEndDate: string;
  department: {
    key: string;
    label: string;
  };
  provider: string;
  generatedAt?: string | null;
  publishedAt?: string | null;
  updatedAt: string;
  generatedSummary?: string | null;
  publishedSummary?: string | null;
  finalSummary: string;
  canEdit: boolean;
  publisher?: WorkManagementOwner | null;
  source: {
    totalReportCount: number;
    includedReportCount: number;
    approvedReportCount: number;
  };
  sourceReports: WeeklyPublicDigestSourceReport[];
};

export type MonthlyGoalItem = {
  id?: string;
  title: string;
  metric?: string | null;
  dueAt?: string | null;
  progressNote?: string | null;
  riskNote?: string | null;
  sortOrder: number;
};

export type MonthlyGoalSummary = {
  id: string;
  targetYear: number;
  targetMonth: number;
  label: string;
  status: "DRAFT" | "SUBMITTED";
  owner: WorkManagementOwner;
  updatedAt?: string | null;
  submittedAt?: string | null;
  summary?: string | null;
  itemCount: number;
  scheduledItemCount: number;
};

export type MonthlyGoalAiSummary = {
  goalId: string;
  provider: string;
  generatedAt: string;
  sourcePeriod: {
    year: number;
    month: number;
    label: string;
  };
  source: {
    weeklyReportCount: number;
    submittedWeeklyReportCount: number;
    goalItemCount: number;
  };
  weeklyReports: Array<{
    id: string;
    label: string;
    status: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED";
    submittedAt?: string | null;
    href: string;
  }>;
  sections: {
    highlights: string;
    patterns: string;
    risks: string;
    carryovers: string;
    nextMonthSuggestions: string;
  };
};

export type MonthlyGoalAiSummarySnapshot = MonthlyGoalAiSummary & {
  snapshotId: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyGoalDetail = MonthlyGoalSummary & {
  canEdit: boolean;
  items: MonthlyGoalItem[];
  aiSummaries: MonthlyGoalAiSummarySnapshot[];
};

export type LastMonthCarryOverItem = {
  id: string;
  title: string;
  description?: string | null;
  incompleteReason?: string | null;
  plannedAt?: string | null;
  periodLabel: string;
  owner: WorkManagementOwner;
  href: string;
};

export type WorkManagementOverviewResponse = {
  stats: {
    draftWeeklyReportCount: number;
    draftMonthlyGoalCount: number;
    carryOverCount: number;
    lastMonthCarryOverCount: number;
    nextMonthGoalItemCount: number;
  };
  pendingWeeklyReport: PendingWeeklyReportSummary;
  pendingMonthlyGoal: PendingMonthlyGoalSummary;
  lastMonthCarryOvers: LastMonthCarryOverItem[];
  recentWeeklyReports: WeeklyReportSummary[];
  recentMonthlyGoals: MonthlyGoalSummary[];
};

export type WeeklyReportArchiveResponse = {
  filters: {
    year?: number | null;
    month?: number | null;
    status?: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED" | null;
    view: "mine" | "team";
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  availableMonths: Array<{
    year: number;
    month: number;
    count: number;
  }>;
  items: WeeklyReportSummary[];
};

export const WEEKLY_REPORT_STATUS_LABELS = {
  DRAFT: "草稿",
  SUBMITTED: "待主管审阅",
  RETURNED: "已退回",
  APPROVED: "已通过",
  MISSING: "待创建",
} as const;

export const MONTHLY_GOAL_STATUS_LABELS = {
  DRAFT: "草稿",
  SUBMITTED: "已提交",
  MISSING: "待创建",
} as const;

export const PLAN_TYPE_LABELS = {
  CUSTOMER: "服务对象",
  PROJECT: "项目",
  CONTENT: "内容",
  ADMIN: "行政",
  COLLABORATION: "协同",
  OTHER: "其他",
} as const;

export const PRIORITY_LABELS = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
} as const;

export const PLAN_STATUS_LABELS = {
  NOT_STARTED: "未开始",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  AT_RISK: "有风险",
  DELAYED: "已延期",
  CANCELLED: "已取消",
} as const;

export const GOAL_PROGRESS_LABELS = {
  "0": "0%",
  "25": "25%",
  "50": "50%",
  "75": "75%",
  "100": "100%",
} as const;

export const RISK_LEVEL_LABELS = {
  LOW: "低风险",
  MEDIUM: "中风险",
  HIGH: "高风险",
} as const;

export type WeeklyPlanType = keyof typeof PLAN_TYPE_LABELS;
export type WorkPriority = keyof typeof PRIORITY_LABELS;
export type WorkItemStatus = keyof typeof PLAN_STATUS_LABELS;
export type GoalProgress = keyof typeof GOAL_PROGRESS_LABELS;
export type GoalRiskLevel = keyof typeof RISK_LEVEL_LABELS;

export type WeeklySummaryEditorState = {
  achievements: string;
  progress: string;
  risks: string;
  assistance: string;
};

export type MonthlySummaryEditorState = {
  priorities: string;
  deliverables: string;
  risks: string;
};

export type WeeklyPlanEditorItem = WeeklyReportPlanItem & {
  planType: WeeklyPlanType;
  priority: WorkPriority;
  itemStatus: WorkItemStatus;
  relatedEntity: string;
  detail: string;
  syncToCalendar: boolean;
};

export type MonthlyGoalEditorItem = MonthlyGoalItem & {
  deliverable: string;
  metricValue: string;
  progress: GoalProgress;
  itemStatus: WorkItemStatus;
  progressDescription: string;
  supportNeeded: string;
  ownerName: string;
  riskLevel: GoalRiskLevel;
  riskDescription: string;
};

const ABANDON_REASON_PREFIX = "已放弃：";

function normalizeMultiline(value?: string | null) {
  return value?.replace(/\r\n/g, "\n").trim() ?? "";
}

function parseLabeledContent(
  rawValue: string | null | undefined,
  acceptedLabels: string[],
) {
  const result: Record<string, string> = {};
  const fallback: string[] = [];
  const lines = normalizeMultiline(rawValue).split("\n");
  const accepted = new Set(acceptedLabels);
  let activeLabel: string | null = null;
  let buffer: string[] = [];

  function flushActive() {
    if (!activeLabel) {
      return;
    }

    result[activeLabel] = buffer.join("\n").trim();
    activeLabel = null;
    buffer = [];
  }

  for (const line of lines) {
    const match = line.match(/^\[(.+?)\]\s*(.*)$/);

    if (match && accepted.has(match[1])) {
      flushActive();
      activeLabel = match[1];
      buffer = match[2] ? [match[2]] : [];
      continue;
    }

    if (activeLabel) {
      buffer.push(line);
    } else if (line.trim()) {
      fallback.push(line);
    }
  }

  flushActive();

  return {
    sections: result,
    fallback: fallback.join("\n").trim(),
  };
}

function serializeLabeledContent(entries: Array<[string, string]>) {
  return entries
    .map(([label, value]) => {
      const normalized = normalizeMultiline(value);
      return normalized ? `[${label}]\n${normalized}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function findOptionByLabel<T extends string>(
  labels: Record<T, string>,
  value: string | undefined,
  fallback: T,
) {
  const entry = Object.entries(labels).find(([, label]) => label === value);
  return (entry?.[0] as T | undefined) ?? fallback;
}

export function labelForWeeklyReportStatus(
  status: keyof typeof WEEKLY_REPORT_STATUS_LABELS,
) {
  return WEEKLY_REPORT_STATUS_LABELS[status];
}

export function labelForMonthlyGoalStatus(
  status: keyof typeof MONTHLY_GOAL_STATUS_LABELS,
) {
  return MONTHLY_GOAL_STATUS_LABELS[status];
}

export function labelForPlanType(value: WeeklyPlanType) {
  return PLAN_TYPE_LABELS[value];
}

export function labelForPriority(value: WorkPriority) {
  return PRIORITY_LABELS[value];
}

export function labelForWorkItemStatus(value: WorkItemStatus) {
  return PLAN_STATUS_LABELS[value];
}

export function labelForGoalProgress(value: GoalProgress) {
  return GOAL_PROGRESS_LABELS[value];
}

export function labelForRiskLevel(value: GoalRiskLevel) {
  return RISK_LEVEL_LABELS[value];
}

export function isAbandonedReason(value?: string | null) {
  return normalizeMultiline(value).startsWith(ABANDON_REASON_PREFIX);
}

export function encodeAbandonedReason(reason: string) {
  return `${ABANDON_REASON_PREFIX}${reason.trim()}`;
}

export function decodeAbandonedReason(reason?: string | null) {
  if (!isAbandonedReason(reason)) {
    return normalizeMultiline(reason);
  }

  return normalizeMultiline(reason).replace(ABANDON_REASON_PREFIX, "").trim();
}

export function parseWeeklySummaryState(
  completedSummary?: string | null,
  focusSummary?: string | null,
): WeeklySummaryEditorState {
  const parsed = parseLabeledContent(focusSummary, [
    "本周推进说明",
    "本周问题 / 风险",
    "需要协助事项",
  ]);

  return {
    achievements: normalizeMultiline(completedSummary),
    progress:
      parsed.sections["本周推进说明"] || parsed.fallback || "",
    risks: parsed.sections["本周问题 / 风险"] || "",
    assistance: parsed.sections["需要协助事项"] || "",
  };
}

export function serializeWeeklySummaryState(state: WeeklySummaryEditorState) {
  return {
    completedSummary: normalizeMultiline(state.achievements),
    focusSummary: serializeLabeledContent([
      ["本周推进说明", state.progress],
      ["本周问题 / 风险", state.risks],
      ["需要协助事项", state.assistance],
    ]),
  };
}

export function parseMonthlySummaryState(
  summary?: string | null,
): MonthlySummaryEditorState {
  const parsed = parseLabeledContent(summary, [
    "本月工作重点",
    "核心交付方向",
    "风险与注意事项",
  ]);

  return {
    priorities:
      parsed.sections["本月工作重点"] || parsed.fallback || "",
    deliverables: parsed.sections["核心交付方向"] || "",
    risks: parsed.sections["风险与注意事项"] || "",
  };
}

export function serializeMonthlySummaryState(state: MonthlySummaryEditorState) {
  return serializeLabeledContent([
    ["本月工作重点", state.priorities],
    ["核心交付方向", state.deliverables],
    ["风险与注意事项", state.risks],
  ]);
}

export function toWeeklyPlanEditorItem(
  item: WeeklyReportPlanItem,
): WeeklyPlanEditorItem {
  const parsed = parseLabeledContent(item.description, [
    "类型",
    "优先级",
    "状态",
    "关联对象",
    "详细说明",
  ]);

  return {
    ...item,
    planType: findOptionByLabel(
      PLAN_TYPE_LABELS,
      parsed.sections["类型"],
      "OTHER",
    ),
    priority: findOptionByLabel(
      PRIORITY_LABELS,
      parsed.sections["优先级"],
      "MEDIUM",
    ),
    itemStatus: findOptionByLabel(
      PLAN_STATUS_LABELS,
      parsed.sections["状态"],
      "NOT_STARTED",
    ),
    relatedEntity: parsed.sections["关联对象"] || "",
    detail: parsed.sections["详细说明"] || parsed.fallback || "",
    syncToCalendar: Boolean(item.plannedAt),
  };
}

export function fromWeeklyPlanEditorItem(
  item: WeeklyPlanEditorItem,
  sortOrder: number,
): WeeklyReportPlanItem {
  return {
    id: item.id,
    sourceReviewItemId: item.sourceReviewItemId ?? "",
    taskId: item.taskId ?? "",
    title: item.title.trim(),
    plannedAt: item.syncToCalendar ? item.plannedAt ?? "" : "",
    sortOrder,
    description: serializeLabeledContent([
      ["类型", PLAN_TYPE_LABELS[item.planType]],
      ["优先级", PRIORITY_LABELS[item.priority]],
      ["状态", PLAN_STATUS_LABELS[item.itemStatus]],
      ["关联对象", item.relatedEntity],
      ["详细说明", item.detail],
    ]),
  };
}

export function toMonthlyGoalEditorItem(
  item: MonthlyGoalItem,
): MonthlyGoalEditorItem {
  const metric = parseLabeledContent(item.metric, ["交付结果", "量化指标"]);
  const progress = parseLabeledContent(item.progressNote, [
    "当前进度",
    "状态",
    "进展说明",
    "所需协助",
    "责任人",
  ]);
  const risk = parseLabeledContent(item.riskNote, ["风险等级", "风险说明"]);

  return {
    ...item,
    deliverable: metric.sections["交付结果"] || metric.fallback || "",
    metricValue: metric.sections["量化指标"] || "",
    progress: findOptionByLabel(
      GOAL_PROGRESS_LABELS,
      progress.sections["当前进度"],
      "0",
    ),
    itemStatus: findOptionByLabel(
      PLAN_STATUS_LABELS,
      progress.sections["状态"],
      "NOT_STARTED",
    ),
    progressDescription: progress.sections["进展说明"] || "",
    supportNeeded: progress.sections["所需协助"] || "",
    ownerName: progress.sections["责任人"] || "",
    riskLevel: findOptionByLabel(
      RISK_LEVEL_LABELS,
      risk.sections["风险等级"],
      "LOW",
    ),
    riskDescription: risk.sections["风险说明"] || risk.fallback || "",
  };
}

export function fromMonthlyGoalEditorItem(
  item: MonthlyGoalEditorItem,
  sortOrder: number,
): MonthlyGoalItem {
  return {
    id: item.id,
    title: item.title.trim(),
    dueAt: item.dueAt ?? "",
    sortOrder,
    metric: serializeLabeledContent([
      ["交付结果", item.deliverable],
      ["量化指标", item.metricValue],
    ]),
    progressNote: serializeLabeledContent([
      ["当前进度", GOAL_PROGRESS_LABELS[item.progress]],
      ["状态", PLAN_STATUS_LABELS[item.itemStatus]],
      ["进展说明", item.progressDescription],
      ["所需协助", item.supportNeeded],
      ["责任人", item.ownerName],
    ]),
    riskNote: serializeLabeledContent([
      ["风险等级", RISK_LEVEL_LABELS[item.riskLevel]],
      ["风险说明", item.riskDescription],
    ]),
  };
}

export function formatWorkDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatWorkDay(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function statusTone(
  status: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED" | "MISSING",
) {
  if (status === "APPROVED" || status === "SUBMITTED") {
    return "success" as const;
  }

  if (status === "RETURNED" || status === "MISSING") {
    return "danger" as const;
  }

  return "warning" as const;
}

export function syncCarryOverPlanItems(
  reviewItems: WeeklyReportReviewItem[],
  planItems: WeeklyReportPlanItem[],
) {
  const carriedReviewMap = new Map(
    reviewItems
      .filter(
        (item) =>
          item.status === "INCOMPLETE" && !isAbandonedReason(item.incompleteReason),
      )
      .map((item) => [item.id, item]),
  );
  const nextPlanItems = planItems
    .filter((item) =>
      item.sourceReviewItemId ? carriedReviewMap.has(item.sourceReviewItemId) : true,
    )
    .map((item) => ({ ...item }));

  const seen = new Set(
    nextPlanItems
      .map((item) => item.sourceReviewItemId)
      .filter((item): item is string => Boolean(item)),
  );

  carriedReviewMap.forEach((reviewItem, reviewId) => {
    if (seen.has(reviewId)) {
      return;
    }

    nextPlanItems.push({
      sourceReviewItemId: reviewId,
      title: reviewItem.title,
      description: reviewItem.description ?? "",
      plannedAt: reviewItem.plannedAt ?? "",
      sortOrder: nextPlanItems.length,
    });
  });

  return nextPlanItems.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}
