import type {
  ScheduleMemberView,
  ScheduleSourceFilter,
  ScheduleStatusFilter,
  ScheduleViewMode,
} from "../components/schedule/types";

type ScheduleTaskPrefill = {
  agriculturePlanId?: string;
  content?: string;
  customerId?: string;
  date?: string;
  endAt?: string;
  nextAction?: string;
  quotationId?: string;
  reminderAt?: string;
  solutionLabel?: string;
  sourceModule?: string;
  startAt?: string;
  summary?: string;
  title?: string;
};

type ScheduleQueryState = {
  view: ScheduleViewMode;
  date: string;
  member: ScheduleMemberView;
  source: ScheduleSourceFilter;
  status: ScheduleStatusFilter;
  assignee?: string;
};

export function buildScheduleCreateHref(prefill: ScheduleTaskPrefill = {}) {
  const params = new URLSearchParams({ compose: "task" });

  for (const [key, value] of Object.entries(prefill)) {
    const normalized = value?.trim();
    if (normalized) {
      params.set(key, normalized);
    }
  }

  return `/schedule?${params.toString()}`;
}

export function normalizeScheduleView(value?: string | null): ScheduleViewMode {
  return value === "week" || value === "day" || value === "list"
    ? value
    : "month";
}

export function normalizeScheduleMember(value?: string | null): ScheduleMemberView {
  return value === "team" ? "team" : "me";
}

export function normalizeScheduleSource(
  value?: string | null,
): ScheduleSourceFilter {
  switch (value) {
    case "manual":
    case "weekly_report":
    case "monthly_goal":
    case "customer_followup":
    case "quotation":
    case "contract_node":
    case "system_reminder":
    case "local_reminder":
      return value;
    default:
      return "all";
  }
}

export function normalizeScheduleStatus(
  value?: string | null,
): ScheduleStatusFilter {
  switch (value) {
    case "pending":
    case "completed":
    case "reminder":
      return value;
    default:
      return "all";
  }
}

export function buildScheduleRoute(state: ScheduleQueryState) {
  const params = new URLSearchParams();

  if (state.view !== "month") {
    params.set("view", state.view);
  }
  if (state.date) {
    params.set("date", state.date);
  }
  if (state.member !== "me") {
    params.set("member", state.member);
  }
  if (state.source !== "all") {
    params.set("source", state.source);
  }
  if (state.status !== "all") {
    params.set("status", state.status);
  }
  if (state.member === "team" && state.assignee) {
    params.set("assignee", state.assignee);
  }

  const query = params.toString();
  return query ? `/schedule?${query}` : "/schedule";
}
