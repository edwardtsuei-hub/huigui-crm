"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { apiFetch } from "../../../lib/api";

type ManagementOverviewResponse = {
  memberTotal: number;
  activeMemberCount: number;
  monthlyNewMembers: number;
  pendingApprovalCount: number;
  permissionChangeCount: number;
  recentRiskLogs: Array<{
    id: string;
    createdAt: string;
    action: string;
    module: string;
    targetName?: string | null;
    content?: string | null;
    result?: string | null;
    user?: { name: string; roleName?: string | null } | null;
  }>;
  recentExportRecords: Array<{
    id: string;
    createdAt: string;
    targetName?: string | null;
    content?: string | null;
    user?: { name: string } | null;
  }>;
  recentDisabledAccounts: Array<{
    id: string;
    createdAt: string;
    targetName?: string | null;
    content?: string | null;
    user?: { name: string } | null;
  }>;
  pendingApprovalItems: Array<{
    id: string;
    title: string;
    summary?: string | null;
    requiredRoleCode?: string | null;
    requester: { name: string; roleName: string };
    quotation?: { id: string; quotationNo: string; customerName: string } | null;
    createdAt: string;
  }>;
  quickActions: Array<{
    key: string;
    label: string;
    href: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export default function ManagementOverviewPage() {
  const [data, setData] = useState<ManagementOverviewResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<ManagementOverviewResponse>("/management/overview")
      .then(setData)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : "管理总览加载失败")
      );
  }, []);

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        title="管理中心"
        eyebrow="Management Center"
        description="集中查看成员规模、待处理审批、权限变更和高风险操作，让管理者先看到系统状态，再进入具体配置页。"
        actions={
          <>
            <Link className="button secondary inline" href="/management/roles">
              配置角色
            </Link>
            <Link className="button inline" href="/management/members?create=1">
              新增成员
            </Link>
          </>
        }
        meta={[
          { label: "模块", value: "成员 / 权限 / 审批 / 审计" },
          { label: "视图", value: "总览 + 四个配置页" }
        ]}
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="insight-grid">
        <article className="insight-card">
          <div className="insight-label">成员总数</div>
          <div className="insight-value">{data?.memberTotal ?? 0}</div>
          <div className="insight-note">用于衡量当前系统的协作规模。</div>
        </article>
        <article className="insight-card">
          <div className="insight-label">启用成员</div>
          <div className="insight-value">{data?.activeMemberCount ?? 0}</div>
          <div className="insight-note">当前可登录并参与业务协作的账号。</div>
        </article>
        <article className="insight-card">
          <div className="insight-label">本月新增成员</div>
          <div className="insight-value">{data?.monthlyNewMembers ?? 0}</div>
          <div className="insight-note">最近组织扩张与岗位增补节奏。</div>
        </article>
        <article className="insight-card">
          <div className="insight-label">待处理审批</div>
          <div className="insight-value">{data?.pendingApprovalCount ?? 0}</div>
          <div className="insight-note">折扣、导出等关键动作等待审批。</div>
        </article>
      </section>

      <section className="split-workspace">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>待处理审批</h3>
              <p>把真正阻塞业务推进的审批先排出来，而不是让审批规则页变成静态配置页。</p>
            </div>

            <div className="stack">
              {data?.pendingApprovalItems?.length ? (
                data.pendingApprovalItems.map((item) => (
                  <Link className="list-card" href={item.quotation ? `/quotations/${item.quotation.id}` : "/quotations"} key={item.id}>
                    <div className="summary-row">
                      <strong>{item.title}</strong>
                      <span className="status-pill warning">{item.requiredRoleCode || "待审批"}</span>
                    </div>
                    <div className="small muted">
                      {item.summary || "当前审批等待处理"} · 提交人 {item.requester.name}
                    </div>
                    <div className="small muted">
                      {item.quotation ? `${item.quotation.quotationNo} / ${item.quotation.customerName}` : "通用审批项"} · {formatDate(item.createdAt)}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty">当前没有待处理审批，管理中心状态稳定。</div>
              )}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>高风险操作</h3>
              <p>优先盯住删除、驳回、停用与负责人转移，避免风险动作悄悄发生。</p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>操作人</th>
                    <th>模块</th>
                    <th>动作</th>
                    <th>对象</th>
                    <th>摘要</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentRiskLogs?.length ? (
                    data.recentRiskLogs.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>{item.user?.name || "--"}</td>
                        <td>{item.module}</td>
                        <td>
                          <span className="status-pill danger">{item.action}</span>
                        </td>
                        <td>{item.targetName || "--"}</td>
                        <td>{item.content || item.result || "--"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">还没有高风险操作记录。</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="workspace-side">
          <section className="panel stack">
            <div className="section-heading">
              <h3>快捷入口</h3>
              <p>把最常用的管理动作收束成一列，不需要在多个页签之间来回找。</p>
            </div>

            <div className="stack">
              {data?.quickActions?.map((action) => (
                <Link className="list-card" href={action.href} key={action.key}>
                  <strong>{action.label}</strong>
                  <div className="small muted">进入对应配置页继续处理。</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>近期导出与账号变更</h3>
              <p>导出记录和账号停用是管理者最常追的两类动作，放在同一侧边栏更直观。</p>
            </div>

            <div className="stack">
              <div className="summary-card">
                <div className="summary-row">
                  <span>近期导出</span>
                  <strong>{data?.recentExportRecords?.length ?? 0}</strong>
                </div>
                <div className="small muted">
                  {data?.recentExportRecords?.[0]
                    ? `${data.recentExportRecords[0].targetName || "正式报价"} · ${formatDate(data.recentExportRecords[0].createdAt)}`
                    : "最近暂无导出记录"}
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-row">
                  <span>账号停用记录</span>
                  <strong>{data?.recentDisabledAccounts?.length ?? 0}</strong>
                </div>
                <div className="small muted">
                  {data?.recentDisabledAccounts?.[0]
                    ? `${data.recentDisabledAccounts[0].targetName || "成员账号"} · ${formatDate(data.recentDisabledAccounts[0].createdAt)}`
                    : "最近暂无账号状态变更"}
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-row">
                  <span>权限变更次数</span>
                  <strong>{data?.permissionChangeCount ?? 0}</strong>
                </div>
                <div className="small muted">统计本月角色权限、审批规则等敏感配置变更次数。</div>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
