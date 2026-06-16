"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, emitNotificationsChanged } from "../../lib/api";
import {
  buildNotificationHref,
  notificationTypeLabel,
  type WorkspaceNotification,
} from "../../lib/workspace";
import { useSiteBrandKey } from "../system/SiteBrandContext";
import { RightDrawer, StatusBadge } from "../system/primitives";

type NotificationDrawerProps = {
  error: string;
  items: WorkspaceNotification[];
  loading: boolean;
  onClose: () => void;
  open: boolean;
  unreadCount: number;
};

export function NotificationDrawer({
  error,
  items,
  loading,
  onClose,
  open,
  unreadCount,
}: NotificationDrawerProps) {
  const brandKey = useSiteBrandKey();
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "reminders" | "special"
  >("all");
  const [actionError, setActionError] = useState("");
  const [markAllPending, setMarkAllPending] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveTab("all");
    setActionError("");
  }, [open]);

  async function markAllAsRead() {
    setMarkAllPending(true);
    setActionError("");

    try {
      await apiFetch("/notifications/read-all", {
        method: "POST",
      });
      emitNotificationsChanged();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "批量更新通知失败",
      );
    } finally {
      setMarkAllPending(false);
    }
  }

  const tabItems = useMemo(() => {
    return {
      all: items,
      pending: items.filter((item) => !item.readAt),
      reminders: items.filter(
        (item) =>
          item.type === "FOLLOW_UP_REMINDER" ||
          item.type === "TASK_REMINDER" ||
          item.type === "CONTRACT_EXPIRY_REMINDER" ||
          item.type === "TASK_ASSIGNED" ||
          item.type === "TASK_REASSIGNED",
      ),
      special:
        brandKey === "management"
          ? items.filter(
              (item) =>
                item.type === "DISCUSSION_COMMENT" ||
                item.type === "APPROVAL_REQUEST_CREATED" ||
                item.type === "CUSTOMER_APPROVAL_REQUEST_CREATED" ||
                item.type === "APPROVAL_REQUEST_DECIDED" ||
                item.type === "CUSTOMER_APPROVAL_REQUEST_DECIDED" ||
                item.type === "WEEKLY_REPORT_SUBMITTED" ||
                item.type === "WEEKLY_REPORT_REVIEWED" ||
                item.type === "MONTHLY_GOAL_SUBMITTED" ||
                item.type === "QUOTATION_REMINDER",
            )
          : items.filter(
              (item) =>
                item.type === "APPROVAL_REQUEST_CREATED" ||
                item.type === "CUSTOMER_APPROVAL_REQUEST_CREATED" ||
                item.type === "APPROVAL_REQUEST_DECIDED" ||
                item.type === "CUSTOMER_APPROVAL_REQUEST_DECIDED" ||
                item.type === "QUOTATION_REMINDER" ||
                /审批|折扣|导出/i.test(`${item.title} ${item.content}`),
            ),
    };
  }, [brandKey, items]);

  const visibleItems = tabItems[activeTab];
  const specialTabLabel = brandKey === "management" ? "协作" : "审批";

  return (
    <RightDrawer
      description={
        brandKey === "management"
          ? "轻量查看待处理提醒与协作消息，完整筛选与历史操作交给独立通知页。"
          : "轻量查看待处理提醒，完整筛选与历史操作交给独立通知页。"
      }
      eyebrow="通知"
      footer={
        <>
          <button
            className="button secondary inline"
            disabled={!unreadCount || markAllPending}
            onClick={markAllAsRead}
            type="button"
          >
            {markAllPending ? "处理中..." : "全部标记已读"}
          </button>
          <Link
            className="button inline"
            href="/notifications"
            onClick={onClose}
          >
            查看全部通知
          </Link>
        </>
      }
      onClose={onClose}
      open={open}
      title="通知抽屉"
    >
      <div className="notification-summary">
        <StatusBadge tone={unreadCount ? "warning" : "neutral"} variant="badge">
          未读 {unreadCount}
        </StatusBadge>
      </div>

      <div className="segmented-control">
        {[
          { key: "all", label: "全部" },
          { key: "pending", label: "待处理" },
          { key: "reminders", label: "提醒" },
          { key: "special", label: specialTabLabel },
        ].map((tab) => (
          <button
            className={`segmented-control__item ${activeTab === tab.key ? "active" : ""}`}
            key={tab.key}
            onClick={() =>
              setActiveTab(
                tab.key as "all" | "pending" | "reminders" | "special",
              )
            }
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <div className="drawer-empty">正在整理提醒摘要...</div> : null}
      {error ? <div className="danger-text small">{error}</div> : null}
      {actionError ? (
        <div className="danger-text small">{actionError}</div>
      ) : null}

      {!loading ? (
        <div className="drawer-list">
          {visibleItems.length ? (
            visibleItems.map((item) => (
              <Link
                className="drawer-notice"
                href={buildNotificationHref(item)}
                key={item.id}
                onClick={onClose}
              >
                <div className="drawer-notice__top">
                  <strong>{item.title}</strong>
                  <StatusBadge tone={item.readAt ? "neutral" : "warning"}>
                    {item.readAt ? "已读" : "未读"}
                  </StatusBadge>
                </div>
                <p>{item.content}</p>
                <div className="small muted">
                  {notificationTypeLabel(item.type, brandKey)} · {item.createdAtLabel}
                </div>
              </Link>
            ))
          ) : (
            <div className="drawer-empty">当前分类下暂时没有通知。</div>
          )}
        </div>
      ) : null}
    </RightDrawer>
  );
}
