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
  type MonthlyGoalSummary,
  type PendingMonthlyGoalSummary,
  formatWorkDay,
  labelForMonthlyGoalStatus,
  statusTone,
} from "../../../../../lib/work-management";

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
    status: "ACTIVE" | "DISABLED";
  }>;
};

export default function TeamMonthlyGoalsPage() {
  const [data, setData] = useState<MonthlyGoalListResponse | null>(null);
  const [members, setMembers] = useState<MemberListResponse["items"]>([]);
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const response = await apiFetch<MonthlyGoalListResponse>("/work-management/monthly-goals");
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
              : "团队月目标列表加载失败",
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
        ? item.owner.displayName.includes(keyword) || item.label.includes(keyword)
        : true;
      const matchesDepartment = department ? member?.department === department : true;
      const matchesPeriod = period ? item.label.includes(period) : true;

      return matchesKeyword && matchesDepartment && matchesPeriod;
    });
  }, [data?.teamItems, department, keyword, members, period]);

  return (
    <div className="workspace-stack">
      <WorkManagementPageHeader
        title="团队月目标"
        description="横向查看团队月目标的结构、状态和目标项数量，便于管理者快速比对。"
        view="team"
        actions={
          <Link className="button inline" href="/work-management/team/overview">
            返回团队概览
          </Link>
        }
        meta={[
          { label: "当前月份", value: data?.pendingMonthlyGoal?.label ?? "本月" },
          { label: "可操作", value: "筛选 / 查看 / 跳转详情" },
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            title="团队月目标列表"
            description="目标项数量、最近提交时间和状态会集中显示在这里。"
          >
            <FilterBar>
              <label className="filter-field filter-field--wide">
                <span>搜索</span>
                <input
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="成员名 / 月份"
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
                <span>月份关键字</span>
                <input
                  onChange={(event) => setPeriod(event.target.value)}
                  placeholder="例如 2026 年 04 月"
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
                    <th>月份</th>
                    <th>状态</th>
                    <th>目标数</th>
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
                            {labelForMonthlyGoalStatus(item.status)}
                          </StatusBadge>
                        </td>
                        <td>{item.itemCount}</td>
                        <td>{item.submittedAt ? formatWorkDay(item.submittedAt) : "未提交"}</td>
                        <td>
                          <Link className="button ghost inline" href={`/work-management/monthly-goals?goalId=${item.id}`}>
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
                title="没有匹配的团队月目标"
                description="可以调整成员、部门或月份筛选条件后再查看。"
              />
            )}
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <HistoryListCard
            description="最近 4 份团队月目标会保留在这里，方便快速切换查看。"
            emptyDescription="团队成员提交月目标后，这里会展示最近记录。"
            emptyTitle="暂无团队月目标"
            items={(data?.teamItems ?? []).slice(0, 4).map((item) => ({
              id: item.id,
              title: `${item.owner.displayName} · ${item.label}`,
              meta: `目标项 ${item.itemCount} · 最近提交 ${item.submittedAt ? formatWorkDay(item.submittedAt) : "未提交"}`,
              statusLabel: labelForMonthlyGoalStatus(item.status),
              statusTone: statusTone(item.status),
              href: `/work-management/monthly-goals?goalId=${item.id}`,
            }))}
            onSelect={() => undefined}
            title="最近团队月目标"
          />

          <ReminderListCard
            title="团队提醒"
            items={[
              {
                id: "monthly",
                title: "每月 28 日前检查团队目标提交情况",
                meta: "当前页可直接对比团队目标结构和提交月份",
                tone: "warning",
              },
            ]}
          />
        </aside>
      </section>
    </div>
  );
}
