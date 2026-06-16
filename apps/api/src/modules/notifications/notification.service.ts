import {
  NotificationChannel,
  NotificationSendStatus,
  Prisma
} from "@prisma/client";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryNotificationsDto } from "../../notifications/dto/query-notifications.dto";
import { WecomMessageService } from "../wecom/wecom-message.service";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  content: string;
  relatedType?: string;
  relatedId?: string;
  sendChannel: NotificationChannel;
  sendStatus?: NotificationSendStatus;
  sentAt?: Date | null;
};

type NotificationDeliveryInput = Omit<NotificationInput, "sendChannel" | "sendStatus" | "sentAt">;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly wecomMessageService: WecomMessageService
  ) {}

  async listForUser(userId: string, query: QueryNotificationsDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where = this.buildSystemWhere(userId, query);

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.notification.count({ where }),
      this.unreadCountForUser(userId)
    ]);

    return {
      page,
      pageSize,
      total,
      unreadCount,
      items
    };
  }

  async getSummaryForUser(userId: string) {
    return {
      unreadCount: await this.unreadCountForUser(userId)
    };
  }

  async countTodayForUser(userId: string) {
    return this.prisma.notification.count({
      where: {
        ...this.buildSystemWhere(userId),
        createdAt: {
          gte: this.getStartOfDay()
        }
      }
    });
  }

  async unreadCountForUser(userId: string) {
    return this.prisma.notification.count({
      where: {
        ...this.buildSystemWhere(userId),
        readAt: null
      }
    });
  }

  async recentForUser(userId: string, take = 5) {
    return this.prisma.notification.findMany({
      where: this.buildSystemWhere(userId),
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take
    });
  }

  async findExisting(
    input: Pick<NotificationInput, "userId" | "type" | "relatedType" | "relatedId" | "sendChannel">
  ) {
    return this.prisma.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        sendChannel: input.sendChannel
      }
    });
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.requireSystemNotification(userId, id);
    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() }
    });
  }

  async markAsUnread(userId: string, id: string) {
    const notification = await this.requireSystemNotification(userId, id);
    if (!notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: null }
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        ...this.buildSystemWhere(userId),
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    return {
      success: true,
      updatedCount: result.count,
      unreadCount: await this.unreadCountForUser(userId)
    };
  }

  async retryWecomNotification(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId,
        sendChannel: NotificationChannel.WECOM
      }
    });

    if (!notification) {
      throw new NotFoundException("企业微信通知不存在");
    }

    try {
      await this.sendWecomNotification(notification);

      return this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          sendStatus: NotificationSendStatus.SENT,
          sentAt: new Date()
        }
      });
    } catch (error) {
      this.logger.warn(
        `企业微信通知重试失败 notificationId=${notification.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          sendStatus: NotificationSendStatus.FAILED
        }
      });
    }
  }

  async getTaskNotificationForAction(userId: string, id: string) {
    const notification = await this.requireSystemNotification(userId, id);
    if (notification.relatedType !== "TASK" || !notification.relatedId) {
      throw new NotFoundException("当前通知不支持直接处理");
    }

    return notification;
  }

  async createIfAbsent(input: NotificationInput) {
    const existing = await this.findExisting(input);
    if (existing) {
      return existing;
    }

    return this.createNotification(input);
  }

  async createNotification(input: NotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        content: input.content,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        sendChannel: input.sendChannel,
        sendStatus: input.sendStatus ?? NotificationSendStatus.PENDING,
        sentAt: input.sentAt
      }
    });
  }

  async deliverSystemAndWecom(input: NotificationDeliveryInput) {
    return this.deliverSystemAndWecomInternal(input, true);
  }

  async deliverEventSystemAndWecom(input: NotificationDeliveryInput) {
    return this.deliverSystemAndWecomInternal(input, false);
  }

  async deliverManySystemAndWecom(inputs: NotificationDeliveryInput[]) {
    const results = [];

    for (const input of inputs) {
      results.push(await this.deliverSystemAndWecom(input));
    }

    return results;
  }

  async deliverManyEventsSystemAndWecom(inputs: NotificationDeliveryInput[]) {
    const results = [];

    for (const input of inputs) {
      results.push(await this.deliverEventSystemAndWecom(input));
    }

    return results;
  }

  private async deliverSystemAndWecomInternal(input: NotificationDeliveryInput, dedupe: boolean) {
    const create = dedupe ? this.createIfAbsent.bind(this) : this.createNotification.bind(this);
    const systemNotification = await create({
      ...input,
      sendChannel: NotificationChannel.SYSTEM,
      sendStatus: NotificationSendStatus.SENT,
      sentAt: new Date()
    });

    await this.deliverWecom(input, dedupe);

    return systemNotification;
  }

  private async deliverWecom(input: NotificationDeliveryInput, dedupe: boolean) {
    const existing = dedupe
      ? await this.findExisting({
          userId: input.userId,
          type: input.type,
          relatedType: input.relatedType,
          relatedId: input.relatedId,
          sendChannel: NotificationChannel.WECOM
        })
      : null;

    if (existing?.sendStatus === NotificationSendStatus.SENT) {
      return existing;
    }

    const wecomNotification =
      existing ??
      (await this.createWecomNotification(input, dedupe));

    try {
      await this.sendWecomNotification(input);
      return this.prisma.notification.update({
        where: { id: wecomNotification.id },
        data: {
          sendStatus: NotificationSendStatus.SENT,
          sentAt: new Date()
        }
      });
    } catch (error) {
      this.logger.warn(
        `企业微信通知发送失败 userId=${input.userId} type=${input.type}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      return this.prisma.notification.update({
        where: { id: wecomNotification.id },
        data: {
          sendStatus: NotificationSendStatus.FAILED
        }
      });
    }
  }

  private async createWecomNotification(input: NotificationDeliveryInput, dedupe: boolean) {
    const create = dedupe ? this.createIfAbsent.bind(this) : this.createNotification.bind(this);

    return create({
      ...input,
      sendChannel: NotificationChannel.WECOM,
      sendStatus: NotificationSendStatus.PENDING,
      sentAt: null
    });
  }

  private async sendWecomNotification(input: {
    userId: string;
    title: string;
    content: string;
    relatedType?: string | null;
    relatedId?: string | null;
  }) {
    return this.wecomMessageService.sendReminderMessage(
      input.userId,
      input.title,
      input.content,
      {
        url: this.buildNotificationUrl(input),
        buttonText: "前往查看"
      }
    );
  }

  private buildNotificationUrl(input: { relatedType?: string | null; relatedId?: string | null }) {
    const baseUrl = this.resolveNotificationBaseUrl(input);
    if (!baseUrl) {
      return null;
    }

    const path = this.buildNotificationPath(input);
    if (!path) {
      return null;
    }

    return `${baseUrl}${path}`;
  }

  private resolveNotificationBaseUrl(input: { relatedType?: string | null; relatedId?: string | null }) {
    if (input.relatedType === "WEEKLY_REPORT" || input.relatedType === "MONTHLY_GOAL") {
      const managementDomain = this.configService
        .get<string>("WECOM_MANAGEMENT_DOMAIN")
        ?.trim()
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");
      if (managementDomain) {
        return `https://${managementDomain}`;
      }
    }

    return this.configService.get<string>("APP_BASE_URL")?.replace(/\/$/, "") ?? null;
  }

  private buildNotificationPath(input: { relatedType?: string | null; relatedId?: string | null }) {
    switch (input.relatedType) {
      case "TASK":
        return input.relatedId
          ? `/schedule?taskId=${encodeURIComponent(input.relatedId)}#discussion`
          : "/schedule";
      case "WEEKLY_REPORT":
        return input.relatedId
          ? `/work-management/weekly-reports?reportId=${encodeURIComponent(input.relatedId)}#discussion`
          : "/work-management/weekly-reports";
      case "MONTHLY_GOAL":
        return input.relatedId
          ? `/work-management/monthly-goals?goalId=${encodeURIComponent(input.relatedId)}#discussion`
          : "/work-management/monthly-goals";
      case "QUOTATION":
        return input.relatedId
          ? `/quotations/${encodeURIComponent(input.relatedId)}`
          : "/quotations";
      case "CUSTOMER":
        return input.relatedId
          ? `/customers/${encodeURIComponent(input.relatedId)}`
          : "/customers";
      case "ORDER":
        return input.relatedId
          ? `/orders/${encodeURIComponent(input.relatedId)}`
          : "/orders";
      default:
        return "/notifications";
    }
  }

  private buildSystemWhere(userId: string, query?: QueryNotificationsDto): Prisma.NotificationWhereInput {
    const keyword = query?.keyword?.trim();
    const channel = query?.channel ?? "SYSTEM";
    const sendStatus = query?.sendStatus ?? "all";
    const where: Prisma.NotificationWhereInput = {
      userId
    };

    if (channel !== "all") {
      where.sendChannel = channel;
    }

    if (sendStatus !== "all") {
      where.sendStatus = sendStatus;
    }

    if (query?.status === "unread") {
      where.readAt = null;
    }

    if (query?.status === "read") {
      where.readAt = { not: null };
    }

    if (query?.type?.trim()) {
      where.type = query.type.trim();
    }

    if (keyword) {
      where.OR = [
        {
          title: {
            contains: keyword
          }
        },
        {
          content: {
            contains: keyword
          }
        }
      ];
    }

    return where;
  }

  private async requireSystemNotification(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...this.buildSystemWhere(userId)
      }
    });

    if (!notification) {
      throw new NotFoundException("通知不存在");
    }

    return notification;
  }

  private getStartOfDay() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
