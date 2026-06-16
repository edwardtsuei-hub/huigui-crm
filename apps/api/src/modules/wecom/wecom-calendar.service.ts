import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, Task, User, WecomSyncStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { WecomCalendarEventDto } from "./dto/wecom.dto";
import { WecomService } from "./wecom.service";

const DEFAULT_CALENDAR_RETRY_LIMIT = 5;

type TaskWithAssignee = Task & {
  assignee?: Pick<User, "wecomUserId" | "wecomName" | "name"> | null;
};

type WecomScheduleResponse = {
  errcode: number;
  errmsg: string;
  schedule_id?: string;
};

export type WecomCalendarRetryResult = {
  scanned: number;
  retried: number;
  synced: number;
  failed: number;
  skipped: number;
};

@Injectable()
export class WecomCalendarService {
  private readonly logger = new Logger(WecomCalendarService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly wecomService: WecomService
  ) {}

  async syncTask(task: TaskWithAssignee) {
    const calendarId = this.getCalendarId();
    const attendeeUserId = task.assignee?.wecomUserId;

    if (!calendarId) {
      return this.markFailed(task.id, null, "WECOM_CALENDAR_ID 未配置");
    }

    if (!attendeeUserId) {
      return this.markFailed(task.id, calendarId, "日程负责人未绑定企业微信");
    }

    const existing = await this.prisma.wecomCalendarSync.findUnique({
      where: { taskId: task.id }
    });

    try {
      if (existing?.scheduleId && existing.syncStatus !== WecomSyncStatus.DELETED) {
        await this.wecomService.post("/cgi-bin/oa/schedule/update", {
          agentid: this.getAgentId(),
          schedule: this.buildSchedulePayload(task, calendarId, attendeeUserId, existing.scheduleId)
        });

        return this.markSynced(task.id, calendarId, existing.scheduleId);
      }

      const response = await this.wecomService.post<WecomScheduleResponse>(
        "/cgi-bin/oa/schedule/add",
        {
          agentid: this.getAgentId(),
          schedule: this.buildSchedulePayload(task, calendarId, attendeeUserId)
        }
      );

      if (!response.schedule_id) {
        return this.markFailed(task.id, calendarId, "企业微信未返回日程 ID");
      }

      return this.markSynced(task.id, calendarId, response.schedule_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`企业微信日历同步失败 taskId=${task.id}: ${message}`);
      return this.markFailed(task.id, calendarId, message);
    }
  }

  async deleteTaskSchedule(taskId: string) {
    const existing = await this.prisma.wecomCalendarSync.findUnique({
      where: { taskId }
    });

    if (!existing?.scheduleId) {
      return existing;
    }

    try {
      await this.wecomService.post("/cgi-bin/oa/schedule/del", {
        agentid: this.getAgentId(),
        schedule_id: existing.scheduleId
      });

      return this.prisma.wecomCalendarSync.update({
        where: { taskId },
        data: {
          syncStatus: WecomSyncStatus.DELETED,
          lastSyncError: null,
          lastSyncedAt: new Date()
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`企业微信日历删除失败 taskId=${taskId}: ${message}`);
      return this.markFailed(taskId, existing.calendarId, message);
    }
  }

  async retryPendingAndFailed(limit = 10): Promise<WecomCalendarRetryResult> {
    const syncs = await this.prisma.wecomCalendarSync.findMany({
      where: {
        syncStatus: {
          in: [WecomSyncStatus.PENDING, WecomSyncStatus.FAILED]
        },
        retryCount: {
          lt: this.getRetryLimit()
        }
      },
      orderBy: [
        { syncStatus: "desc" },
        { updatedAt: "asc" }
      ],
      take: limit,
      include: {
        task: {
          include: {
            assignee: true
          }
        }
      }
    });

    const result: WecomCalendarRetryResult = {
      scanned: syncs.length,
      retried: 0,
      synced: 0,
      failed: 0,
      skipped: 0
    };

    for (const sync of syncs) {
      if (!sync.task) {
        result.skipped += 1;
        await this.prisma.wecomCalendarSync.update({
          where: { id: sync.id },
          data: {
            syncStatus: WecomSyncStatus.DELETED,
            lastSyncError: null,
            lastSyncedAt: new Date()
          }
        });
        continue;
      }

      result.retried += 1;
      const retried = await this.syncTask(sync.task);
      if (retried.syncStatus === WecomSyncStatus.SYNCED) {
        result.synced += 1;
      } else {
        result.failed += 1;
      }
    }

    return result;
  }

  async createCalendarEvent(payload: WecomCalendarEventDto) {
    return this.createManualSchedule(payload);
  }

  async updateCalendarEvent(payload: WecomCalendarEventDto) {
    if (!payload.eventId) {
      return {
        success: false,
        message: "缺少企业微信日程 ID"
      };
    }

    await this.wecomService.post("/cgi-bin/oa/schedule/update", {
      agentid: this.getAgentId(),
      schedule: this.buildManualSchedulePayload(payload, payload.eventId)
    });

    return { success: true, implemented: true };
  }

  async deleteCalendarEvent(payload: WecomCalendarEventDto) {
    if (!payload.eventId) {
      return {
        success: false,
        message: "缺少企业微信日程 ID"
      };
    }

    await this.wecomService.post("/cgi-bin/oa/schedule/del", {
      agentid: this.getAgentId(),
      schedule_id: payload.eventId
    });

    return { success: true, implemented: true };
  }

  private async createManualSchedule(payload: WecomCalendarEventDto) {
    const response = await this.wecomService.post<WecomScheduleResponse>(
      "/cgi-bin/oa/schedule/add",
      {
        agentid: this.getAgentId(),
        schedule: this.buildManualSchedulePayload(payload)
      }
    );

    return {
      success: true,
      implemented: true,
      eventId: response.schedule_id ?? null
    };
  }

  private buildSchedulePayload(
    task: TaskWithAssignee,
    calendarId: string,
    attendeeUserId: string,
    scheduleId?: string
  ) {
    return this.stripUndefined({
      schedule_id: scheduleId,
      admins: [attendeeUserId],
      start_time: Math.floor(task.startAt.getTime() / 1000),
      end_time: Math.floor((task.endAt ?? task.startAt).getTime() / 1000),
      attendees: [{ userid: attendeeUserId }],
      summary: task.title,
      description: task.content ?? undefined,
      cal_id: calendarId,
      reminders: task.reminderAt
        ? { is_remind: 1, remind_before_event_secs: this.reminderLeadSeconds(task) }
        : undefined
    });
  }

  private buildManualSchedulePayload(payload: WecomCalendarEventDto, scheduleId?: string) {
    const calendarId = payload.calendarId?.trim() || this.getCalendarId();
    const attendeeUserId = payload.attendeeUserId?.trim();

    return this.stripUndefined({
      schedule_id: scheduleId,
      admins: attendeeUserId ? [attendeeUserId] : undefined,
      start_time: payload.startAt ? Math.floor(new Date(payload.startAt).getTime() / 1000) : undefined,
      end_time: payload.endAt ? Math.floor(new Date(payload.endAt).getTime() / 1000) : undefined,
      attendees: attendeeUserId ? [{ userid: attendeeUserId }] : undefined,
      summary: payload.title?.trim(),
      description: payload.content?.trim(),
      cal_id: calendarId
    });
  }

  private reminderLeadSeconds(task: TaskWithAssignee) {
    if (!task.reminderAt || task.reminderAt >= task.startAt) {
      return 0;
    }

    return Math.min(
      Math.floor((task.startAt.getTime() - task.reminderAt.getTime()) / 1000),
      24 * 60 * 60
    );
  }

  private async markSynced(taskId: string, calendarId: string, scheduleId: string) {
    return this.prisma.wecomCalendarSync.upsert({
      where: { taskId },
      create: {
        taskId,
        calendarId,
        scheduleId,
        syncStatus: WecomSyncStatus.SYNCED,
        lastSyncError: null,
        retryCount: 0,
        lastSyncedAt: new Date()
      },
      update: {
        calendarId,
        scheduleId,
        syncStatus: WecomSyncStatus.SYNCED,
        lastSyncError: null,
        retryCount: 0,
        lastSyncedAt: new Date()
      }
    });
  }

  private async markFailed(taskId: string, calendarId: string | null, error: string) {
    return this.prisma.wecomCalendarSync.upsert({
      where: { taskId },
      create: {
        taskId,
        calendarId,
        syncStatus: WecomSyncStatus.FAILED,
        lastSyncError: error,
        retryCount: 1
      },
      update: {
        ...(calendarId ? { calendarId } : {}),
        syncStatus: WecomSyncStatus.FAILED,
        lastSyncError: error,
        retryCount: { increment: 1 }
      }
    });
  }

  private getCalendarId() {
    return this.configService.get<string>("WECOM_CALENDAR_ID")?.trim() ?? "";
  }

  private getRetryLimit() {
    const configured = Number(this.configService.get<string>("WECOM_CALENDAR_RETRY_LIMIT")?.trim());
    return Number.isInteger(configured) && configured > 0
      ? configured
      : DEFAULT_CALENDAR_RETRY_LIMIT;
  }

  private getAgentId() {
    const agentId = Number(this.configService.get<string>("WECOM_AGENT_ID")?.trim());
    return Number.isInteger(agentId) && agentId > 0 ? agentId : undefined;
  }

  private stripUndefined<T extends Record<string, unknown>>(value: T) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== "")
    ) as Prisma.JsonObject;
  }
}
