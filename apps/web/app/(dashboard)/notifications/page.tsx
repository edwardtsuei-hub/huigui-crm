"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
  type Tone,
} from "../../../components/system/primitives";
import { useSiteBrandKey } from "../../../components/system/SiteBrandContext";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { apiFetch, emitNotificationsChanged } from "../../../lib/api";
import { buildNotificationHref, notificationTypeLabel } from "../../../lib/workspace";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  readAt: string | null;
  sendChannel: "SYSTEM" | "WECOM" | "EMAIL";
  sendStatus: "PENDING" | "SENT" | "FAILED";
  sentAt?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
};

type NotificationListResponse = {
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
  items: NotificationItem[];
};

type NotificationQuickAction =
  | "TASK_DONE"
  | "TASK_DOING"
  | "TASK_TODO"
  | "TASK_DELAY_1D"
  | "TASK_DELAY_3D"
  | "TASK_DELAY_7D";

const statusOptions = [
  { value: "all", label: "全部状态" },
  { value: "unread", label: "仅看未读" },
  { value: "read", label: "仅看已读" },
];

const channelOptions = [
  { value: "SYSTEM", label: "站内通知" },
  { value: "WECOM", label: "企业微信" },
  { value: "all", label: "全部渠道" },
];

const sendStatusOptions = [
  { value: "all", label: "全部送达" },
  { value: "PENDING", label: "待发送" },
  { value: "SENT", label: "已送达" },
  { value: "FAILED", label: "发送失败" },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function notificationChannelLabel(channel: NotificationItem["sendChannel"]) {
  switch (channel) {
    case "WECOM":
      return "企业微信";
    case "EMAIL":
      return "邮件";
    default:
      return "站内";
  }
}

function sendStatusLabel(status: NotificationItem["sendStatus"]) {
  switch (status) {
    case "PENDING":
      return "待发送";
    case "FAILED":
      return "发送失败";
    default:
      return "已送达";
  }
}

function sendStatusTone(status: NotificationItem["sendStatus"]): Tone {
  switch (status) {
    case "PENDING":
      return "warning";
    case "FAILED":
      return "danger";
    default:
      return "success";
  }
}

export default function NotificationsPage() {
  const brandKey = useSiteBrandKey();
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("SYSTEM");
  const [sendStatus, setSendStatus] = useState("all");
  const [type, setType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const deferredKeyword = useDeferredValue(keyword.trim());

  const typeOptions = useMemo(
    () =>
      brandKey === "management"
        ? [
            { value: "all", label: "全部类型" },
            { value: "FOLLOW_UP_REMINDER", label: "跟进提醒" },
            { value: "TASK_REMINDER", label: "计划提醒" },
            { value: "CONTRACT_EXPIRY_REMINDER", label: "到期提醒" },
            { value: "DISCUSSION_COMMENT", label: "协作留言" },
            { value: "TASK_ASSIGNED", label: "计划指派" },
            { value: "TASK_REASSIGNED", label: "改派通知" },
            { value: "APPROVAL_REQUEST_CREATED", label: "报价审批" },
            { value: "APPROVAL_REQUEST_DECIDED", label: "报价审批结果" },
            { value: "CUSTOMER_APPROVAL_REQUEST_CREATED", label: "客户审批" },
            { value: "CUSTOMER_APPROVAL_REQUEST_DECIDED", label: "客户审批结果" },
            { value: "WEEKLY_REPORT_SUBMITTED", label: "周报待审" },
            { value: "WEEKLY_REPORT_REVIEWED", label: "周报审阅" },
            { value: "MONTHLY_GOAL_SUBMITTED", label: "月目标提交" },
            { value: "QUOTATION_REMINDER", label: "系统提醒" },
          ]
        : [
            { value: "all", label: "全部类型" },
            { value: "FOLLOW_UP_REMINDER", label: "客户跟进提醒" },
            { value: "TASK_REMINDER", label: "工作计划提醒" },
            { value: "CONTRACT_EXPIRY_REMINDER", label: "合同到期提醒" },
            { value: "DISCUSSION_COMMENT", label: "协作留言" },
            { value: "TASK_ASSIGNED", label: "工作计划指派" },
            { value: "TASK_REASSIGNED", label: "改派通知" },
            { value: "APPROVAL_REQUEST_CREATED", label: "报价审批" },
            { value: "APPROVAL_REQUEST_DECIDED", label: "报价审批结果" },
            { value: "CUSTOMER_APPROVAL_REQUEST_CREATED", label: "客户审批" },
            { value: "CUSTOMER_APPROVAL_REQUEST_DECIDED", label: "客户审批结果" },
            { value: "WEEKLY_REPORT_REVIEWED", label: "周报审阅" },
          ],
    [brandKey],
  );

  useEffect(() => {
    let cancelled = false;
    setError("");

    async function loadNotifications() {
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "30",
        });

        if (status !== "all") {
          params.set("status", status);
        }

        if (channel !== "SYSTEM") {
          params.set("channel", channel);
        }

        if (sendStatus !== "all") {
          params.set("sendStatus", sendStatus);
        }

        if (type !== "all") {
          params.set("type", type);
        }

        if (deferredKeyword) {
          params.set("keyword", deferredKeyword);
        }

        const response = await apiFetch<NotificationListResponse>(
          `/notifications?${params.toString()}`,
        );
        if (!cancelled) {
          setData(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "加载通知失败",
          );
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [channel, deferredKeyword, reloadVersion, sendStatus, status, type]);

  async function updateReadState(id: string, nextState: "read" | "unread") {
    setPendingAction(id);
    setError("");

    try {
      await apiFetch(`/notifications/${id}/${nextState}`, {
        method: "PATCH",
      });
      emitNotificationsChanged();
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "更新通知状态失败",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function markAllAsRead() {
    setPendingAction("all");
    setError("");

    try {
      await apiFetch("/notifications/read-all", {
        method: "POST",
      });
      emitNotificationsChanged();
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "批量更新通知失败",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function retryWecomNotification(id: string) {
    setPendingAction(`retry-${id}`);
    setError("");

    try {
      await apiFetch(`/notifications/${id}/retry-wecom`, {
        method: "POST",
      });
      emitNotificationsChanged();
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "企业微信通知重试失败",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function runNotificationAction(
    item: NotificationItem,
    action: NotificationQuickAction,
  ) {
    setPendingAction(`${action}-${item.id}`);
    setError("");

    try {
      await apiFetch(`/notifications/${item.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      emitNotificationsChanged();
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "通知处理失败",
      );
    } finally {
      setPendingAction(null);
    }
  }

  const summary = useMemo(
    (): Array<{ label: string; value: string; tone?: Tone }> => [
      { label: "筛选结果", value: String(data?.total ?? 0) },
      {
        label: "未读",
        tone: (data?.unreadCount ?? 0) > 0 ? "warning" : "neutral",
        value: String(data?.unreadCount ?? 0),
      },
      {
        label: brandKey === "management" ? "计划提醒" : "跟进提醒",
        value: String(
          data?.items.filter((item) =>
            item.type ===
            (brandKey === "management" ? "TASK_REMINDER" : "FOLLOW_UP_REMINDER"),
          )
            .length ?? 0,
        ),
      },
      {
        label: channel === "WECOM" ? "发送失败" : brandKey === "management" ? "协作留言" : "合同到期",
        value: String(
          data?.items.filter((item) => {
            if (channel === "WECOM") {
              return item.sendStatus === "FAILED";
            }

            return (
              item.type ===
              (brandKey === "management"
                ? "DISCUSSION_COMMENT"
                : "CONTRACT_EXPIRY_REMINDER")
            );
          })
            .length ?? 0,
        ),
      },
    ],
    [brandKey, channel, data],
  );

  return (
    <div className="workspace-stack">
      <WorkspacePageHeader
        actions={
          <button
            className="button secondary inline"
            disabled={!data?.unreadCount || pendingAction === "all"}
            onClick={markAllAsRead}
            type="button"
          >
            {pendingAction === "all" ? "处理中..." : "批量标记已读"}
          </button>
        }
        description={
          brandKey === "management"
            ? "顶部铃铛负责摘要，这里才是完整的筛选与历史中心，用于逐项处理、批量已读和回看提醒消息。"
            : "顶部铃铛负责摘要，这里才是完整的筛选与历史中心，用于逐项处理、批量已读和回看业务提醒。"
        }
        eyebrow="通知中心"
        meta={summary}
        title="通知中心"
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <SectionCard
        description="按状态、类型和关键词过滤所有提醒与留言，快速找到今天需要先处理的消息。"
        title="提醒与筛选"
      >
        <FilterBar
          actions={
            <button
              className="button ghost inline"
              onClick={() => {
                setStatus("all");
                setChannel("SYSTEM");
                setSendStatus("all");
                setType("all");
                setKeyword("");
              }}
              type="button"
            >
              清空筛选
            </button>
          }
        >
          <div className="field filter-field">
            <label htmlFor="notification-status">状态</label>
            <select
              id="notification-status"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field filter-field">
            <label htmlFor="notification-channel">渠道</label>
            <select
              id="notification-channel"
              onChange={(event) => {
                const nextChannel = event.target.value;
                setChannel(nextChannel);
                if (nextChannel === "SYSTEM") {
                  setSendStatus("all");
                }
              }}
              value={channel}
            >
              {channelOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field filter-field">
            <label htmlFor="notification-send-status">送达</label>
            <select
              disabled={channel === "SYSTEM"}
              id="notification-send-status"
              onChange={(event) => setSendStatus(event.target.value)}
              value={channel === "SYSTEM" ? "all" : sendStatus}
            >
              {sendStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field filter-field">
            <label htmlFor="notification-type">类型</label>
            <select
              id="notification-type"
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              {typeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field filter-field--wide">
            <label htmlFor="notification-keyword">关键词</label>
            <input
              id="notification-keyword"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索标题或通知内容"
              value={keyword}
            />
          </div>
        </FilterBar>

        <div className="focus-list">
          {data?.items?.length ? (
            data.items.map((item) => {
              const isUnread = !item.readAt;
              const isSystemNotification = item.sendChannel === "SYSTEM";

              return (
                <article
                  className={`notification-card ${isUnread ? "unread" : ""}`}
                  key={item.id}
                >
                  <div className="notification-card__meta">
                    <div className="stack compact-gap">
                      <strong>{item.title}</strong>
                      <div className="muted small">
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                    <div className="notification-summary">
                      <StatusBadge tone="neutral" variant="badge">
                        {notificationTypeLabel(item.type, brandKey)}
                      </StatusBadge>
                      <StatusBadge tone="neutral" variant="badge">
                        {notificationChannelLabel(item.sendChannel)}
                      </StatusBadge>
                      <StatusBadge tone={sendStatusTone(item.sendStatus)} variant="badge">
                        {sendStatusLabel(item.sendStatus)}
                      </StatusBadge>
                      <StatusBadge
                        tone={isUnread ? "warning" : "neutral"}
                        variant="badge"
                      >
                        {isUnread ? "未读" : "已读"}
                      </StatusBadge>
                    </div>
                  </div>

                  <p>{item.content}</p>

                  {item.sendChannel === "SYSTEM" && item.relatedType === "TASK" ? (
                    <div className="notification-card__quick-actions">
                      <button
                        className="button ghost inline"
                        disabled={pendingAction === `TASK_DONE-${item.id}`}
                        onClick={() => runNotificationAction(item, "TASK_DONE")}
                        type="button"
                      >
                        {pendingAction === `TASK_DONE-${item.id}` ? "处理中..." : "标记完成"}
                      </button>
                      <button
                        className="button ghost inline"
                        disabled={pendingAction === `TASK_DOING-${item.id}`}
                        onClick={() => runNotificationAction(item, "TASK_DOING")}
                        type="button"
                      >
                        {pendingAction === `TASK_DOING-${item.id}` ? "处理中..." : "标记进行中"}
                      </button>
                      <button
                        className="button ghost inline"
                        disabled={pendingAction === `TASK_DELAY_1D-${item.id}`}
                        onClick={() => runNotificationAction(item, "TASK_DELAY_1D")}
                        type="button"
                      >
                        {pendingAction === `TASK_DELAY_1D-${item.id}` ? "处理中..." : "延后明天"}
                      </button>
                    </div>
                  ) : null}

                  <div className="notification-card__actions">
                    <Link
                      className="button inline"
                      href={buildNotificationHref(item)}
                    >
                      前往查看
                    </Link>
                    {isSystemNotification ? (
                      <button
                        className="button secondary inline"
                        disabled={pendingAction === item.id}
                        onClick={() =>
                          updateReadState(item.id, isUnread ? "read" : "unread")
                        }
                        type="button"
                      >
                        {pendingAction === item.id
                          ? "处理中..."
                          : isUnread
                            ? "标记已读"
                            : "标记未读"}
                      </button>
                    ) : null}
                    {item.sendChannel === "WECOM" && item.sendStatus === "FAILED" ? (
                      <button
                        className="button secondary inline"
                        disabled={pendingAction === `retry-${item.id}`}
                        onClick={() => retryWecomNotification(item.id)}
                        type="button"
                      >
                        {pendingAction === `retry-${item.id}` ? "重试中..." : "重试企微"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              description="当前筛选条件下还没有通知，后续提醒、留言与系统消息会统一沉淀在这里。"
              title="暂无通知"
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
