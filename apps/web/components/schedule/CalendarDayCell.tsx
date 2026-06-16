"use client";

import type { CSSProperties, Ref } from "react";
import { CalendarEventCard } from "./CalendarEventCard";
import type {
  CalendarEvent,
  EventVisualTone,
  ScheduleDensityMode,
  ScheduleMonthCellModel,
} from "./types";

type CalendarDayCellProps = {
  cell: ScheduleMonthCellModel;
  density: ScheduleDensityMode;
  activeSeriesId?: string | null;
  isPreviewActive?: boolean;
  overlaySeriesIds?: string[];
  spanOverlayHeight?: number;
  showInlineAssignee: boolean;
  getEventVisualTone: (event: CalendarEvent) => EventVisualTone;
  buildEventFullLabel: (event: CalendarEvent, showAssignee: boolean) => string;
  onDateSelect: (dateKey: string, openCreate?: boolean) => void;
  onDateCreate: (dateKey: string) => void;
  onEventOpen: (event: CalendarEvent) => void;
  onSeriesHoverChange?: (seriesId: string | null) => void;
  onPreviewOpen?: () => void;
  onPreviewClose?: () => void;
  cellRef?: Ref<HTMLDivElement>;
  bodyRef?: Ref<HTMLDivElement>;
};

const densityEntryCountMap: Record<ScheduleDensityMode, number> = {
  compact: 1,
  standard: 2,
  detailed: 4,
};

function getBusyDots(count: number) {
  const level = Math.min(4, Math.max(0, count === 0 ? 0 : Math.ceil(count / 2)));
  return Array.from({ length: 4 }, (_, index) => index < level);
}

function buildCellFlag(cell: ScheduleMonthCellModel) {
  if (cell.isAdjustedWorkday) {
    return {
      label: "班",
      className: "calendar-cell__flag calendar-cell__flag--workday",
    };
  }

  if (cell.isHoliday) {
    return {
      label: "休",
      className: "calendar-cell__flag calendar-cell__flag--holiday",
    };
  }

  if (cell.isWeekend) {
    return {
      label: "周末",
      className: "calendar-cell__flag calendar-cell__flag--weekend",
    };
  }

  return null;
}

export function CalendarDayCell({
  cell,
  density,
  activeSeriesId,
  isPreviewActive = false,
  overlaySeriesIds,
  spanOverlayHeight = 0,
  showInlineAssignee,
  getEventVisualTone,
  buildEventFullLabel,
  onDateSelect,
  onDateCreate,
  onEventOpen,
  onSeriesHoverChange,
  onPreviewOpen,
  onPreviewClose,
  cellRef,
  bodyRef,
}: CalendarDayCellProps) {
  const overlaySeriesLookup = new Set(overlaySeriesIds ?? []);
  const displayableEntries = cell.entries.filter(
    (event) =>
      !(
        event.isMultiDay &&
        event.seriesId &&
        overlaySeriesLookup.has(event.seriesId)
      ),
  );
  const visibleBusinessItems = displayableEntries.slice(0, densityEntryCountMap[density]);
  const hiddenCount = Math.max(0, displayableEntries.length - visibleBusinessItems.length);
  const busyDots = getBusyDots(cell.businessCount);
  const cellFlag = buildCellFlag(cell);
  const hasActiveSeries = Boolean(
    activeSeriesId &&
      cell.entries.some((event) => event.isMultiDay && event.seriesId === activeSeriesId),
  );

  return (
    <div
      className={[
        "calendar-grid__cell",
        "calendar-grid__cell--interactive",
        cell.isCurrentMonth ? "" : "muted",
        cell.isToday ? "today" : "",
        cell.isSelected ? "selected" : "",
        cell.isWeekend && !cell.isAdjustedWorkday ? "weekend" : "",
        cell.isHoliday ? "holiday" : "",
        cell.isAdjustedWorkday ? "workday-shift" : "",
        isPreviewActive ? "calendar-grid__cell--preview-active" : "",
        hasActiveSeries ? "calendar-grid__cell--series-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onDateSelect(cell.dateKey, cell.businessCount === 0)}
      onDoubleClick={() => onDateCreate(cell.dateKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onDateSelect(cell.dateKey, cell.businessCount === 0);
        }
      }}
      onMouseEnter={onPreviewOpen}
      onMouseLeave={onPreviewClose}
      ref={cellRef}
      role="button"
      tabIndex={0}
    >
      <div className="calendar-cell__top">
        <div className="calendar-cell__headline">
          <div className="calendar-cell__headline-main">
            <span className="calendar-cell__day">{cell.day}</span>
            {cellFlag ? <span className={cellFlag.className}>{cellFlag.label}</span> : null}
          </div>
        </div>

        {cell.businessCount > 0 ? (
          <div className="calendar-cell__density" aria-hidden="true">
            <div className="calendar-cell__density-dots">
              {busyDots.map((active, index) => (
                <span
                  className={`calendar-cell__density-dot ${active ? "active" : ""}`}
                  key={`${cell.dateKey}-density-${index}`}
                />
              ))}
            </div>
            <span className="calendar-cell__count">{cell.businessCount}</span>
          </div>
        ) : null}
      </div>

      <div
        className="calendar-cell__body"
        ref={bodyRef}
        style={
          spanOverlayHeight > 0
            ? ({
                "--calendar-span-offset": `${spanOverlayHeight}px`,
              } as CSSProperties)
            : undefined
        }
      >
        <div className="calendar-cell__entries">
          {visibleBusinessItems.map((event) => (
            <CalendarEventCard
              activeSeriesId={activeSeriesId}
              density={density}
              event={event}
              fullLabel={buildEventFullLabel(event, density === "detailed" && showInlineAssignee)}
              key={event.id}
              onOpen={onEventOpen}
              onSeriesHoverChange={onSeriesHoverChange}
              showInlineAssignee={density === "detailed" && showInlineAssignee}
              tone={getEventVisualTone(event)}
            />
          ))}
        </div>

        {hiddenCount > 0 || cell.festival ? (
          <div className="calendar-cell__bottom">
            {hiddenCount > 0 ? (
              <button
                className="calendar-cell__more"
                onClick={(event) => {
                  event.stopPropagation();
                  onDateSelect(cell.dateKey);
                }}
                type="button"
              >
                +{hiddenCount}
              </button>
            ) : (
              <span className="calendar-cell__more-placeholder" aria-hidden="true" />
            )}

            {cell.festival ? (
              <div className={`calendar-cell__festival ${cell.festival.type}`}>
                {cell.festival.type === "adjusted_workday" ? "调休上班" : cell.festival.label}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
