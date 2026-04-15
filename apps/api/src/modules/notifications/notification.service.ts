import {
  NotificationChannel,
  NotificationSendStatus,
  Prisma
} from "@prisma/client";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryNotificationsDto } from "../../notifications/dto/query-notifications.dto";

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

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createIfAbsent(input: NotificationInput) {
    const existing = await this.findExisting(input);
    if (existing) {
      return existing;
    }

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

  private buildSystemWhere(userId: string, query?: QueryNotificationsDto): Prisma.NotificationWhereInput {
    const keyword = query?.keyword?.trim();
    const where: Prisma.NotificationWhereInput = {
      userId,
      sendChannel: NotificationChannel.SYSTEM
    };

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
