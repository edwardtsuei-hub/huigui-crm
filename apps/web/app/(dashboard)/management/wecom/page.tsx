"use client";

import { useEffect, useMemo, useState } from "react";
import { ManagementPageToolbar } from "../../../../components/management/ManagementPageToolbar";
import {
  EmptyState,
  FilterBar,
  SectionCard,
  StatusBadge,
  SummaryCard,
  type Tone,
} from "../../../../components/system/primitives";
import { apiFetch } from "../../../../lib/api";

type WecomCalendarSyncItem = {
  id: string;
  taskId?: string | null;
  taskTitle: string;
  assigneeName?: string | null;
  assigneeWecomUserId?: string | null;
  calendarId?: string | null;
  scheduleId?: string | null;
  syncStatus: "PENDING" | "SYNCED" | "FAILED" | "DELETED";
  lastSyncError?: string | null;
  retryCount: number;
  lastSyncedAt?: string | null;
  updatedAt: string;
};

type WecomCallbackItem = {
  id: string;
  event?: string | null;
  changeType?: string | null;
  fromUserId?: string | null;
  agentId?: string | null;
  status: string;
  error?: string | null;
  createdAt: string;
};

type WecomNotificationItem = {
  id: string;
  userName: string;
  title: string;
  type: string;
  sendStatus: "PENDING" | "SENT" | "FAILED";
  sentAt?: string | null;
  createdAt: string;
};

type WecomMonitorResponse = {
  summary: {
    calendar: Record<string, number>;
    callbacks: Record<string, number>;
    notifications: {
      failed: number;
      sent: number;
      pending: number;
    };
  };
  calendarSyncs: WecomCalendarSyncItem[];
  callbacks: WecomCallbackItem[];
  notifications: WecomNotificationItem[];
};

const statusOptions = [
  { value: "all", label: "全部状态" },
  { value: "FAILED", label: "同步失败" },
  { value: "SYNCED", label: "已同步" },
  { value: "PENDING", label: "待同步" },
  { value: "DELETED", label: "已删除" },
];

function formatDateTime(value?: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function syncTone(status: WecomCalendarSyncItem["syncStatus"]): Tone {
  switch (status) {
    case "SYNCED":
      return "success";
    case "FAILED":
      return "danger";
    case "DELETED":
      return "neutral";
    default:
      return "warning";
  }
}

function sendTone(status: WecomNotificationItem["sendStatus"]): Tone {
  switch (status) {
    case "SENT":
      return "success";
    case "FAILED":
      return "danger";
    default:
      return "warning";
  }
}

function calendarStatusLabel(status: WecomCalendarSyncItem["syncStatus"]) {
  switch (status) {
    case "SYNCED":
      return "已同步";
    case "FAILED":
      return "失败";
    case "DELETED":
      return "已删除";
    case "PENDING":
      return "待同步";
    default:
      return status || "--";
  }
}

function notificationStatusLabel(status: WecomNotificationItem["sendStatus"]) {
  switch (status) {
    case "SENT":
      return "已送达";
    case "FAILED":
      return "失败";
    case "PENDING":
      return "待发送";
    default:
      return status || "--";
  }
}

export default function ManagementWecomPage() {
  const [data, setData] = useState<WecomMonitorResponse | null>(null);
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState("");
  const [retryingFailed, setRetryingFailed] = useState(false);

  async function loadMonitor() {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (keyword.trim()) params.set("keyword", keyword.trim());

    try {
      setLoading(true);
      setError("");
      const response = await apiFetch<WecomMonitorResponse>(
        `/management/wecom/monitor${params.toString() ? `?${params.toString()}` : ""}`,
      );
      setData(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "企业微信监控加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMonitor();
  }, []);

  async function retryCalendarSync(id: string) {
    try {
      setRetryingId(id);
      setError("");
      setMessage("");
      await apiFetch(`/management/wecom/calendar-sync/${id}/retry`, {
        method: "POST",
      });
      setMessage("企业微信日历同步已重试");
      await loadMonitor();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "企业微信日历重试失败");
    } finally {
      setRetryingId("");
    }
  }

  async function retryFailedCalendarSyncs() {
    try {
      setRetryingFailed(true);
      setError("");
      setMessage("");
      const result = await apiFetch<{
        scanned: number;
        retried: number;
        synced: number;
        failed: number;
        skipped: number;
      }>("/management/wecom/calendar-sync/retry-failed", {
        method: "POST",
      });
      setMessage(
        `失败项重试完成：扫描 ${result.scanned}，重试 ${result.retried}，成功 ${result.synced}，失败 ${result.failed}，跳过 ${result.skipped}`,
      );
      await loadMonitor();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "企业微信日历批量重试失败");
    } finally {
      setRetryingFailed(false);
    }
  }

  const summary = useMemo(
    () => [
      {
        label: "日历失败",
        value: String(data?.summary.calendar.FAILED ?? 0),
        tone: (data?.summary.calendar.FAILED ?? 0) ? "danger" as Tone : "neutral" as Tone,
      },
      {
        label: "已同步",
        value: String(data?.summary.calendar.SYNCED ?? 0),
        tone: "success" as Tone,
      },
      {
        label: "企微通知失败",
        value: String(data?.summary.notifications.failed ?? 0),
        tone: data?.summary.notifications.failed ? "danger" as Tone : "neutral" as Tone,
      },
      {
        label: "回调记录",
        value: String(
          Object.values(data?.summary.callbacks ?? {}).reduce((sum, value) => sum + value, 0),
        ),
      },
    ],
    [data],
  );

  return (
    <div className="workspace-stack">
      <ManagementPageToolbar
        note="集中查看日历同步、回调事件与企业微信通知送达状态，优先处理失败项。"
        actions={
          <div className="action-row">
            <button
              className="button secondary inline"
              disabled={retryingFailed}
              onClick={retryFailedCalendarSyncs}
              type="button"
            >
              {retryingFailed ? "重试中..." : "重试失败项"}
            </button>
            <button className="button secondary inline" onClick={loadMonitor} type="button">
              {loading ? "刷新中..." : "刷新"}
            </button>
          </div>
        }
        meta={summary}
      />

      {error ? <div className="danger-text small">{error}</div> : null}
      {message ? <div className="success-text small">{message}</div> : null}

      <SectionCard title="筛选">
        <FilterBar
          actions={
            <button
              className="button ghost inline"
              onClick={() => {
                setStatus("all");
                setKeyword("");
              }}
              type="button"
            >
              清空
            </button>
          }
        >
          <div className="field filter-field">
            <label htmlFor="wecom-status">日历状态</label>
            <select id="wecom-status" onChange={(event) => setStatus(event.target.value)} value={status}>
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field filter-field--wide">
            <label htmlFor="wecom-keyword">关键词</label>
            <input
              id="wecom-keyword"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索日程、负责人、错误信息或通知标题"
              value={keyword}
            />
          </div>
          <button className="button inline" onClick={loadMonitor} type="button">
            查询
          </button>
        </FilterBar>
      </SectionCard>

      <div className="workspace-grid two-columns">
        <SectionCard title="日历同步">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>日程</th>
                  <th>负责人</th>
                  <th>状态</th>
                  <th>最近同步</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data?.calendarSyncs.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.taskTitle}</strong>
                      <div className="small muted">日历：{item.calendarId || "--"}</div>
                      <div className="small muted">日程：{item.scheduleId || "--"}</div>
                      {item.lastSyncError ? (
                        <div className="danger-text small">{item.lastSyncError}</div>
                      ) : null}
                    </td>
                    <td>
                      {item.assigneeName || "--"}
                      <div className="small muted">{item.assigneeWecomUserId || "未绑定"}</div>
                    </td>
                    <td>
                      <StatusBadge tone={syncTone(item.syncStatus)}>
                        {calendarStatusLabel(item.syncStatus)}
                      </StatusBadge>
                    </td>
                    <td>{formatDateTime(item.lastSyncedAt ?? item.updatedAt)}</td>
                    <td>
                      <button
                        className="button secondary inline"
                        disabled={!item.taskId || retryingId === item.id}
                        onClick={() => retryCalendarSync(item.id)}
                        type="button"
                      >
                        {retryingId === item.id ? "重试中..." : "重试"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && !data.calendarSyncs.length ? (
            <EmptyState title="暂无日历同步记录" description="创建或更新日程后，这里会显示企业微信同步结果。" />
          ) : null}
        </SectionCard>

        <SummaryCard title="企业微信通知">
          <div className="summary-list">
            {data?.notifications.slice(0, 12).map((item) => (
              <div className="summary-row" key={item.id}>
                <span>
                  {item.title}
                  <div className="small muted">{item.userName} · {formatDateTime(item.createdAt)}</div>
                </span>
                <StatusBadge tone={sendTone(item.sendStatus)}>
                  {notificationStatusLabel(item.sendStatus)}
                </StatusBadge>
              </div>
            ))}
            {data && !data.notifications.length ? (
              <div className="small muted">暂无企业微信通知记录。</div>
            ) : null}
          </div>
        </SummaryCard>
      </div>

      <SectionCard title="回调日志">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>事件</th>
                <th>成员</th>
                <th>Agent</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {data?.callbacks.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>
                    <strong>{item.event || "--"}</strong>
                    <div className="small muted">{item.changeType || "无变更类型"}</div>
                    {item.error ? <div className="danger-text small">{item.error}</div> : null}
                  </td>
                  <td>{item.fromUserId || "--"}</td>
                  <td>{item.agentId || "--"}</td>
                  <td>
                    <StatusBadge tone={item.status === "FAILED" ? "danger" : "success"}>
                      {item.status === "FAILED" ? "失败" : "已接收"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && !data.callbacks.length ? (
          <EmptyState title="暂无回调记录" description="企业微信回调触发后，会在这里留下事件摘要。" />
        ) : null}
      </SectionCard>
    </div>
  );
}
