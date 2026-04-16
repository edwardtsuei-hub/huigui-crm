"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { apiFetch } from "../../../lib/api";
import {
  buildMonthMatrix,
  formatDateLabel,
  formatDayLabel,
  formatTimeLabel,
  normalizeNotifications,
  notificationTypeLabel,
  type WorkspaceNotification,
} from "../../../lib/workspace";

type CustomerListResponse = {
  items: Array<{
    id: string;
    name: string;
    cooperationDirection?: string | null;
    followups?: Array<{
      content: string;
      nextFollowupAt?: string | null;
    }>;
  }>;
};

type NotificationListResponse = {
  items: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: string;
    readAt: string | null;
  }>;
};

type DashboardResponse = {
  recentQuotations: Array<{
    id: string;
    quotationNo: string;
    createdAt: string;
    customer: { name: string };
  }>;
};

type ScheduleEvent = {
  id: string;
  dayOffset: number;
  time: string;
  title: string;
  description: string;
  href: string;
  relation: string;
};

function buildEvents(
  customers: CustomerListResponse["items"],
  quotations: DashboardResponse["recentQuotations"],
  notifications: WorkspaceNotification[],
) {
  const items: ScheduleEvent[] = [];

  customers.slice(0, 3).forEach((customer, index) => {
    items.push({
      id: `customer-${customer.id}`,
      dayOffset: index,
      time: customer.followups?.[0]?.nextFollowupAt
        ? formatTimeLabel(customer.followups[0].nextFollowupAt)
        : (["09:30", "11:00", "15:00"][index] ?? "16:00"),
      title: `${customer.name} 跟进`,
      description:
        customer.followups?.[0]?.content ||
        customer.cooperationDirection ||
        "确认阶段反馈与下一步动作。",
      href: `/customers/${customer.id}`,
      relation: "客户",
    });
  });

  quotations.slice(0, 2).forEach((quotation, index) => {
    items.push({
      id: `quotation-${quotation.id}`,
      dayOffset: index + 1,
      time: index === 0 ? "14:00" : "16:30",
      title: `${quotation.customer.name} 报价复盘`,
      description: `${quotation.quotationNo} 进入待确认阶段，需要统一价格与交付口径。`,
      href: `/quotations/${quotation.id}`,
      relation: "报价",
    });
  });

  const contractReminder = notifications.find(
    (item) => item.type === "CONTRACT_EXPIRY_REMINDER",
  );
  if (contractReminder) {
    items.push({
      id: contractReminder.id,
      dayOffset: 3,
      time: "17:00",
      title: "合同到期提醒",
      description: contractReminder.title,
      href: "/schedule",
      relation: "合同",
    });
  }

  items.push({
    id: "planner",
    dayOffset: 4,
    time: "18:00",
    title: "工作计划回顾",
    description: "收口当天跟进、报价与提醒执行情况，准备次日优先级。",
    href: "/schedule",
    relation: "计划",
  });

  return items;
}

export default function SchedulePage() {
  const [customers, setCustomers] = useState<CustomerListResponse["items"]>([]);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>(
    [],
  );
  const [quotations, setQuotations] = useState<
    DashboardResponse["recentQuotations"]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [customerResponse, notificationResponse, dashboardResponse] =
          await Promise.all([
            apiFetch<CustomerListResponse>("/customers?page=1&pageSize=8"),
            apiFetch<NotificationListResponse>(
              "/notifications?page=1&pageSize=16",
            ),
            apiFetch<DashboardResponse>("/meta/dashboard"),
          ]);

        if (cancelled) {
          return;
        }

        setCustomers(customerResponse.items);
        setNotifications(normalizeNotifications(notificationResponse.items));
        setQuotations(dashboardResponse.recentQuotations);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "日程数据加载失败",
          );
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const events = useMemo(
    () => buildEvents(customers, quotations, notifications),
    [customers, notifications, quotations],
  );
  const monthCells = useMemo(() => buildMonthMatrix(new Date()), []);
  const weekColumns = useMemo(() => {
    const baseDate = new Date();

    return Array.from({ length: 5 }, (_, index) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + index);

      return {
        key: index,
        label: formatDayLabel(date),
        items: events.filter((event) => event.dayOffset === index),
      };
    });
  }, [events]);

  const timeline = useMemo(
    () =>
      events.slice().sort((left, right) => left.time.localeCompare(right.time)),
    [events],
  );

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <>
            <Link className="button secondary inline" href="/schedule">
              查看提醒中心
            </Link>
            <Link className="button inline" href="/dashboard">
              返回首页
            </Link>
          </>
        }
        description="用周视图、时间轴和月历入口统一管理客户跟进、报价复核、合同到期与自定义计划提醒，让日程成为真正的协同中枢。"
        eyebrow="日程协同"
        meta={[
          { label: "关联对象", value: "客户 / 报价 / 合同 / 方案" },
          { label: "视图", value: "时间轴 + 周视图 + 月历" },
        ]}
        title="日程"
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <section className="layout-grid">
        <div className="workspace-main">
          <section className="panel stack">
            <div className="section-heading">
              <h3>本周视图</h3>
              <p>按天聚合客户、报价、合同和计划提醒，适合安排团队跟进节奏。</p>
            </div>

            <div className="week-grid">
              {weekColumns.map((column) => (
                <article className="week-column" key={column.key}>
                  <div className="week-column__header">
                    <strong>{column.label}</strong>
                    <span>
                      {column.items.length
                        ? `已排 ${column.items.length} 项`
                        : "待补充安排"}
                    </span>
                  </div>

                  {column.items.length ? (
                    column.items.map((event) => (
                      <Link
                        className="week-event"
                        href={event.href}
                        key={event.id}
                      >
                        <strong>{event.title}</strong>
                        <span>
                          {event.time} · {event.relation}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <div className="week-event">
                      <strong>保留弹性时间</strong>
                      <span>用于临时客户沟通、补资料或内部复核。</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>今日日程时间轴</h3>
              <p>适合按小时推进今天最重要的客户和报价动作。</p>
            </div>

            <div className="timeline-list">
              {timeline.map((event) => (
                <article className="timeline-item" key={event.id}>
                  <div className="timeline-item__time">
                    <strong>{event.time}</strong>
                    <span>{event.relation}</span>
                  </div>
                  <div className="timeline-item__body">
                    <h4>{event.title}</h4>
                    <p>{event.description}</p>
                    <div className="timeline-item__links">
                      <Link className="status-pill neutral" href={event.href}>
                        打开关联{event.relation}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="workspace-side sticky-side">
          <section className="calendar-card" id="month">
            <div className="section-heading">
              <h3>月历</h3>
              <p>提供快速定位本月节点的入口，适合配合周视图做节奏规划。</p>
            </div>

            <div className="calendar-grid">
              {["一", "二", "三", "四", "五", "六", "日"].map((label) => (
                <div className="calendar-grid__label" key={label}>
                  {label}
                </div>
              ))}
              {monthCells.map((cell) => (
                <div
                  className={`calendar-grid__cell ${cell.currentMonth ? "" : "muted"} ${cell.isToday ? "today" : ""}`}
                  key={cell.iso}
                >
                  {cell.day}
                </div>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>提醒摘要</h3>
              <p>把可操作的提醒分门别类，不让通知淹没真正重要的动作。</p>
            </div>

            <div className="focus-list">
              {notifications.slice(0, 6).map((item) => (
                <Link className="list-card" href="/schedule" key={item.id}>
                  <div className="focus-card__top">
                    <strong>{item.title}</strong>
                    <span
                      className={`status-pill ${item.readAt ? "neutral" : "warning"}`}
                    >
                      {item.readAt ? "已读" : "未读"}
                    </span>
                  </div>
                  <div className="small muted">
                    {notificationTypeLabel(item.type)} · {item.createdAtLabel}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="section-heading">
              <h3>关联对象</h3>
              <p>日程项可直接带着客户、报价、合同或方案关系跳转处理。</p>
            </div>

            <div className="focus-list">
              {events.slice(0, 4).map((event) => (
                <Link
                  className="list-card"
                  href={event.href}
                  key={`relation-${event.id}`}
                >
                  <div className="focus-card__top">
                    <strong>{event.title}</strong>
                    <span className="status-pill neutral">
                      {event.relation}
                    </span>
                  </div>
                  <div className="small muted">{event.description}</div>
                  <div className="small muted">
                    {formatDateLabel(new Date())}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
