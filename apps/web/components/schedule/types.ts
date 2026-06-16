"use client";

export type ScheduleViewMode = "month" | "week" | "day" | "list";
export type ScheduleMemberView = "me" | "team";
export type ScheduleStatusFilter = "all" | "pending" | "completed" | "reminder";
export type ScheduleDensityMode = "compact" | "standard" | "detailed";
export type ScheduleSourceFilter =
  | "all"
  | "manual"
  | "weekly_report"
  | "monthly_goal"
  | "customer_followup"
  | "quotation"
  | "contract_node"
  | "system_reminder"
  | "local_reminder";
export type EventVisualTone =
  | "formal"
  | "reminder"
  | "risk"
  | "done"
  | "festival";

export type ScheduleDisplayCategory =
  | "formal"
  | "travel"
  | "meeting"
  | "followup"
  | "plan"
  | "quotation"
  | "reminder"
  | "risk"
  | "done"
  | "festival";

export type ScheduleDisplayThemeKey =
  | "formal-1"
  | "formal-2"
  | "formal-3"
  | "travel-1"
  | "travel-2"
  | "travel-3"
  | "meeting-1"
  | "meeting-2"
  | "meeting-3"
  | "followup-1"
  | "followup-2"
  | "followup-3"
  | "plan-1"
  | "plan-2"
  | "plan-3"
  | "quotation-1"
  | "quotation-2"
  | "quotation-3"
  | "reminder"
  | "risk"
  | "done"
  | "festival";

export type CalendarEvent = {
  id: string;
  canonicalId: string;
  seriesId?: string;
  source: "task" | "workspace" | "notification" | "festival";
  dateKey: string;
  sortTime: number;
  timeLabel: string;
  title: string;
  detail: string;
  href?: string;
  relationLabel?: string;
  assigneeId?: string;
  assigneeLabel?: string;
  marker:
    | "meeting"
    | "plan"
    | "followup"
    | "contract"
    | "quotation"
    | "local"
    | "notification"
    | "festival";
  tone: "neutral" | "success" | "warning" | "danger";
  badgeLabel: string;
  statusLabel?: string;
  isAllDay?: boolean;
  isMultiDay?: boolean;
  rangeStartDateKey?: string;
  rangeEndDateKey?: string;
  rangeSegment?: "single" | "start" | "middle" | "end";
  spanStart?: boolean;
  spanMiddle?: boolean;
  spanEnd?: boolean;
  seriesColor?: "followup" | "meeting" | "plan" | "contract" | "quotation" | "other" | "done";
  displayCategory?: ScheduleDisplayCategory;
  displayThemeKey?: ScheduleDisplayThemeKey;
  raw?: unknown;
};

export type ScheduleFestivalInfo = {
  label: string;
  note: string;
  official?: boolean;
  sourceUrl?: string;
  type: "holiday" | "festival" | "weekend" | "adjusted_workday";
};

export type ScheduleMonthCellModel = {
  dateKey: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  isAdjustedWorkday: boolean;
  businessCount: number;
  entries: CalendarEvent[];
  moreCount: number;
  festival?: ScheduleFestivalInfo | null;
};

export type ScheduleMemberOption = {
  id: string;
  label: string;
};

export type ScheduleImportCandidate = {
  id: string;
  source: "weekly_report" | "monthly_goal";
  sourceLabel: string;
  parentId: string;
  title: string;
  description: string;
  ownerId: string;
  ownerLabel: string;
  periodLabel: string;
  plannedAt?: string | null;
  dueAt?: string | null;
};
