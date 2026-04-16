import { Injectable } from "@nestjs/common";
import { ApprovalStatus, TaskStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { ApprovalService } from "../common/services/approval.service";
import { NotificationService } from "../modules/notifications/notification.service";

@Injectable()
export class MetaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly approvalService: ApprovalService,
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
    const users = await this.accessControl.getAssignableUsers(currentUser);

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      displayName: user.wecomName ?? user.name,
      department: user.department,
      title: user.title,
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
    const customerWhere = await this.accessControl.buildCustomerWhere(currentUser);
    const quotationWhere = await this.accessControl.buildQuotationWhere(currentUser);
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
      pendingApprovalCount:
        currentUser.roleCode === "SUPER_ADMIN" || currentUser.roleCode === "ADMIN"
          ? await this.prisma.approvalRequest.count({
              where: { status: ApprovalStatus.PENDING }
            })
          : (await this.approvalService.listPendingForRoleCodes([currentUser.roleCode], 50)).length,
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
