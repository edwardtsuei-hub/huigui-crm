"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../system/primitives";
import {
  getEventDisplayThemeKey,
  getScheduleThemeStyle,
} from "./scheduleDisplayTheme";
import {
  buildScheduleQuickActions,
  type ScheduleQuickActionHandlers,
} from "./scheduleQuickActions";
import type {
  CalendarEvent,
  EventVisualTone,
  ScheduleFestivalInfo,
  ScheduleImportCandidate,
} from "./types";

export type DayWorkbenchFilter =
  | "all"
  | "pending"
  | "completed"
  | "reminder"
  | "overdue";

type DayWorkbenchPanelProps = {
  dateKey: string;
  festival?: ScheduleFestivalInfo | null;
  isToday: boolean;
  isWeekend: boolean;
  actionLoading?: boolean;
  onCreate: () => void;
  onOpenDayView: () => void;
  onImport: () => void;
  filter: DayWorkbenchFilter;
  onFilterChange: (value: DayWorkbenchFilter) => void;
  events: CalendarEvent[];
  stats: {
    total: number;
    pending: number;
    completed: number;
    reminders: number;
    overdue: number;
  };
  unscheduledItems: ScheduleImportCandidate[];
  showAssignee: boolean;
  showTeamScope: boolean;
  onEventOpen: (event: CalendarEvent) => void;
  onQuickImportCandidate: (item: ScheduleImportCandidate) => void;
  getEventVisualTone: (event: CalendarEvent) => EventVisualTone;
  getEventSourceLabel: (event: CalendarEvent) => string;
} & ScheduleQuickActionHandlers;

const filterTabs: Array<{
  value: DayWorkbenchFilter;
  label: string;
}> = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待处理" },
  { value: "completed", label: "已完成" },
  { value: "reminder", label: "提醒" },
  { value: "overdue", label: "逾期" },
];

function formatPrimaryDate(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function formatWeekday(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "long",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function buildHeaderSummary(
  stats: DayWorkbenchPanelProps["stats"],
  isToday: boolean,
) {
  if (stats.total === 0) {
    return isToday ? "今天暂无正式安排" : "这一天还没有正式安排";
  }

  return `${isToday ? "今天" : "这一天"}共 ${stats.total} 项安排`;
}

function buildHeaderSecondary(
  stats: DayWorkbenchPanelProps["stats"],
  unscheduledCount: number,
  showTeamScope: boolean,
) {
  if (stats.total === 0) {
    if (unscheduledCount > 0) {
      return `还有 ${unscheduledCount} 条待安排计划可导入到这一天。`;
    }

    return showTeamScope
      ? "可以新增正式日程，或切换筛选聚焦团队当天重点事项。"
      : "可以直接新增日程，或从计划中导入待排事项。";
  }

  const parts = [
    stats.pending > 0 ? `${stats.pending} 项待处理` : null,
    stats.completed > 0 ? `${stats.completed} 项已完成` : null,
    stats.reminders > 0 ? `${stats.reminders} 项提醒` : null,
    stats.overdue > 0 ? `${stats.overdue} 项逾期` : null,
  ].filter(Boolean) as string[];

  return parts.join(" · ") || "点击下方事项可展开完整详情。";
}

function buildTimeLabel(event: CalendarEvent) {
  return event.isAllDay ? "全天" : event.timeLabel;
}

function getBadgeTone(event: CalendarEvent) {
  if (event.statusLabel === "已完成" || event.statusLabel === "已读") {
    return "success" as const;
  }

  if (event.statusLabel === "已延期") {
    return "danger" as const;
  }

  if (event.statusLabel === "进行中" || event.statusLabel === "待处理") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function buildExpandedMeta(
  event: CalendarEvent,
  showAssignee: boolean,
  getEventSourceLabel: (event: CalendarEvent) => string,
) {
  const multiDayMeta =
    event.isMultiDay &&
    event.rangeStartDateKey &&
    event.rangeEndDateKey &&
    event.rangeStartDateKey !== event.rangeEndDateKey
      ? [
          {
            label: "连续范围",
            value: `${formatPrimaryDate(event.rangeStartDateKey)} - ${formatPrimaryDate(event.rangeEndDateKey)}`,
          },
          {
            label: "当前进度",
            value: `连续第 ${
              Math.floor(
                (new Date(`${event.dateKey}T12:00:00`).getTime() -
                  new Date(`${event.rangeStartDateKey}T12:00:00`).getTime()) /
                  (24 * 60 * 60 * 1000),
              ) + 1
            } / ${
              Math.floor(
                (new Date(`${event.rangeEndDateKey}T12:00:00`).getTime() -
                  new Date(`${event.rangeStartDateKey}T12:00:00`).getTime()) /
                  (24 * 60 * 60 * 1000),
              ) + 1
            } 天`,
          },
        ]
      : [];

  return [
    { label: "类型", value: event.badgeLabel },
    { label: "来源", value: getEventSourceLabel(event) },
    event.statusLabel ? { label: "状态", value: event.statusLabel } : null,
    showAssignee && event.assigneeLabel
      ? { label: "负责人", value: `#${event.assigneeLabel}` }
      : null,
    event.relationLabel ? { label: "关联对象", value: event.relationLabel } : null,
    ...multiDayMeta,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
}

export function DayWorkbenchPanel({
  dateKey,
  festival,
  isToday,
  isWeekend,
  actionLoading = false,
  onCreate,
  onOpenDayView,
  onImport,
  filter,
  onFilterChange,
  events,
  stats,
  unscheduledItems,
  showAssignee,
  showTeamScope,
  onEventOpen,
  onQuickTaskEdit,
  onQuickTaskDelete,
  onQuickTaskStatusChange,
  onQuickTaskDelay,
  onQuickWorkspaceToggle,
  onQuickNotificationToggle,
  onQuickImportCandidate,
  getEventVisualTone,
  getEventSourceLabel,
}: DayWorkbenchPanelProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!events.find((event) => event.id === expandedEventId)) {
      setExpandedEventId(events[0]?.id ?? null);
    }
  }, [events, expandedEventId]);

  const headerSummary = useMemo(
    () => buildHeaderSummary(stats, isToday),
    [isToday, stats],
  );
  const backlogCount = showTeamScope ? 0 : unscheduledItems.length;
  const headerSecondary = useMemo(
    () => buildHeaderSecondary(stats, backlogCount, showTeamScope),
    [backlogCount, showTeamScope, stats],
  );

  const tabCounts = useMemo(
    () => ({
      all: stats.total,
      pending: stats.pending,
      completed: stats.completed,
      reminder: stats.reminders,
      overdue: stats.overdue,
    }),
    [stats],
  );

  return (
    <section className="panel stack schedule-day-workbench">
      <div className="schedule-day-workbench__shell">
        <header className="schedule-day-panel-header">
          <div className="schedule-day-panel-header__topline">
            <span className="schedule-day-panel-header__eyebrow">
              当天工作台
            </span>
            <div className="schedule-day-panel-header__pills">
              {isToday ? <StatusBadge tone="success">今天</StatusBadge> : null}
              {isWeekend && !festival ? (
                <StatusBadge tone="neutral">周末</StatusBadge>
              ) : null}
              {festival ? (
                <StatusBadge
                  tone={
                    festival.type === "holiday"
                      ? "danger"
                      : festival.type === "adjusted_workday"
                        ? "neutral"
                        : "warning"
                  }
                >
                  {festival.type === "adjusted_workday"
                    ? "调休上班"
                    : festival.label}
                </StatusBadge>
              ) : null}
              {showTeamScope ? <StatusBadge tone="neutral">团队视角</StatusBadge> : null}
            </div>
          </div>

          <div className="schedule-day-panel-header__title">
            <h3>{formatPrimaryDate(dateKey)}</h3>
            <span>{formatWeekday(dateKey)}</span>
          </div>

          <div className="schedule-day-panel-header__summary">
            <strong>{headerSummary}</strong>
            <p>{headerSecondary}</p>
            {festival?.note ? (
              <div className="schedule-day-panel-header__note">{festival.note}</div>
            ) : null}
          </div>
        </header>

        <div className="schedule-day-filter-strip" role="tablist" aria-label="当天事项筛选">
          {filterTabs.map((option) => (
            <button
              className={`schedule-day-filter-chip ${
                filter === option.value ? "active" : ""
              }`}
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              type="button"
            >
              <span>{option.label}</span>
              <strong>{tabCounts[option.value]}</strong>
            </button>
          ))}
        </div>

        <section className="schedule-day-panel-section">
          <div className="schedule-day-panel-section__heading">
            <div>
              <h4>当天事项</h4>
              <p>左侧看整月分布，右侧专注这一天的推进、提醒与处理动作。</p>
            </div>
          </div>

          {events.length ? (
            <div className="schedule-day-event-list">
              {events.map((event) => {
                const isExpanded = expandedEventId === event.id;
                const tone = getEventVisualTone(event);
                const themeKey = getEventDisplayThemeKey(event, tone);
                const expandedMeta = buildExpandedMeta(
                  event,
                  showAssignee,
                  getEventSourceLabel,
                );

                return (
                  <article
                    className={`schedule-day-event ${
                      isExpanded ? "is-active" : ""
                    }`}
                    key={event.id}
                    style={getScheduleThemeStyle(themeKey)}
                  >
                    <button
                      className="schedule-day-event__trigger"
                      onClick={() =>
                        setExpandedEventId((current) =>
                          current === event.id ? null : event.id,
                        )
                      }
                      type="button"
                    >
                      <span className="schedule-day-event__bar" aria-hidden="true" />

                      <div className="schedule-day-event__time">
                        {buildTimeLabel(event)}
                      </div>

                      <div className="schedule-day-event__body">
                        <div className="schedule-day-event__heading">
                          <strong>{event.title}</strong>
                          <div className="schedule-day-event__badges">
                            {event.statusLabel ? (
                              <StatusBadge tone={getBadgeTone(event)}>
                                {event.statusLabel}
                              </StatusBadge>
                            ) : null}
                            <StatusBadge tone="neutral">{event.badgeLabel}</StatusBadge>
                          </div>
                        </div>

                        <div className="schedule-day-event__meta">
                          <span>来源：{getEventSourceLabel(event)}</span>
                          {showAssignee && event.assigneeLabel ? (
                            <span>负责人：#{event.assigneeLabel}</span>
                          ) : null}
                          {event.relationLabel ? (
                            <span>{event.relationLabel}</span>
                          ) : null}
                        </div>

                        <p>{event.detail}</p>
                      </div>

                      <span className="schedule-day-event__state">
                        {isExpanded ? "收起" : "展开"}
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="schedule-day-event__details">
                        <div className="schedule-day-event__detail-grid">
                          {expandedMeta.map((item) => (
                            <div
                              className="schedule-day-event__detail-item"
                              key={`${event.id}-${item.label}`}
                            >
                              <span>{item.label}</span>
                              <strong>{item.value}</strong>
                            </div>
                          ))}
                        </div>

                        <div className="schedule-day-event__detail-actions">
                          {buildScheduleQuickActions({
                            event,
                            onOpen: onEventOpen,
                            onQuickTaskEdit,
                            onQuickTaskDelete,
                            onQuickTaskStatusChange,
                            onQuickTaskDelay,
                            onQuickWorkspaceToggle,
                            onQuickNotificationToggle,
                            openLabel: "查看完整详情",
                          }).map((action) => (
                            <button
                              className={[
                                "button",
                                action.kind === "secondary" ? "secondary" : "ghost",
                                "inline",
                                action.danger ? "danger-text" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              disabled={action.disabledWhenLoading ? actionLoading : false}
                              key={action.key}
                              onClick={action.onSelect}
                              type="button"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="schedule-day-empty">
              <strong>
                {stats.total === 0 ? "这一天还没有正式日程" : "当前筛选下没有匹配事项"}
              </strong>
              <p>
                {stats.total === 0
                  ? unscheduledItems.length > 0
                    ? `你可以直接新增日程，或把 ${unscheduledItems.length} 条待安排计划导入到这一天。`
                    : "可以先安排重点事项，也可以切到团队视图查看整体分布。"
                  : "换一个筛选条件，或直接新增新的正式安排。"}
              </p>
              <div className="action-row">
                <button className="button inline" onClick={onCreate} type="button">
                  新增日程
                </button>
                <button className="button secondary inline" onClick={onImport} type="button">
                  从计划导入
                </button>
              </div>
            </div>
          )}
        </section>

        {!showTeamScope && unscheduledItems.length > 0 ? (
          <section className="schedule-day-panel-section schedule-day-panel-section--compact">
            <div className="schedule-day-panel-section__heading">
              <div>
                <h4>待排计划入口</h4>
                <p>轻量补进这一天，不用先打开完整导入面板。</p>
              </div>
              {unscheduledItems.length > 3 ? (
                <span className="muted-text">还有 {unscheduledItems.length - 3} 条</span>
              ) : null}
            </div>

            <div className="schedule-day-backlog-list">
              {unscheduledItems.slice(0, 3).map((item) => (
                <article className="schedule-day-backlog-item" key={item.id}>
                  <div className="schedule-day-backlog-item__body">
                    <strong>{item.title}</strong>
                    <p>
                      {item.sourceLabel} · {item.periodLabel}
                    </p>
                  </div>
                  <button
                    className="button ghost inline"
                    onClick={() => onQuickImportCandidate(item)}
                    type="button"
                  >
                    导入今天
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="schedule-day-panel-actions">
          <button className="button inline" onClick={onCreate} type="button">
            新增日程
          </button>
          <button className="button secondary inline" onClick={onImport} type="button">
            从计划导入
          </button>
          <button className="button ghost inline" onClick={onOpenDayView} type="button">
            查看日视图
          </button>
        </footer>
      </div>
    </section>
  );
}
