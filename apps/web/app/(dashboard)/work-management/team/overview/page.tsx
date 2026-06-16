"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  InsightStatCard,
  TeamActivityFeed,
  WorkManagementPageHeader,
} from "../../../../../components/work-management/WorkManagementUI";
import { EmptyState, SectionCard, StatusBadge } from "../../../../../components/system/primitives";
import { apiFetch } from "../../../../../lib/api";
import {
  type MonthlyGoalSummary,
  type PendingMonthlyGoalSummary,
  type PendingWeeklyReportSummary,
  type WeeklyReportSummary,
  formatWorkDay,
  labelForMonthlyGoalStatus,
  labelForWeeklyReportStatus,
  statusTone,
} from "../../../../../lib/work-management";

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

type MemberListResponse = {
  items: Array<{
    id: string;
    name: string;
    department?: string | null;
    title?: string | null;
    status: "ACTIVE" | "DISABLED";
  }>;
};

export default function TeamWorkManagementOverviewPage() {
  const [weeklyList, setWeeklyList] = useState<WeeklyReportListResponse | null>(null);
  const [monthlyList, setMonthlyList] = useState<MonthlyGoalListResponse | null>(null);
  const [memberTotal, setMemberTotal] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [weeklyResponse, monthlyResponse] = await Promise.all([
          apiFetch<WeeklyReportListResponse>("/work-management/weekly-reports"),
          apiFetch<MonthlyGoalListResponse>("/work-management/monthly-goals"),
        ]);

        if (cancelled) {
          return;
        }

        setWeeklyList(weeklyResponse);
        setMonthlyList(monthlyResponse);

        try {
          const memberResponse = await apiFetch<MemberListResponse>("/management/members");
          if (!cancelled) {
            setMemberTotal(
              memberResponse.items.filter((item) => item.status === "ACTIVE").length,
            );
          }
        } catch {
          if (!cancelled) {
            const ownerIds = new Set([
              ...weeklyResponse.teamItems.map((item) => item.owner.id),
              ...monthlyResponse.teamItems.map((item) => item.owner.id),
            ]);
            setMemberTotal(ownerIds.size || null);
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "团队协同概览加载失败",
          );
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentWeeklyLabel = weeklyList?.pendingWeeklyReport?.label;
  const currentMonthlyLabel = monthlyList?.pendingMonthlyGoal?.label;
  const currentWeeklySubmitted = (weeklyList?.teamItems ?? []).filter(
    (item) => item.label === currentWeeklyLabel,
  );
  const currentMonthlySubmitted = (monthlyList?.teamItems ?? []).filter(
    (item) => item.label === currentMonthlyLabel,
  );

  const weeklyRate = memberTotal
    ? `${Math.round((currentWeeklySubmitted.length / memberTotal) * 100)}%`
    : `${currentWeeklySubmitted.length} 份`;
  const monthlyRate = memberTotal
    ? `${Math.round((currentMonthlySubmitted.length / memberTotal) * 100)}%`
    : `${currentMonthlySubmitted.length} 份`;

  const activityItems = useMemo(() => {
    const weeklyActivities = (weeklyList?.teamItems ?? []).slice(0, 5).map((item) => ({
      id: `weekly-${item.id}`,
      title: `${item.owner.displayName} 提交了周报`,
      meta: `${item.label} · ${item.submittedAt ? formatWorkDay(item.submittedAt) : "刚刚提交"}`,
      tone: "success" as const,
      href: `/work-management/team/weekly-reports`,
    }));
    const monthlyActivities = (monthlyList?.teamItems ?? []).slice(0, 5).map((item) => ({
      id: `monthly-${item.id}`,
      title: `${item.owner.displayName} 提交了月目标`,
      meta: `${item.label} · ${item.submittedAt ? formatWorkDay(item.submittedAt) : "刚刚提交"}`,
      tone: "neutral" as const,
      href: `/work-management/team/monthly-goals`,
    }));

    return [...weeklyActivities, ...monthlyActivities].slice(0, 8);
  }, [monthlyList?.teamItems, weeklyList?.teamItems]);

  return (
    <div className="workspace-stack">
      <WorkManagementPageHeader
        title="团队协同概览"
        description="从团队视角查看周报、月目标、提交节奏与最近动态。"
        view="team"
        actions={
          <>
            <Link className="button secondary inline" href="/work-management/team/weekly-reports">
              团队周报
            </Link>
            <Link className="button inline" href="/work-management/team/monthly-goals">
              团队月目标
            </Link>
          </>
        }
        meta={[
          { label: "视角", value: memberTotal ? `覆盖 ${memberTotal} 位成员` : "团队只读视角" },
          { label: "用途", value: "提交节奏 / 横向查看 / 最近动态" },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="wm-stat-grid">
        <InsightStatCard
          title="本周周报提交率"
          value={weeklyRate}
          description={currentWeeklyLabel ? `${currentWeeklyLabel} 已提交 ${currentWeeklySubmitted.length} 份` : "当前周期暂无提交数据"}
          status={{ label: "周报", tone: "warning" }}
        />
        <InsightStatCard
          title="本月目标提交率"
          value={monthlyRate}
          description={currentMonthlyLabel ? `${currentMonthlyLabel} 已提交 ${currentMonthlySubmitted.length} 份` : "当前月份暂无提交数据"}
          status={{ label: "月目标", tone: "warning" }}
        />
        <InsightStatCard
          title="团队周报总量"
          value={(weeklyList?.teamItems ?? []).length}
          description="最近可查看的团队周报记录数量。"
          status={{ label: "最近记录", tone: "success" }}
        />
        <InsightStatCard
          title="团队目标总量"
          value={(monthlyList?.teamItems ?? []).length}
          description="最近可查看的团队月目标记录数量。"
          status={{ label: "最近记录", tone: "success" }}
        />
      </section>

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            title="当前周期团队周报"
            description="优先关注当前周次的提交情况和未完成承接数量。"
          >
            <div className="wm-record-grid">
              {currentWeeklySubmitted.length ? (
                currentWeeklySubmitted.map((item) => (
                  <Link
                    className="list-card stack"
                    href={`/work-management/weekly-reports?reportId=${item.id}`}
                    key={item.id}
                  >
                    <div className="summary-row">
                      <strong>{item.owner.displayName}</strong>
                      <StatusBadge tone={statusTone(item.status)}>
                        {labelForWeeklyReportStatus(item.status)}
                      </StatusBadge>
                    </div>
                    <div className="small muted">{item.label}</div>
                    <div className="small muted">
                      待回顾 {item.openReviewCount} · 本周计划 {item.planItemCount}
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="当前周次暂时没有团队周报"
                  description="成员提交后，这里会优先显示当前周期的团队周报。"
                />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="当前月份团队目标"
            description="便于快速横向比较本月各成员的目标颗粒度与提交状态。"
          >
            <div className="wm-record-grid">
              {currentMonthlySubmitted.length ? (
                currentMonthlySubmitted.map((item) => (
                  <Link
                    className="list-card stack"
                    href={`/work-management/monthly-goals?goalId=${item.id}`}
                    key={item.id}
                  >
                    <div className="summary-row">
                      <strong>{item.owner.displayName}</strong>
                      <StatusBadge tone={statusTone(item.status)}>
                        {labelForMonthlyGoalStatus(item.status)}
                      </StatusBadge>
                    </div>
                    <div className="small muted">{item.label}</div>
                    <div className="small muted">目标项 {item.itemCount} 条</div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="当前月份暂时没有团队目标"
                  description="成员提交本月目标后，这里会优先显示当前月份记录。"
                />
              )}
            </div>
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <TeamActivityFeed items={activityItems} />
        </aside>
      </section>
    </div>
  );
}
