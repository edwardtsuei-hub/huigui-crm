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
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { apiFetch } from "../../../lib/api";
import { formatDateLabel, formatMoney } from "../../../lib/workspace";

type QuotationType =
  | "AGRICULTURE"
  | "GENERAL"
  | "INDUSTRY"
  | "SERVICE"
  | "BREEDING";

type ApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

type QuotationRecord = {
  id: string;
  quotationNo: string;
  type: QuotationType;
  subtotal: string;
  totalAmount: string;
  approvalStatus: ApprovalStatus;
  exportApprovalStatus: ApprovalStatus;
  createdAt: string;
  customer: { name: string };
  creator: { displayName: string };
  items: Array<{ id: string }>;
};

const quotationTypeOptions: Array<{
  value: "" | QuotationType;
  label: string;
}> = [
  { value: "", label: "全部类型" },
  { value: "AGRICULTURE", label: "农业方案" },
  { value: "GENERAL", label: "通用报价" },
  { value: "INDUSTRY", label: "行业报价" },
  { value: "SERVICE", label: "服务报价" },
  { value: "BREEDING", label: "养殖报价" },
];

function quotationTypeLabel(type: QuotationType) {
  return (
    quotationTypeOptions.find((option) => option.value === type)?.label ??
    "报价"
  );
}

function approvalTone(status: ApprovalStatus) {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function approvalLabel(status: ApprovalStatus, mode: "approval" | "export") {
  if (status === "PENDING") {
    return "待审批";
  }
  if (status === "REJECTED") {
    return "已驳回";
  }
  if (status === "APPROVED") {
    return mode === "export" ? "已解锁" : "已通过";
  }
  return "免审批";
}

export default function QuotationsPage() {
  const [records, setRecords] = useState<QuotationRecord[]>([]);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<"" | QuotationType>("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<QuotationRecord[]>("/quotations")
      .then(setRecords)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "加载报价记录失败",
        ),
      );
  }, []);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        const matchesType = !type || record.type === type;
        const haystack =
          `${record.quotationNo} ${record.customer.name} ${record.creator.displayName}`.toLowerCase();
        const matchesKeyword =
          !keyword.trim() || haystack.includes(keyword.trim().toLowerCase());
        return matchesType && matchesKeyword;
      }),
    [keyword, records, type],
  );

  const stats = useMemo(
    () => [
      { label: "报价总数", value: String(records.length) },
      {
        label: "待审批",
        value: String(
          records.filter(
            (record) =>
              record.approvalStatus === "PENDING" ||
              record.exportApprovalStatus === "PENDING",
          ).length,
        ),
      },
      {
        label: "农业方案",
        value: String(
          records.filter((record) => record.type === "AGRICULTURE").length,
        ),
      },
      {
        label: "总金额",
        value: formatMoney(
          records.reduce((sum, record) => sum + Number(record.totalAmount), 0),
        ),
      },
    ],
    [records],
  );

  const statusSummary = useMemo(
    () => [
      {
        label: "折扣审批待处理",
        value: String(
          records.filter((record) => record.approvalStatus === "PENDING")
            .length,
        ),
      },
      {
        label: "导出审批待处理",
        value: String(
          records.filter((record) => record.exportApprovalStatus === "PENDING")
            .length,
        ),
      },
      {
        label: "本周新建",
        value: String(
          records.filter((record) => {
            const createdAt = new Date(record.createdAt).getTime();
            return Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
          }).length,
        ),
      },
    ],
    [records],
  );

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <>
            <Link
              className="button secondary inline"
              href="/solutions/agriculture/new"
            >
              新建农业方案
            </Link>
            <Link className="button inline" href="/quotes/general">
              新建通用报价
            </Link>
          </>
        }
        description="统一查看报价状态、审批结果与导出进度，列表页只保留筛选、核对和进入详情的高频动作。"
        eyebrow="报价协同"
        meta={stats}
        title="报价记录"
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="split-workspace">
        <div className="workspace-main">
          <SectionCard
            actions={
              <StatusBadge
                tone={filteredRecords.length ? "success" : "neutral"}
                variant="badge"
              >
                筛选结果 {filteredRecords.length}
              </StatusBadge>
            }
            description="按关键词和报价类型筛选，快速锁定需要审批、导出或跟进的正式报价。"
            title="报价列表"
          >
            <FilterBar
              actions={
                <button
                  className="button ghost inline"
                  onClick={() => {
                    setKeyword("");
                    setType("");
                  }}
                  type="button"
                >
                  清空筛选
                </button>
              }
            >
              <div className="field filter-field--wide">
                <label htmlFor="quotation-search">搜索</label>
                <input
                  id="quotation-search"
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索报价单号 / 客户 / 创建人"
                  value={keyword}
                />
              </div>

              <div className="field filter-field">
                <label htmlFor="quotation-type">类型</label>
                <select
                  id="quotation-type"
                  onChange={(event) =>
                    setType(event.target.value as "" | QuotationType)
                  }
                  value={type}
                >
                  {quotationTypeOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </FilterBar>

            {filteredRecords.length ? (
              <DataTable>
                <thead>
                  <tr>
                    <th>报价单号</th>
                    <th>类型</th>
                    <th>客户</th>
                    <th>条目数</th>
                    <th>金额</th>
                    <th>折扣审批</th>
                    <th>导出审批</th>
                    <th>创建人</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.quotationNo}</strong>
                        <div className="small muted">
                          小计 {formatMoney(record.subtotal)}
                        </div>
                      </td>
                      <td>
                        <StatusBadge
                          tone={
                            record.type === "AGRICULTURE"
                              ? "success"
                              : "neutral"
                          }
                        >
                          {quotationTypeLabel(record.type)}
                        </StatusBadge>
                      </td>
                      <td>{record.customer.name}</td>
                      <td>{record.items.length}</td>
                      <td>{formatMoney(record.totalAmount)}</td>
                      <td>
                        <StatusBadge tone={approvalTone(record.approvalStatus)}>
                          {approvalLabel(record.approvalStatus, "approval")}
                        </StatusBadge>
                      </td>
                      <td>
                        <StatusBadge
                          tone={approvalTone(record.exportApprovalStatus)}
                        >
                          {approvalLabel(record.exportApprovalStatus, "export")}
                        </StatusBadge>
                      </td>
                      <td>{record.creator.displayName}</td>
                      <td>{formatDateLabel(record.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          <Link
                            className="button secondary inline"
                            href={`/quotations/${record.id}`}
                          >
                            查看详情
                          </Link>
                          <ActionMenu
                            items={[
                              {
                                href: `/quotations/${record.id}`,
                                label: "打开审批与导出记录",
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
                  <Link className="button inline" href="/quotes/general">
                    新建通用报价
                  </Link>
                }
                description="当前筛选条件下没有报价记录，建议调整筛选条件或直接新建报价。"
                title="暂无匹配报价"
              />
            )}
          </SectionCard>
        </div>

        <aside className="workspace-side sticky-side">
          <SummaryCard
            description="把审批和导出阻塞收口在右侧，避免每次都去明细里翻。"
            title="推进概览"
          >
            <div className="focus-list">
              {statusSummary.map((item) => (
                <article className="summary-card" key={item.label}>
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SummaryCard>
        </aside>
      </section>
    </div>
  );
}
