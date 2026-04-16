"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
  type Tone,
} from "../../../components/system/primitives";
import { WorkspacePageHeader } from "../../../components/dashboard/WorkspacePageHeader";
import { apiFetch, emitNotificationsChanged } from "../../../lib/api";
import { notificationTypeLabel } from "../../../lib/workspace";

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
  { value: "CONTRACT_EXPIRY_REMINDER", label: "合同到期提醒" },
];

const statusOptions = [
  { value: "all", label: "全部状态" },
  { value: "unread", label: "仅看未读" },
  { value: "read", label: "仅看已读" },
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
          pageSize: "30",
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
  }, [deferredKeyword, reloadVersion, status, type]);

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

  const summary = useMemo(
    (): Array<{ label: string; value: string; tone?: Tone }> => [
      { label: "筛选结果", value: String(data?.total ?? 0) },
      {
        label: "未读",
        tone: (data?.unreadCount ?? 0) > 0 ? "warning" : "neutral",
        value: String(data?.unreadCount ?? 0),
      },
      {
        label: "跟进提醒",
        value: String(
          data?.items.filter((item) => item.type === "FOLLOW_UP_REMINDER")
            .length ?? 0,
        ),
      },
      {
        label: "合同到期",
        value: String(
          data?.items.filter((item) => item.type === "CONTRACT_EXPIRY_REMINDER")
            .length ?? 0,
        ),
      },
    ],
    [data],
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
        description="顶部铃铛负责摘要，这里才是完整的筛选与历史中心，用于逐项处理、批量已读和回溯审批提醒。"
        eyebrow="通知中心"
        meta={summary}
        title="通知中心"
      />

      {error ? <div className="danger-text small">{error}</div> : null}

      <SectionCard
        description="按状态、类型和关键词过滤所有提醒，快速找到今天需要先处理的通知。"
        title="历史与筛选"
      >
        <FilterBar
          actions={
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
                        {notificationTypeLabel(item.type)}
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

                  <div className="notification-card__actions">
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
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              description="当前筛选条件下还没有通知，后续提醒、审批与系统消息会统一沉淀在这里。"
              title="暂无通知"
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
