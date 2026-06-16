import type { CalendarEvent } from "./types";

export type ScheduleTaskStatus = "TODO" | "DOING" | "DONE";

export type ScheduleQuickActionHandlers = {
  onQuickTaskEdit?: (event: CalendarEvent) => void;
  onQuickTaskDelete?: (event: CalendarEvent) => void;
  onQuickTaskStatusChange?: (
    event: CalendarEvent,
    status: ScheduleTaskStatus,
  ) => void;
  onQuickTaskDelay?: (event: CalendarEvent, days: number) => void;
  onQuickWorkspaceToggle?: (event: CalendarEvent) => void;
  onQuickNotificationToggle?: (event: CalendarEvent) => void;
};

export type ScheduleQuickActionItem = {
  key: string;
  label: string;
  kind: "ghost" | "secondary";
  danger?: boolean;
  disabledWhenLoading?: boolean;
  onSelect: () => void;
};

type BuildScheduleQuickActionsOptions = ScheduleQuickActionHandlers & {
  event: CalendarEvent;
  onOpen: (event: CalendarEvent) => void;
  openLabel?: string;
};

function getTaskStatus(event: CalendarEvent) {
  return (event.raw as { status?: string } | undefined)?.status;
}

function getWorkspaceStatus(event: CalendarEvent) {
  return (event.raw as { status?: string } | undefined)?.status;
}

function getNotificationReadAt(event: CalendarEvent) {
  return (event.raw as { readAt?: string | null } | undefined)?.readAt;
}

export function buildScheduleQuickActions({
  event,
  onOpen,
  openLabel = "查看详情",
  onQuickTaskEdit,
  onQuickTaskDelete,
  onQuickTaskStatusChange,
  onQuickTaskDelay,
  onQuickWorkspaceToggle,
  onQuickNotificationToggle,
}: BuildScheduleQuickActionsOptions): ScheduleQuickActionItem[] {
  const actions: ScheduleQuickActionItem[] = [];
  const taskStatus = getTaskStatus(event);
  const workspaceStatus = getWorkspaceStatus(event);
  const notificationReadAt = getNotificationReadAt(event);

  if (event.source === "task") {
    if (onQuickTaskEdit) {
      actions.push({
        key: "task-edit",
        label: "编辑",
        kind: "ghost",
        disabledWhenLoading: true,
        onSelect: () => onQuickTaskEdit(event),
      });
    }

    if (onQuickTaskStatusChange) {
      actions.push({
        key: taskStatus === "DONE" ? "task-restore" : "task-done",
        label: taskStatus === "DONE" ? "恢复待处理" : "标记完成",
        kind: "ghost",
        disabledWhenLoading: true,
        onSelect: () =>
          onQuickTaskStatusChange(event, taskStatus === "DONE" ? "TODO" : "DONE"),
      });

      if (taskStatus !== "DOING") {
        actions.push({
          key: "task-doing",
          label: "标记进行中",
          kind: "ghost",
          disabledWhenLoading: true,
          onSelect: () => onQuickTaskStatusChange(event, "DOING"),
        });
      }
    }

    if (onQuickTaskDelay) {
      actions.push({
        key: "task-delay",
        label: "延后明天",
        kind: "ghost",
        disabledWhenLoading: true,
        onSelect: () => onQuickTaskDelay(event, 1),
      });
    }

    if (onQuickTaskDelete) {
      actions.push({
        key: "task-delete",
        label: "删除",
        kind: "ghost",
        danger: true,
        disabledWhenLoading: true,
        onSelect: () => onQuickTaskDelete(event),
      });
    }
  }

  if (event.source === "workspace" && onQuickWorkspaceToggle) {
    actions.push({
      key: "workspace-toggle",
      label: workspaceStatus === "done" ? "恢复待处理" : "标记完成",
      kind: "ghost",
      disabledWhenLoading: true,
      onSelect: () => onQuickWorkspaceToggle(event),
    });
  }

  if (event.source === "notification" && onQuickNotificationToggle) {
    actions.push({
      key: "notification-toggle",
      label: notificationReadAt ? "标记未读" : "标记已读",
      kind: "ghost",
      disabledWhenLoading: true,
      onSelect: () => onQuickNotificationToggle(event),
    });
  }

  actions.push({
    key: "open",
    label: openLabel,
    kind: "secondary",
    onSelect: () => onOpen(event),
  });

  return actions;
}
