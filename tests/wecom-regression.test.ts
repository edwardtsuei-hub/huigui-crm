import "reflect-metadata";

import assert from "node:assert/strict";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WecomSyncStatus } from "@prisma/client";
import { NotificationService } from "../apps/api/src/modules/notifications/notification.service";
import { WecomCalendarService } from "../apps/api/src/modules/wecom/wecom-calendar.service";
import { resolveWecomAppConfig } from "../apps/api/src/modules/wecom/wecom-app-config";
import { WecomMessageService } from "../apps/api/src/modules/wecom/wecom-message.service";
import { WecomService } from "../apps/api/src/modules/wecom/wecom.service";

Logger.overrideLogger(false);

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

function config(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key]
  } as unknown as ConfigService;
}

test("WeCom app config keeps employee domain on the Daai channel", () => {
  const resolved = resolveWecomAppConfig(config({
    WECOM_CORP_ID: "corp-1",
    WECOM_CRM_DOMAIN: "crm.hui-health.com",
    WECOM_CRM_AGENT_ID: "100001",
    WECOM_CRM_SECRET: "crm-secret",
    WECOM_EMPLOYEE_DOMAIN: "management.hui-health.com",
    WECOM_EMPLOYEE_AGENT_ID: "200001",
    WECOM_EMPLOYEE_SECRET: "employee-secret",
  }), "https://management.hui-health.com");

  assert.equal(resolved.appKey, "employee");
  assert.equal(resolved.agentId, "200001");
  assert.equal(resolved.secret, "employee-secret");
  assert.equal(resolved.redirectUri, "https://management.hui-health.com/login/wecom/callback");
});

test("WeCom app config does not fall back to CRM credentials for employee domain", () => {
  const resolved = resolveWecomAppConfig(config({
    WECOM_CORP_ID: "corp-1",
    WECOM_CRM_DOMAIN: "crm.hui-health.com",
    WECOM_CRM_AGENT_ID: "100001",
    WECOM_CRM_SECRET: "crm-secret",
    WECOM_EMPLOYEE_DOMAIN: "management.hui-health.com",
  }), "https://management.hui-health.com/payroll/mine");

  assert.equal(resolved.appKey, "employee");
  assert.equal(resolved.agentId, "");
  assert.equal(resolved.secret, "");
});

function createCalendarPrisma(existing?: Record<string, unknown> | null) {
  const calls = {
    upserts: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>
  };

  return {
    calls,
    prisma: {
      wecomCalendarSync: {
        findUnique: async () => existing ?? null,
        upsert: async (args: Record<string, unknown>) => {
          calls.upserts.push(args);
          return args;
        },
        update: async (args: Record<string, unknown>) => {
          calls.updates.push(args);
          return args;
        }
      }
    }
  };
}

function createCalendarRetryPrisma(syncs: Array<Record<string, unknown>>) {
  const calls = {
    findMany: [] as Array<Record<string, unknown>>,
    findUnique: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
    upserts: [] as Array<Record<string, unknown>>
  };

  return {
    calls,
    prisma: {
      wecomCalendarSync: {
        findMany: async (args: Record<string, unknown>) => {
          calls.findMany.push(args);
          return syncs;
        },
        findUnique: async (args: Record<string, unknown>) => {
          calls.findUnique.push(args);
          const taskId = (args.where as { taskId?: string }).taskId;
          return syncs.find((item) => item.taskId === taskId) ?? null;
        },
        update: async (args: Record<string, unknown>) => {
          calls.updates.push(args);
          return args;
        },
        upsert: async (args: Record<string, unknown>) => {
          calls.upserts.push(args);
          return args.update;
        }
      }
    }
  };
}

test("NotificationService builds stable WeCom deep links", () => {
  const service = new NotificationService(
    {} as never,
    config({ APP_BASE_URL: "https://crm.example.com/" }),
    {} as never
  );
  const buildNotificationUrl = (service as unknown as {
    buildNotificationUrl(input: { relatedType?: string | null; relatedId?: string | null }): string | null;
  }).buildNotificationUrl.bind(service);

  assert.equal(
    buildNotificationUrl({ relatedType: "TASK", relatedId: "task 1" }),
    "https://crm.example.com/schedule?taskId=task%201#discussion"
  );
  assert.equal(
    buildNotificationUrl({ relatedType: "WEEKLY_REPORT", relatedId: "week/1" }),
    "https://crm.example.com/work-management/weekly-reports?reportId=week%2F1#discussion"
  );
  assert.equal(
    buildNotificationUrl({ relatedType: "MONTHLY_GOAL", relatedId: "goal 1" }),
    "https://crm.example.com/work-management/monthly-goals?goalId=goal%201#discussion"
  );
  assert.equal(
    buildNotificationUrl({ relatedType: "QUOTATION", relatedId: "quote/1" }),
    "https://crm.example.com/quotations/quote%2F1"
  );
  assert.equal(
    buildNotificationUrl({ relatedType: "CUSTOMER", relatedId: "customer 1" }),
    "https://crm.example.com/customers/customer%201"
  );
  assert.equal(
    buildNotificationUrl({ relatedType: "UNKNOWN", relatedId: "anything" }),
    "https://crm.example.com/notifications"
  );

  const serviceWithoutBaseUrl = new NotificationService(
    {} as never,
    config({}),
    {} as never
  );
  const buildNotificationUrlWithoutBase = (serviceWithoutBaseUrl as unknown as {
    buildNotificationUrl(input: { relatedType?: string | null; relatedId?: string | null }): string | null;
  }).buildNotificationUrl.bind(serviceWithoutBaseUrl);
  assert.equal(buildNotificationUrlWithoutBase({ relatedType: "TASK", relatedId: "task-1" }), null);
});

test("NotificationService sends card messages with the generated target URL", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new NotificationService(
    {} as never,
    config({ APP_BASE_URL: "https://crm.example.com" }),
    {
      sendReminderMessage: async (
        userId: string,
        title: string,
        content: string,
        options?: Record<string, unknown>
      ) => {
        calls.push({ userId, title, content, options });
        return { success: true };
      }
    } as never
  );

  await (service as unknown as {
    sendWecomNotification(input: {
      userId: string;
      title: string;
      content: string;
      relatedType?: string | null;
      relatedId?: string | null;
    }): Promise<unknown>;
  }).sendWecomNotification({
    userId: "user-1",
    title: "Quote approved",
    content: "Please review the quote.",
    relatedType: "QUOTATION",
    relatedId: "quote/1"
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].userId, "user-1");
  assert.deepEqual(calls[0].options, {
    url: "https://crm.example.com/quotations/quote%2F1",
    buttonText: "前往查看"
  });
});

test("WecomMessageService chooses textcard when a URL is available", async () => {
  const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
  const service = new WecomMessageService(
    {
      user: {
        findUnique: async () => ({ id: "user-1", wecomUserId: "wecom-user-1" })
      }
    } as never,
    {
      getClientConfig: () => ({ agentId: "100001" }),
      post: async (path: string, body: Record<string, unknown>) => {
        posts.push({ path, body });
        return { errcode: 0, errmsg: "ok" };
      }
    } as never
  );

  await service.sendReminderMessage("user-1", "Task updated", "Line 1\nLine 2", {
    url: "https://crm.example.com/schedule?taskId=task-1"
  });

  assert.equal(posts.length, 1);
  assert.equal(posts[0].path, "/cgi-bin/message/send");
  assert.equal(posts[0].body.msgtype, "textcard");
  assert.equal(posts[0].body.touser, "wecom-user-1");
  assert.deepEqual(posts[0].body.textcard, {
    title: "Task updated",
    description: "Line 1<br>Line 2",
    url: "https://crm.example.com/schedule?taskId=task-1",
    btntxt: "前往查看"
  });
});

test("WecomCalendarService creates a WeCom schedule for bound assignees", async () => {
  const { prisma, calls } = createCalendarPrisma(null);
  const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
  const service = new WecomCalendarService(
    config({ WECOM_AGENT_ID: "100001", WECOM_CALENDAR_ID: "calendar-1" }),
    prisma as never,
    {
      post: async (path: string, body: Record<string, unknown>) => {
        posts.push({ path, body });
        return { errcode: 0, errmsg: "ok", schedule_id: "schedule-1" };
      }
    } as never
  );

  await service.syncTask({
    id: "task-1",
    title: "Visit customer",
    content: "Prepare samples",
    startAt: new Date("2026-05-11T01:00:00.000Z"),
    endAt: new Date("2026-05-11T02:00:00.000Z"),
    reminderAt: new Date("2026-05-11T00:45:00.000Z"),
    assignee: {
      name: "Alice",
      wecomName: "Alice W",
      wecomUserId: "alice-wecom"
    }
  } as never);

  assert.equal(posts.length, 1);
  assert.equal(posts[0].path, "/cgi-bin/oa/schedule/add");
  assert.equal(posts[0].body.agentid, 100001);
  assert.deepEqual(posts[0].body.schedule, {
    admins: ["alice-wecom"],
    start_time: 1778461200,
    end_time: 1778464800,
    attendees: [{ userid: "alice-wecom" }],
    summary: "Visit customer",
    description: "Prepare samples",
    cal_id: "calendar-1",
    reminders: { is_remind: 1, remind_before_event_secs: 900 }
  });

  assert.equal(calls.upserts.length, 1);
  const upsert = calls.upserts[0] as {
    create: {
      scheduleId: string;
      syncStatus: WecomSyncStatus;
      lastSyncError: string | null;
      retryCount: number;
    };
  };
  assert.equal(upsert.create.scheduleId, "schedule-1");
  assert.equal(upsert.create.syncStatus, WecomSyncStatus.SYNCED);
  assert.equal(upsert.create.lastSyncError, null);
  assert.equal(upsert.create.retryCount, 0);
});

test("WecomCalendarService caps long reminder lead time to one day", async () => {
  const { prisma } = createCalendarPrisma(null);
  const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
  const service = new WecomCalendarService(
    config({ WECOM_AGENT_ID: "100001", WECOM_CALENDAR_ID: "calendar-1" }),
    prisma as never,
    {
      post: async (path: string, body: Record<string, unknown>) => {
        posts.push({ path, body });
        return { errcode: 0, errmsg: "ok", schedule_id: "schedule-1" };
      }
    } as never
  );

  await service.syncTask({
    id: "task-1",
    title: "Monthly meeting",
    content: null,
    startAt: new Date("2026-05-12T01:00:00.000Z"),
    endAt: new Date("2026-05-12T02:00:00.000Z"),
    reminderAt: new Date("2026-05-11T00:30:00.000Z"),
    assignee: {
      name: "Alice",
      wecomName: "Alice W",
      wecomUserId: "alice-wecom"
    }
  } as never);

  assert.equal(
    ((posts[0].body.schedule as { reminders: { remind_before_event_secs: number } }).reminders)
      .remind_before_event_secs,
    86400
  );
});

test("WecomCalendarService updates and deletes existing WeCom schedules", async () => {
  const existing = {
    taskId: "task-1",
    calendarId: "calendar-1",
    scheduleId: "schedule-existing",
    syncStatus: WecomSyncStatus.SYNCED
  };
  const { prisma, calls } = createCalendarPrisma(existing);
  const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
  const service = new WecomCalendarService(
    config({ WECOM_AGENT_ID: "100001", WECOM_CALENDAR_ID: "calendar-1" }),
    prisma as never,
    {
      post: async (path: string, body: Record<string, unknown>) => {
        posts.push({ path, body });
        return { errcode: 0, errmsg: "ok" };
      }
    } as never
  );

  await service.syncTask({
    id: "task-1",
    title: "Updated visit",
    content: null,
    startAt: new Date("2026-05-11T01:00:00.000Z"),
    endAt: null,
    reminderAt: null,
    assignee: {
      name: "Alice",
      wecomName: "Alice W",
      wecomUserId: "alice-wecom"
    }
  } as never);

  assert.equal(posts[0].path, "/cgi-bin/oa/schedule/update");
  assert.equal(posts[0].body.agentid, 100001);
  assert.equal((posts[0].body.schedule as { schedule_id: string }).schedule_id, "schedule-existing");
  assert.equal(calls.upserts.length, 1);

  await service.deleteTaskSchedule("task-1");

  assert.equal(posts[1].path, "/cgi-bin/oa/schedule/del");
  assert.deepEqual(posts[1].body, { agentid: 100001, schedule_id: "schedule-existing" });
  assert.equal(calls.updates.length, 1);
  assert.equal(
    (calls.updates[0] as { data: { syncStatus: WecomSyncStatus } }).data.syncStatus,
    WecomSyncStatus.DELETED
  );
});

test("WecomCalendarService records sync failures without calling WeCom", async () => {
  const { prisma, calls } = createCalendarPrisma(null);
  const posts: Array<Record<string, unknown>> = [];
  const service = new WecomCalendarService(
    config({}),
    prisma as never,
    {
      post: async (path: string, body: Record<string, unknown>) => {
        posts.push({ path, body });
        return { errcode: 0, errmsg: "ok" };
      }
    } as never
  );

  await service.syncTask({
    id: "task-1",
    title: "Visit customer",
    startAt: new Date("2026-05-11T01:00:00.000Z"),
    endAt: null,
    reminderAt: null,
    assignee: {
      name: "Alice",
      wecomName: "Alice W",
      wecomUserId: "alice-wecom"
    }
  } as never);

  assert.equal(posts.length, 0);
  assert.equal(calls.upserts.length, 1);
  const upsert = calls.upserts[0] as {
    create: { syncStatus: WecomSyncStatus; lastSyncError: string; retryCount: number };
  };
  assert.equal(upsert.create.syncStatus, WecomSyncStatus.FAILED);
  assert.equal(upsert.create.lastSyncError, "WECOM_CALENDAR_ID 未配置");
  assert.equal(upsert.create.retryCount, 1);
});

test("WecomCalendarService retries pending and failed calendar syncs with a retry cap", async () => {
  const retryableTask = {
    id: "task-retry",
    title: "Retry meeting",
    content: null,
    startAt: new Date("2026-05-11T01:00:00.000Z"),
    endAt: null,
    reminderAt: null,
    assignee: {
      name: "Alice",
      wecomName: "Alice W",
      wecomUserId: "alice-wecom"
    }
  };
  const { prisma, calls } = createCalendarRetryPrisma([
    {
      taskId: "task-retry",
      calendarId: "calendar-1",
      scheduleId: null,
      syncStatus: WecomSyncStatus.FAILED,
      retryCount: 2,
      task: retryableTask
    },
    {
      taskId: "task-deleted",
      calendarId: "calendar-1",
      scheduleId: "schedule-deleted",
      syncStatus: WecomSyncStatus.PENDING,
      retryCount: 0,
      id: "sync-deleted",
      task: null
    }
  ]);
  const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
  const service = new WecomCalendarService(
    config({
      WECOM_AGENT_ID: "100001",
      WECOM_CALENDAR_ID: "calendar-1",
      WECOM_CALENDAR_RETRY_LIMIT: "3"
    }),
    prisma as never,
    {
      post: async (path: string, body: Record<string, unknown>) => {
        posts.push({ path, body });
        return { errcode: 0, errmsg: "ok", schedule_id: "schedule-retried" };
      }
    } as never
  );

  const result = await service.retryPendingAndFailed(10);

  assert.deepEqual(result, {
    scanned: 2,
    retried: 1,
    synced: 1,
    failed: 0,
    skipped: 1
  });
  assert.equal(calls.findMany.length, 1);
  const where = calls.findMany[0].where as {
    syncStatus: { in: WecomSyncStatus[] };
    retryCount: { lt: number };
  };
  assert.deepEqual(where.syncStatus.in, [WecomSyncStatus.PENDING, WecomSyncStatus.FAILED]);
  assert.equal(where.retryCount.lt, 3);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].path, "/cgi-bin/oa/schedule/add");
  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.updates.length, 1);
  assert.deepEqual(calls.updates[0].where, { id: "sync-deleted" });
  assert.equal(
    (calls.updates[0].data as { syncStatus: WecomSyncStatus }).syncStatus,
    WecomSyncStatus.DELETED
  );
});

test("WecomService records callback summaries and keeps callback flow non-blocking", async () => {
  const creates: Array<Record<string, unknown>> = [];
  const service = new WecomService(
    config({}),
    {} as never,
    {
      wecomCallbackLog: {
        create: async (args: Record<string, unknown>) => {
          creates.push(args);
          return args;
        }
      }
    } as never
  );

  await (service as unknown as {
    recordCallback(xml: string): Promise<void>;
  }).recordCallback(
    [
      "<xml>",
      "<Event><![CDATA[change_contact]]></Event>",
      "<ChangeType><![CDATA[update_user]]></ChangeType>",
      "<FromUserName><![CDATA[from-user]]></FromUserName>",
      "<UserID><![CDATA[user-1]]></UserID>",
      "<AgentID>100001</AgentID>",
      "</xml>"
    ].join("")
  );

  assert.equal(creates.length, 1);
  assert.deepEqual((creates[0] as { data: Record<string, unknown> }).data, {
    event: "change_contact",
    changeType: "update_user",
    fromUserId: "from-user",
    agentId: "100001",
    rawXml: [
      "<xml>",
      "<Event><![CDATA[change_contact]]></Event>",
      "<ChangeType><![CDATA[update_user]]></ChangeType>",
      "<FromUserName><![CDATA[from-user]]></FromUserName>",
      "<UserID><![CDATA[user-1]]></UserID>",
      "<AgentID>100001</AgentID>",
      "</xml>"
    ].join(""),
    status: "RECEIVED"
  });

  let attempts = 0;
  const failureCreates: Array<Record<string, unknown>> = [];
  const serviceWithFailingFirstInsert = new WecomService(
    config({}),
    {} as never,
    {
      wecomCallbackLog: {
        create: async (args: Record<string, unknown>) => {
          attempts += 1;
          if (attempts === 1) {
            throw new Error("primary insert failed");
          }
          failureCreates.push(args);
          return args;
        }
      }
    } as never
  );

  await (serviceWithFailingFirstInsert as unknown as {
    recordCallback(xml: string): Promise<void>;
  }).recordCallback("<xml><Event>event</Event></xml>");

  assert.equal(attempts, 2);
  assert.equal((failureCreates[0] as { data: { status: string } }).data.status, "FAILED");
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
    console.error(`${failures.length} WeCom regression test(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${tests.length} WeCom regression test(s) passed.`);
}

void main();
