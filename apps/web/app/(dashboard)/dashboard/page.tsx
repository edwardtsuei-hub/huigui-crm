"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, getCurrentUser } from "../../../lib/api";
import { PUBLIC_ENTRY_HOST } from "../../../lib/public-entry";
import { formatMoney } from "../../../lib/workspace";

type DashboardResponse = {
  todayTodoCount: number;
  todayReminderCount: number;
  customerCount: number;
  productCount: number;
  quotationCount: number;
  pendingApprovalCount?: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    type: string;
  }>;
  recentQuotations: Array<{
    id: string;
    quotationNo: string;
    type: "AGRICULTURE" | "INDUSTRY" | "SERVICE" | "BREEDING" | "GENERAL";
    totalAmount: string;
    createdAt: string;
    customer: { name: string };
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
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
      return "首页工作台";
  }
}

export default function DashboardPage() {
  const currentUser = getCurrentUser();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<DashboardResponse>("/meta/dashboard")
      .then(setData)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "工作台加载失败"));
  }, []);

  const primaryCards = useMemo(() => {
    switch (currentUser?.roleCode) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return [
          { label: "团队概览", value: data?.customerCount ?? 0, note: "当前可见客户总量" },
          { label: "待审批事项", value: data?.pendingApprovalCount ?? 0, note: "需要管理角色处理" },
          { label: "高频提醒", value: data?.todayReminderCount ?? 0, note: "今日风险与提醒" },
          { label: "本周报价", value: data?.quotationCount ?? 0, note: "团队报价归档规模" }
        ];
      case "SALES_MANAGER":
        return [
          { label: "本组客户", value: data?.customerCount ?? 0, note: "当前团队客户池" },
          { label: "本组待审批", value: data?.pendingApprovalCount ?? 0, note: "折扣与导出待处理" },
          { label: "本组今日日程", value: data?.todayReminderCount ?? 0, note: "提醒与日程密度" },
          { label: "本组报价", value: data?.quotationCount ?? 0, note: "已生成报价总数" }
        ];
      case "PRODUCT_SPECIALIST":
        return [
          { label: "产品资产", value: data?.productCount ?? 0, note: "可维护产品与模板" },
          { label: "方案调用", value: data?.quotationCount ?? 0, note: "被方案或报价引用次数" },
          { label: "待补全提醒", value: data?.todayReminderCount ?? 0, note: "缺素材或待校对事项" },
          { label: "今日任务", value: data?.todayTodoCount ?? 0, note: "当前执行中的内部任务" }
        ];
      case "FINANCE":
        return [
          { label: "待确认报价", value: data?.pendingApprovalCount ?? 0, note: "等待财务确认或导出" },
          { label: "已归档报价", value: data?.quotationCount ?? 0, note: "可追踪金额与导出状态" },
          { label: "今日提醒", value: data?.todayReminderCount ?? 0, note: "回款与到期提醒" },
          { label: "客户覆盖", value: data?.customerCount ?? 0, note: "当前可见客户范围" }
        ];
      default:
        return [
          { label: "我的客户", value: data?.customerCount ?? 0, note: "当前我负责的客户数" },
          { label: "我的待跟进", value: data?.todayTodoCount ?? 0, note: "今天需要推进的任务" },
          { label: "我的提醒", value: data?.todayReminderCount ?? 0, note: "站内提醒与计划事项" },
          { label: "我的报价", value: data?.quotationCount ?? 0, note: "我可见的报价档案" }
        ];
    }
  }, [currentUser?.roleCode, data]);

  const quickLinks = useMemo(() => {
    switch (currentUser?.roleCode) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return [
          { href: "/management/members", label: "成员管理", note: "查看账号、角色和状态" },
          { href: "/management/approvals", label: "审批规则", note: "调整折扣与导出门槛" },
          { href: "/management/logs", label: "操作日志", note: "追踪高风险操作" }
        ];
      case "PRODUCT_SPECIALIST":
        return [
          { href: "/products", label: "产品管理", note: "维护建议售价与模板" },
          { href: "/solutions/agriculture/new", label: "农业方案", note: "进入方案计算工作区" },
          { href: "/files", label: "档案中心", note: "查看方案输出与归档" }
        ];
      case "FINANCE":
        return [
          { href: "/quotations", label: "报价记录", note: "查看金额与审批状态" },
          { href: "/files", label: "档案中心", note: "聚合正式报价和资料" },
          { href: "/schedule", label: "日程中心", note: "查看到期和回款提醒" }
        ];
      default:
        return [
          { href: "/customers", label: "客户管理", note: "继续推进跟进和归属" },
          { href: "/solutions", label: "方案工作台", note: "发起农业或行业方案" },
          { href: "/quotations", label: "报价记录", note: "回看审批与导出状态" }
        ];
    }
  }, [currentUser?.roleCode]);

  return (
    <div className="workspace-stack">
      <section className="page-header">
        <div className="page-header__content">
          <div className="page-header__eyebrow">正式入口 · {PUBLIC_ENTRY_HOST}</div>
          <div className="page-header__copy">
            <h1>{roleWorkspaceTitle(currentUser?.roleCode)}</h1>
            <p>团队统一从 {PUBLIC_ENTRY_HOST} 进入系统，首页优先展示最影响当日推进的客户、报价、审批、提醒与资产信息。</p>
          </div>
        </div>
        <div className="page-header__actions">
          <Link className="button secondary inline" href="/schedule">
            今日日程
          </Link>
          <Link className="button inline" href={currentUser?.roleCode === "PRODUCT_SPECIALIST" ? "/products/new" : "/customers/new"}>
            快速开始
          </Link>
        </div>
      </section>

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="insight-grid">
        {primaryCards.map((card) => (
          <article className="insight-card" key={card.label}>
            <div className="insight-label">{card.label}</div>
            <div className="insight-value">{card.value}</div>
            <div className="insight-note">{card.note}</div>
          </article>
        ))}
      </section>

      <section className="split-workspace">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>最近报价</h3>
              <p>报价是 CRM、方案、审批和归档的交汇点，首页优先展示最近进入流转的单据。</p>
            </div>

            <div className="grid-2">
              {data?.recentQuotations?.length ? (
                data.recentQuotations.map((quotation) => (
                  <Link className="list-card" href={`/quotations/${quotation.id}`} key={quotation.id}>
                    <div className="summary-row">
                      <strong>{quotation.quotationNo}</strong>
                      <span className="status-pill neutral">{quotation.type}</span>
                    </div>
                    <div className="small muted">{quotation.customer.name}</div>
                    <div className="summary-row">
                      <span className="small muted">{formatDateTime(quotation.createdAt)}</span>
                      <strong>{formatMoney(quotation.totalAmount)}</strong>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty">暂无可展示的报价记录，创建新报价后会优先出现在这里。</div>
              )}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>角色化快捷入口</h3>
              <p>首页入口会跟角色一起变化，不再对所有人展示同一组按钮。</p>
            </div>

            <div className="focus-grid">
              {quickLinks.map((item) => (
                <Link className="focus-card panel" href={item.href} key={item.href}>
                  <div className="focus-card__top">
                    <strong>{item.label}</strong>
                    <span className="status-pill neutral">进入</span>
                  </div>
                  <p>{item.note}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="workspace-side">
          <section className="panel stack">
            <div className="section-heading">
              <h3>近期提醒</h3>
              <p>这里保留今天最重要的通知摘要，完整列表统一从顶部铃铛进入。</p>
            </div>

            <div className="stack">
              {data?.recentNotifications?.length ? (
                data.recentNotifications.map((notification) => (
                  <Link className="notification-card" href="/schedule" key={notification.id}>
                    <div className="notification-card__meta">
                      <strong>{notification.title}</strong>
                      <span className="status-pill warning">{notification.type}</span>
                    </div>
                    <p>{notification.content}</p>
                    <div className="small muted">{formatDateTime(notification.createdAt)}</div>
                  </Link>
                ))
              ) : (
                <div className="empty">暂无新的系统提醒，后续跟进、审批和到期事项会优先显示在这里。</div>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
