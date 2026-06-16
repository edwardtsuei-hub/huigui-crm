"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import {
  getEventDisplayThemeKey,
  getScheduleThemeStyle,
} from "./scheduleDisplayTheme";
import type {
  CalendarEvent,
  EventVisualTone,
  ScheduleDensityMode,
} from "./types";

type CalendarEventCardProps = {
  event: CalendarEvent;
  density: ScheduleDensityMode;
  showInlineAssignee: boolean;
  tone: EventVisualTone;
  fullLabel: string;
  activeSeriesId?: string | null;
  onOpen: (event: CalendarEvent) => void;
  onSeriesHoverChange?: (seriesId: string | null) => void;
};

function formatRangeDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
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

function buildDisplayTitle(event: CalendarEvent, density: ScheduleDensityMode) {
  if (!event.isMultiDay) {
    return event.title;
  }

  if (event.rangeSegment === "middle") {
    if (density === "compact") {
      return "进行中";
    }

    if (density === "standard") {
      return event.title.length > 8 ? `${event.title.slice(0, 8)}…` : event.title;
    }
  }

  return event.title;
}

function getStatusToneClass(tone: EventVisualTone) {
  switch (tone) {
    case "done":
      return "calendar-entry__status-dot--done";
    case "risk":
      return "calendar-entry__status-dot--risk";
    case "reminder":
      return "calendar-entry__status-dot--reminder";
    default:
      return "calendar-entry__status-dot--formal";
  }
}

export function CalendarEventCard({
  event,
  density,
  showInlineAssignee,
  tone,
  fullLabel,
  activeSeriesId,
  onOpen,
  onSeriesHoverChange,
}: CalendarEventCardProps) {
  const showTime = density !== "compact";
  const showMeta = density === "detailed";
  const rangeLabel = showMeta ? buildRangeLabel(event) : null;
  const displayTitle = buildDisplayTitle(event, density);
  const themeKey = getEventDisplayThemeKey(event, tone);
  const isSeriesActive = Boolean(
    activeSeriesId && event.isMultiDay && event.seriesId === activeSeriesId,
  );
  const isSeriesDimmed = Boolean(activeSeriesId && !isSeriesActive);
  const metaItems = [
    showInlineAssignee && event.assigneeLabel ? `#${event.assigneeLabel}` : null,
    event.statusLabel ?? null,
    rangeLabel,
  ].filter(Boolean) as string[];

  function handleClick(clickEvent: ReactMouseEvent<HTMLButtonElement>) {
    clickEvent.stopPropagation();
    onOpen(event);
  }

  function handleSeriesHoverChange(nextSeriesId: string | null) {
    if (!event.isMultiDay || !event.seriesId || !onSeriesHoverChange) {
      return;
    }

    onSeriesHoverChange(nextSeriesId);
  }

  return (
    <button
      className={[
        "calendar-entry",
        `calendar-entry--${density}`,
        event.isMultiDay ? "calendar-entry--range" : "",
        event.isMultiDay ? `calendar-entry--${event.rangeSegment ?? "single"}` : "",
        isSeriesActive ? "calendar-entry--series-active" : "",
        isSeriesDimmed ? "calendar-entry--series-dim" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      onBlur={() => handleSeriesHoverChange(null)}
      onFocus={() => handleSeriesHoverChange(event.seriesId ?? null)}
      onMouseEnter={() => handleSeriesHoverChange(event.seriesId ?? null)}
      onMouseLeave={() => handleSeriesHoverChange(null)}
      style={getScheduleThemeStyle(themeKey)}
      title={fullLabel}
      type="button"
    >
      <span className="calendar-entry__bar" aria-hidden="true" />
      <span className="calendar-entry__content">
        {showTime ? (
          <span className="calendar-entry__time">{buildDisplayTime(event)}</span>
        ) : null}
        <span className="calendar-entry__title">{displayTitle}</span>
        {showMeta && metaItems.length > 0 ? (
          <span className="calendar-entry__meta">
            {metaItems.map((item, index) => (
              <span
                className={[
                  "calendar-entry__meta-item",
                  item === event.statusLabel ? "calendar-entry__meta-item--status" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`${event.id}-meta-${index}`}
              >
                {item === event.statusLabel ? (
                  <span
                    className={[
                      "calendar-entry__status-dot",
                      getStatusToneClass(tone),
                    ].join(" ")}
                  />
                ) : null}
                {item}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}
