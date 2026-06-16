"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  HistoryListCard,
  ReminderListCard,
  WorkManagementPageHeader,
} from "../../../../../components/work-management/WorkManagementUI";
import { DataTable, EmptyState, FilterBar, SectionCard, StatusBadge } from "../../../../../components/system/primitives";
import { apiFetch } from "../../../../../lib/api";
import {
  type PendingWeeklyReportSummary,
  type WeeklyReportSummary,
  formatWorkDay,
  labelForWeeklyReportStatus,
  statusTone,
} from "../../../../../lib/work-management";

type WeeklyReportListResponse = {
  pendingWeeklyReport: PendingWeeklyReportSummary;
  items: WeeklyReportSummary[];
  teamItems: WeeklyReportSummary[];
};

type MemberListResponse = {
  items: Array<{
    id: string;
    name: string;
    department?: string | null;
    status: "ACTIVE" | "DISABLED";
  }>;
};

export default function TeamWeeklyReportsPage() {
  const [data, setData] = useState<WeeklyReportListResponse | null>(null);
  const [members, setMembers] = useState<MemberListResponse["items"]>([]);
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const response = await apiFetch<WeeklyReportListResponse>("/work-management/weekly-reports");
        if (cancelled) {
          return;
        }

        setData(response);

        try {
          const memberResponse = await apiFetch<MemberListResponse>("/management/members");
          if (!cancelled) {
            setMembers(memberResponse.items);
          }
        } catch {
          if (!cancelled) {
            setMembers([]);
          }
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "团队周报列表加载失败",
          );
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map((item) => item.department)
            .filter((item): item is string => Boolean(item)),
        ),
      ),
    [members],
  );

  const rows = useMemo(() => {
    return (data?.teamItems ?? []).filter((item) => {
      const member = members.find((memberItem) => memberItem.id === item.owner.id);
      const matchesKeyword = keyword
        ? item.owner.displayName.includes(keyword) ||
          item.label.includes(keyword)
        : true;
      const matchesDepartment = department
        ? member?.department === department
        : true;
      const matchesPeriod = period ? item.label.includes(period) : true;

      return matchesKeyword && matchesDepartment && matchesPeriod;
    });
  }, [data?.teamItems, department, keyword, members, period]);

  return (
    <div className="workspace-stack">
      <WorkManagementPageHeader
        title="团队周报"
        description="按成员、部门和周期横向查看团队周报，快速定位谁已提交、谁有承接风险。"
        view="team"
        actions={
          <Link className="button inline" href="/work-management/team/overview">
            返回团队概览
          </Link>
        }
        meta={[
          { label: "当前周期", value: data?.pendingWeeklyReport?.label ?? "本周" },
          { label: "可操作", value: "筛选 / 查看 / 跳转详情" },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            title="团队周报列表"
            description="状态、承接项数量和最近提交时间会集中显示在这里。"
          >
            <FilterBar>
              <label className="filter-field filter-field--wide">
                <span>搜索</span>
                <input
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="成员名 / 周期"
                  value={keyword}
                />
              </label>
              <label className="filter-field">
                <span>部门</span>
                <select onChange={(event) => setDepartment(event.target.value)} value={department}>
                  <option value="">全部部门</option>
                  {departments.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="filter-field">
                <span>周期关键字</span>
                <input
                  onChange={(event) => setPeriod(event.target.value)}
                  placeholder="例如 2026-04-20"
                  value={period}
                />
              </label>
            </FilterBar>

            {rows.length ? (
              <DataTable>
                <thead>
                  <tr>
                    <th>成员</th>
                    <th>部门</th>
                    <th>周期</th>
                    <th>状态</th>
                    <th>未完成事项</th>
                    <th>提交时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const member = members.find((memberItem) => memberItem.id === item.owner.id);

                    return (
                      <tr key={item.id}>
                        <td>{item.owner.displayName}</td>
                        <td>{member?.department || "--"}</td>
                        <td>{item.label}</td>
                        <td>
                          <StatusBadge tone={statusTone(item.status)}>
                            {labelForWeeklyReportStatus(item.status)}
                          </StatusBadge>
                        </td>
                        <td>{item.incompleteCarryOverCount}</td>
                        <td>{item.submittedAt ? formatWorkDay(item.submittedAt) : "未提交"}</td>
                        <td>
                          <Link className="button ghost inline" href={`/work-management/weekly-reports?reportId=${item.id}`}>
                            查看
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState
                title="没有匹配的团队周报"
                description="可以调整成员、部门或周期筛选条件后再查看。"
              />
            )}
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <HistoryListCard
            description="最近 4 份团队周报会保留在这里，方便快速切换查看。"
            emptyDescription="团队成员提交周报后，这里会展示最近记录。"
            emptyTitle="暂无团队周报"
            items={(data?.teamItems ?? []).slice(0, 4).map((item) => ({
              id: item.id,
              title: `${item.owner.displayName} · ${item.label}`,
              meta: `待回顾 ${item.openReviewCount} · 本周计划 ${item.planItemCount}`,
              statusLabel: labelForWeeklyReportStatus(item.status),
              statusTone: statusTone(item.status),
              href: `/work-management/weekly-reports?reportId=${item.id}`,
            }))}
            onSelect={() => undefined}
            title="最近团队周报"
          />

          <ReminderListCard
            title="团队提醒"
            items={[
              {
                id: "weekly",
                title: "周五前检查团队周报提交情况",
                meta: "当前页可直接查看本周团队周报和承接数量",
                tone: "warning",
              },
            ]}
          />
        </aside>
      </section>
    </div>
  );
}
