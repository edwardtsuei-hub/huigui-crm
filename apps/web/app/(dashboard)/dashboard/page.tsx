"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSiteBrandKey } from "../../../components/system/SiteBrandContext";
import { FirstRunGuide } from "../../../components/system/FirstRunGuide";
import { StatusBadge, type Tone } from "../../../components/system/primitives";
import { apiFetch, getCurrentUser, hasPermission } from "../../../lib/api";
import {
  buildNotificationHref,
  formatMoney,
  notificationTypeLabel,
} from "../../../lib/workspace";

type DashboardTabKey = "quotations" | "customers" | "files" | "operations";

type DashboardWeeklyReport = {
  needsAttention: boolean;
  status: "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED" | "MISSING";
  displayStatus:
    | "DRAFT"
    | "SUBMITTED"
    | "RETURNED"
    | "APPROVED"
    | "MISSING"
    | "OVERDUE";
  weekStartDate: string;
  weekEndDate: string;
  href: string;
  openReviewCount: number;
  planItemCount: number;
  reportId: string | null;
};

type DashboardResponse = {
  todayTodoCount: number;
  todayReminderCount: number;
  customerCount: number;
  quotationCount: number;
  weeklyQuotationCount: number;
  pendingApprovalCount?: number;
  pendingInspectionLinkCount?: number;
  dashboardWeeklyReport?: DashboardWeeklyReport;
  recentNotifications: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    type: string;
    relatedType?: string | null;
    relatedId?: string | null;
  }>;
  recentQuotations: Array<{
    id: string;
    quotationNo: string;
    type: "AGRICULTURE" | "INDUSTRY" | "SERVICE" | "BREEDING" | "GENERAL";
    status: "DRAFT" | "GENERATED" | "SENT" | "WON" | "LOST";
    totalAmount: string;
    createdAt: string;
    updatedAt: string;
    customer: {
      id: string;
      name: string;
    };
  }>;
  recentCustomers: Array<{
    id: string;
    customerName: string;
    companyName?: string | null;
    contactName?: string | null;
    status: "UNCONTACTED" | "CONTACTED" | "MET" | "COOPERATING" | "PAUSED";
    updatedAt: string;
    owner?: {
      id: string;
      name: string;
    } | null;
  }>;
  recentFiles: Array<{
    id: string;
    fileName: string;
    category?: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
    status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "ARCHIVED" | "OBSOLETE";
    isArchived: boolean;
    updatedAt: string;
    folder?: {
      id: string;
      name: string;
    } | null;
    uploader: {
      id: string;
      name: string;
    };
  }>;
  recentOperations: Array<{
    id: string;
    action: string;
    module: string;
    targetType?: string | null;
    targetId?: string | null;
    targetName?: string | null;
    content?: string | null;
    result?: string | null;
    createdAt: string;
    user?: {
      id: string;
      name: string;
    } | null;
  }>;
};

type ActionItem = {
  href: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

type PriorityState = {
  title: string;
  description: string;
  tone: "success" | "warning" | "danger";
  actions: ActionItem[];
};

type WeeklyReportPresentation = {
  title: string;
  description: string;
  statusLabel: string;
  tone: "success" | "warning" | "danger";
  href: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
};

type ReminderItem = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  tone: "success" | "warning" | "danger" | "neutral";
  meta?: string;
};

type MetricCard = {
  label: string;
  value: number;
  note: string;
};

type DashboardPulseRow = {
  label: string;
  value: number;
  note: string;
  width: string;
};

type DashboardActivityItem = {
  id: string;
  eyebrow: string;
  title: string;
  summary: string;
  metaLeft: string;
  metaRight: string;
  href: string;
  status: string;
  tone: Tone;
};

type DashboardActivitySection = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  href: string;
  actionLabel: string;
  items: DashboardActivityItem[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `${formatter.format(new Date(start))} ～ ${formatter.format(new Date(end))}`;
}

function roleWorkspaceTitle(roleCode?: string) {
  switch (roleCode) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "管理员工作台";
    case "SALES_MANAGER":
      return "销售主管工作台";
    case "SALES":
      return "销售工作台";
    case "PRODUCT_SPECIALIST":
      return "产品 / 方案专员工作台";
    case "FINANCE":
      return "财务 / 行政工作台";
    default:
      return "管理员工作台";
  }
}

function quotationStatusLabel(status: DashboardResponse["recentQuotations"][number]["status"]) {
  switch (status) {
    case "DRAFT":
      return "草稿";
    case "GENERATED":
      return "已生成";
    case "SENT":
      return "已发送";
    case "WON":
      return "已成交";
    case "LOST":
      return "已失单";
    default:
      return "处理中";
  }
}

function customerStatusLabel(status: DashboardResponse["recentCustomers"][number]["status"]) {
  switch (status) {
    case "UNCONTACTED":
      return "未联系";
    case "CONTACTED":
      return "已联系";
    case "MET":
      return "已拜访";
    case "COOPERATING":
      return "合作中";
    case "PAUSED":
      return "已暂停";
    default:
      return "客户";
  }
}

function customerStatusTone(status: DashboardResponse["recentCustomers"][number]["status"]) {
  switch (status) {
    case "COOPERATING":
      return "success";
    case "PAUSED":
      return "neutral";
    case "MET":
      return "warning";
    default:
      return "neutral";
  }
}

function quotationStatusTone(
  status: DashboardResponse["recentQuotations"][number]["status"],
): Tone {
  switch (status) {
    case "WON":
    case "SENT":
      return "success";
    case "DRAFT":
      return "warning";
    case "LOST":
      return "danger";
    default:
      return "neutral";
  }
}

function fileStatusLabel(file: DashboardResponse["recentFiles"][number]) {
  if (file.isArchived || file.status === "ARCHIVED") {
    return "已归档";
  }

  if (file.status === "PENDING_REVIEW") {
    return "待审核";
  }

  if (file.status === "DRAFT") {
    return "草稿";
  }

  return "正常";
}

function fileStatusTone(file: DashboardResponse["recentFiles"][number]) {
  if (file.isArchived || file.status === "ARCHIVED") {
    return "neutral";
  }

  if (file.status === "PENDING_REVIEW") {
    return "warning";
  }

  if (file.status === "DRAFT") {
    return "warning";
  }

  return "success";
}

function operationActionTone(action: string): Tone {
  switch (action.toUpperCase()) {
    case "DELETE":
    case "REJECT":
      return "danger";
    case "DISABLE":
      return "warning";
    case "APPROVE":
    case "ENABLE":
    case "SUBMIT":
      return "success";
    default:
      return "neutral";
  }
}

function weeklyReportTone(status: DashboardWeeklyReport["displayStatus"]) {
  if (status === "SUBMITTED" || status === "APPROVED") {
    return "success" as const;
  }

  if (status === "DRAFT") {
    return "warning" as const;
  }

  return "danger" as const;
}

function weeklyReportStatusLabel(status: DashboardWeeklyReport["displayStatus"]) {
  switch (status) {
    case "SUBMITTED":
      return "待主管审阅";
    case "RETURNED":
      return "已退回";
    case "APPROVED":
      return "已通过";
    case "DRAFT":
      return "草稿中";
    case "OVERDUE":
      return "已逾期";
    default:
      return "待创建";
  }
}

function buildWeeklyReportPresentation(
  report: DashboardWeeklyReport | undefined,
): WeeklyReportPresentation {
  const href = report?.reportId ? `${report.href}?reportId=${report.reportId}` : report?.href ?? "/work-management/weekly-reports";

  if (!report || report.displayStatus === "MISSING") {
    return {
      title: "周报待创建",
      description: "本周周报还未开始，建议先创建后再补充计划与提醒。",
      statusLabel: "待创建",
      tone: "danger",
      href,
      primaryActionLabel: "创建周报",
    };
  }

  if (report.displayStatus === "OVERDUE") {
    return {
      title: "周报已逾期",
      description: "本周周报尚未提交，请尽快补充并完成提交。",
      statusLabel: "已逾期",
      tone: "danger",
      href,
      primaryActionLabel: report.reportId ? "去提交" : "创建周报",
      secondaryActionLabel: report.reportId ? "查看详情" : undefined,
    };
  }

  if (report.displayStatus === "DRAFT") {
    return {
      title: "周报待提交",
      description: "本周周报仍在编辑中，请在周五前完成提交。",
      statusLabel: "草稿中",
      tone: "warning",
      href,
      primaryActionLabel: "继续填写",
      secondaryActionLabel: "查看详情",
    };
  }

  if (report.displayStatus === "RETURNED") {
    return {
      title: "周报已被退回",
      description: "主管已经退回当前版本，请根据说明修改后重新提交。",
      statusLabel: "已退回",
      tone: "danger",
      href,
      primaryActionLabel: "去修改",
      secondaryActionLabel: "查看详情",
    };
  }

  if (report.displayStatus === "APPROVED") {
    return {
      title: "周报已通过",
      description: "本期周报已通过主管审阅，可继续用于月底汇总和团队协作。",
      statusLabel: "已通过",
      tone: "success",
      href,
      primaryActionLabel: "查看周报",
    };
  }

  return {
    title: "本周周报状态",
    description: "本期周报已完成提交，当前等待主管审阅。",
    statusLabel: "待主管审阅",
    tone: "success",
    href,
    primaryActionLabel: "查看周报",
  };
}

function buildPriorityState(
  counts: {
    reminderCount: number;
    approvalCount: number;
    inspectionLinkCount: number;
    followUpCount: number;
  },
  quickStartHref: string,
): PriorityState {
  const total =
    counts.reminderCount +
    counts.approvalCount +
    counts.inspectionLinkCount +
    counts.followUpCount;

  if (counts.reminderCount >= 5 || total >= 7) {
    return {
      title: "今日事项较多",
      description: `今天有 ${counts.reminderCount} 条提醒、${counts.approvalCount} 条审批、${counts.inspectionLinkCount} 条检测补关联待处理，建议上午先收口这些阻塞，再推进客户和报价。`,
      tone: "danger",
      actions: [
        { href: "/notifications", label: "去处理提醒" },
        {
          href:
            counts.inspectionLinkCount > 0
              ? "/inspections?needsLinking=true"
              : "/schedule",
          label: counts.inspectionLinkCount > 0 ? "去补关联" : "查看今日日程",
          variant: "secondary",
        },
        { href: quickStartHref, label: "快速开始", variant: "ghost" },
      ],
    };
  }

  if (total > 0) {
    return {
      title: "今日优先处理",
      description: `今天有 ${counts.reminderCount} 条提醒待处理，${counts.approvalCount} 条审批待确认，${counts.inspectionLinkCount} 条检测待补关联，另外还有 ${counts.followUpCount} 条业务需要跟进。`,
      tone:
        counts.approvalCount > 0 || counts.inspectionLinkCount > 0
          ? "warning"
          : "success",
      actions: [
        { href: "/notifications", label: "去处理提醒" },
        {
          href:
            counts.inspectionLinkCount > 0
              ? "/inspections?needsLinking=true"
              : "/schedule",
          label: counts.inspectionLinkCount > 0 ? "去补关联" : "查看今日日程",
          variant: "secondary",
        },
        { href: quickStartHref, label: "快速开始", variant: "ghost" },
      ],
    };
  }

  return {
    title: "今日状态平稳",
    description: "今天暂无高优先事项，可以从最近报价、客户跟进或档案整理开始。",
    tone: "success",
    actions: [
      { href: "/quotations", label: "查看最近报价" },
      { href: "/customers", label: "查看客户", variant: "secondary" },
      { href: quickStartHref, label: "快速开始", variant: "ghost" },
    ],
  };
}

function buildOperationHref(
  operation: DashboardResponse["recentOperations"][number],
) {
  switch (operation.targetType) {
    case "Customer":
      return operation.targetId ? `/customers/${operation.targetId}` : "/customers";
    case "Quotation":
      return operation.targetId ? `/quotations/${operation.targetId}` : "/quotations";
    case "FileRecord":
      return "/files?view=recent";
    case "ApprovalRule":
      return "/management/approvals";
    case "User":
      return "/management/members";
    case "Role":
      return "/management/roles";
    default:
      return operation.module === "files" ? "/files?view=recent" : "/management/logs";
  }
}

function operationModuleLabel(module: string) {
  switch (module) {
    case "customers":
      return "客户";
    case "quotations":
      return "报价";
    case "files":
      return "档案";
    case "management":
      return "管理";
    case "schedule":
      return "日程";
    case "work_management":
      return "周报";
    default:
      return "系统";
  }
}

function operationActionLabel(action: string) {
  switch (action.toUpperCase()) {
    case "CREATE":
      return "新建";
    case "UPDATE":
      return "更新";
    case "DELETE":
      return "删除";
    case "APPROVE":
      return "审批通过";
    case "REJECT":
      return "审批驳回";
    case "EXPORT":
      return "导出";
    case "SUBMIT":
      return "提交";
    case "DISABLE":
      return "停用";
    case "ENABLE":
      return "启用";
    default:
      return action;
  }
}

function reminderActionLabel(notification: DashboardResponse["recentNotifications"][number]) {
  switch (notification.relatedType) {
    case "TASK":
      return "去处理";
    case "WEEKLY_REPORT":
      return "去填写";
    case "MONTHLY_GOAL":
      return "去填写";
    default:
      return "查看详情";
  }
}

function formatMetricCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatFocusCount(value: number) {
  if (value < 10) {
    return `0${value}`;
  }

  return formatMetricCount(value);
}

export default function DashboardPage() {
  const brandKey = useSiteBrandKey();
  const currentUser = getCurrentUser();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTabKey>("quotations");

  useEffect(() => {
    apiFetch<DashboardResponse>("/meta/dashboard")
      .then(setData)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "工作台加载失败"),
      );
  }, []);

  const workspaceTitle =
    currentUser?.roleCode === "SUPER_ADMIN" || currentUser?.roleCode === "ADMIN"
      ? "管理员工作台"
      : roleWorkspaceTitle(currentUser?.roleCode);
  const quickStartHref =
    currentUser?.roleCode === "PRODUCT_SPECIALIST" ? "/products/new" : "/customers/new";
  const pendingApprovalCount = data?.pendingApprovalCount ?? 0;
  const pendingInspectionLinkCount = data?.pendingInspectionLinkCount ?? 0;
  const todayReminderCount = data?.todayReminderCount ?? 0;
  const todayTodoCount = data?.todayTodoCount ?? 0;
  const customerCount = data?.customerCount ?? 0;
  const weeklyQuotationCount = data?.weeklyQuotationCount ?? 0;
  const pendingItemCount = pendingApprovalCount + todayTodoCount;
  const uncategorizedFilesCount =
    data?.recentFiles.filter((file) => !file.category || !file.folder?.name).length ?? 0;
  const weeklyReport = data?.dashboardWeeklyReport;
  const weeklyReportPresentation = useMemo(
    () => buildWeeklyReportPresentation(weeklyReport),
    [weeklyReport],
  );

  const priorityState = useMemo(
    () =>
      buildPriorityState(
        {
          reminderCount: todayReminderCount,
          approvalCount: pendingApprovalCount,
          inspectionLinkCount: pendingInspectionLinkCount,
          followUpCount: todayTodoCount,
        },
        quickStartHref,
      ),
    [
      pendingApprovalCount,
      pendingInspectionLinkCount,
      quickStartHref,
      todayReminderCount,
      todayTodoCount,
    ],
  );

  const metricCards = useMemo<Array<MetricCard>>(() => {
    return [
      {
        label: "活跃客户",
        value: customerCount,
        note:
          customerCount > 0
            ? `当前有 ${customerCount} 位客户可继续跟进`
            : "当前没有待跟进客户",
      },
      {
        label: "待处理事项",
        value: pendingItemCount,
        note:
          pendingItemCount > 0
            ? "需要管理员处理的内容"
            : "当前没有待处理事项",
      },
      {
        label: "本周报价",
        value: weeklyQuotationCount,
        note:
          weeklyQuotationCount > 0
            ? "本周新增或更新报价数量"
            : "本周还没有新增报价",
      },
      {
        label: "待整理档案",
        value: uncategorizedFilesCount,
        note:
          uncategorizedFilesCount > 0
            ? `还有 ${uncategorizedFilesCount} 份资料待归类`
            : "档案归类状态稳定",
      },
    ];
  }, [customerCount, pendingItemCount, uncategorizedFilesCount, weeklyQuotationCount]);

  const reminderItems = useMemo<Array<ReminderItem>>(() => {
    const items: ReminderItem[] = [];

    if (pendingApprovalCount > 0) {
      items.push({
        id: "approval-reminder",
        title: "审批待确认",
        description: `有 ${pendingApprovalCount} 条审批内容待确认，请尽快处理。`,
        actionLabel: "去审批",
        href: "/management/approvals",
        tone: "warning",
        meta: "来自管理中心",
      });
    }

    if (pendingInspectionLinkCount > 0) {
      items.push({
        id: "inspection-linking-reminder",
        title: "检测待补关联",
        description: `有 ${pendingInspectionLinkCount} 条检测记录尚未补齐客户或产品，建议优先修补关联。`,
        actionLabel: "去补关联",
        href: "/inspections?needsLinking=true",
        tone: "warning",
        meta: "建议今天完成",
      });
    }

    if (weeklyReport && weeklyReportPresentation.tone !== "success") {
      items.push({
        id: "weekly-report-reminder",
        title: weeklyReportPresentation.title,
        description: weeklyReportPresentation.description,
        actionLabel: weeklyReportPresentation.primaryActionLabel,
        href: weeklyReportPresentation.href,
        tone: weeklyReportPresentation.tone,
        meta: formatDateRange(weeklyReport.weekStartDate, weeklyReport.weekEndDate),
      });
    }

    if (uncategorizedFilesCount > 0) {
      items.push({
        id: "files-reminder",
        title: "档案待整理",
        description: `有 ${uncategorizedFilesCount} 份资料尚未归类，建议尽快整理到对应目录。`,
        actionLabel: "去整理",
        href: "/files?view=recent",
        tone: "neutral",
        meta: "来自档案中心",
      });
    }

    (data?.recentNotifications ?? []).forEach((notification) => {
      items.push({
        id: notification.id,
        title:
          notification.title || notificationTypeLabel(notification.type, brandKey),
        description: notification.content,
        actionLabel: reminderActionLabel(notification),
        href: buildNotificationHref(notification),
        tone: "warning",
        meta: `时间：${formatDateTime(notification.createdAt)}`,
      });
    });

    return items.slice(0, 4);
  }, [
    brandKey,
    data?.recentNotifications,
    uncategorizedFilesCount,
    pendingApprovalCount,
    pendingInspectionLinkCount,
    weeklyReport,
    weeklyReportPresentation,
  ]);

  const quickLinks = useMemo(() => {
    const links = [
      {
        href: "/customers",
        label: "客户池",
        note:
          customerCount > 0
            ? `继续推进 ${customerCount} 位活跃客户与沉默客户`
            : "进入客户页继续录入和整理客户档案",
        permission: "page.customers.list",
      },
      {
        href: "/quotations",
        label: "报价档案",
        note:
          weeklyQuotationCount > 0
            ? `本周已有 ${weeklyQuotationCount} 份报价在推进`
            : "查看最近报价并继续推动成交",
        permission: "menu.quotations",
      },
      {
        href: "/files?view=recent",
        label: "档案中心",
        note:
          uncategorizedFilesCount > 0
            ? `还有 ${uncategorizedFilesCount} 份资料待整理`
            : "处理归档、审核与目录整理",
        permission: "page.files.center",
      },
      {
        href: "/management",
        label: "管理中心",
        note:
          pendingApprovalCount > 0
            ? `还有 ${pendingApprovalCount} 条审批待确认`
            : "成员、审批与审计动作集中处理",
        permission: "menu.management",
      },
      {
        href: "/inspections?needsLinking=true",
        label: "检测补关联",
        note:
          pendingInspectionLinkCount > 0
            ? `还有 ${pendingInspectionLinkCount} 条记录待补关联`
            : "查看送检批次与报告关联状态",
        permission: "page.inspections.list",
      },
      {
        href: "/management/members",
        label: "成员管理",
        note: "查看账号、角色和状态",
        permission: "page.management.members",
      },
      {
        href: "/management/approvals",
        label: "审批规则",
        note: "调整审批与导出门槛",
        permission: "page.management.approvals",
      },
      {
        href: "/management/logs",
        label: "操作日志",
        note: "追踪高风险操作",
        permission: "page.management.logs",
      },
    ].filter((item) => hasPermission(currentUser, item.permission));

    const preferredOrder = [
      "客户池",
      "报价档案",
      "档案中心",
      "管理中心",
      "检测补关联",
      "成员管理",
      "审批规则",
      "操作日志",
    ];

    return preferredOrder
      .map((label) => links.find((item) => item.label === label))
      .filter((item): item is (typeof links)[number] => Boolean(item))
      .slice(0, 4);
  }, [
    currentUser,
    customerCount,
    pendingApprovalCount,
    pendingInspectionLinkCount,
    uncategorizedFilesCount,
    weeklyQuotationCount,
  ]);

  const tabMeta = useMemo(
    () => ({
      quotations: {
        title: "最近报价",
        description: "最近进入流转的报价会显示在这里。",
        emptyTitle: "还没有最近报价",
        emptyDescription: "新的报价创建或更新后，会优先显示在这里。",
        href: "/quotations",
        actionLabel: "查看全部报价",
      },
      customers: {
        title: "最近客户",
        description: "最近新增或更新的客户会显示在这里，便于快速接续跟进。",
        emptyTitle: "还没有最近客户动态",
        emptyDescription: "新增客户或更新跟进记录后，这里会开始显示。",
        href: "/customers",
        actionLabel: "查看客户",
      },
      files: {
        title: "最近档案",
        description: "最近上传、更新或归档的资料会显示在这里。",
        emptyTitle: "还没有最近档案动态",
        emptyDescription: "上传文件或整理资料夹后，这里会开始显示。",
        href: "/files?view=recent",
        actionLabel: "进入档案中心",
      },
      operations: {
        title: "最近操作",
        description: "最近的重要管理动作会显示在这里，便于追踪系统变化。",
        emptyTitle: "还没有最近操作记录",
        emptyDescription: "后续的上传、审批、归档和规则调整会显示在这里。",
        href: "/management/logs",
        actionLabel: "查看操作日志",
      },
    }),
    [],
  );

  const currentMoment = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date()),
    [],
  );

  const focusTracks = useMemo(
    () => [
      {
        label: "今日提醒",
        value: todayReminderCount,
        note:
          todayReminderCount > 0
            ? `今天有 ${todayReminderCount} 条提醒待处理，适合上午优先收口。`
            : "今天没有新的提醒，节奏相对稳定。",
        tone: todayReminderCount > 0 ? ("warning" as const) : ("success" as const),
      },
      {
        label: "审批待确认",
        value: pendingApprovalCount,
        note:
          pendingApprovalCount > 0
            ? `${pendingApprovalCount} 条审批正在等待确认，建议尽快完成闭环。`
            : "当前没有待确认审批，管理动作比较顺畅。",
        tone: pendingApprovalCount > 0 ? ("danger" as const) : ("neutral" as const),
      },
      {
        label: "检测待补关联",
        value: pendingInspectionLinkCount,
        note:
          pendingInspectionLinkCount > 0
            ? `${pendingInspectionLinkCount} 条检测记录还缺客户或产品，今天补齐会更稳。`
            : "检测关联状态稳定，暂时没有积压记录。",
        tone:
          pendingInspectionLinkCount > 0
            ? ("warning" as const)
            : ("success" as const),
      },
    ],
    [pendingApprovalCount, pendingInspectionLinkCount, todayReminderCount],
  );

  const pulseRows = useMemo<Array<DashboardPulseRow>>(() => {
    const baseRows = [
      {
        label: "活跃客户",
        value: customerCount,
        note: customerCount > 0 ? `当前可继续跟进 ${customerCount} 位客户。` : "当前没有待跟进客户。",
      },
      {
        label: "本周报价",
        value: weeklyQuotationCount,
        note:
          weeklyQuotationCount > 0
            ? `本周已有 ${weeklyQuotationCount} 份报价进入推进节奏。`
            : "本周还没有新的报价动态。",
      },
      {
        label: "待处理事项",
        value: pendingItemCount,
        note:
          pendingItemCount > 0
            ? `${pendingItemCount} 条事项仍在等待处理。`
            : "当前没有积压事项，适合推进更长期任务。",
      },
    ];
    const maxValue = Math.max(...baseRows.map((item) => item.value), 1);

    return baseRows.map((item) => ({
      ...item,
      width: item.value > 0 ? `${Math.max(18, Math.round((item.value / maxValue) * 100))}%` : "10%",
    }));
  }, [customerCount, pendingItemCount, weeklyQuotationCount]);

  const activitySections = useMemo<Record<DashboardTabKey, DashboardActivitySection>>(
    () => ({
      quotations: {
        ...tabMeta.quotations,
        items: (data?.recentQuotations ?? []).map((quotation) => ({
          id: quotation.id,
          eyebrow: `${quotation.type} · 报价流程`,
          title: quotation.quotationNo,
          summary: `${quotation.customer.name} · 报价金额 ${formatMoney(quotation.totalAmount)}`,
          metaLeft: `更新时间 ${formatDateTime(quotation.updatedAt)}`,
          metaRight: `状态 ${quotationStatusLabel(quotation.status)}`,
          href: `/quotations/${quotation.id}`,
          status: quotationStatusLabel(quotation.status),
          tone: quotationStatusTone(quotation.status),
        })),
      },
      customers: {
        ...tabMeta.customers,
        items: (data?.recentCustomers ?? []).map((customer) => ({
          id: customer.id,
          eyebrow: `${customer.owner?.name || "未指定负责人"} · 客户跟进`,
          title: customer.customerName,
          summary: customer.companyName || customer.contactName || "客户信息待补充",
          metaLeft: `更新时间 ${formatDateTime(customer.updatedAt)}`,
          metaRight: `状态 ${customerStatusLabel(customer.status)}`,
          href: `/customers/${customer.id}`,
          status: customerStatusLabel(customer.status),
          tone: customerStatusTone(customer.status),
        })),
      },
      files: {
        ...tabMeta.files,
        items: (data?.recentFiles ?? []).map((file) => ({
          id: file.id,
          eyebrow: `${file.category || "未分类"} · 档案动态`,
          title: file.fileName,
          summary: `${file.folder?.name || "待归类目录"} · 上传人 ${file.uploader.name}`,
          metaLeft: `更新时间 ${formatDateTime(file.updatedAt)}`,
          metaRight: `状态 ${fileStatusLabel(file)}`,
          href: "/files?view=recent",
          status: fileStatusLabel(file),
          tone: fileStatusTone(file),
        })),
      },
      operations: {
        ...tabMeta.operations,
        items: (data?.recentOperations ?? []).map((operation) => ({
          id: operation.id,
          eyebrow: `${operationModuleLabel(operation.module)} · 操作轨迹`,
          title: operation.targetName || operationActionLabel(operation.action),
          summary: operation.content || operation.result || "最近有新的管理动作发生。",
          metaLeft: `时间 ${formatDateTime(operation.createdAt)}`,
          metaRight: `操作人 ${operation.user?.name || "--"}`,
          href: buildOperationHref(operation),
          status: operationActionLabel(operation.action),
          tone: operationActionTone(operation.action),
        })),
      },
    }),
    [
      data?.recentCustomers,
      data?.recentFiles,
      data?.recentOperations,
      data?.recentQuotations,
      tabMeta,
    ],
  );

  const activeSection = activitySections[activeTab];

  const advisoryNotes = useMemo(() => {
    const notes: string[] = [];

    if (todayReminderCount || pendingApprovalCount || pendingInspectionLinkCount) {
      notes.push(
        `建议先处理 ${todayReminderCount} 条提醒、${pendingApprovalCount} 条审批和 ${pendingInspectionLinkCount} 条检测补关联，再进入客户与报价推进。`,
      );
    } else {
      notes.push("今天没有明显的提醒积压，可以把注意力放在推进客户、报价和回访。");
    }

    if (todayTodoCount > 0) {
      notes.push(`业务跟进队列里还有 ${todayTodoCount} 条事项，适合按客户批次往前推。`);
    }

    if (weeklyQuotationCount > 0) {
      notes.push(`本周已有 ${weeklyQuotationCount} 份报价在推进，适合继续推动签约与回款节奏。`);
    }

    if (uncategorizedFilesCount > 0) {
      notes.push(`档案中心仍有 ${uncategorizedFilesCount} 份资料待归类，建议在今天内收口。`);
    } else {
      notes.push("最近档案归类状态稳定，回收区与归档节奏都比较健康。");
    }

    return notes.slice(0, 3);
  }, [
    pendingApprovalCount,
    pendingInspectionLinkCount,
    todayReminderCount,
    todayTodoCount,
    uncategorizedFilesCount,
    weeklyQuotationCount,
  ]);

  return (
    <div className="workspace-stack dashboard-home">
      <section className="dashboard-command-deck">
        <div className="dashboard-command-copy">
          <span className="dashboard-command-eyebrow">今日工作面</span>
          <h1>{workspaceTitle}</h1>
          <p>{priorityState.description}</p>
          <div className="dashboard-command-actions">
            {priorityState.actions.map((action) => (
              <Link
                className={`button ${action.variant === "secondary" ? "secondary" : action.variant === "ghost" ? "ghost" : ""} inline`}
                href={action.href}
                key={`${action.label}-${action.href}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="dashboard-command-meta">
          <div className="dashboard-live-card">
            <span>当前判断</span>
            <strong>{priorityState.title}</strong>
            <small>{currentMoment} · 首页已接入真实工作台数据</small>
            <StatusBadge tone={weeklyReportPresentation.tone}>
              周报 {weeklyReportPresentation.statusLabel}
            </StatusBadge>
            <small>{weeklyReportPresentation.description}</small>
          </div>
        </div>
      </section>

      {error ? <div className="danger-text small">{error}</div> : null}

      <FirstRunGuide
        actions={[
          { label: "查看今日重点", href: "#dashboard-priority" },
          { label: "今日日程", href: "/schedule", variant: "secondary" },
        ]}
        description="第一次进入时，先看今日优先处理，再看核心指标和业务动态，最后从快捷入口进入具体工作。"
        guideKey="dashboard-home"
        steps={[
          {
            label: "先看今日优先处理",
            description: "先确认提醒、审批和待跟进事项，避免把真正重要的动作埋在页面下面。",
          },
          {
            label: "再看核心指标",
            description: "通过客户、提醒和报价数量，快速判断今天是否有异常或积压需要处理。",
          },
          {
            label: "最后再进入高频动作",
            description: "从今日日程、快速开始和业务动态切入，直接进入你接下来要做的事。",
          },
        ]}
        title="先从今天最重要的事情开始"
      />

      <section className="dashboard-focus-board" id="dashboard-priority">
        <div className="dashboard-focus-board__header">
          <div className="section-heading">
            <h3>今日优先处理</h3>
            <p>把高优先内容压在第一屏，而不是散在不同模块里。</p>
          </div>
          <StatusBadge tone={priorityState.tone}>{priorityState.title}</StatusBadge>
        </div>

        <div className="dashboard-focus-grid">
          {focusTracks.map((item) => (
            <article
              className={`dashboard-focus-lane dashboard-focus-lane--${item.tone}`}
              key={item.label}
            >
              <div className="dashboard-focus-lane__header">
                <span>{item.label}</span>
                <strong>{formatFocusCount(item.value)}</strong>
              </div>
              <p>{item.note}</p>
            </article>
          ))}
        </div>

        <div className="dashboard-focus-actions">
          {priorityState.actions.map((action) => (
            <Link
              className={`button ${action.variant === "secondary" ? "secondary" : action.variant === "ghost" ? "ghost" : ""} inline`}
              href={action.href}
              key={`${action.label}-${action.href}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="dashboard-metric-ribbon">
        {metricCards.map((card) => (
          <article className="dashboard-metric-card" key={card.label}>
            <div className="dashboard-metric-card__heading">
              <span>{card.label}</span>
            </div>
            <strong>{formatMetricCount(card.value)}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-layout">
        <div className="dashboard-main">
          <section className="dashboard-pulse-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-section-eyebrow">经营脉搏</span>
                <strong>先看节奏，再决定今天的动作顺序。</strong>
              </div>
              <span className="dashboard-header-note">全部指标来自当前工作台真实数据</span>
            </div>

            <div className="dashboard-pulse-grid">
              {pulseRows.map((item) => (
                <article className="dashboard-pulse-row" key={item.label}>
                  <div className="dashboard-pulse-row__header">
                    <span>{item.label}</span>
                    <strong>{formatMetricCount(item.value)}</strong>
                  </div>
                  <div className="dashboard-pulse-row__bar">
                    <span
                      className="dashboard-pulse-row__bar-fill"
                      style={{ width: item.width }}
                    />
                  </div>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-activity-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-section-eyebrow">动态主区</span>
                <strong>{activeSection.title}</strong>
                <p>{activeSection.description}</p>
              </div>
              <Link className="button ghost inline" href={activeSection.href}>
                {activeSection.actionLabel}
              </Link>
            </div>

            <div className="dashboard-activity-tabs" aria-label="业务动态主区">
              {(Object.keys(tabMeta) as DashboardTabKey[]).map((tabKey) => (
                <button
                  className={`dashboard-activity-tab ${activeTab === tabKey ? "active" : ""}`}
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  type="button"
                >
                  {tabMeta[tabKey].title}
                </button>
              ))}
            </div>

            {activeSection.items.length ? (
              <div className="dashboard-activity-list" key={activeTab}>
                {activeSection.items.map((item) => (
                  <Link className="dashboard-activity-item" href={item.href} key={item.id}>
                    <div className="dashboard-activity-item__main">
                      <span className="dashboard-activity-item__eyebrow">{item.eyebrow}</span>
                      <strong>{item.title}</strong>
                      <p>{item.summary}</p>
                    </div>

                    <div className="dashboard-activity-item__meta">
                      <div>
                        <span>{item.metaLeft}</span>
                        <span>{item.metaRight}</span>
                      </div>
                      <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <strong>{activeSection.emptyTitle}</strong>
                <span>{activeSection.emptyDescription}</span>
              </div>
            )}
          </section>

          <section className="dashboard-quick-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-section-eyebrow">高频入口</span>
                <strong>管理员最常用的入口不该埋在页面下面。</strong>
                <p>把最常用的管理动作集中在这里，方便直接进入具体工作。</p>
              </div>
            </div>

            {quickLinks.length ? (
              <div className="dashboard-quick-grid">
                {quickLinks.map((item) => (
                  <Link className="dashboard-quick-link" href={item.href} key={item.href}>
                    <div className="dashboard-quick-link__top">
                      <strong>{item.label}</strong>
                      <span>进入</span>
                    </div>
                    <p>{item.note}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <strong>当前账号没有可展示的管理入口</strong>
                <span>权限开放后，这里会自动显示成员、审批和日志入口。</span>
              </div>
            )}
          </section>
        </div>

        <aside className="dashboard-side sticky-side">
          <section className="dashboard-weekly-panel">
            <div className="dashboard-side-header">
              <div>
                <span className="dashboard-section-eyebrow">本周周报</span>
                <strong>{weeklyReportPresentation.title}</strong>
              </div>
              <StatusBadge tone={weeklyReportTone(weeklyReport?.displayStatus ?? "MISSING")}>
                {weeklyReportPresentation.statusLabel}
              </StatusBadge>
            </div>

            <p className="dashboard-weekly-panel__range">
              {formatDateRange(
                weeklyReport?.weekStartDate ?? new Date().toISOString(),
                weeklyReport?.weekEndDate ?? new Date().toISOString(),
              )}
            </p>

            <div className="dashboard-weekly-panel__stats">
              <span>待回顾 {weeklyReport?.openReviewCount ?? 0}</span>
              <span>本周计划 {weeklyReport?.planItemCount ?? 0}</span>
            </div>

            <p className="dashboard-weekly-panel__description">
              {weeklyReportPresentation.description}
            </p>

            <div className="dashboard-side-actions">
              <Link className="button inline" href={weeklyReportPresentation.href}>
                {weeklyReportPresentation.primaryActionLabel}
              </Link>
              {weeklyReportPresentation.secondaryActionLabel ? (
                <Link className="button secondary inline" href={weeklyReportPresentation.href}>
                  {weeklyReportPresentation.secondaryActionLabel}
                </Link>
              ) : null}
            </div>
          </section>

          <section className="dashboard-reminder-panel">
            <div className="dashboard-side-header">
              <div>
                <span className="dashboard-section-eyebrow">近期提醒</span>
                <strong>把真正需要处理的提醒留在右侧。</strong>
              </div>
            </div>

            {reminderItems.length ? (
              <div className="dashboard-reminder-list">
                {reminderItems.map((item) => (
                  <article className="dashboard-reminder-card" key={item.id}>
                    <div className="dashboard-reminder-card__header">
                      <strong>{item.title}</strong>
                      <StatusBadge tone={item.tone}>{item.meta ?? item.actionLabel}</StatusBadge>
                    </div>
                    <p>{item.description}</p>
                    <div className="dashboard-reminder-card__actions">
                      <Link className="button secondary inline" href={item.href}>
                        {item.actionLabel}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <strong>当前没有待处理提醒</strong>
                <span>新的提醒和风险项会自动出现在这里。</span>
              </div>
            )}
          </section>

          <section className="dashboard-note-panel">
            <div className="dashboard-side-header">
              <div>
                <span className="dashboard-section-eyebrow">今日建议</span>
                <strong>先处理拥堵，再推进成交和整理。</strong>
              </div>
            </div>

            <ul className="dashboard-note-list">
              {advisoryNotes.map((note) => (
                <li className="dashboard-note-list__item" key={note}>
                  {note}
                </li>
              ))}
            </ul>
            <div className="dashboard-side-actions">
              <Link className="button secondary inline" href="/notifications">
                查看提醒中心
              </Link>
              <Link
                className="button ghost inline"
                href={
                  pendingInspectionLinkCount > 0
                    ? "/inspections?needsLinking=true"
                    : "/customers"
                }
              >
                {pendingInspectionLinkCount > 0 ? "去看检测补关联" : "进入客户页"}
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
