import { Injectable } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { NotificationService } from "../modules/notifications/notification.service";

@Injectable()
export class MetaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  async getIndustries() {
    return this.prisma.industryGroup.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        subgroups: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  }

  async getIndustrySubgroups(groupId?: string) {
    return this.prisma.industrySubgroup.findMany({
      where: groupId ? { groupId } : undefined,
      orderBy: [{ groupId: "asc" }, { sortOrder: "asc" }],
      include: { group: true }
    });
  }

  async getUsers(currentUser: AuthenticatedUser) {
    const users = await this.prisma.user.findMany({
      where: currentUser.roleCode === "STAFF" ? { id: currentUser.id } : undefined,
      orderBy: { createdAt: "asc" },
      include: { role: true }
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      displayName: user.wecomName ?? user.name,
      roleCode: user.role.code,
      roleName: user.role.name,
      mobile: user.mobile,
      email: user.email,
      wecomUserId: user.wecomUserId,
      wecomName: user.wecomName,
      wecomAvatar: user.wecomAvatar
    }));
  }

  async getDashboard(currentUser: AuthenticatedUser) {
    const customerWhere =
      currentUser.roleCode === "STAFF" ? { ownerUserId: currentUser.id } : undefined;
    const quotationWhere =
      currentUser.roleCode === "STAFF" ? { creatorUserId: currentUser.id } : undefined;
    const taskWhere = {
      assigneeUserId: currentUser.id,
      status: {
        in: [TaskStatus.TODO, TaskStatus.DOING]
      }
    };

    const [
      customerCount,
      productCount,
      quotationCount,
      todayTodoCount,
      todayReminderCount,
      recentCustomers,
      recentQuotations,
      recentNotifications
    ] =
      await Promise.all([
        this.prisma.customer.count({ where: customerWhere }),
        this.prisma.product.count({ where: { status: "ENABLED" } }),
        this.prisma.quotation.count({ where: quotationWhere }),
        this.prisma.task.count({ where: taskWhere }),
        this.notificationService.countTodayForUser(currentUser.id),
        this.prisma.customer.findMany({
          where: customerWhere,
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: { owner: true }
        }),
        this.prisma.quotation.findMany({
          where: quotationWhere,
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { customer: true }
        }),
        this.notificationService.recentForUser(currentUser.id)
      ]);

    return {
      todayTodoCount,
      todayReminderCount,
      weeklyQuotationCount: quotationCount,
      monthlyWonCount: 0,
      customerCount,
      productCount,
      quotationCount,
      recentCustomers,
      recentNotifications,
      recentQuotations: recentQuotations.map((quotation) => ({
        ...quotation,
        type: quotation.quotationType,
        totalAmount: Number(quotation.totalDiscountedAmount).toFixed(2),
        customer: {
          ...quotation.customer,
          name: quotation.customer.customerName
        }
      }))
    };
  }
}
