import "reflect-metadata";

import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import {
  NotificationChannel,
  NotificationSendStatus,
  RecordDataScope,
  TaskStatus,
  TaskType,
} from "@prisma/client";
import type { AuthenticatedUser } from "../apps/api/src/common/types/authenticated-user";
import { NotificationService } from "../apps/api/src/modules/notifications/notification.service";
import { TasksService } from "../apps/api/src/tasks/tasks.service";

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

const currentUser = {
  id: "user-1",
  name: "诚恳心",
  loginAccount: "edwardtsuei",
  roleCode: "SUPER_ADMIN",
  roleName: "超级管理员",
  recordDataScope: RecordDataScope.REAL,
  permissions: ["action.schedule.update", "page.schedule.center"],
} as unknown as AuthenticatedUser;

function createTask(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-05-12T02:00:00.000Z");

  return {
    id: "task-1",
    title: "月度会议提醒",
    type: TaskType.PLAN,
    customerId: null,
    quotationId: null,
    agriculturePlanId: null,
    assigneeUserId: "user-1",
    startAt: new Date("2026-05-12T03:00:00.000Z"),
    endAt: new Date("2026-05-12T04:00:00.000Z"),
    reminderAt: new Date("2026-05-12T02:30:00.000Z"),
    content: "处理通知快捷动作",
    status: TaskStatus.TODO,
    createdBy: "user-1",
    dataScope: RecordDataScope.REAL,
    partitionKey: "REAL",
    testBatchId: null,
    createdAt: now,
    updatedAt: now,
    customer: null,
    quotation: null,
    agriculturePlan: null,
    assignee: {
      id: "user-1",
      name: "诚恳心",
      wecomName: "诚恳心",
    },
    creator: {
      id: "user-1",
      name: "诚恳心",
      wecomName: "诚恳心",
    },
    wecomCalendarSync: null,
    ...overrides,
  };
}

function createTasksService(task = createTask()) {
  const calls = {
    taskUpdates: [] as Array<Record<string, unknown>>,
    auditLogs: [] as Array<Record<string, unknown>>,
    calendarSyncs: [] as Array<Record<string, unknown>>,
  };

  const prisma = {
    task: {
      findFirst: async () => task,
      update: async (args: { data: Record<string, unknown> }) => {
        calls.taskUpdates.push(args);
        return {
          ...task,
          ...args.data,
          status: args.data.status ?? task.status,
          updatedAt: new Date("2026-05-12T05:00:00.000Z"),
        };
      },
    },
  };
  const accessControl = {
    buildTaskWhere: async (_user: AuthenticatedUser, where: Record<string, unknown>) => ({
      id: where.id,
    }),
    hasPermission: () => true,
  };
  const auditService = {
    summarizeChanges: (_before: unknown, _after: unknown, fields: string[]) =>
      fields.join(","),
    log: async (input: Record<string, unknown>) => {
      calls.auditLogs.push(input);
      return input;
    },
  };
  const wecomCalendarService = {
    syncTask: async (input: Record<string, unknown>) => {
      calls.calendarSyncs.push(input);
      return input;
    },
  };

  return {
    calls,
    service: new TasksService(
      prisma as never,
      accessControl as never,
      auditService as never,
      {} as never,
      {} as never,
      wecomCalendarService as never,
    ),
  };
}

function createNotificationService(notification: Record<string, unknown>) {
  const calls = {
    notificationUpdates: [] as Array<Record<string, unknown>>,
  };
  const prisma = {
    notification: {
      findFirst: async () => notification,
      update: async (args: { data: Record<string, unknown> }) => {
        calls.notificationUpdates.push(args);
        return {
          ...notification,
          ...args.data,
        };
      },
      count: async () => 0,
    },
  };

  return {
    calls,
    service: new NotificationService(
      prisma as never,
      { get: () => undefined } as unknown as ConfigService,
      {} as never,
    ),
  };
}

test("TasksService quick action marks task done and syncs calendar", async () => {
  const { service, calls } = createTasksService();

  const result = await service.quickAction("task-1", "TASK_DONE", currentUser);

  assert.equal(result.status, TaskStatus.DONE);
  assert.equal(calls.taskUpdates.length, 1);
  assert.equal(calls.taskUpdates[0].data.status, TaskStatus.DONE);
  assert.equal(calls.auditLogs.length, 1);
  assert.equal(calls.calendarSyncs.length, 1);
});

test("TasksService quick delay moves task dates and restores todo status", async () => {
  const { service, calls } = createTasksService();

  const result = await service.quickAction("task-1", "TASK_DELAY_3D", currentUser);

  assert.equal(result.status, TaskStatus.TODO);
  assert.equal(calls.taskUpdates[0].data.status, TaskStatus.TODO);
  assert.equal(
    (calls.taskUpdates[0].data.startAt as Date).toISOString(),
    "2026-05-15T03:00:00.000Z",
  );
  assert.equal(
    (calls.taskUpdates[0].data.endAt as Date).toISOString(),
    "2026-05-15T04:00:00.000Z",
  );
  assert.equal(
    (calls.taskUpdates[0].data.reminderAt as Date).toISOString(),
    "2026-05-15T02:30:00.000Z",
  );
});

test("NotificationService only exposes task notifications for quick actions", async () => {
  const { service } = createNotificationService({
    id: "notification-1",
    userId: "user-1",
    type: "TASK_REMINDER",
    title: "工作计划提醒",
    content: "请处理任务",
    relatedType: "TASK",
    relatedId: "task-1",
    sendChannel: NotificationChannel.SYSTEM,
    sendStatus: NotificationSendStatus.SENT,
    readAt: null,
    createdAt: new Date("2026-05-12T02:00:00.000Z"),
  });

  const notification = await service.getTaskNotificationForAction(
    "user-1",
    "notification-1",
  );

  assert.equal(notification.relatedId, "task-1");
});

test("NotificationService rejects non-task quick actions", async () => {
  const { service } = createNotificationService({
    id: "notification-1",
    userId: "user-1",
    type: "DISCUSSION_COMMENT",
    title: "协作留言",
    content: "请查看留言",
    relatedType: "WEEKLY_REPORT",
    relatedId: "report-1",
    sendChannel: NotificationChannel.SYSTEM,
    sendStatus: NotificationSendStatus.SENT,
    readAt: null,
    createdAt: new Date("2026-05-12T02:00:00.000Z"),
  });

  await assert.rejects(
    () => service.getTaskNotificationForAction("user-1", "notification-1"),
    /当前通知不支持直接处理/,
  );
});

async function main() {
  const failures: Array<{ name: string; error: unknown }> = [];

  for (const item of tests) {
    try {
      await item.run();
      console.log(`ok - ${item.name}`);
    } catch (error) {
      failures.push({ name: item.name, error });
      console.error(`not ok - ${item.name}`);
      console.error(error);
    }
  }

  if (failures.length) {
    console.error(`${failures.length} notification action regression test(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${tests.length} notification action regression test(s) passed.`);
}

void main();
