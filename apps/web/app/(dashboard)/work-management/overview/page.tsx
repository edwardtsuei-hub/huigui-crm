"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  InsightStatCard,
  PrimaryTaskCard,
  ReminderListCard,
  ShortcutActionsCard,
  TeamActivityFeed,
  WorkManagementPageHeader,
} from "../../../../components/work-management/WorkManagementUI";
import { SectionCard, StatusBadge } from "../../../../components/system/primitives";
import { apiFetch } from "../../../../lib/api";
import {
  type MonthlyGoalDetail,
  type MonthlyGoalSummary,
  type PendingMonthlyGoalSummary,
  type PendingWeeklyReportSummary,
  type WeeklyReportDetail,
  type WeeklyReportSummary,
  type WorkManagementOverviewResponse,
  formatWorkDay,
  labelForMonthlyGoalStatus,
  labelForWeeklyReportStatus,
  statusTone,
} from "../../../../lib/work-management";

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

type Tone = "neutral" | "warning" | "success" | "danger";
type ActionVariant = "primary" | "secondary" | "ghost";

type ActionConfig = {
  kind: "link" | "button";
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: ActionVariant;
  disabled?: boolean;
};

type TaskConfig = {
  title: string;
  description: string;
  status: { label: string; tone: Tone };
  metaItems: Array<{ label: string; value: string }>;
  primaryAction: ActionConfig;
  secondaryAction?: ActionConfig;
};

const EMPTY_STATS = {
  draftWeeklyReportCount: 0,
  draftMonthlyGoalCount: 0,
  carryOverCount: 0,
  lastMonthCarryOverCount: 0,
  nextMonthGoalItemCount: 0,
};

function buttonClass(variant: ActionVariant = "primary") {
  if (variant === "secondary") {
    return "button secondary inline";
  }

  if (variant === "ghost") {
    return "button ghost inline";
  }

  return "button inline";
}

function withVariant(action: ActionConfig, variant: ActionVariant) {
  return { ...action, variant };
}

export default function WorkManagementOverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<WorkManagementOverviewResponse | null>(null);
  const [weeklyList, setWeeklyList] = useState<WeeklyReportListResponse | null>(null);
  const [monthlyList, setMonthlyList] = useState<MonthlyGoalListResponse | null>(null);
  const [error, setError] = useState("");
  const [creatingWeekly, setCreatingWeekly] = useState(false);
  const [creatingMonthly, setCreatingMonthly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const [overviewResponse, weeklyResponse, monthlyResponse] = await Promise.all([
          apiFetch<WorkManagementOverviewResponse>("/work-management/overview"),
          apiFetch<WeeklyReportListResponse>("/work-management/weekly-reports"),
          apiFetch<MonthlyGoalListResponse>("/work-management/monthly-goals"),
        ]);

        if (cancelled) {
          return;
        }

        setData(overviewResponse);
        setWeeklyList(weeklyResponse);
        setMonthlyList(monthlyResponse);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "协同总览加载失败",
        );
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
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

  const teamActivities = useMemo(() => {
    const weeklyActivities = (weeklyList?.teamItems ?? []).slice(0, 4).map((item) => ({
      id: `weekly-${item.id}`,
      title: `${item.owner.displayName} 提交了周报`,
      meta: `${item.label} · ${item.submittedAt ? formatWorkDay(item.submittedAt) : "刚刚提交"}`,
      tone: "success" as const,
      href: `/work-management/weekly-reports?reportId=${item.id}`,
      sortKey: item.submittedAt ?? item.updatedAt ?? item.weekEndDate,
    }));

    const monthlyActivities = (monthlyList?.teamItems ?? []).slice(0, 4).map((item) => ({
      id: `monthly-${item.id}`,
      title: `${item.owner.displayName} 提交了月目标`,
      meta: `${item.label} · ${item.submittedAt ? formatWorkDay(item.submittedAt) : "刚刚提交"}`,
      tone: "neutral" as const,
      href: `/work-management/monthly-goals?goalId=${item.id}`,
      sortKey: item.submittedAt ?? item.updatedAt ?? `${item.targetYear}-${item.targetMonth}`,
    }));

    return [...weeklyActivities, ...monthlyActivities]
      .sort((left, right) => right.sortKey.localeCompare(left.sortKey))
      .slice(0, 6)
      .map(({ sortKey: _sortKey, ...item }) => item);
  }, [monthlyList?.teamItems, weeklyList?.teamItems]);

  const stats = data?.stats ?? EMPTY_STATS;
  const isLoaded = Boolean(data);
  const weeklyPending = data?.pendingWeeklyReport;
  const monthlyPending = data?.pendingMonthlyGoal;
  const weeklyStatus = weeklyPending?.status ?? "MISSING";
  const monthlyStatus = monthlyPending?.status ?? "MISSING";
  const weeklyNeedsCreation = weeklyStatus === "MISSING";
  const weeklyNeedsRevision =
    weeklyStatus === "DRAFT" || weeklyStatus === "RETURNED";
  const weeklyAwaitingReview = weeklyStatus === "SUBMITTED";
  const weeklyApproved = weeklyStatus === "APPROVED";
  const weeklyLabel = weeklyPending?.label ?? "本周周期";
  const monthlyLabel = monthlyPending?.label ?? "本月周期";
  const weeklyHref = weeklyPending?.reportId
    ? `/work-management/weekly-reports?reportId=${weeklyPending.reportId}`
    : "/work-management/weekly-reports";
  const monthlyHref = monthlyPending?.goalId
    ? `/work-management/monthly-goals?goalId=${monthlyPending.goalId}`
    : "/work-management/monthly-goals";
  const latestWeeklyHref = data?.recentWeeklyReports?.[0]
    ? `/work-management/weekly-reports?reportId=${data.recentWeeklyReports[0].id}`
    : "/work-management/weekly-reports";
  const latestMonthlyHref = data?.recentMonthlyGoals?.[0]
    ? `/work-management/monthly-goals?goalId=${data.recentMonthlyGoals[0].id}`
    : "/work-management/monthly-goals";
  const weeklyArchiveHref = "/work-management/weekly-reports?archive=1";
  const monthlyAiSummaryHref = `${monthlyHref}#monthly-ai-summary`;
  const weeklyCarryoverHref = "/work-management/weekly-reports#weekly-carryovers";
  const hasWeeklyHistory = Boolean(data?.recentWeeklyReports?.length);
  const hasMonthlyHistory = Boolean(data?.recentMonthlyGoals?.length);
  const isFirstEntry = Boolean(
    data &&
      weeklyStatus === "MISSING" &&
      monthlyStatus === "MISSING" &&
      !hasWeeklyHistory &&
      !hasMonthlyHistory &&
      stats.draftWeeklyReportCount === 0 &&
      stats.draftMonthlyGoalCount === 0 &&
      stats.carryOverCount === 0 &&
      stats.lastMonthCarryOverCount === 0 &&
      stats.nextMonthGoalItemCount === 0,
  );

  const weeklyQuickAction: ActionConfig =
    !isLoaded
      ? {
          kind: "link",
          label: "打开周报",
          href: "/work-management/weekly-reports",
        }
      : weeklyNeedsCreation
      ? {
          kind: "button",
          label: creatingWeekly ? "创建中..." : "创建周报",
          onClick: () => void handleCreateWeeklyReport(),
          disabled: creatingWeekly,
        }
      : weeklyNeedsRevision
        ? {
            kind: "link",
            label: weeklyStatus === "RETURNED" ? "修改后重提" : "继续周报",
            href: weeklyHref,
          }
        : {
            kind: "link",
            label: "查看周报",
            href: weeklyHref,
          };

  const monthlyQuickAction: ActionConfig =
    !isLoaded
      ? {
          kind: "link",
          label: "打开本月目标",
          href: "/work-management/monthly-goals",
        }
      : monthlyStatus === "MISSING"
      ? {
          kind: "button",
          label: creatingMonthly ? "创建中..." : "创建本月目标",
          onClick: () => void handleCreateMonthlyGoal(),
          disabled: creatingMonthly,
        }
      : monthlyStatus === "DRAFT"
        ? {
            kind: "link",
            label: "继续本月目标",
            href: monthlyHref,
          }
        : {
            kind: "link",
            label: "查看本月目标",
            href: monthlyHref,
          };

  const pageDescription = (() => {
    if (isFirstEntry) {
      return "把周报、月目标和待承接事项放在同一条推进链路中，建议先从本周周报开始。";
    }

    if (weeklyNeedsCreation && monthlyStatus === "DRAFT") {
      return "本周周报还未开始，建议先完成周报，再回到本月目标继续补充。";
    }

    if (weeklyNeedsCreation) {
      return "本周周报还未开始，建议先创建后再补充计划、提醒与协作信息。";
    }

    if (weeklyStatus === "RETURNED") {
      return "本周周报已被主管退回，建议先按说明修改后重新提交，再继续月底汇总与目标推进。";
    }

    if (weeklyStatus === "DRAFT") {
      return "先处理本周待提交与待承接事项，再逐步进入月目标、提醒与历史记录。";
    }

    if (monthlyStatus !== "SUBMITTED") {
      return weeklyApproved
        ? "本周周报已通过主管审阅，可继续完善本月目标并确认后续承接事项。"
        : "本周周报已提交，当前等待主管审阅，可继续完善本月目标并确认后续承接事项。";
    }

    if (stats.carryOverCount > 0) {
      return weeklyApproved
        ? "本周主要内容已通过审阅，优先确认待承接事项，再查看提醒与历史记录。"
        : "本周主要内容已提交，优先确认待承接事项，再查看提醒与历史记录。";
    }

    return weeklyApproved
      ? "本周与本月的主要内容已进入稳定推进状态，可继续查看承接事项、提醒和团队动态。"
      : "本周与本月的主要内容已提交，可继续查看承接事项、提醒和团队动态。";
  })();

  const currentStageLabel = (() => {
    if (isFirstEntry) {
      return "首次进入";
    }

    if (weeklyNeedsCreation) {
      return "周报未开始";
    }

    if (weeklyStatus === "RETURNED") {
      return "周报被退回";
    }

    if (weeklyStatus === "DRAFT") {
      return "周报草稿中";
    }

    if (monthlyStatus === "MISSING") {
      return "月目标未开始";
    }

    if (monthlyStatus === "DRAFT") {
      return "月目标进行中";
    }

    if (stats.carryOverCount > 0) {
      return "承接处理中";
    }

    return "查看与跟进";
  })();

  const nextStepLabel = (() => {
    if (weeklyNeedsCreation) {
      return "创建本周周报";
    }

    if (weeklyStatus === "RETURNED") {
      return "修改并重新提交周报";
    }

    if (weeklyStatus === "DRAFT") {
      return "继续填写周报";
    }

    if (stats.carryOverCount > 0) {
      return "处理承接事项";
    }

    if (monthlyStatus === "MISSING") {
      return "创建本月目标";
    }

    if (monthlyStatus === "DRAFT") {
      return "继续完善本月目标";
    }

    return "查看提醒与历史";
  })();

  const weeklyTask: TaskConfig =
    weeklyNeedsCreation
      ? {
          title: "本周待创建周报",
          description: isFirstEntry
            ? "先记录本周重点，再逐步补充计划、提醒与协作信息。"
            : "本周还没有周报内容，先创建后再安排计划和提醒。",
          status: { label: "未创建", tone: "danger" },
          metaItems: [
            { label: "提交节点", value: "周五 18:00 前" },
            { label: "当前阶段", value: "还未开始" },
          ],
          primaryAction: weeklyQuickAction,
          secondaryAction: hasWeeklyHistory
            ? {
                kind: "link",
                label: "查看上周周报",
                href: latestWeeklyHref,
              }
            : undefined,
        }
      : weeklyNeedsRevision
        ? {
            title:
              weeklyStatus === "RETURNED" ? "本周周报待修改后重提" : "本周待提交周报",
            description:
              weeklyStatus === "RETURNED"
                ? "主管已退回本周周报，请根据说明补充修改后重新提交。"
                : "本周周报已创建，仍可继续补充成果、计划和协作信息。",
            status: {
              label: weeklyStatus === "RETURNED" ? "已退回" : "草稿",
              tone: weeklyStatus === "RETURNED" ? "danger" : "warning",
            },
            metaItems: [
              { label: "截止时间", value: "周五 18:00 前提交" },
              { label: "未完成项", value: `${weeklyPending?.openReviewCount ?? 0} 项` },
            ],
            primaryAction: {
              kind: "link",
              label: weeklyStatus === "RETURNED" ? "去修改" : "继续填写",
              href: weeklyHref,
            },
            secondaryAction: {
              kind: "link",
              label: "查看详情",
              href: weeklyHref,
            },
          }
        : {
            title: weeklyApproved ? "本周周报已通过" : "本周周报待主管审阅",
            description: weeklyApproved
              ? "已完成本周提交并通过审阅，可继续用于月底汇总和团队协作。"
              : "已完成本周提交，可查看内容、补充评论，或等待主管审阅反馈。",
            status: {
              label: weeklyApproved ? "已通过" : "待审阅",
              tone: "success",
            },
            metaItems: [
              {
                label: "提交状态",
                value: weeklyApproved ? "已通过主管审阅" : "等待主管审阅",
              },
              { label: "本周计划", value: `${weeklyPending?.planItemCount ?? 0} 项` },
            ],
            primaryAction: {
              kind: "link",
              label: "查看详情",
              href: weeklyHref,
            },
            secondaryAction: {
              kind: "link",
              label: "查看讨论",
              href: weeklyHref,
            },
          };

  const monthlyTask: TaskConfig =
    monthlyStatus === "MISSING"
      ? {
          title: "本月目标待创建",
          description: "把本月重点拆成目标项，后续会更容易承接到周报和日程里。",
          status: { label: "未创建", tone: "danger" },
          metaItems: [
            { label: "提交节点", value: "每月 28 日前" },
            { label: "当前阶段", value: "还未开始" },
          ],
          primaryAction: monthlyQuickAction,
          secondaryAction: hasMonthlyHistory
            ? {
                kind: "link",
                label: "查看历史",
                href: latestMonthlyHref,
              }
            : undefined,
        }
      : monthlyStatus === "DRAFT"
        ? {
            title: "本月目标待完善",
            description: "当前已有目标草稿，可继续补充目标项、风险说明和截止时间。",
            status: { label: "草稿", tone: "warning" },
            metaItems: [
              { label: "截止时间", value: "每月 28 日前完成" },
              { label: "目标项", value: `${monthlyPending?.itemCount ?? 0} 条` },
            ],
            primaryAction: {
              kind: "link",
              label: "继续填写",
              href: monthlyHref,
            },
            secondaryAction: {
              kind: "link",
              label: "查看历史",
              href: latestMonthlyHref,
            },
          }
        : {
            title: "本月目标已提交",
            description: "可查看当前版本、跟进执行进度，或回顾历史目标结构。",
            status: { label: "已提交", tone: "success" },
            metaItems: [
              { label: "当前状态", value: "已完成本月提交" },
              { label: "目标项", value: `${monthlyPending?.itemCount ?? 0} 条` },
            ],
            primaryAction: {
              kind: "link",
              label: "查看详情",
              href: monthlyHref,
            },
            secondaryAction: {
              kind: "link",
              label: "查看历史",
              href: latestMonthlyHref,
            },
          };

  const reminders = !isFirstEntry
    ? [
        ...(weeklyNeedsCreation
          ? [
              {
                id: "weekly-report-missing",
                title: "本周周报待创建",
                meta: "先创建后可承接上周未完成事项，并继续补充本周计划。",
                tone: "warning" as const,
                actionLabel: creatingWeekly ? "创建中..." : "创建周报",
                onClick: () => void handleCreateWeeklyReport(),
                disabled: creatingWeekly,
              },
            ]
          : weeklyNeedsRevision
            ? [
                {
                  id: weeklyStatus === "RETURNED" ? "weekly-report-returned" : "weekly-report-draft",
                  title:
                    weeklyStatus === "RETURNED"
                      ? "本周周报已被退回"
                      : "本周周报待提交",
                  meta:
                    weeklyStatus === "RETURNED"
                      ? "请根据主管说明修改后重新提交。"
                      : "请在周五 18:00 前完成提交。",
                  tone: weeklyStatus === "RETURNED" ? ("danger" as const) : ("warning" as const),
                  actionLabel: weeklyStatus === "RETURNED" ? "去修改" : "去填写",
                  href: weeklyHref,
                },
              ]
            : []),
        ...(monthlyStatus === "MISSING"
          ? [
              {
                id: "monthly-goal-missing",
                title: "本月目标待创建",
                meta: "先建立本月目标结构，后续更容易承接到周报和日程里。",
                tone: "warning" as const,
                actionLabel: creatingMonthly ? "创建中..." : "创建本月目标",
                onClick: () => void handleCreateMonthlyGoal(),
                disabled: creatingMonthly,
              },
            ]
          : monthlyStatus === "DRAFT"
            ? [
                {
                  id: "monthly-goal-draft",
                  title: "本月目标待完善",
                  meta: "请在每月 28 日前补全目标内容。",
                  tone: "warning" as const,
                  actionLabel: "继续填写",
                  href: monthlyHref,
                },
              ]
            : []),
        ...(stats.carryOverCount > 0
          ? [
              {
                id: "carryovers",
                title: "有待承接事项需要确认",
                meta: `当前还有 ${stats.carryOverCount} 项待处理。`,
                tone: "danger" as const,
                actionLabel: "去处理",
                href: weeklyCarryoverHref,
              },
            ]
          : []),
      ]
    : [];

  const shortcutItems = [
    {
      key: "weekly-primary",
      href: weeklyQuickAction.href,
      onClick: weeklyQuickAction.onClick,
      disabled: weeklyQuickAction.disabled,
      label: weeklyQuickAction.label,
      description:
        weeklyNeedsCreation
          ? "直接创建本周周报草稿并进入编辑页。"
          : weeklyNeedsRevision
            ? weeklyStatus === "RETURNED"
              ? "根据主管退回说明补充后，再次提交本周周报。"
              : "继续补充成果、计划和提醒内容。"
            : "查看当前周期周报内容和协作反馈。",
    },
    {
      key: "monthly-primary",
      href: monthlyQuickAction.href,
      onClick: monthlyQuickAction.onClick,
      disabled: monthlyQuickAction.disabled,
      label: monthlyQuickAction.label,
      description:
        monthlyStatus === "MISSING"
          ? "直接创建本月目标草稿并进入编辑页。"
          : monthlyStatus === "DRAFT"
            ? "继续补充目标项、截止时间和风险说明。"
            : "查看当前版本与历史目标结构。",
    },
    {
      key: "weekly-history",
      href: weeklyArchiveHref,
      label: "查看历史周报",
      description: "按月份回看历史周报，为月度回顾和承接分析准备素材。",
    },
    {
      key: "monthly-ai-summary",
      href: monthlyAiSummaryHref,
      label: "月底汇总",
      description: "从周报沉淀本月成果、风险和下月建议，直接回填月目标。",
    },
    {
      key: "schedule",
      href: "/schedule?member=me",
      label: "查看我的日程",
      description: "检查本周计划同步到日程后的安排。",
    },
    ...(stats.carryOverCount > 0
      ? [
          {
            key: "carryover",
            href: weeklyCarryoverHref,
            label: "处理待承接事项",
            description: "集中确认上周或上月遗留事项的去向。",
          },
        ]
      : []),
  ];

  const statCards = [
    {
      title: "周报草稿",
      value: stats.draftWeeklyReportCount,
      description:
        stats.draftWeeklyReportCount > 0
          ? `当前还有 ${stats.draftWeeklyReportCount} 份周报未提交。`
          : "当前没有未提交的周报草稿。",
      status: {
        label: stats.draftWeeklyReportCount > 0 ? "草稿" : "正常",
        tone: stats.draftWeeklyReportCount > 0 ? ("warning" as const) : ("neutral" as const),
      },
    },
    {
      title: "月目标草稿",
      value: stats.draftMonthlyGoalCount,
      description:
        stats.draftMonthlyGoalCount > 0
          ? `当前还有 ${stats.draftMonthlyGoalCount} 份月目标待完善。`
          : "当前没有未完成的月目标草稿。",
      status: {
        label: stats.draftMonthlyGoalCount > 0 ? "待完善" : "正常",
        tone: stats.draftMonthlyGoalCount > 0 ? ("warning" as const) : ("neutral" as const),
      },
    },
    {
      title: "待承接事项",
      value: stats.carryOverCount,
      description:
        stats.carryOverCount > 0
          ? "来自上月或上周回顾，仍需确认去向的事项。"
          : "当前没有待承接的事项。",
      status: {
        label: stats.carryOverCount > 0 ? "需处理" : "正常",
        tone: stats.carryOverCount > 0 ? ("warning" as const) : ("neutral" as const),
      },
    },
    {
      title: "上月未完成",
      value: stats.lastMonthCarryOverCount,
      description:
        stats.lastMonthCarryOverCount > 0
          ? "上月遗留到本月的事项，建议继续跟进。"
          : "上月没有遗留到本月的事项。",
      status: {
        label: stats.lastMonthCarryOverCount > 0 ? "待推进" : "正常",
        tone: stats.lastMonthCarryOverCount > 0 ? ("danger" as const) : ("neutral" as const),
      },
    },
    {
      title: "下月目标项",
      value: stats.nextMonthGoalItemCount,
      description:
        stats.nextMonthGoalItemCount > 0
          ? "下个月已规划好的目标条目数量。"
          : "下个月还没有提前规划的目标条目。",
      status: {
        label: stats.nextMonthGoalItemCount > 0 ? "已规划" : "待规划",
        tone: stats.nextMonthGoalItemCount > 0 ? ("success" as const) : ("neutral" as const),
      },
    },
  ];

  const headerPrimaryKey =
    weeklyNeedsCreation || weeklyNeedsRevision
      ? "weekly"
      : monthlyStatus !== "SUBMITTED"
        ? "monthly"
        : "weekly";

  const showStats = Boolean(data) && !isFirstEntry;
  const showCarryoverModule = Boolean(data) && stats.carryOverCount > 0;
  const showCurrentWeeklyModule = Boolean(data) && !isFirstEntry;
  const showRecentWeeklyModule = hasWeeklyHistory;
  const showRecentMonthlyModule = hasMonthlyHistory;
  const showReminderModule = reminders.length > 0;
  const showTeamActivityModule = !isFirstEntry && teamActivities.length > 0;

  function renderAction(action: ActionConfig) {
    const className = buttonClass(action.variant);

    if (action.kind === "link" && action.href) {
      return (
        <Link className={className} href={action.href} key={`${action.label}-${action.href}`}>
          {action.label}
        </Link>
      );
    }

    return (
      <button
        className={className}
        disabled={action.disabled}
        key={action.label}
        onClick={action.onClick}
        type="button"
      >
        {action.label}
      </button>
    );
  }

  return (
    <div className="workspace-stack">
      <WorkManagementPageHeader
        title="协同总览"
        description={pageDescription}
        actions={
          <>
            {renderAction(
              withVariant(
                weeklyQuickAction,
                headerPrimaryKey === "weekly" ? "primary" : "secondary",
              ),
            )}
            {renderAction(
              withVariant(
                monthlyQuickAction,
                headerPrimaryKey === "monthly" ? "primary" : "secondary",
              ),
            )}
          </>
        }
        meta={[
          { label: "当前阶段", value: currentStageLabel },
          { label: "下一步", value: nextStepLabel },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      {isFirstEntry ? (
        <section className="wm-overview-welcome">
          <div className="stack compact-gap">
            <strong>欢迎开始使用协同工作台</strong>
            <p>
              这里会把周报、月目标和待承接事项放到同一条推进链路里。建议先创建本周周报，再逐步补充本月目标与提醒安排。
            </p>
          </div>
          <div className="action-row">
            {renderAction(withVariant(weeklyQuickAction, "primary"))}
            {renderAction(withVariant(monthlyQuickAction, "secondary"))}
          </div>
        </section>
      ) : null}

      <section className="wm-primary-task-grid">
        <PrimaryTaskCard
          description={weeklyTask.description}
          title={weeklyTask.title}
          periodLabel={weeklyLabel}
          status={weeklyTask.status}
          deadlineText=""
          pendingCount={0}
          metaItems={weeklyTask.metaItems}
          primaryAction={renderAction(withVariant(weeklyTask.primaryAction, "primary"))}
          secondaryAction={
            weeklyTask.secondaryAction
              ? renderAction(withVariant(weeklyTask.secondaryAction, "secondary"))
              : null
          }
        />

        <PrimaryTaskCard
          description={monthlyTask.description}
          title={monthlyTask.title}
          periodLabel={monthlyLabel}
          status={monthlyTask.status}
          deadlineText=""
          pendingCount={0}
          metaItems={monthlyTask.metaItems}
          primaryAction={renderAction(withVariant(monthlyTask.primaryAction, "primary"))}
          secondaryAction={
            monthlyTask.secondaryAction
              ? renderAction(withVariant(monthlyTask.secondaryAction, "secondary"))
              : null
          }
        />
      </section>

      {showStats ? (
        <section className="wm-stat-grid">
          {statCards.map((item) => (
            <InsightStatCard
              description={item.description}
              key={item.title}
              status={item.status}
              title={item.title}
              value={item.value}
            />
          ))}
        </section>
      ) : null}

      <section className="split-workspace">
        <div className="workspace-main">
          {showCarryoverModule ? (
            <SectionCard
              title="待确认承接事项"
              description="这些事项来自上周或上月，仍需选择继续推进、完成或终止。"
              actions={
                <div className="action-row">
                  <Link className="button inline" href={weeklyCarryoverHref}>
                    去处理
                  </Link>
                  <Link className="button secondary inline" href="/work-management/weekly-reports">
                    查看详情
                  </Link>
                </div>
              }
            >
              <div className="wm-focus-list">
                <div className="wm-highlight-link">
                  <div className="summary-row">
                    <strong>
                      {stats.carryOverCount === 1
                        ? "还有 1 项待确认"
                        : `当前共有 ${stats.carryOverCount} 项待确认`}
                    </strong>
                    <StatusBadge tone="warning">需处理</StatusBadge>
                  </div>
                  <div className="small muted">
                    建议先确认继续推进、完成或终止，再进入本周周报和月目标的后续安排。
                  </div>
                </div>

                {(data?.lastMonthCarryOvers ?? []).slice(0, 3).map((item) => (
                  <Link className="list-card stack" href={item.href} key={item.id}>
                    <div className="summary-row">
                      <strong>{item.title}</strong>
                      <StatusBadge tone="danger">待承接</StatusBadge>
                    </div>
                    <div className="small muted">
                      {item.periodLabel}
                      {item.plannedAt ? ` · 原计划 ${formatWorkDay(item.plannedAt)}` : ""}
                    </div>
                    {item.incompleteReason ? (
                      <div className="small muted">未完成原因：{item.incompleteReason}</div>
                    ) : item.description ? (
                      <div className="small muted">{item.description}</div>
                    ) : null}
                  </Link>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {showCurrentWeeklyModule ? (
            <SectionCard
              title={
                weeklyAwaitingReview || weeklyApproved ? "本周周报" : "待处理周报"
              }
              description={
                weeklyNeedsCreation
                  ? "本周周报还未开始，建议先创建后再补充成果、计划和提醒。"
                  : weeklyNeedsRevision
                    ? weeklyStatus === "RETURNED"
                      ? "本周周报已被退回，请先根据说明调整后重新提交。"
                      : "周报不再只是一段文字，而是从回顾、承接到推进日程的一整条推进链。"
                    : weeklyAwaitingReview
                      ? "本周内容已提交，当前等待主管审阅。"
                      : "本周内容已通过审阅，可继续查看承接事项、协作反馈和后续安排。"
              }
              actions={
                weeklyNeedsCreation ? (
                  <div className="action-row">
                    {renderAction(withVariant(weeklyQuickAction, "primary"))}
                    {hasWeeklyHistory
                      ? renderAction(
                          withVariant(
                            {
                              kind: "link",
                              label: "查看上周内容",
                              href: latestWeeklyHref,
                            },
                            "secondary",
                          ),
                        )
                      : null}
                  </div>
                ) : (
                  <div className="action-row">
                    <Link className="button secondary inline" href={weeklyHref}>
                      {weeklyNeedsRevision ? "进入周报页" : "查看详情"}
                    </Link>
                  </div>
                )
              }
            >
              {weeklyNeedsCreation ? (
                <div className="wm-focus-list">
                  <div className="wm-highlight-link">
                    <div className="summary-row">
                      <strong>还没有本周周报</strong>
                      <StatusBadge tone="danger">未创建</StatusBadge>
                    </div>
                    <div className="small muted">
                      创建后可承接上周未完成事项，并把本周计划同步到日程。
                    </div>
                  </div>
                </div>
              ) : (
                <div className="wm-focus-list">
                  <Link className="wm-highlight-link" href={weeklyHref}>
                    <div className="summary-row">
                      <strong>{weeklyLabel}</strong>
                      <StatusBadge tone={statusTone(weeklyStatus)}>
                        {labelForWeeklyReportStatus(weeklyStatus)}
                      </StatusBadge>
                    </div>
                    <div className="small muted">
                      待回顾 {weeklyPending?.openReviewCount ?? 0} 项 · 本周计划 {weeklyPending?.planItemCount ?? 0} 项
                    </div>
                    <div className="small muted">
                      {weeklyStatus === "RETURNED"
                        ? "主管已退回当前版本，请根据说明修改后重新提交。"
                        : weeklyStatus === "DRAFT"
                          ? "仍可继续补充成果、计划和协作信息。"
                          : weeklyApproved
                            ? "当前版本已通过审阅，可继续用于月底汇总和协作。"
                            : "可查看本周内容、讨论记录与承接情况。"}
                    </div>
                  </Link>
                </div>
              )}
            </SectionCard>
          ) : null}

          {showRecentWeeklyModule ? (
            <SectionCard
              title="近期周报"
              description="优先查看最近几周的提交状态和承接情况，避免遗漏未关闭的计划。"
              actions={
                <Link className="button secondary inline" href={weeklyArchiveHref}>
                  查看全部历史
                </Link>
              }
            >
              <div className="wm-record-grid">
                {(data?.recentWeeklyReports ?? []).slice(0, 4).map((item) => (
                  <Link
                    className="list-card stack"
                    href={`/work-management/weekly-reports?reportId=${item.id}`}
                    key={item.id}
                  >
                    <div className="summary-row">
                      <strong>{item.label}</strong>
                      <StatusBadge tone={statusTone(item.status)}>
                        {labelForWeeklyReportStatus(item.status)}
                      </StatusBadge>
                    </div>
                    <div className="small muted">
                      待回顾 {item.openReviewCount} · 本周计划 {item.planItemCount}
                    </div>
                    <div className="small muted">
                      最近提交 {item.submittedAt ? formatWorkDay(item.submittedAt) : "未提交"}
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {showRecentMonthlyModule ? (
            <SectionCard
              title="最近月目标"
              description="月度前回看最近几个月的规划结构，并可继续进入 AI 总结整理成果与风险。"
              actions={
                <Link className="button secondary inline" href={monthlyAiSummaryHref}>
                  打开 AI 总结
                </Link>
              }
            >
              <div className="wm-record-grid">
                {(data?.recentMonthlyGoals ?? []).slice(0, 4).map((item) => (
                  <Link
                    className="list-card stack"
                    href={`/work-management/monthly-goals?goalId=${item.id}`}
                    key={item.id}
                  >
                    <div className="summary-row">
                      <strong>{item.label}</strong>
                      <StatusBadge tone={statusTone(item.status)}>
                        {labelForMonthlyGoalStatus(item.status)}
                      </StatusBadge>
                    </div>
                    <div className="small muted">目标项 {item.itemCount} 条</div>
                    <div className="small muted">
                      最近提交 {item.submittedAt ? formatWorkDay(item.submittedAt) : "未提交"}
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>

        <aside className="workspace-side sticky-side">
          {showReminderModule ? (
            <ReminderListCard
              title="我的提醒"
              description="未提交、未承接和即将到期的内容会统一收在这里。"
              items={reminders}
            />
          ) : null}

          {showTeamActivityModule ? <TeamActivityFeed items={teamActivities} /> : null}

          <ShortcutActionsCard items={shortcutItems} />
        </aside>
      </section>
    </div>
  );
}
