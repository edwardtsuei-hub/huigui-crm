import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ContractStatus,
  RecordDataScope,
  TaskStatus,
  UserStatus
} from "@prisma/client";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { REAL_PARTITION_KEY } from "../../common/services/record-partition.service";
import { NotificationService } from "../notifications/notification.service";
import { WorkManagementService } from "../../work-management/work-management.service";

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
    private readonly notificationService: NotificationService,
    private readonly workManagementService: WorkManagementService
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async dispatchDueReminders() {
    const jobs = [
      this.processFollowupReminders(),
      this.processTaskReminders(),
      this.processContractReminders(),
      this.processWorkManagementReminders()
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
        },
        customer: {
          is: {
            dataScope: RecordDataScope.REAL,
            partitionKey: REAL_PARTITION_KEY,
            testBatchId: null
          }
        },
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
        },
        dataScope: RecordDataScope.REAL,
        partitionKey: REAL_PARTITION_KEY,
        testBatchId: null,
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
          status: ContractStatus.ACTIVE,
          dataScope: RecordDataScope.REAL,
          partitionKey: REAL_PARTITION_KEY,
          testBatchId: null,
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

  private async processWorkManagementReminders() {
    const [weeklyTargets, monthlyTargets] = await Promise.all([
      this.workManagementService.listWeeklyReportReminderTargets(new Date()),
      this.workManagementService.listMonthlyGoalReminderTargets(new Date())
    ]);

    for (const target of weeklyTargets) {
      await this.deliverReminder({
        recipients: [target.userId],
        type: "WEEKLY_REPORT_REMINDER",
        title: "周报填写提醒",
        content: [
          `请填写下周周报：${this.formatDate(target.weekStartDate)} 至 ${this.formatDate(target.weekEndDate)}`,
          "请回顾上周计划，并补充下周计划与预计完成时间。"
        ].join("\n"),
        relatedType: "WEEKLY_REPORT",
        relatedId: this.formatDate(target.weekStartDate)
      });
    }

    for (const target of monthlyTargets) {
      await this.deliverReminder({
        recipients: [target.userId],
        type: "MONTHLY_GOAL_REMINDER",
        title: "月目标填写提醒",
        content: [
          `请填写 ${target.targetYear} 年 ${String(target.targetMonth).padStart(2, "0")} 月目标`,
          "请在月底前补充下一月的核心目标、交付结果与时间安排。"
        ].join("\n"),
        relatedType: "MONTHLY_GOAL",
        relatedId: `${target.targetYear}-${String(target.targetMonth).padStart(2, "0")}`
      });
    }
  }

  private async deliverReminder(payload: ReminderPayload) {
    const recipients = Array.from(new Set(payload.recipients.filter(Boolean)));

    for (const userId of recipients) {
      await this.notificationService.deliverSystemAndWecom({
        userId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        relatedType: payload.relatedType,
        relatedId: payload.relatedId
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

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(value)
      .replace(/\//g, "-");
  }
}
