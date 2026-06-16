import "reflect-metadata";

import assert from "node:assert/strict";
import {
  RecordDataScope,
  TaskStatus,
  TaskType,
  WeeklyPlanReviewStatus,
  WeeklyReportStatus,
} from "@prisma/client";
import type { AuthenticatedUser } from "../apps/api/src/common/types/authenticated-user";
import { WorkManagementService } from "../apps/api/src/work-management/work-management.service";

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

const managerUser = {
  id: "manager-1",
  username: "manager",
  displayName: "主管",
  roleCode: "SUPER_ADMIN",
  roleName: "超级管理员",
  recordDataScope: RecordDataScope.REAL,
  permissions: ["action.work_management.review", "page.work_management.weekly_reports"],
} as unknown as AuthenticatedUser;

const memberUser = {
  id: "member-1",
  username: "member",
  name: "成员一",
  wecomName: "成员一",
  department: "销售部",
};

function createWeeklyReport(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-05-12T02:00:00.000Z");

  return {
    id: "report-1",
    userId: "member-1",
    weekStartDate: new Date("2026-05-11T00:00:00.000Z"),
    weekEndDate: new Date("2026-05-17T23:59:59.999Z"),
    status: WeeklyReportStatus.DRAFT,
    completedSummary: "本周完成客户回访",
    focusSummary: "下周继续推进",
    submittedAt: null,
    managerReviewedAt: null,
    managerReviewComment: null,
    managerReviewer: null,
    dataScope: RecordDataScope.REAL,
    partitionKey: "REAL",
    testBatchId: null,
    createdAt: now,
    updatedAt: now,
    user: memberUser,
    reviewItems: [
      {
        id: "review-1",
        reportId: "report-1",
        sourcePlanItemId: null,
        title: "上周计划",
        description: null,
        plannedAt: null,
        status: WeeklyPlanReviewStatus.INCOMPLETE,
        incompleteReason: "等待客户资料",
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    planItems: [
      {
        id: "plan-1",
        reportId: "report-1",
        sourceReviewItemId: null,
        taskId: null,
        title: "月度会议跟进",
        description: "整理会议纪要",
        plannedAt: new Date("2026-05-15T02:00:00.000Z"),
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "plan-done",
        reportId: "report-1",
        sourceReviewItemId: null,
        taskId: "task-existing",
        title: "已派生计划",
        description: null,
        plannedAt: new Date("2026-05-16T02:00:00.000Z"),
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    ...overrides,
  };
}

function createService(report = createWeeklyReport()) {
  const calls = {
    notifications: [] as Array<Record<string, unknown>>,
    notificationBatches: [] as Array<Array<Record<string, unknown>>>,
    taskCreates: [] as Array<Record<string, unknown>>,
    planUpdates: [] as Array<Record<string, unknown>>,
    auditLogs: [] as Array<Record<string, unknown>>,
  };

  const prisma = {
    weeklyReport: {
      findMany: async () => [report],
      findFirst: async () => report,
    },
    task: {
      create: async (args: { data: Record<string, unknown> }) => {
        calls.taskCreates.push(args);
        return {
          id: "task-created",
          title: args.data.title,
          startAt: args.data.startAt,
        };
      },
    },
    weeklyReportPlanItem: {
      update: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        calls.planUpdates.push(args);
        return args;
      },
    },
    $transaction: async <T>(callback: (tx: typeof prisma) => Promise<T>) =>
      callback(prisma),
  };

  const accessControl = {
    getAssignableUsers: async () => [
      memberUser,
      {
        id: "member-missing",
        username: "missing",
        name: "成员二",
        wecomName: "成员二",
        department: "销售部",
      },
    ],
    assertPermission: () => null,
    hasPermission: () => true,
  };

  const recordPartition = {
    buildWhere: () => ({
      dataScope: RecordDataScope.REAL,
      partitionKey: "REAL",
      testBatchId: null,
    }),
    mergeWhere: (baseWhere: unknown, partitionWhere: unknown) => ({
      AND: [baseWhere, partitionWhere],
    }),
    resolveContext: () => ({
      partitionKey: "REAL",
    }),
  };

  const notificationService = {
    deliverManyEventsSystemAndWecom: async (inputs: Array<Record<string, unknown>>) => {
      calls.notificationBatches.push(inputs);
      return inputs;
    },
    deliverEventSystemAndWecom: async (input: Record<string, unknown>) => {
      calls.notifications.push(input);
      return input;
    },
  };

  const auditService = {
    log: async (input: Record<string, unknown>) => {
      calls.auditLogs.push(input);
      return input;
    },
  };

  return {
    calls,
    service: new WorkManagementService(
      prisma as never,
      auditService as never,
      recordPartition as never,
      accessControl as never,
      notificationService as never,
    ),
  };
}

test("WorkManagementService builds weekly report team closure rows and summary", async () => {
  const { service } = createService();

  const closure = await service.getWeeklyReportTeamClosure(
    { weekStartDate: "2026-05-11" },
    managerUser,
  );

  assert.equal(closure.summary.totalMembers, 2);
  assert.equal(closure.summary.draftCount, 1);
  assert.equal(closure.summary.missingCount, 1);
  assert.equal(closure.summary.needsReminderCount, 2);
  assert.equal(closure.rows[0].status, WeeklyReportStatus.DRAFT);
  assert.equal(closure.rows[0].openReviewCount, 1);
  assert.equal(closure.rows[1].status, "MISSING");
});

test("WorkManagementService only reminds selected weekly report targets", async () => {
  const { service, calls } = createService();

  const result = await service.remindWeeklyReports(
    {
      weekStartDate: "2026-05-11",
      userIds: ["member-missing"],
    },
    managerUser,
  );

  assert.equal(result.remindedCount, 1);
  assert.equal(calls.notificationBatches.length, 1);
  assert.equal(calls.notificationBatches[0].length, 1);
  assert.equal(calls.notificationBatches[0][0].userId, "member-missing");
  assert.equal(calls.notificationBatches[0][0].type, "WEEKLY_REPORT_MANUAL_REMINDER");
});

test("WorkManagementService derives unsynced weekly plans into tasks", async () => {
  const { service, calls } = createService(
    createWeeklyReport({
      status: WeeklyReportStatus.SUBMITTED,
    }),
  );

  const result = await service.deriveWeeklyReportTasks(
    "report-1",
    { planItemIds: ["plan-1", "plan-done"] },
    managerUser,
  );

  assert.equal(result.createdCount, 1);
  assert.equal(calls.taskCreates.length, 1);
  assert.equal(calls.taskCreates[0].data.title, "周报计划 · 月度会议跟进");
  assert.equal(calls.taskCreates[0].data.type, TaskType.PLAN);
  assert.equal(calls.taskCreates[0].data.status, TaskStatus.TODO);
  assert.equal(calls.taskCreates[0].data.assigneeUserId, "member-1");
  assert.equal(calls.planUpdates.length, 1);
  assert.deepEqual(calls.planUpdates[0].where, { id: "plan-1" });
  assert.equal(calls.notifications.length, 1);
  assert.equal(calls.notifications[0].type, "WEEKLY_REPORT_TASK_DERIVED");
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
    console.error(`${failures.length} work management regression test(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${tests.length} work management regression test(s) passed.`);
}

void main();
