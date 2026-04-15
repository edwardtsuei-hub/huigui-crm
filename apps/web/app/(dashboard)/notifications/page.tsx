"use client";

import { useDeferredValue, useEffect, useState } from "react";
import {
  apiFetch,
  emitNotificationsChanged
} from "../../../lib/api";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  readAt: string | null;
};

type NotificationListResponse = {
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
  items: NotificationItem[];
};

const typeOptions = [
  { value: "all", label: "全部类型" },
  { value: "FOLLOW_UP_REMINDER", label: "客户跟进提醒" },
  { value: "TASK_REMINDER", label: "工作计划提醒" },
  { value: "CONTRACT_EXPIRY_REMINDER", label: "合同到期提醒" }
];

const statusOptions = [
  { value: "all", label: "全部状态" },
  { value: "unread", label: "仅看未读" },
  { value: "read", label: "仅看已读" }
];

function typeLabel(type: string) {
  return typeOptions.find((item) => item.value === type)?.label ?? type;
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationListResponse | null>(null);
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const deferredKeyword = useDeferredValue(keyword.trim());

  useEffect(() => {
    let cancelled = false;
    setError("");

    async function loadNotifications() {
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "30"
        });

        if (status !== "all") {
          params.set("status", status);
        }

        if (type !== "all") {
          params.set("type", type);
        }

        if (deferredKeyword) {
          params.set("keyword", deferredKeyword);
        }

        const response = await apiFetch<NotificationListResponse>(`/notifications?${params.toString()}`);
        if (!cancelled) {
          setData(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "加载通知失败");
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [deferredKeyword, reloadVersion, status, type]);

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

  async function updateReadState(id: string, nextState: "read" | "unread") {
    setPendingAction(id);
    setError("");

    try {
      await apiFetch(`/notifications/${id}/${nextState}`, {
        method: "PATCH"
      });
      emitNotificationsChanged();
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新通知状态失败");
    } finally {
      setPendingAction(null);
    }
  }

  async function markAllAsRead() {
    setPendingAction("all");
    setError("");

    try {
      await apiFetch("/notifications/read-all", {
        method: "POST"
      });
      emitNotificationsChanged();
      setReloadVersion((current) => current + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量更新通知失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="panel stack">
      <div className="panel-header">
        <div>
          <h3>通知中心</h3>
          <p className="muted">客户跟进、工作计划与合同到期提醒都会汇总到网页端通知中心。</p>
        </div>
        <div className="notification-summary">
          <div className="status-badge">筛选结果 {data?.total ?? 0} 条</div>
          <div className={`status-badge ${data?.unreadCount ? "alert" : ""}`}>
            未读 {data?.unreadCount ?? 0} 条
          </div>
        </div>
      </div>

      <div className="filter-row">
        <div className="field filter-field">
          <label htmlFor="notification-status">状态</label>
          <select
            id="notification-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((item) => (
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
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {typeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field filter-field filter-field--wide">
          <label htmlFor="notification-keyword">关键词</label>
          <input
            id="notification-keyword"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索标题或通知内容"
          />
        </div>

        <div className="action-row">
          <button
            className="button secondary inline"
            disabled={!data?.unreadCount || pendingAction === "all"}
            onClick={markAllAsRead}
            type="button"
          >
            {pendingAction === "all" ? "处理中..." : "全部标记已读"}
          </button>
          <button
            className="button ghost inline"
            onClick={() => {
              setStatus("all");
              setType("all");
              setKeyword("");
            }}
            type="button"
          >
            清空筛选
          </button>
        </div>
      </div>

      {error ? <div className="danger-text small">{error}</div> : null}

      <div className="stack">
        {data?.items?.length ? (
          data.items.map((item) => {
            const isUnread = !item.readAt;

            return (
              <article className={`notification-card ${isUnread ? "unread" : ""}`} key={item.id}>
                <div className="notification-card__meta">
                  <div className="stack compact-gap">
                    <strong>{item.title}</strong>
                    <div className="muted small">{formatDateTime(item.createdAt)}</div>
                  </div>
                  <div className="notification-summary">
                    <div className="status-badge">{typeLabel(item.type)}</div>
                    <div className={`status-badge ${isUnread ? "alert" : ""}`}>
                      {isUnread ? "未读" : "已读"}
                    </div>
                  </div>
                </div>

                <p>{item.content}</p>

                <div className="notification-card__actions">
                  <button
                    className="button secondary inline"
                    disabled={pendingAction === item.id}
                    onClick={() => updateReadState(item.id, isUnread ? "read" : "unread")}
                    type="button"
                  >
                    {pendingAction === item.id ? "处理中..." : isUnread ? "标记已读" : "标记未读"}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty">当前筛选条件下还没有通知，后续提醒会自动出现在这里。</div>
        )}
      </div>
    </section>
  );
}
