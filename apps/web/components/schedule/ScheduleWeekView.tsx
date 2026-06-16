"use client";

import {
  getEventDisplayThemeKey,
  getScheduleThemeStyle,
} from "./scheduleDisplayTheme";
import { ScheduleEventDigestCard } from "./ScheduleEventDigestCard";
import type { ScheduleQuickActionHandlers } from "./scheduleQuickActions";
import type {
  CalendarEvent,
  EventVisualTone,
  ScheduleDisplayThemeKey,
} from "./types";

type ScheduleWeekDaySummary = {
  dateKey: string;
  label: string;
  items: CalendarEvent[];
};

type WeekSpanSegment = {
  id: string;
  seriesId: string;
  startCol: number;
  endCol: number;
  lane: number;
  event: CalendarEvent;
  tone: EventVisualTone;
  themeKey: ScheduleDisplayThemeKey;
};

type ScheduleWeekViewProps = {
  days: ScheduleWeekDaySummary[];
  selectedDateKey: string;
  showInlineAssignee: boolean;
  actionLoading?: boolean;
  onDateSelect: (dateKey: string, openCreate?: boolean) => void;
  onCreateDate: (dateKey: string) => void;
  onEventOpen: (event: CalendarEvent) => void;
  getEventVisualTone: (event: CalendarEvent) => EventVisualTone;
  getEventSourceLabel: (event: CalendarEvent) => string;
  buildEventFullLabel: (event: CalendarEvent, showAssignee: boolean) => string;
} & ScheduleQuickActionHandlers;

function buildWeekSpanData(
  days: ScheduleWeekDaySummary[],
  getEventVisualTone: (event: CalendarEvent) => EventVisualTone,
) {
  const grouped = new Map<string, Omit<WeekSpanSegment, "id" | "lane">>();

  days.forEach((day, colIndex) => {
    day.items.forEach((event) => {
      if (!event.isMultiDay || !event.seriesId || event.source === "festival") {
        return;
      }

      const existing = grouped.get(event.seriesId);
      const representativeEvent =
        !existing ||
        event.rangeSegment === "start" ||
        (existing.event.rangeSegment !== "start" && colIndex < existing.startCol)
          ? event
          : existing.event;

      grouped.set(event.seriesId, {
        seriesId: event.seriesId,
        startCol: existing ? Math.min(existing.startCol, colIndex) : colIndex,
        endCol: existing ? Math.max(existing.endCol, colIndex) : colIndex,
        event: representativeEvent,
        tone: existing?.tone ?? getEventVisualTone(event),
        themeKey:
          existing?.themeKey ??
          getEventDisplayThemeKey(event, getEventVisualTone(event)),
      });
    });
  });

  const laneEndCols: number[] = [];
  const visibleOverlaySeriesByDate = new Map<string, Set<string>>();
  const maxVisibleLanes = 3;

  const segments = Array.from(grouped.values())
    .sort((left, right) => {
      if (left.startCol !== right.startCol) {
        return left.startCol - right.startCol;
      }

      if (left.endCol !== right.endCol) {
        return right.endCol - left.endCol;
      }

      return left.event.sortTime - right.event.sortTime;
    })
    .map((segment) => {
      let lane = laneEndCols.findIndex((lastEndCol) => segment.startCol > lastEndCol);
      if (lane === -1) {
        lane = laneEndCols.length;
      }
      laneEndCols[lane] = segment.endCol;

      return {
        ...segment,
        id: `${segment.seriesId}-${segment.startCol}-${segment.endCol}`,
        lane,
      } satisfies WeekSpanSegment;
    })
    .filter((segment) => segment.lane < maxVisibleLanes);

  segments.forEach((segment) => {
    for (let colIndex = segment.startCol; colIndex <= segment.endCol; colIndex += 1) {
      const dateKey = days[colIndex]?.dateKey;
      if (!dateKey) {
        continue;
      }

      const existing = visibleOverlaySeriesByDate.get(dateKey) ?? new Set<string>();
      existing.add(segment.seriesId);
      visibleOverlaySeriesByDate.set(dateKey, existing);
    }
  });

  return {
    segments,
    visibleOverlaySeriesByDate,
    laneCount: segments.reduce(
      (maxLane, segment) => Math.max(maxLane, segment.lane + 1),
      0,
    ),
  };
}

export function ScheduleWeekView({
  days,
  selectedDateKey,
  showInlineAssignee,
  actionLoading = false,
  onDateSelect,
  onCreateDate,
  onEventOpen,
  onQuickTaskEdit,
  onQuickTaskDelete,
  onQuickTaskStatusChange,
  onQuickTaskDelay,
  onQuickWorkspaceToggle,
  onQuickNotificationToggle,
  getEventVisualTone,
  getEventSourceLabel,
  buildEventFullLabel,
}: ScheduleWeekViewProps) {
  const todayKey = `${new Date().getFullYear()}-${`${new Date().getMonth() + 1}`.padStart(2, "0")}-${`${new Date().getDate()}`.padStart(2, "0")}`;
  const weekSpanData = buildWeekSpanData(days, getEventVisualTone);

  return (
    <div className="schedule-week-view">
      {weekSpanData.segments.length > 0 ? (
        <section className="schedule-week-span-panel">
          <div className="schedule-week-span-panel__heading">
            <strong>本周连续事项</strong>
            <span>跨天任务会在这里保持一体展示，避免每天重复占位。</span>
          </div>
          <div
            className="schedule-week-span-grid"
            style={{
              gridTemplateRows: `repeat(${weekSpanData.laneCount}, minmax(28px, auto))`,
            }}
          >
            {weekSpanData.segments.map((segment) => (
              <button
                className="schedule-week-span-bar"
                key={segment.id}
                onClick={() => onEventOpen(segment.event)}
                style={{
                  gridColumn: `${segment.startCol + 1} / ${segment.endCol + 2}`,
                  gridRow: `${segment.lane + 1}`,
                  ...getScheduleThemeStyle(segment.themeKey),
                }}
                title={buildEventFullLabel(segment.event, showInlineAssignee)}
                type="button"
              >
                <span className="schedule-week-span-bar__rail" aria-hidden="true" />
                <span className="schedule-week-span-bar__label">{segment.event.title}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="week-grid">
        {days.map((day) => {
          const businessItems = day.items.filter((item) => item.source !== "festival");
          const visibleItems = businessItems.filter(
            (item) =>
              !(
                item.isMultiDay &&
                item.seriesId &&
                weekSpanData.visibleOverlaySeriesByDate
                  .get(day.dateKey)
                  ?.has(item.seriesId)
              ),
          );
          const isSelectedDay = selectedDateKey === day.dateKey;
          const isTodayColumn = todayKey === day.dateKey;

          return (
            <section className="week-column" key={day.dateKey}>
              <button
                className={[
                  "week-column__header",
                  "week-column__header--button",
                  isSelectedDay ? "week-column__header--selected" : "",
                  isTodayColumn ? "week-column__header--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onDateSelect(day.dateKey, businessItems.length === 0)}
                type="button"
              >
                <div className="week-column__header-main">
                  <strong>{day.label}</strong>
                  <span>{businessItems.length ? `${businessItems.length} 项安排` : "点击新增日程"}</span>
                </div>
                <span className="week-column__count">{businessItems.length}</span>
              </button>

              {visibleItems.length ? (
                <div className="week-column__events">
                  {visibleItems.map((event) => (
                    <ScheduleEventDigestCard
                      actionLoading={actionLoading}
                      event={event}
                      fullLabel={buildEventFullLabel(event, showInlineAssignee)}
                      key={event.id}
                      onOpen={onEventOpen}
                      onQuickNotificationToggle={onQuickNotificationToggle}
                      onQuickTaskDelay={onQuickTaskDelay}
                      onQuickTaskDelete={onQuickTaskDelete}
                      onQuickTaskEdit={onQuickTaskEdit}
                      onQuickTaskStatusChange={onQuickTaskStatusChange}
                      onQuickWorkspaceToggle={onQuickWorkspaceToggle}
                      showInlineAssignee={showInlineAssignee}
                      sourceLabel={getEventSourceLabel(event)}
                      tone={getEventVisualTone(event)}
                      variant="week"
                    />
                  ))}
                </div>
              ) : (
                <button
                  className="week-column__empty"
                  onClick={() => onCreateDate(day.dateKey)}
                  type="button"
                >
                  <strong>
                    {businessItems.length ? "连续事项已集中展示" : "这一天还没有安排"}
                  </strong>
                  <span>
                    {businessItems.length
                      ? "跨天任务已放到上方连续条，这里只保留单日事项。"
                      : "直接新增日程，或从右侧待安排池补进来。"}
                  </span>
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
