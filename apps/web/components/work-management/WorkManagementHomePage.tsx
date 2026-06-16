"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  apiFetch,
  emitNotificationsChanged,
} from "../../lib/api";
import {
  type MonthlyGoalDetail,
  type MonthlyGoalSummary,
  type WeeklyReportDetail,
  type WeeklyReportSummary,
  type WorkManagementOverviewResponse,
  labelForMonthlyGoalStatus,
  labelForWeeklyReportStatus,
  statusTone,
} from "../../lib/work-management";
import {
  buildNotificationHref,
  formatDateLabel,
  notificationTypeLabel,
} from "../../lib/workspace";
import { SectionCard, StatusBadge } from "../system/primitives";
import { useSiteBrandKey } from "../system/SiteBrandContext";
import { WorkManagementPageHeader } from "./WorkManagementUI";
import styles from "./WorkManagementHomePage.module.css";

const EMPTY_OVERVIEW: WorkManagementOverviewResponse = {
  stats: {
    draftWeeklyReportCount: 0,
    draftMonthlyGoalCount: 0,
    carryOverCount: 0,
    lastMonthCarryOverCount: 0,
    nextMonthGoalItemCount: 0,
  },
  pendingWeeklyReport: {
    needsAttention: true,
    status: "MISSING",
    weekStartDate: "",
    weekEndDate: "",
    label: "本周周报",
    href: "/work-management/weekly-reports",
    openReviewCount: 0,
    planItemCount: 0,
    reportId: null,
  },
  pendingMonthlyGoal: {
    needsAttention: true,
    status: "MISSING",
    targetYear: 0,
    targetMonth: 0,
    label: "本月目标",
    href: "/work-management/monthly-goals",
    itemCount: 0,
    goalId: null,
  },
  lastMonthCarryOvers: [],
  recentWeeklyReports: [],
  recentMonthlyGoals: [],
};

type HomeDashboardSummary = {
  todayTodoCount: number;
  todayReminderCount: number;
  recentNotifications: Array<{
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

type HomeNotification = HomeDashboardSummary["recentNotifications"][number];

type WorkEntryDefinition = {
  key: string;
  description: string;
  kicker: string;
  renderPrimaryAction: () => React.ReactNode;
  renderSecondaryAction?: () => React.ReactNode;
  status: {
    label: string;
    tone: "neutral" | "warning" | "success" | "danger";
  };
  title: string;
};

type PulseEmphasis = "neutral" | "warning" | "danger";

type PulseCardDefinition = {
  key: string;
  actionHref: string;
  actionLabel: string;
  description: string;
  emphasis: PulseEmphasis;
  label: string;
  mobileNote: string;
  value: number;
};

function isPriorityNotification(item: HomeNotification) {
  return (
    !item.readAt &&
    (item.type === "TASK_REMINDER" ||
      item.type === "FOLLOW_UP_REMINDER" ||
      item.type === "DISCUSSION_COMMENT" ||
      /退回|截止|提醒|待处理/i.test(`${item.title} ${item.content}`))
  );
}

function notificationPriorityScore(item: HomeNotification) {
  if (isPriorityNotification(item)) {
    return 360;
  }

  if (item.type === "CONTRACT_EXPIRY_REMINDER" && !item.readAt) {
    return 220;
  }

  if (!item.readAt) {
    return 200;
  }

  if (item.type === "CONTRACT_EXPIRY_REMINDER") {
    return 80;
  }

  return 0;
}

function compareHomeNotifications(left: HomeNotification, right: HomeNotification) {
  const priorityDifference =
    notificationPriorityScore(right) - notificationPriorityScore(left);
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function notificationBadge(item: HomeNotification): {
  label: string;
  tone: "neutral" | "warning" | "danger";
} {
  if (isPriorityNotification(item)) {
    return {
      label: "优先处理",
      tone: "warning",
    };
  }

  if (item.type === "CONTRACT_EXPIRY_REMINDER" && !item.readAt) {
    return {
      label: "高优先级",
      tone: "warning",
    };
  }

  if (!item.readAt) {
    return {
      label: "待处理",
      tone: "warning",
    };
  }

  return {
    label: "已读",
    tone: "neutral",
  };
}

function WorkEntryCard({
  className,
  description,
  kicker,
  primaryAction,
  secondaryAction,
  status,
  title,
}: {
  className?: string;
  description: string;
  kicker: string;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
  status: { label: string; tone: "neutral" | "warning" | "success" | "danger" };
  title: string;
}) {
  return (
    <article className={[styles.entryCard, className].filter(Boolean).join(" ")}>
      <div className={styles.entryHeader}>
        <span>{kicker}</span>
        <div className={styles.entryTitleRow}>
          <strong>{title}</strong>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
      </div>

      <p className={styles.entryDescription}>{description}</p>

      <div className={styles.entryActions}>
        {primaryAction}
        {secondaryAction}
      </div>
    </article>
  );
}

function PulseActionCard({
  actionHref,
  actionLabel,
  className,
  description,
  emphasis = "neutral",
  label,
  value,
}: {
  actionHref: string;
  actionLabel: string;
  className?: string;
  description: string;
  emphasis?: PulseEmphasis;
  label: string;
  value: number;
}) {
  return (
    <article
      className={[
        styles.pulseCard,
        className,
        emphasis === "warning" ? styles.pulseCardWarning : "",
        emphasis === "danger" ? styles.pulseCardDanger : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{description}</p>
      <Link className="button secondary inline" href={actionHref}>
        {actionLabel}
      </Link>
    </article>
  );
}

function MobilePriorityActionCard({
  actionHref,
  actionLabel,
  emphasis = "neutral",
  label,
  note,
  value,
}: {
  actionHref: string;
  actionLabel: string;
  emphasis?: PulseEmphasis;
  label: string;
  note: string;
  value: number;
}) {
  return (
    <article
      className={[
        styles.mobilePriorityCard,
        emphasis === "warning" ? styles.pulseCardWarning : "",
        emphasis === "danger" ? styles.pulseCardDanger : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.mobilePriorityHeader}>
        <div className={styles.mobilePriorityMeta}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
        <StatusBadge tone={emphasis === "danger" ? "danger" : emphasis === "warning" ? "warning" : "neutral"}>
          今天优先
        </StatusBadge>
      </div>
      <p>{note}</p>
      <Link className="button inline" href={actionHref}>
        {actionLabel}
      </Link>
    </article>
  );
}

function MobileSignalActionCard({
  actionHref,
  actionLabel,
  emphasis = "neutral",
  label,
  note,
  value,
}: {
  actionHref: string;
  actionLabel: string;
  emphasis?: PulseEmphasis;
  label: string;
  note: string;
  value: number;
}) {
  return (
    <article
      className={[
        styles.mobileSignalCard,
        emphasis === "warning" ? styles.pulseCardWarning : "",
        emphasis === "danger" ? styles.pulseCardDanger : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
      <Link className="button ghost inline" href={actionHref}>
        {actionLabel}
      </Link>
    </article>
  );
}

export default function WorkManagementHomePage() {
  const brandKey = useSiteBrandKey();
  const router = useRouter();
  const [data, setData] = useState<WorkManagementOverviewResponse>(EMPTY_OVERVIEW);
  const [dashboardSummary, setDashboardSummary] = useState<HomeDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [creatingWeekly, setCreatingWeekly] = useState(false);
  const [creatingMonthly, setCreatingMonthly] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [noticeActionError, setNoticeActionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      try {
        const [overviewResponse, dashboardResponse] = await Promise.all([
          apiFetch<WorkManagementOverviewResponse>("/work-management/overview"),
          apiFetch<HomeDashboardSummary>("/meta/dashboard").catch((requestError) => {
            if (!cancelled) {
              setDashboardError(
                requestError instanceof Error
                  ? requestError.message
                  : "管理摘要加载失败",
              );
            }

            return null;
          }),
        ]);

        if (cancelled) {
          return;
        }

        setData(overviewResponse);
        setDashboardSummary(dashboardResponse);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "协同首页加载失败",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHomeData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function refreshDashboardSummary() {
      try {
        const response = await apiFetch<HomeDashboardSummary>("/meta/dashboard");
        if (!active) {
          return;
        }

        setDashboardSummary(response);
        setDashboardError("");
      } catch {
        // Keep the current snapshot if background refresh fails.
      }
    }

    function handleNotificationsChanged() {
      void refreshDashboardSummary();
    }

    window.addEventListener(
      NOTIFICATIONS_CHANGED_EVENT,
      handleNotificationsChanged,
    );

    return () => {
      active = false;
      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        handleNotificationsChanged,
      );
    };
  }, []);

  async function handleCreateWeeklyReport() {
    setCreatingWeekly(true);
    setError("");

    try {
      const response = await apiFetch<WeeklyReportDetail>(
        "/work-management/weekly-reports/draft",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      startTransition(() => {
        router.push(`/work-management/weekly-reports?reportId=${response.id}`);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "周报草稿创建失败",
      );
    } finally {
      setCreatingWeekly(false);
    }
  }

  async function handleCreateMonthlyGoal() {
    setCreatingMonthly(true);
    setError("");

    try {
      const response = await apiFetch<MonthlyGoalDetail>(
        "/work-management/monthly-goals/draft",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      startTransition(() => {
        router.push(`/work-management/monthly-goals?goalId=${response.id}`);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "本月目标草稿创建失败",
      );
    } finally {
      setCreatingMonthly(false);
    }
  }

  async function handleMarkNotificationRead(id: string) {
    setMarkingNotificationId(id);
    setNoticeActionError("");

    try {
      await apiFetch(`/notifications/${id}/read`, {
        method: "PATCH",
      });

      const readAt = new Date().toISOString();
      setDashboardSummary((current) =>
        current
          ? {
              ...current,
              recentNotifications: current.recentNotifications.map((item) =>
                item.id === id ? { ...item, readAt } : item,
              ),
            }
          : current,
      );
      emitNotificationsChanged();
    } catch (requestError) {
      setNoticeActionError(
        requestError instanceof Error
          ? requestError.message
          : "更新通知状态失败",
      );
    } finally {
      setMarkingNotificationId(null);
    }
  }

  async function handleMarkAllNotificationsRead() {
    setMarkingAllNotifications(true);
    setNoticeActionError("");

    try {
      await apiFetch("/notifications/read-all", {
        method: "POST",
      });

      const readAt = new Date().toISOString();
      setDashboardSummary((current) =>
        current
          ? {
              ...current,
              recentNotifications: current.recentNotifications.map((item) => ({
                ...item,
                readAt: item.readAt ?? readAt,
              })),
            }
          : current,
      );
      emitNotificationsChanged();
    } catch (requestError) {
      setNoticeActionError(
        requestError instanceof Error
          ? requestError.message
          : "批量更新通知失败",
      );
    } finally {
      setMarkingAllNotifications(false);
    }
  }

  const stats = data.stats;
  const weeklyPending = data.pendingWeeklyReport;
  const monthlyPending = data.pendingMonthlyGoal;
  const weeklyStatus = weeklyPending.status;
  const monthlyStatus = monthlyPending.status;
  const todayReminderCount = dashboardSummary?.todayReminderCount ?? 0;
  const todayTodoCount = dashboardSummary?.todayTodoCount ?? 0;
  const draftCount = stats.draftWeeklyReportCount + stats.draftMonthlyGoalCount;
  const prioritizedNotifications = [
    ...(dashboardSummary?.recentNotifications ?? []),
  ].sort(compareHomeNotifications);
  const unreadNoticeCount = prioritizedNotifications.filter(
    (item) => !item.readAt,
  ).length;
  const weeklyHref = weeklyPending.reportId
    ? `/work-management/weekly-reports?reportId=${weeklyPending.reportId}`
    : "/work-management/weekly-reports";
  const monthlyHref = monthlyPending.goalId
    ? `/work-management/monthly-goals?goalId=${monthlyPending.goalId}`
    : "/work-management/monthly-goals";

  const heroTitle =
    weeklyStatus === "MISSING"
      ? "先从本周周报开始，让今天的工作有一个清楚入口"
      : weeklyStatus === "RETURNED"
        ? "本周周报已被退回，先完成修改再继续后面的协同"
        : weeklyStatus === "DRAFT"
          ? "本周周报还在进行中，先把关键进展和计划补完整"
          : monthlyStatus === "MISSING"
            ? "周报已进入稳定节奏，接着把本月目标补起来"
            : monthlyStatus === "DRAFT"
              ? "本月目标还没收口，适合从这里继续推进"
              : stats.carryOverCount > 0
                ? "本周和本月已进入提交节奏，接着处理待承接事项"
                : "当前首页入口已经稳定，可以从这里进入周报、月目标和班表";

  const heroDescription =
    weeklyStatus === "MISSING"
      ? "协同首页现在作为统一入口保留在这里，当前默认把周报放在第一位，后续如果你要换成班表、通知或别的首页模块，只需要替换这块容器。"
      : "这里不再直接把你丢进单一业务页，而是先给出今天应该优先处理的入口，再往下展开周报、本月目标和班表协同。";

  const mobileHeroTitle =
    weeklyStatus === "MISSING"
      ? "先建立本周周报"
      : weeklyStatus === "RETURNED"
        ? "先改完被退回的周报"
        : weeklyStatus === "DRAFT"
          ? "先把本周周报补完整"
          : monthlyStatus === "MISSING"
            ? "接着补上本月目标"
            : monthlyStatus === "DRAFT"
              ? "继续收口本月目标"
              : todayReminderCount > 0
                ? `先收口 ${todayReminderCount} 条提醒`
                : unreadNoticeCount > 0
                  ? `先查看 ${unreadNoticeCount} 条未读消息`
                  : "从这里继续今天的工作";

  const mobileHeroDescription =
    weeklyStatus === "MISSING"
      ? "手机端先保留最直接的下一步动作，先建周报，再继续处理目标、提醒和排班。"
      : weeklyStatus === "RETURNED"
        ? "先修改周报，再继续今天的目标、提醒和排班。"
        : weeklyStatus === "DRAFT"
          ? "先补齐关键进展和下周计划，再往下处理其他事项。"
          : todayReminderCount > 0
            ? "先把今天的提醒收口，再继续班表、通知和后续安排。"
            : unreadNoticeCount > 0
              ? "手机端会先把未读消息排到前面，方便快速扫完再继续。"
              : "手机端会把下一步动作和待处理消息排成更顺手的行动流。";

  const draftActionHref =
    weeklyStatus === "RETURNED" || weeklyStatus === "DRAFT" || weeklyStatus === "MISSING"
      ? weeklyHref
      : monthlyStatus === "DRAFT" || monthlyStatus === "MISSING"
        ? monthlyHref
        : "/work-management/weekly-reports";
  const draftActionLabel =
    weeklyStatus === "RETURNED"
      ? "去修改周报"
      : weeklyStatus === "DRAFT"
        ? "继续填写周报"
        : monthlyStatus === "DRAFT"
          ? "继续本月目标"
          : monthlyStatus === "MISSING"
            ? "创建本月目标"
            : "打开周报列表";

  function renderWeeklyPrimaryAction() {
    if (weeklyStatus === "MISSING") {
      return (
        <button
          className="button inline"
          disabled={creatingWeekly}
          onClick={() => void handleCreateWeeklyReport()}
          type="button"
        >
          {creatingWeekly ? "创建周报中..." : "创建本周周报"}
        </button>
      );
    }

    return (
      <Link className="button inline" href={weeklyHref}>
        {weeklyStatus === "RETURNED"
          ? "去修改周报"
          : weeklyStatus === "DRAFT"
            ? "继续填写周报"
            : "打开周报"}
      </Link>
    );
  }

  function renderMonthlyPrimaryAction() {
    if (monthlyStatus === "MISSING") {
      return (
        <button
          className="button inline"
          disabled={creatingMonthly}
          onClick={() => void handleCreateMonthlyGoal()}
          type="button"
        >
          {creatingMonthly ? "创建目标中..." : "创建本月目标"}
        </button>
      );
    }

    return (
      <Link className="button inline" href={monthlyHref}>
        {monthlyStatus === "DRAFT" ? "继续本月目标" : "打开本月目标"}
      </Link>
    );
  }

  const summaryCards = [
    {
      key: "drafts",
      label: "草稿节奏",
      note: "当前待继续的周报与本月目标草稿总数。",
      value: draftCount,
    },
    {
      key: "carry",
      label: "承接事项",
      note: "从本周延续下来的未完成事项，会继续带到周报里。",
      value: stats.carryOverCount,
    },
    {
      key: "next",
      label: "下月准备",
      note: "已经预留到下月目标的事项数量，方便后续换首页仍能承接。",
      value: stats.nextMonthGoalItemCount,
    },
  ];

  const pulseCards: PulseCardDefinition[] = [
    {
      key: "reminders",
      actionHref: "/notifications",
      actionLabel: "查看提醒",
      description:
        todayReminderCount > 0
          ? `当前有 ${todayReminderCount} 条提醒待处理，适合先快速收口。`
          : "当前没有新的提醒积压，可以直接进入周报或班表。",
      emphasis: todayReminderCount > 0 ? "warning" : "neutral",
      label: "今日提醒",
      mobileNote:
        todayReminderCount > 0 ? `先收口 ${todayReminderCount} 条提醒` : "当前没有提醒积压",
      value: todayReminderCount,
    },
    {
      key: "drafts",
      actionHref: draftActionHref,
      actionLabel: draftActionLabel,
      description:
        weeklyStatus === "RETURNED"
          ? "本周周报已被退回，建议先回到周报补充修改并重新提交。"
          : weeklyStatus === "DRAFT"
            ? "本周周报还在草稿中，适合先补齐关键进展和下周计划。"
            : monthlyStatus === "DRAFT"
              ? "本月目标还在整理中，可以继续补充交付物、排期和风险说明。"
              : draftCount > 0
                ? `当前还有 ${draftCount} 份草稿待续，建议先处理完再切到其他入口。`
                : "当前没有待续草稿，可以直接查看提醒、班表和最近进展。",
      emphasis: draftCount > 0 ? "warning" : "neutral",
      label: "草稿待续",
      mobileNote:
        draftCount > 0 ? `${draftCount} 份草稿待继续` : "当前没有草稿待续",
      value: draftCount,
    },
    {
      key: "todos",
      actionHref: "/schedule",
      actionLabel: "打开日程",
      description:
        todayTodoCount > 0
          ? `还有 ${todayTodoCount} 条待跟进事项，适合从通知或日程继续往下推进。`
          : "当前没有额外待跟进事项，今天的节奏相对平稳。",
      emphasis: todayTodoCount > 0 ? "warning" : "neutral",
      label: "待跟进",
      mobileNote:
        todayTodoCount > 0 ? `${todayTodoCount} 条事项待继续推进` : "今天没有额外待跟进事项",
      value: todayTodoCount,
    },
  ];
  const mobilePulseQueue = [pulseCards[0], pulseCards[1], pulseCards[2]];
  const mobilePriorityPulse =
    mobilePulseQueue.find((item) => item.value > 0) ?? mobilePulseQueue[0];
  const mobileSecondaryPulses = mobilePulseQueue.filter(
    (item) => item.key !== mobilePriorityPulse.key,
  );

  const workEntries: WorkEntryDefinition[] = [
    {
      key: "weekly",
      description:
        weeklyStatus === "MISSING"
          ? "本周还没有周报，建议从这里创建并进入填写。"
          : weeklyStatus === "RETURNED"
            ? "主管已退回当前周报，优先从这里修改并重新提交。"
            : weeklyStatus === "DRAFT"
              ? `当前还有 ${weeklyPending.openReviewCount} 项待回顾、${weeklyPending.planItemCount} 项计划待确认。`
              : "当前周报已经进入提交或通过状态，可从这里查看详情与讨论。",
      kicker: weeklyPending.label || "本周周报",
      renderPrimaryAction: renderWeeklyPrimaryAction,
      renderSecondaryAction: () => (
        <Link className="button secondary inline" href="/work-management/weekly-reports">
          打开周报列表
        </Link>
      ),
      status: {
        label: labelForWeeklyReportStatus(weeklyStatus),
        tone: statusTone(weeklyStatus),
      },
      title: "周报入口",
    },
    {
      key: "monthly",
      description:
        monthlyStatus === "MISSING"
          ? "当前月份还没有目标草稿，可以直接从这里创建。"
          : monthlyStatus === "DRAFT"
            ? `当前已有 ${monthlyPending.itemCount} 条目标项，适合继续补充交付物和风险说明。`
            : "本月目标已提交，可从这里查看目标结构和 AI 汇总。",
      kicker: monthlyPending.label || "本月目标",
      renderPrimaryAction: renderMonthlyPrimaryAction,
      renderSecondaryAction: () => (
        <Link className="button secondary inline" href="/work-management/monthly-goals">
          查看目标列表
        </Link>
      ),
      status: {
        label: labelForMonthlyGoalStatus(monthlyStatus),
        tone: statusTone(monthlyStatus),
      },
      title: "本月目标入口",
    },
    {
      key: "schedule",
      description:
        "排班、成员信息和通知中心不需要再等进入周报后绕路，可以直接从首页第二入口进入。",
      kicker: "协同节奏",
      renderPrimaryAction: () => (
        <Link className="button inline" href="/schedule/shifts">
          打开班表管理
        </Link>
      ),
      renderSecondaryAction: () => (
        <Link className="button secondary inline" href="/management">
          打开管理中心
        </Link>
      ),
      status: {
        label: "可直接进入",
        tone: "neutral",
      },
      title: "班表与协同入口",
    },
    {
      key: "history",
      description:
        "协同总览页没有被删掉，现在变成可选入口，用来承接更重的统计和团队动态。",
      kicker: "历史与承接",
      renderPrimaryAction: () => (
        <Link className="button inline" href="/work-management/overview">
          查看协同总览
        </Link>
      ),
      renderSecondaryAction: () => (
        <Link className="button secondary inline" href="/work-management/team/overview">
          打开团队视角
        </Link>
      ),
      status: {
        label: loading ? "加载中" : "保留中",
        tone: loading ? "neutral" : "success",
      },
      title: "协同总览仍可保留",
    },
  ];

  const mobileWorkEntries = [
    workEntries[0],
    workEntries[2],
    workEntries[1],
    workEntries[3],
  ];

  const slotItems = [
    {
      key: "current",
      label: "当前已启用",
      title: "周报优先入口",
      description:
        "登录后先到协同首页，再由这里进入周报，不再把用户直接丢进周报正文页。",
    },
    {
      key: "next",
      label: "下一候补位",
      title: "班表 / 排班入口",
      description:
        "如果后续你想把班表改成首页主模块，只需要把这个位置提升到第一张主卡即可。",
    },
    {
      key: "future",
      label: "后续保留位",
      title: "提醒汇总 / 成员动态 / 协同摘要",
      description:
        "这些模块可以逐步接进来，不需要重写登录页、会话逻辑或管理端入口域名。",
    },
  ];

  function renderWorkEntryCards(layout: "desktop" | "mobile") {
    const items = layout === "desktop" ? workEntries : mobileWorkEntries;

    return (
      <div className={layout === "desktop" ? styles.entryGrid : styles.mobileEntryList}>
        {items.map((item) => (
          <WorkEntryCard
            className={layout === "mobile" ? styles.mobileEntryCard : undefined}
            description={item.description}
            kicker={item.kicker}
            key={item.key}
            primaryAction={item.renderPrimaryAction()}
            secondaryAction={item.renderSecondaryAction?.()}
            status={item.status}
            title={item.title}
          />
        ))}
      </div>
    );
  }

  function renderSlotItems() {
    return (
      <div className={styles.slotList}>
        {slotItems.map((item) => (
          <article className={styles.slotItem} key={item.key}>
            <div className={styles.slotHeader}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
            </div>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    );
  }

  function renderNoticePanel({
    className,
    mobile = false,
    subtitle,
    title,
  }: {
    className?: string;
    mobile?: boolean;
    subtitle: string;
    title: string;
  }) {
    return (
      <div
        className={[
          styles.noticePanel,
          mobile ? styles.mobileNoticePanel : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.noticeHeader}>
          <div>
            <span>{subtitle}</span>
            <strong>{title}</strong>
          </div>
          <div className={styles.noticeActions}>
            {unreadNoticeCount > 0 ? (
              <button
                className="button secondary inline"
                disabled={markingAllNotifications}
                onClick={() => void handleMarkAllNotificationsRead()}
                type="button"
              >
                {markingAllNotifications ? "处理中..." : "全部标记已读"}
              </button>
            ) : null}
            <Link className="button ghost inline" href="/notifications">
              查看全部
            </Link>
          </div>
        </div>

        {dashboardError ? (
          <p className={styles.emptyNote}>协同摘要暂时不可用：{dashboardError}</p>
        ) : prioritizedNotifications.length ? (
          <div className={styles.noticeList}>
            {noticeActionError ? (
              <p className={styles.emptyNote}>{noticeActionError}</p>
            ) : null}
            {prioritizedNotifications.slice(0, mobile ? 3 : 4).map((item) => {
              const badge = notificationBadge(item);
              const priorityHighlighted = isPriorityNotification(item);

              return (
                <article
                  className={[
                    styles.noticeRow,
                    !item.readAt ? styles.noticeRowUnread : "",
                    priorityHighlighted ? styles.noticeRowApproval : "",
                    mobile ? styles.mobileNoticeRow : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={item.id}
                >
                  <Link className={styles.noticeLink} href={buildNotificationHref(item)}>
                    <div className={styles.noticeMeta}>
                      <span>{notificationTypeLabel(item.type, brandKey)}</span>
                      <strong>{item.title || "系统通知"}</strong>
                      <p>{item.content}</p>
                    </div>
                  </Link>
                  <div
                    className={[
                      styles.noticeAside,
                      mobile ? styles.mobileNoticeAside : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    <time>{formatDateLabel(item.createdAt)}</time>
                    {!item.readAt ? (
                      <button
                        className="button ghost inline"
                        disabled={
                          markingAllNotifications || markingNotificationId === item.id
                        }
                        onClick={() => void handleMarkNotificationRead(item.id)}
                        type="button"
                      >
                        {markingNotificationId === item.id ? "处理中..." : "标记已读"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.emptyNote}>最近没有新的通知，首页会在这里优先展示最新提醒。</p>
        )}
      </div>
    );
  }

  function renderRecentProgress(layout: "desktop" | "mobile") {
    const limit = layout === "desktop" ? 3 : 2;

    return (
      <div className={layout === "desktop" ? styles.recentGrid : styles.mobileRecentStack}>
        <div
          className={[
            styles.recentColumn,
            layout === "mobile" ? styles.mobileRecentColumn : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <h4>最近周报</h4>
          <div className={styles.recentList}>
            {data.recentWeeklyReports.length ? (
              data.recentWeeklyReports.slice(0, limit).map((item: WeeklyReportSummary) => (
                <Link
                  className={styles.recentLink}
                  href={`/work-management/weekly-reports?reportId=${item.id}`}
                  key={item.id}
                >
                  <div className={styles.recentRow}>
                    <div className={styles.recentRowMeta}>
                      <span>{item.label}</span>
                      <strong>{item.owner.displayName}</strong>
                      <p>
                        {item.openReviewCount} 项待回顾 · {item.planItemCount} 项计划
                      </p>
                    </div>
                    <StatusBadge tone={statusTone(item.status)}>
                      {labelForWeeklyReportStatus(item.status)}
                    </StatusBadge>
                  </div>
                </Link>
              ))
            ) : (
              <p className={styles.emptyNote}>最近还没有周报记录，创建后会优先显示在这里。</p>
            )}
          </div>
        </div>

        <div
          className={[
            styles.recentColumn,
            layout === "mobile" ? styles.mobileRecentColumn : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <h4>最近本月目标</h4>
          <div className={styles.recentList}>
            {data.recentMonthlyGoals.length ? (
              data.recentMonthlyGoals
                .slice(0, limit)
                .map((item: MonthlyGoalSummary) => (
                  <Link
                    className={styles.recentLink}
                    href={`/work-management/monthly-goals?goalId=${item.id}`}
                    key={item.id}
                  >
                    <div className={styles.recentRow}>
                      <div className={styles.recentRowMeta}>
                        <span>{item.label}</span>
                        <strong>{item.owner.displayName}</strong>
                        <p>{item.itemCount} 条目标项 · {item.scheduledItemCount} 条已排期</p>
                      </div>
                      <StatusBadge tone={statusTone(item.status)}>
                        {labelForMonthlyGoalStatus(item.status)}
                      </StatusBadge>
                    </div>
                  </Link>
                ))
            ) : (
              <p className={styles.emptyNote}>最近还没有本月目标记录，创建后会同步显示在这里。</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack gap-lg">
      {error ? (
        <SectionCard
          title="加载提醒"
          description="协同首页会继续保留入口结构，但这次没有拿到最新总览数据。"
        >
          <p className={styles.emptyNote}>{error}</p>
        </SectionCard>
      ) : null}

      <div className={styles.desktopViewport}>
        <WorkManagementPageHeader
          title="协同首页"
          description="把当前主入口、下一步动作和未来可替换模块放在同一块协同首页里。"
          meta={[
            {
              label: "本周周报",
              value: labelForWeeklyReportStatus(weeklyStatus),
              tone: statusTone(weeklyStatus),
            },
            {
              label: "本月目标",
              value: labelForMonthlyGoalStatus(monthlyStatus),
              tone: statusTone(monthlyStatus),
            },
            {
              label: "待承接",
              value: `${stats.carryOverCount} 项`,
              tone: stats.carryOverCount > 0 ? "warning" : "neutral",
            },
          ]}
          actions={
            <>
              <Link className="button secondary inline" href="/schedule/shifts">
                班表管理
              </Link>
              <Link className="button ghost inline" href="/work-management/overview">
                查看协同总览
              </Link>
            </>
          }
        />

        <section className={styles.hero}>
          <article className={styles.heroPanel}>
            <span className={styles.heroEyebrow}>当前首页入口</span>
            <h2 className={styles.heroTitle}>{heroTitle}</h2>
            <p className={styles.heroDescription}>{heroDescription}</p>
            <div className={styles.heroActions}>
              {renderWeeklyPrimaryAction()}
              <Link className="button secondary inline" href={monthlyHref}>
                打开本月目标
              </Link>
              <Link className="button ghost inline" href="/management">
                打开管理中心
              </Link>
            </div>
          </article>

          <div className={styles.heroMetaGrid}>
            {summaryCards.map((item) => (
              <article className={styles.heroMetaCard} key={item.key}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.sectionGrid}>
          <SectionCard
            title="当前工作入口"
            description="首页先聚合最常用的三个入口，避免一进来就被直接推进单一页面。"
          >
            {renderWorkEntryCards("desktop")}
          </SectionCard>

          <SectionCard
            title="首页编排"
            description="登录流现在只认这个首页入口，后续要换主页时只需要替换这里的模块编排。"
          >
            {renderSlotItems()}
          </SectionCard>
        </div>

        <SectionCard
          title="协同脉搏"
          description="桌机版保留并列信息面板，草稿进度、提醒和最近通知可以同时展开查看。"
        >
          <div className={styles.pulseGrid}>
            {pulseCards.map((item) => (
              <PulseActionCard
                actionHref={item.actionHref}
                actionLabel={item.actionLabel}
                description={item.description}
                emphasis={item.emphasis}
                key={item.key}
                label={item.label}
                value={item.value}
              />
            ))}
          </div>
          {renderNoticePanel({
            subtitle: "最近通知",
            title: "首页先看最需要响应的消息",
          })}
        </SectionCard>

        <SectionCard
          title="最近进展"
          description="先保留最近周报和本月目标的入口，避免首页切换后找不到原有记录。"
        >
          {renderRecentProgress("desktop")}
        </SectionCard>
      </div>

      <div className={styles.mobileViewport}>
        <section className={styles.mobileHero}>
          <span className={styles.heroEyebrow}>手机工作入口</span>
          <h2 className={styles.mobileHeroTitle}>{mobileHeroTitle}</h2>
          <p className={styles.mobileHeroDescription}>{mobileHeroDescription}</p>

          <div className={styles.mobileHeroMeta}>
            <article className={styles.mobileHeroMetaItem}>
              <span>本周周报</span>
              <strong>{labelForWeeklyReportStatus(weeklyStatus)}</strong>
            </article>
            <article className={styles.mobileHeroMetaItem}>
              <span>本月目标</span>
              <strong>{labelForMonthlyGoalStatus(monthlyStatus)}</strong>
            </article>
            <article className={styles.mobileHeroMetaItem}>
              <span>待承接</span>
              <strong>{stats.carryOverCount} 项</strong>
            </article>
          </div>

          <div className={styles.mobilePrimaryAction}>{renderWeeklyPrimaryAction()}</div>

          <div className={styles.mobileSecondaryActions}>
            <Link className="button secondary inline" href={monthlyHref}>
              本月目标
            </Link>
            <Link className="button ghost inline" href="/management">
              管理中心
            </Link>
          </div>
        </section>

        <SectionCard
          title="今天先处理"
          description="手机端优先把会打断节奏的事项放在最前面，适合边走边处理。"
        >
          <div className={styles.mobilePulseStack}>
            <MobilePriorityActionCard
              actionHref={mobilePriorityPulse.actionHref}
              actionLabel={mobilePriorityPulse.actionLabel}
              emphasis={mobilePriorityPulse.emphasis}
              label={mobilePriorityPulse.label}
              note={mobilePriorityPulse.mobileNote}
              value={mobilePriorityPulse.value}
            />
            <div className={styles.mobileSignalGrid}>
              {mobileSecondaryPulses.map((item) => (
                <MobileSignalActionCard
                  actionHref={item.actionHref}
                  actionLabel={item.actionLabel}
                  emphasis={item.emphasis}
                  key={item.key}
                  label={item.label}
                  note={item.mobileNote}
                  value={item.value}
                />
              ))}
            </div>
          </div>
        </SectionCard>

        {renderNoticePanel({
          className: styles.mobileNoticeSurface,
          mobile: true,
          subtitle: "待处理消息",
          title: "手机先处理未读与提醒",
        })}

        <SectionCard
          title="直接入口"
          description="手机端优先保留最常开的入口顺序，减少来回切换。"
        >
          {renderWorkEntryCards("mobile")}
        </SectionCard>

        <div className={styles.mobileStatStrip}>
          {summaryCards.map((item) => (
            <article className={styles.mobileStatCard} key={item.key}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>

        <SectionCard
          title="最近进展"
          description="外出时也能快速续上最近的周报和本月目标。"
        >
          {renderRecentProgress("mobile")}
        </SectionCard>
      </div>
    </div>
  );
}
