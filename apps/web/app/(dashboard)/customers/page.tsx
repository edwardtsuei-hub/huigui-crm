"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ActionMenu,
  DataTable,
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
  SummaryCard,
} from "../../../components/system/primitives";
import {
  customerStatusLabelMap,
  customerStatusTone,
} from "../../../components/customers/types";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { apiFetch } from "../../../lib/api";
import { formatDateLabel, formatMoney } from "../../../lib/workspace";

type IndustryGroup = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  displayName: string;
  roleName: string;
};

type CustomerListResponse = {
  items: CustomerRecord[];
  total: number;
};

type CustomerRecord = {
  id: string;
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  mobile?: string | null;
  status: string;
  updatedAt: string;
  cooperationDirection?: string | null;
  estimatedAmount?: string | null;
  successProbability?: number | null;
  recentFollowupAt?: string | null;
  owner: { id: string; displayName: string };
  industryGroup?: { id: string; name: string } | null;
  industrySubgroup?: { id: string; name: string } | null;
  _count: { followups: number; quotations: number };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [industries, setIndustries] = useState<IndustryGroup[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    industryGroupId: "",
    ownerUserId: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const searchParams = new URLSearchParams();
        if (filters.search) searchParams.set("keyword", filters.search);
        if (filters.status) searchParams.set("status", filters.status);
        if (filters.industryGroupId) {
          searchParams.set("industryGroupId", filters.industryGroupId);
        }
        if (filters.ownerUserId) {
          searchParams.set("ownerUserId", filters.ownerUserId);
        }

        const [customerResponse, industryResponse, userResponse] =
          await Promise.all([
            apiFetch<CustomerListResponse>(
              `/customers?${searchParams.toString()}`,
            ),
            apiFetch<IndustryGroup[]>("/meta/industries"),
            apiFetch<UserOption[]>("/meta/users"),
          ]);

        if (cancelled) {
          return;
        }

        setCustomers(customerResponse.items);
        setIndustries(industryResponse);
        setUsers(userResponse);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载客户失败",
          );
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [
    filters.industryGroupId,
    filters.ownerUserId,
    filters.search,
    filters.status,
  ]);

  const stats = useMemo(
    () => [
      { label: "客户总数", value: String(customers.length) },
      {
        label: "合作中",
        value: String(
          customers.filter((customer) => customer.status === "COOPERATING")
            .length,
        ),
      },
      {
        label: "高意向",
        value: String(
          customers.filter(
            (customer) => (customer.successProbability ?? 0) >= 70,
          ).length,
        ),
      },
      {
        label: "关联报价",
        value: String(
          customers.reduce(
            (sum, customer) => sum + customer._count.quotations,
            0,
          ),
        ),
      },
    ],
    [customers],
  );

  const focusCustomers = useMemo(
    () =>
      [...customers]
        .sort(
          (left, right) =>
            (right.successProbability ?? 0) - (left.successProbability ?? 0),
        )
        .slice(0, 4),
    [customers],
  );

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <>
            <Link className="button secondary inline" href="/schedule">
              查看今日日程
            </Link>
            <Link className="button inline" href="/customers/new">
              新增客户
            </Link>
          </>
        }
        description="客户列表页专注搜索、筛选与判断，新增客户收口到独立页，避免列表区重复嵌套长表单。"
        eyebrow="客户工作台"
        meta={stats}
        title="客户管理"
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            actions={
              <StatusBadge
                tone={customers.length ? "success" : "neutral"}
                variant="badge"
              >
                当前结果 {customers.length}
              </StatusBadge>
            }
            description="按搜索、状态、行业和负责人组合筛选，快速判断谁该今天推进。"
            title="客户列表"
          >
            <FilterBar
              actions={
                <button
                  className="button ghost inline"
                  onClick={() =>
                    setFilters({
                      search: "",
                      status: "",
                      industryGroupId: "",
                      ownerUserId: "",
                    })
                  }
                  type="button"
                >
                  清空筛选
                </button>
              }
            >
              <div className="field filter-field--wide">
                <label htmlFor="customer-search">搜索</label>
                <input
                  id="customer-search"
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                  placeholder="搜索客户名称 / 联系人 / 手机"
                  value={filters.search}
                />
              </div>

              <div className="field filter-field">
                <label htmlFor="customer-status">状态</label>
                <select
                  id="customer-status"
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                  value={filters.status}
                >
                  <option value="">全部状态</option>
                  {Object.entries(customerStatusLabelMap).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="field filter-field">
                <label htmlFor="customer-industry">行业</label>
                <select
                  id="customer-industry"
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      industryGroupId: event.target.value,
                    }))
                  }
                  value={filters.industryGroupId}
                >
                  <option value="">全部行业</option>
                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field filter-field">
                <label htmlFor="customer-owner">负责人</label>
                <select
                  id="customer-owner"
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      ownerUserId: event.target.value,
                    }))
                  }
                  value={filters.ownerUserId}
                >
                  <option value="">全部负责人</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </FilterBar>

            {customers.length ? (
              <DataTable>
                <thead>
                  <tr>
                    <th>客户</th>
                    <th>状态 / 行业</th>
                    <th>负责人</th>
                    <th>意向 / 金额</th>
                    <th>下一步动作</th>
                    <th>最近互动</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.name}</strong>
                        <div className="small muted">
                          {customer.companyName || "未填企业名称"}
                        </div>
                        <div className="small muted">
                          {customer.contactName || "未填联系人"}
                          {customer.mobile ? ` · ${customer.mobile}` : ""}
                        </div>
                      </td>

                      <td>
                        <StatusBadge tone={customerStatusTone(customer.status)}>
                          {customerStatusLabelMap[customer.status] ??
                            customer.status}
                        </StatusBadge>
                        <div className="small muted" style={{ marginTop: 8 }}>
                          {customer.industryGroup?.name || "未设置行业"}
                          {customer.industrySubgroup?.name
                            ? ` / ${customer.industrySubgroup.name}`
                            : ""}
                        </div>
                      </td>

                      <td>
                        <strong>{customer.owner.displayName}</strong>
                        <div className="small muted">主负责人</div>
                      </td>

                      <td>
                        <strong>{customer.successProbability ?? 0}%</strong>
                        <div className="small muted">
                          {formatMoney(customer.estimatedAmount)}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {customer.cooperationDirection || "待补充下一步动作"}
                        </strong>
                        <div className="small muted">
                          跟进 {customer._count.followups} 次 · 报价{" "}
                          {customer._count.quotations} 次
                        </div>
                      </td>

                      <td>
                        {customer.recentFollowupAt
                          ? formatDateLabel(customer.recentFollowupAt)
                          : formatDateLabel(customer.updatedAt)}
                      </td>

                      <td>
                        <div className="table-actions">
                          <Link
                            className="button secondary inline"
                            href={`/customers/${customer.id}`}
                          >
                            详情
                          </Link>
                          <Link
                            className="button secondary inline"
                            href={`/quotes/general?customerId=${customer.id}`}
                          >
                            报价
                          </Link>
                          <ActionMenu
                            items={[
                              {
                                href: `/solutions/agriculture/new?customerId=${customer.id}`,
                                label: "新建方案",
                              },
                              {
                                href: `/customers/${customer.id}/edit`,
                                label: "编辑客户",
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState
                action={
                  <Link className="button inline" href="/customers/new">
                    新增客户
                  </Link>
                }
                description="当前筛选条件下没有客户，建议调整筛选条件或直接新增客户。"
                title="暂无匹配客户"
              />
            )}
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <SummaryCard
            description="右侧保留今天最值得推进的客户，筛选列表时也能维持判断基线。"
            title="今日重点客户"
          >
            <div className="focus-list">
              {focusCustomers.length ? (
                focusCustomers.map((customer) => (
                  <article className="focus-card" key={`focus-${customer.id}`}>
                    <div className="focus-card__top">
                      <div className="focus-card__meta">
                        <h4>{customer.name}</h4>
                        <div className="small muted">
                          {customer.companyName || "未填企业名称"}
                        </div>
                      </div>
                      <StatusBadge tone={customerStatusTone(customer.status)}>
                        {customerStatusLabelMap[customer.status] ??
                          customer.status}
                      </StatusBadge>
                    </div>

                    <div className="focus-card__detail">
                      <span>意向评分</span>
                      <strong>{customer.successProbability ?? 0}</strong>
                    </div>
                    <div className="focus-card__detail">
                      <span>下一步</span>
                      <strong>
                        {customer.cooperationDirection || "补充下一步动作"}
                      </strong>
                    </div>
                    <div className="focus-card__detail">
                      <span>最近互动</span>
                      <strong>
                        {customer.recentFollowupAt
                          ? formatDateLabel(customer.recentFollowupAt)
                          : formatDateLabel(customer.updatedAt)}
                      </strong>
                    </div>

                    <div className="timeline-item__links">
                      <Link
                        className="button secondary inline"
                        href={`/customers/${customer.id}`}
                      >
                        打开详情
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  description="补齐客户意向评分后，系统会优先把高价值客户收口在这里。"
                  title="暂无重点客户"
                />
              )}
            </div>
          </SummaryCard>
        </aside>
      </section>
    </div>
  );
}
