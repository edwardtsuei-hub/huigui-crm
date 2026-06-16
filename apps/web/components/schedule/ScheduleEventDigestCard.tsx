"use client";

import { useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  getEventDisplayThemeKey,
  getScheduleThemeStyle,
} from "./scheduleDisplayTheme";
import {
  buildScheduleQuickActions,
  type ScheduleQuickActionHandlers,
} from "./scheduleQuickActions";
import type { CalendarEvent, EventVisualTone } from "./types";

type ScheduleEventDigestCardProps = {
  event: CalendarEvent;
  tone: EventVisualTone;
  variant: "week" | "day" | "preview";
  showInlineAssignee: boolean;
  sourceLabel: string;
  fullLabel: string;
  className?: string;
  actionLoading?: boolean;
  onOpen: (event: CalendarEvent) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
} & ScheduleQuickActionHandlers;

function formatRangeDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildDisplayTime(event: CalendarEvent) {
  if (event.isAllDay) {
    return "全天";
  }

  if (!event.isMultiDay) {
    return event.timeLabel;
  }

  if (event.rangeSegment === "middle") {
    return "进行中";
  }

  return event.timeLabel;
}

function buildRangeLabel(event: CalendarEvent) {
  if (
    !event.isMultiDay ||
    !event.rangeStartDateKey ||
    !event.rangeEndDateKey ||
    event.rangeStartDateKey === event.rangeEndDateKey
  ) {
    return null;
  }

  return `${formatRangeDate(event.rangeStartDateKey)} - ${formatRangeDate(event.rangeEndDateKey)}`;
}

function buildProgressLabel(event: CalendarEvent) {
  if (
    !event.isMultiDay ||
    !event.rangeStartDateKey ||
    !event.rangeEndDateKey ||
    event.rangeStartDateKey === event.rangeEndDateKey
  ) {
    return null;
  }

  const start = new Date(`${event.rangeStartDateKey}T12:00:00`).getTime();
  const current = new Date(`${event.dateKey}T12:00:00`).getTime();
  const end = new Date(`${event.rangeEndDateKey}T12:00:00`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((end - start) / dayMs) + 1);
  const currentDay = Math.min(
    totalDays,
    Math.max(1, Math.round((current - start) / dayMs) + 1),
  );

  return `第 ${currentDay} / ${totalDays} 天`;
}

export function ScheduleEventDigestCard({
  event,
  tone,
  variant,
  showInlineAssignee,
  sourceLabel,
  fullLabel,
  className,
  actionLoading = false,
  onOpen,
  onHoverStart,
  onHoverEnd,
  onQuickTaskEdit,
  onQuickTaskDelete,
  onQuickTaskStatusChange,
  onQuickTaskDelay,
  onQuickWorkspaceToggle,
  onQuickNotificationToggle,
}: ScheduleEventDigestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const themeKey = getEventDisplayThemeKey(event, tone);
  const metaItems = [
    showInlineAssignee && event.assigneeLabel ? `#${event.assigneeLabel}` : null,
    buildRangeLabel(event),
    buildProgressLabel(event),
    variant === "day" ? event.relationLabel ?? null : null,
  ].filter(Boolean) as string[];
  const quickActions = buildScheduleQuickActions({
    event,
    onOpen,
    onQuickTaskEdit,
    onQuickTaskDelete,
    onQuickTaskStatusChange,
    onQuickTaskDelay,
    onQuickWorkspaceToggle,
    onQuickNotificationToggle,
  });

  function handleClick(clickEvent: ReactMouseEvent<HTMLButtonElement>) {
    clickEvent.stopPropagation();
    setIsExpanded((current) => !current);
  }

  function handleAction(
    clickEvent: ReactMouseEvent<HTMLButtonElement>,
    callback: () => void,
  ) {
    clickEvent.stopPropagation();
    callback();
  }

  return (
    <article
      className={[
        "schedule-digest-card",
        `schedule-digest-card--${variant}`,
        event.isMultiDay ? "schedule-digest-card--range" : "",
        event.isMultiDay
          ? `schedule-digest-card--${event.rangeSegment ?? "single"}`
          : "",
        isExpanded ? "is-expanded" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={getScheduleThemeStyle(themeKey)}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <button
        className="schedule-digest-card__trigger"
        onClick={handleClick}
        title={fullLabel}
        type="button"
      >
        <span className="schedule-digest-card__bar" aria-hidden="true" />
        <div className="schedule-digest-card__main">
          <div className="schedule-digest-card__top">
            <span className="schedule-digest-card__time">{buildDisplayTime(event)}</span>
            {event.statusLabel ? (
              <span className="schedule-digest-card__state">{event.statusLabel}</span>
            ) : null}
          </div>

          <div className="schedule-digest-card__heading">
            <strong>{event.title}</strong>
            <div className="schedule-digest-card__badges">
              <span className="schedule-digest-card__badge schedule-digest-card__badge--primary">
                {event.badgeLabel}
              </span>
              <span className="schedule-digest-card__badge schedule-digest-card__badge--secondary">
                {sourceLabel}
              </span>
            </div>
          </div>

          {metaItems.length > 0 ? (
            <div className="schedule-digest-card__meta">
              {metaItems.map((item, index) => (
                <span className="schedule-digest-card__meta-item" key={`${event.id}-meta-${index}`}>
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          {variant === "day" && event.detail ? (
            <p className="schedule-digest-card__detail">{event.detail}</p>
          ) : null}
        </div>

        <span className="schedule-digest-card__toggle">
          {isExpanded ? "收起" : "展开"}
        </span>
      </button>

      {isExpanded ? (
        <div className="schedule-digest-card__details">
          {(variant === "week" || variant === "preview") && event.detail ? (
            <p className="schedule-digest-card__detail-note">{event.detail}</p>
          ) : null}

          <div className="schedule-digest-card__actions">
            {quickActions.map((action) => (
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
                onClick={(clickEvent) => handleAction(clickEvent, action.onSelect)}
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
}
