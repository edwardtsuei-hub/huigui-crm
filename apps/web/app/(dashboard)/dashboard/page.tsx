"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

type DashboardResponse = {
  todayTodoCount: number;
  todayReminderCount: number;
  customerCount: number;
  productCount: number;
  quotationCount: number;
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
    type: "AGRICULTURE" | "GENERAL";
    totalAmount: string;
    createdAt: string;
    customer: { name: string };
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState("");

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(value));
  }

  useEffect(() => {
    apiFetch<DashboardResponse>("/meta/dashboard")
      .then(setData)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "加载失败"));
  }, []);

  return (
    <div className="stack">
      <section className="metrics">
        <article className="metric-card">
          <div className="metric-label">本周跟进客户</div>
          <div className="metric-value">{data?.customerCount ?? "--"}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">产品数</div>
          <div className="metric-value">{data?.productCount ?? "--"}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">报价数</div>
          <div className="metric-value">{data?.quotationCount ?? "--"}</div>
        </article>
      </section>

      <section className="layout-grid">
        <div className="panel">
          <h3>首页工作台</h3>
          <div className="grid-2">
            <div className="quote-card">
              <strong>当前待办</strong>
              <div className="metric-value compact">{data?.todayTodoCount ?? 0}</div>
              <div className="muted small">按当前分配给你的任务统计，方便先在网页端统一处理。</div>
            </div>
            <div className="quote-card">
              <strong>今日提醒</strong>
              <div className="metric-value compact">{data?.todayReminderCount ?? 0}</div>
              <div className="muted small">客户跟进、任务到时、合同到期都会进入站内通知中心。</div>
            </div>
            <div className="quote-card">
              <strong>本月成交数</strong>
              <div className="muted small">当前先预留指标位，后续按合同与客户状态补齐成交统计。</div>
            </div>
            <div className="quote-card">
              <strong>通知中心</strong>
              <div className="muted small">网页内查看全部提醒，不再依赖企业微信通知。</div>
              <Link className="button secondary inline" href="/notifications">
                打开通知中心
              </Link>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>最近通知</h3>
          {error ? <div className="danger-text small">{error}</div> : null}
          <div className="stack">
            {data?.recentNotifications?.length ? (
              data.recentNotifications.map((notification) => (
                <Link className="quote-card" href="/notifications" key={notification.id}>
                  <strong>{notification.title}</strong>
                  <div className="muted small">{formatDateTime(notification.createdAt)}</div>
                  <div className="small">{notification.content}</div>
                </Link>
              ))
            ) : (
              <div className="empty">暂时还没有站内通知，提醒生成后会优先展示在这里。</div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>最近创建报价</h3>
        {error ? <div className="danger-text small">{error}</div> : null}
        <div className="grid-2">
          {data?.recentQuotations?.length ? (
            data.recentQuotations.map((quotation) => (
              <Link className="quote-card" href={`/quotations/${quotation.id}`} key={quotation.id}>
                <strong>{quotation.quotationNo}</strong>
                <div className="muted small">{quotation.customer.name}</div>
                <div className="small">
                  {quotation.type === "AGRICULTURE" ? "农业方案" : "通用报价"} · ¥{quotation.totalAmount}
                </div>
              </Link>
            ))
          ) : (
            <div className="empty">还没有报价记录，先从农业方案或通用报价页发起第一单。</div>
          )}
        </div>
      </section>

      <section className="panel">
        <h3>行业入口卡片</h3>
        <div className="grid-2">
          <Link className="quote-card" href="/solutions/agriculture/new">
            <strong>农业方案</strong>
            <div className="muted small">多作物识别、排期规则、桶数报价、A4 预览</div>
          </Link>
          <Link className="quote-card" href="/solutions/industry/new">
            <strong>工业报价</strong>
            <div className="muted small">通用报价单，支持产品选型和优惠说明</div>
          </Link>
          <Link className="quote-card" href="/solutions/service/new">
            <strong>服务业报价</strong>
            <div className="muted small">复用通用报价逻辑，适合服务方案和项目型报价</div>
          </Link>
          <Link className="quote-card" href="/solutions/breeding/new">
            <strong>养殖业报价</strong>
            <div className="muted small">复用通用报价逻辑，可扩展行业模板</div>
          </Link>
          <Link className="quote-card" href="/customers">
            <strong>客户管理</strong>
            <div className="muted small">录入客户、查看跟进与报价关联记录</div>
          </Link>
          <Link className="quote-card" href="/products">
            <strong>产品管理</strong>
            <div className="muted small">维护对外显示名称、价格、模板和启停状态</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
