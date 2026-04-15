import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ContractStatus,
  NotificationChannel,
  NotificationSendStatus,
  TaskStatus,
  UserStatus
} from "@prisma/client";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationService } from "../notifications/notification.service";

type ReminderPayload = {
  recipients: string[];
  type: string;
  title: string;
  content: string;
  relatedType: string;
  relatedId: string;
};

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async dispatchDueReminders() {
    const jobs = [
      this.processFollowupReminders(),
      this.processTaskReminders(),
      this.processContractReminders()
    ];

    const results = await Promise.allSettled(jobs);
    results.forEach((result) => {
      if (result.status === "rejected") {
        this.logger.error(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    });
  }

  private async processFollowupReminders() {
    const followups = await this.prisma.customerFollowup.findMany({
      where: {
        needReminder: true,
        nextContactAt: {
          not: null,
          lte: new Date()
        }
      },
      include: {
        customer: {
          select: {
            customerName: true,
            ownerUserId: true
          }
        }
      }
    });

    for (const followup of followups) {
      if (!followup.nextContactAt) {
        continue;
      }

      await this.deliverReminder({
        recipients: [followup.customer.ownerUserId],
        type: "FOLLOW_UP_REMINDER",
        title: "客户跟进提醒",
        content: [
          `客户：${followup.customer.customerName}`,
          `事项：${followup.nextAction ?? "请今日联系并确认报价"}`,
          `时间：${this.formatDateTime(followup.nextContactAt)}`
        ].join("\n"),
        relatedType: "CUSTOMER_FOLLOWUP",
        relatedId: followup.id
      });
    }
  }

  private async processTaskReminders() {
    const tasks = await this.prisma.task.findMany({
      where: {
        reminderAt: {
          not: null,
          lte: new Date()
        },
        status: {
          in: [TaskStatus.TODO, TaskStatus.DOING]
        }
      },
      select: {
        id: true,
        title: true,
        reminderAt: true,
        assigneeUserId: true
      }
    });

    for (const task of tasks) {
      if (!task.reminderAt) {
        continue;
      }

      await this.deliverReminder({
        recipients: [task.assigneeUserId],
        type: "TASK_REMINDER",
        title: "工作计划提醒",
        content: [
          `计划：${task.title}`,
          `时间：${this.formatDateTime(task.reminderAt)}`,
          "请及时处理当前工作计划。"
        ].join("\n"),
        relatedType: "TASK",
        relatedId: task.id
      });
    }
  }

  private async processContractReminders() {
    const advanceDays = Number(
      this.configService.get<string>("CONTRACT_REMINDER_DAYS") ??
        this.configService.get<string>("WECOM_CONTRACT_REMINDER_DAYS") ??
        "7"
    );
    const now = new Date();
    const deadline = new Date(now.getTime() + Math.max(advanceDays, 1) * 24 * 60 * 60 * 1000);

    const [contracts, managers] = await Promise.all([
      this.prisma.contract.findMany({
        where: {
          expiredAt: {
            not: null,
            gte: now,
            lte: deadline
          },
          status: ContractStatus.ACTIVE
        },
        include: {
          customer: {
            select: {
              customerName: true
            }
          }
        }
      }),
      this.prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          role: {
            is: {
              code: {
                in: ["SUPER_ADMIN", "SENIOR_MANAGER"]
              }
            }
          }
        },
        select: { id: true }
      })
    ]);

    const managerIds = managers.map((item) => item.id);

    for (const contract of contracts) {
      if (!contract.expiredAt) {
        continue;
      }

      await this.deliverReminder({
        recipients: [contract.creatorUserId, ...managerIds],
        type: "CONTRACT_EXPIRY_REMINDER",
        title: "合同到期提醒",
        content: [
          `客户：${contract.customer.customerName}`,
          `合同：${contract.contractName}`,
          `到期日期：${this.formatDateTime(contract.expiredAt)}`,
          "请及时跟进续签。"
        ].join("\n"),
        relatedType: "CONTRACT",
        relatedId: contract.id
      });
    }
  }

  private async deliverReminder(payload: ReminderPayload) {
    const recipients = Array.from(new Set(payload.recipients.filter(Boolean)));

    for (const userId of recipients) {
      await this.notificationService.createIfAbsent({
        userId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        relatedType: payload.relatedType,
        relatedId: payload.relatedId,
        sendChannel: NotificationChannel.SYSTEM,
        sendStatus: NotificationSendStatus.SENT,
        sentAt: new Date()
      });
    }
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })
      .format(value)
      .replace(/\//g, "-");
  }
}
