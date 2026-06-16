"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDayCell } from "./CalendarDayCell";
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
  ScheduleDensityMode,
  ScheduleMonthCellModel,
} from "./types";

type ScheduleMonthGridProps = {
  cells: ScheduleMonthCellModel[];
  density: ScheduleDensityMode;
  showInlineAssignee: boolean;
  actionLoading?: boolean;
  onDateSelect: (dateKey: string, openCreate?: boolean) => void;
  onDateCreate: (dateKey: string) => void;
  onEventOpen: (event: CalendarEvent) => void;
  getEventVisualTone: (event: CalendarEvent) => EventVisualTone;
  getEventSourceLabel: (event: CalendarEvent) => string;
  buildEventFullLabel: (event: CalendarEvent, showAssignee: boolean) => string;
} & ScheduleQuickActionHandlers;

const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];
const previewWidth = 320;
const previewHeight = 340;
const previewViewportPadding = 16;
const previewGap = 12;
const previewCloseDelay = 180;
const spanBarHeight = 24;
const spanBarGap = 6;

type CalendarSpanSegment = {
  id: string;
  seriesId: string;
  weekIndex: number;
  weekDateKeys: string[];
  startCol: number;
  endCol: number;
  lane: number;
  startDateKey: string;
  endDateKey: string;
  event: CalendarEvent;
  tone: EventVisualTone;
  themeKey: ScheduleDisplayThemeKey;
};

type CalendarSpanLayout = CalendarSpanSegment & {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PreviewPosition = {
  top: number;
  left: number;
  maxHeight: number;
  placementX: "left" | "right";
  placementY: "up" | "down";
};

function buildPreviewDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function buildSpanBarLabel(
  event: CalendarEvent,
  width: number,
  density: ScheduleDensityMode,
  showInlineAssignee: boolean,
) {
  const compactTitle =
    width < 116
      ? event.title.length > 4
        ? `${event.title.slice(0, 4)}…`
        : event.title
      : width < 168
        ? event.title.length > 8
          ? `${event.title.slice(0, 8)}…`
          : event.title
        : event.title;
  const parts = [compactTitle];

  if (density === "detailed" && width >= 220) {
    if (!event.isAllDay && event.timeLabel) {
      parts.push(event.timeLabel);
    }

    if (showInlineAssignee && event.assigneeLabel && width >= 300) {
      parts.push(`#${event.assigneeLabel}`);
    }
  }

  return parts.join(" · ");
}

function resolveSpanHoverDateKey(
  segment: CalendarSpanSegment,
  pointerClientX: number,
  rect: DOMRect,
) {
  const segmentColSpan = segment.endCol - segment.startCol + 1;
  if (segmentColSpan <= 1) {
    return segment.startDateKey;
  }

  const relativeX = Math.max(0, Math.min(pointerClientX - rect.left, rect.width));
  const ratio = rect.width > 0 ? relativeX / rect.width : 0;
  const segmentIndex = Math.min(
    segmentColSpan - 1,
    Math.max(0, Math.floor(ratio * segmentColSpan)),
  );
  const targetCol = segment.startCol + segmentIndex;

  return segment.weekDateKeys[targetCol] ?? segment.startDateKey;
}

function buildCalendarSpanSegments(
  cells: ScheduleMonthCellModel[],
  density: ScheduleDensityMode,
  getEventVisualTone: (event: CalendarEvent) => EventVisualTone,
) {
  const overlaySeriesIdsByDate = new Map<string, Set<string>>();
  const overlayReservedHeightByDate = new Map<string, number>();
  const visibleSegments: CalendarSpanSegment[] = [];
  const maxVisibleLanes =
    density === "compact" ? 1 : density === "standard" ? 2 : 3;

  for (let weekIndex = 0; weekIndex < Math.ceil(cells.length / 7); weekIndex += 1) {
    const weekCells = cells.slice(weekIndex * 7, weekIndex * 7 + 7);
    const grouped = new Map<
      string,
      Omit<CalendarSpanSegment, "id" | "lane"> & { lane?: number }
    >();

    weekCells.forEach((cell, colIndex) => {
      cell.entries.forEach((event) => {
        if (!event.isMultiDay || !event.seriesId || event.source === "festival") {
          return;
        }

        const existing = grouped.get(event.seriesId);
        const nextRepresentativeEvent =
          !existing ||
          event.rangeSegment === "start" ||
          (existing.event.rangeSegment !== "start" &&
            colIndex < existing.startCol)
            ? event
            : existing.event;

        grouped.set(event.seriesId, {
          seriesId: event.seriesId,
          weekIndex,
          weekDateKeys: weekCells.map((weekCell) => weekCell.dateKey),
          startCol: existing ? Math.min(existing.startCol, colIndex) : colIndex,
          endCol: existing ? Math.max(existing.endCol, colIndex) : colIndex,
          startDateKey:
            existing && existing.startCol <= colIndex ? existing.startDateKey : cell.dateKey,
          endDateKey:
            existing && existing.endCol >= colIndex ? existing.endDateKey : cell.dateKey,
          event: nextRepresentativeEvent,
          tone: existing?.tone ?? getEventVisualTone(event),
          themeKey:
            existing?.themeKey ??
            getEventDisplayThemeKey(event, getEventVisualTone(event)),
        });
      });
    });

    const laneEndCols: number[] = [];
    const weekSegments = Array.from(grouped.values())
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
          id: `${segment.seriesId}-${weekIndex}`,
          lane,
        } satisfies CalendarSpanSegment;
      })
      .filter((segment) => segment.lane < maxVisibleLanes);

    const visibleLaneCount = weekSegments.reduce(
      (maxLane, segment) => Math.max(maxLane, segment.lane + 1),
      0,
    );

    if (visibleLaneCount > 0) {
      const reservedHeight =
        visibleLaneCount * spanBarHeight + Math.max(0, visibleLaneCount - 1) * spanBarGap + 2;
      weekCells.forEach((cell) => {
        overlayReservedHeightByDate.set(cell.dateKey, reservedHeight);
      });
    }

    weekSegments.forEach((segment) => {
      visibleSegments.push(segment);

      for (let colIndex = segment.startCol; colIndex <= segment.endCol; colIndex += 1) {
        const dateKey = weekCells[colIndex]?.dateKey;
        if (!dateKey) {
          continue;
        }

        const existing = overlaySeriesIdsByDate.get(dateKey) ?? new Set<string>();
        existing.add(segment.seriesId);
        overlaySeriesIdsByDate.set(dateKey, existing);
      }
    });
  }

  return {
    overlaySeriesIdsByDate,
    overlayReservedHeightByDate,
    visibleSegments,
  };
}

function computePreviewPosition(rect: DOMRect): PreviewPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxHeight = Math.min(360, viewportHeight - previewViewportPadding * 2);
  const canOpenRight =
    rect.right + previewGap + previewWidth <= viewportWidth - previewViewportPadding;
  const canOpenDown =
    rect.top + previewHeight <= viewportHeight - previewViewportPadding;

  const placementX = canOpenRight ? "right" : "left";
  const placementY = canOpenDown ? "down" : "up";
  const left =
    placementX === "right"
      ? Math.min(
          rect.right + previewGap,
          viewportWidth - previewWidth - previewViewportPadding,
        )
      : Math.max(previewViewportPadding, rect.left - previewWidth - previewGap);
  const topBase =
    placementY === "down"
      ? rect.top
      : Math.max(previewViewportPadding, rect.bottom - maxHeight);
  const top = Math.min(
    Math.max(previewViewportPadding, topBase),
    viewportHeight - maxHeight - previewViewportPadding,
  );

  return {
    top,
    left,
    maxHeight,
    placementX,
    placementY,
  };
}

export function ScheduleMonthGrid({
  cells,
  density,
  showInlineAssignee,
  actionLoading = false,
  onDateSelect,
  onDateCreate,
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
}: ScheduleMonthGridProps) {
  const gridShellRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const bodyRefs = useRef(new Map<string, HTMLDivElement>());
  const closeTimerRef = useRef<number | null>(null);
  const [hoverPreviewEnabled, setHoverPreviewEnabled] = useState(false);
  const [previewDateKey, setPreviewDateKey] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null);
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);
  const [spanLayouts, setSpanLayouts] = useState<CalendarSpanLayout[]>([]);

  const spanOverlay = useMemo(
    () => buildCalendarSpanSegments(cells, density, getEventVisualTone),
    [cells, density, getEventVisualTone],
  );

  const previewCell = useMemo(
    () => cells.find((cell) => cell.dateKey === previewDateKey) ?? null,
    [cells, previewDateKey],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncHoverCapability = () => {
      setHoverPreviewEnabled(mediaQuery.matches);
    };

    syncHoverCapability();
    mediaQuery.addEventListener("change", syncHoverCapability);

    return () => {
      mediaQuery.removeEventListener("change", syncHoverCapability);
    };
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (spanOverlay.visibleSegments.length === 0) {
      setSpanLayouts([]);
      return;
    }

    let animationFrameId: number | null = null;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleLayoutUpdate) : null;

    function scheduleLayoutUpdate() {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;

        const shellNode = gridShellRef.current;
        if (!shellNode) {
          setSpanLayouts([]);
          return;
        }

        const shellRect = shellNode.getBoundingClientRect();
        const nextLayouts = spanOverlay.visibleSegments.flatMap((segment) => {
          const startCellNode = cellRefs.current.get(segment.startDateKey);
          const endCellNode = cellRefs.current.get(segment.endDateKey);
          const startBodyNode = bodyRefs.current.get(segment.startDateKey);

          if (!startCellNode || !endCellNode || !startBodyNode) {
            return [];
          }

          const startRect = startCellNode.getBoundingClientRect();
          const endRect = endCellNode.getBoundingClientRect();
          const bodyRect = startBodyNode.getBoundingClientRect();
          const startCellStyle = window.getComputedStyle(startCellNode);
          const endCellStyle = window.getComputedStyle(endCellNode);
          const startPaddingLeft = Number.parseFloat(startCellStyle.paddingLeft) || 12;
          const endPaddingRight = Number.parseFloat(endCellStyle.paddingRight) || 12;
          const left = startRect.left - shellRect.left + startPaddingLeft;
          const right = endRect.right - shellRect.left - endPaddingRight;

          return [
            {
              ...segment,
              left,
              top: bodyRect.top - shellRect.top + segment.lane * (spanBarHeight + spanBarGap),
              width: Math.max(36, right - left),
              height: spanBarHeight,
            } satisfies CalendarSpanLayout,
          ];
        });

        setSpanLayouts(nextLayouts);
      });
    }

    scheduleLayoutUpdate();
    window.addEventListener("resize", scheduleLayoutUpdate);

    if (resizeObserver) {
      if (gridShellRef.current) {
        resizeObserver.observe(gridShellRef.current);
      }

      cellRefs.current.forEach((node) => resizeObserver.observe(node));
      bodyRefs.current.forEach((node) => resizeObserver.observe(node));
    }

    return () => {
      window.removeEventListener("resize", scheduleLayoutUpdate);
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      resizeObserver?.disconnect();
    };
  }, [spanOverlay.visibleSegments]);

  useEffect(() => {
    if (!hoverPreviewEnabled || !previewDateKey) {
      setPreviewPosition(null);
      return;
    }

    const updatePosition = () => {
      const node = cellRefs.current.get(previewDateKey);
      if (!node) {
        setPreviewDateKey(null);
        return;
      }

      setPreviewPosition(computePreviewPosition(node.getBoundingClientRect()));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [hoverPreviewEnabled, previewDateKey]);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function schedulePreviewClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setActiveSeriesId(null);
      setPreviewDateKey(null);
    }, previewCloseDelay);
  }

  function openPreview(dateKey: string) {
    if (!hoverPreviewEnabled) {
      return;
    }

    clearCloseTimer();
    setPreviewDateKey(dateKey);
  }

  function handlePreviewAction(
    event: ReactMouseEvent<HTMLElement>,
    callback: () => void,
  ) {
    event.preventDefault();
    event.stopPropagation();
    clearCloseTimer();
    setActiveSeriesId(null);
    setPreviewDateKey(null);
    callback();
  }

  function handleSeriesHoverChange(seriesId: string | null) {
    setActiveSeriesId(seriesId);
  }

  function handleSpanPointerMove(
    event: ReactMouseEvent<HTMLButtonElement>,
    segment: CalendarSpanSegment,
  ) {
    handleSeriesHoverChange(segment.seriesId);

    if (!hoverPreviewEnabled) {
      return;
    }

    const hoveredDateKey = resolveSpanHoverDateKey(
      segment,
      event.clientX,
      event.currentTarget.getBoundingClientRect(),
    );
    openPreview(hoveredDateKey);
  }

  return (
    <>
      <div className="calendar-grid-shell" ref={gridShellRef}>
        <div className={`calendar-grid calendar-grid--interactive calendar-grid--${density}`}>
          {weekLabels.map((label) => (
            <div className="calendar-grid__label" key={label}>
              {label}
            </div>
          ))}

          {cells.map((cell) => (
            <CalendarDayCell
              activeSeriesId={activeSeriesId}
              bodyRef={(node) => {
                if (node) {
                  bodyRefs.current.set(cell.dateKey, node);
                } else {
                  bodyRefs.current.delete(cell.dateKey);
                }
              }}
              buildEventFullLabel={buildEventFullLabel}
              cell={cell}
              cellRef={(node) => {
                if (node) {
                  cellRefs.current.set(cell.dateKey, node);
                } else {
                  cellRefs.current.delete(cell.dateKey);
                }
              }}
              density={density}
              getEventVisualTone={getEventVisualTone}
              isPreviewActive={previewDateKey === cell.dateKey}
              key={cell.dateKey}
              onDateCreate={onDateCreate}
              onDateSelect={onDateSelect}
              onEventOpen={onEventOpen}
              onPreviewClose={schedulePreviewClose}
              onPreviewOpen={() => {
                if (cell.businessCount > 0) {
                  openPreview(cell.dateKey);
                }
              }}
              onSeriesHoverChange={handleSeriesHoverChange}
              overlaySeriesIds={Array.from(
                spanOverlay.overlaySeriesIdsByDate.get(cell.dateKey) ?? [],
              )}
              showInlineAssignee={showInlineAssignee}
              spanOverlayHeight={
                spanOverlay.overlayReservedHeightByDate.get(cell.dateKey) ?? 0
              }
            />
          ))}
        </div>

        {spanLayouts.length > 0 ? (
          <div className={`calendar-span-layer calendar-span-layer--${density}`}>
            {spanLayouts.map((segment) => (
              <button
                className={[
                  "calendar-span-bar",
                  `calendar-span-bar--${density}`,
                  activeSeriesId === segment.seriesId ? "calendar-span-bar--series-active" : "",
                  activeSeriesId && activeSeriesId !== segment.seriesId
                    ? "calendar-span-bar--series-dim"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={segment.id}
                onBlur={() => {
                  handleSeriesHoverChange(null);
                  schedulePreviewClose();
                }}
                onClick={(event) => handlePreviewAction(event, () => onEventOpen(segment.event))}
                onFocus={() => {
                  handleSeriesHoverChange(segment.seriesId);
                  openPreview(segment.startDateKey);
                }}
                onMouseEnter={(event) => handleSpanPointerMove(event, segment)}
                onMouseLeave={() => {
                  handleSeriesHoverChange(null);
                  schedulePreviewClose();
                }}
                onMouseMove={(event) => handleSpanPointerMove(event, segment)}
                style={
                  {
                    height: `${segment.height}px`,
                    left: `${segment.left}px`,
                    top: `${segment.top}px`,
                    width: `${segment.width}px`,
                    ...getScheduleThemeStyle(segment.themeKey),
                  } as CSSProperties
                }
                title={buildEventFullLabel(
                  segment.event,
                  density === "detailed" && showInlineAssignee,
                )}
                type="button"
              >
                <span className="calendar-span-bar__rail" aria-hidden="true" />
                <span className="calendar-span-bar__label">
                  {buildSpanBarLabel(
                    segment.event,
                    segment.width,
                    density,
                    showInlineAssignee,
                  )}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {hoverPreviewEnabled &&
      previewCell &&
      previewPosition &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className={[
                "calendar-preview-card",
                `calendar-preview-card--${previewPosition.placementX}`,
                `calendar-preview-card--${previewPosition.placementY}`,
              ].join(" ")}
              onMouseEnter={clearCloseTimer}
              onMouseLeave={schedulePreviewClose}
              style={{
                left: `${previewPosition.left}px`,
                maxHeight: `${previewPosition.maxHeight}px`,
                top: `${previewPosition.top}px`,
              }}
            >
              <div className="calendar-preview-card__header">
                <div className="calendar-preview-card__title-group">
                  <strong>{buildPreviewDateLabel(previewCell.dateKey)}</strong>
                  <span>{previewCell.businessCount} 项安排</span>
                </div>
                {previewCell.festival ? (
                  <span
                    className={`calendar-preview-card__festival ${previewCell.festival.type}`}
                  >
                    {previewCell.festival.type === "adjusted_workday"
                      ? "调休上班"
                      : previewCell.festival.label}
                  </span>
                ) : null}
              </div>

              <div className="calendar-preview-card__list">
                {previewCell.entries.length > 0 ? (
                  previewCell.entries.map((event) => (
                    <ScheduleEventDigestCard
                      actionLoading={actionLoading}
                      className={[
                        "calendar-preview-card__digest",
                        activeSeriesId && event.isMultiDay && event.seriesId === activeSeriesId
                          ? "calendar-preview-card__digest--series-active"
                          : "",
                        activeSeriesId &&
                        (!event.isMultiDay || event.seriesId !== activeSeriesId)
                          ? "calendar-preview-card__digest--series-dim"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      event={event}
                      fullLabel={buildEventFullLabel(event, showInlineAssignee)}
                      key={`${previewCell.dateKey}-${event.id}`}
                      onHoverEnd={() => handleSeriesHoverChange(null)}
                      onHoverStart={() =>
                        handleSeriesHoverChange(
                          event.isMultiDay ? event.seriesId ?? null : null,
                        )
                      }
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
                      variant="preview"
                    />
                  ))
                ) : (
                  <div className="calendar-preview-card__empty">
                    <strong>这一天还没有安排事项</strong>
                    <span>可以直接新增正式日程，或把待安排计划导入这一天。</span>
                  </div>
                )}
              </div>

              <div className="calendar-preview-card__footer">
                <button
                  className="button secondary inline"
                  onClick={(event) =>
                    handlePreviewAction(event, () => onDateSelect(previewCell.dateKey))
                  }
                  type="button"
                >
                  查看全部
                </button>
                <button
                  className="button ghost inline"
                  onClick={(event) =>
                    handlePreviewAction(event, () => onDateCreate(previewCell.dateKey))
                  }
                  type="button"
                >
                  新增日程
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
