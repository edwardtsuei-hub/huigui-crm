import { Injectable } from "@nestjs/common";
import {
  ApprovalStatus,
  FileRecordStatus,
  TaskStatus,
  WeeklyPlanReviewStatus,
  WeeklyReportStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { ApprovalService } from "../common/services/approval.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import { NotificationService } from "../modules/notifications/notification.service";
import { WorkManagementService } from "../work-management/work-management.service";

function cloneDate(value: Date) {
  return new Date(value.getTime());
}

function startOfDay(value: Date) {
  const date = cloneDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(value: Date) {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function addDays(value: Date, days: number) {
  const date = cloneDate(value);
  date.setDate(date.getDate() + days);
  return date;
}

@Injectable()
export class MetaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly approvalService: ApprovalService,
    private readonly recordPartition: RecordPartitionService,
    private readonly notificationService: NotificationService,
    private readonly workManagementService: WorkManagementService,
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

  async getSolutionCustomers(currentUser: AuthenticatedUser) {
    const where = await this.accessControl.buildCustomerWhere(currentUser);
    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { customerName: "asc" }],
      take: 200,
      select: {
        id: true,
        customerName: true,
        companyName: true,
      },
    });

    return {
      items: customers.map((customer) => ({
        id: customer.id,
        name: customer.customerName,
        companyName: customer.companyName,
      })),
    };
  }

  async getSolutionProducts() {
    const products = await this.prisma.product.findMany({
      where: {
        status: "ENABLED",
      },
      orderBy: [{ updatedAt: "desc" }, { displayName: "asc" }],
      select: {
        id: true,
        displayName: true,
        salePrice: true,
        unit: true,
        spec: true,
      },
    });

    return products.map((product) => ({
      id: product.id,
      displayName: product.displayName,
      suggestedPrice:
        product.salePrice === null || product.salePrice === undefined
          ? ""
          : String(product.salePrice),
      unit: product.unit,
      specification: product.spec,
    }));
  }

  async getDashboard(currentUser: AuthenticatedUser) {
    const now = new Date();
    const currentWeekStart = startOfWeek(now);
    const currentWeekEnd = addDays(currentWeekStart, 6);
    const currentPartition = this.recordPartition.resolveContext(currentUser);
    const customerWhere = await this.accessControl.buildCustomerWhere(currentUser);
    const inspectionNeedsLinkingWhere =
      await this.accessControl.buildInspectionWhere(currentUser, {
        OR: [{ customerId: null }, { productId: null }],
      });
    const quotationWhere = await this.accessControl.buildQuotationWhere(currentUser);
    const weeklyQuotationWhere = await this.accessControl.buildQuotationWhere(currentUser, {
      updatedAt: {
        gte: currentWeekStart,
      },
    });
    const taskWhere = {
      assigneeUserId: currentUser.id,
      status: {
        in: [TaskStatus.TODO, TaskStatus.DOING]
      }
    };
    const canViewAllOperations =
      currentUser.roleCode === "SUPER_ADMIN" || currentUser.roleCode === "ADMIN";

    const [
      customerCount,
      productCount,
      quotationCount,
      weeklyQuotationCount,
      pendingInspectionLinkCount,
      todayTodoCount,
      todayReminderCount,
      recentCustomers,
      recentQuotations,
      recentFiles,
      recentOperations,
      recentNotifications,
      pendingWeeklyReport,
      currentWeekReport,
    ] =
      await Promise.all([
        this.prisma.customer.count({ where: customerWhere }),
        this.prisma.product.count({ where: { status: "ENABLED" } }),
        this.prisma.quotation.count({ where: quotationWhere }),
        this.prisma.quotation.count({ where: weeklyQuotationWhere }),
        this.prisma.inspectionOrder.count({
          where: inspectionNeedsLinkingWhere,
        }),
        this.prisma.task.count({ where: taskWhere }),
        this.notificationService.countTodayForUser(currentUser.id),
        this.prisma.customer.findMany({
          where: customerWhere,
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            customerName: true,
            companyName: true,
            contactName: true,
            status: true,
            updatedAt: true,
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.quotation.findMany({
          where: quotationWhere,
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: { customer: true },
        }),
        this.prisma.fileRecord.findMany({
          where: {
            deletedAt: null,
            status: {
              not: FileRecordStatus.OBSOLETE,
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            fileName: true,
            category: true,
            relatedType: true,
            relatedId: true,
            status: true,
            isArchived: true,
            updatedAt: true,
            folder: {
              select: {
                id: true,
                name: true,
              },
            },
            uploader: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.auditLog.findMany({
          where: canViewAllOperations ? undefined : { userId: currentUser.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            action: true,
            module: true,
            targetType: true,
            targetId: true,
            targetName: true,
            content: true,
            result: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.notificationService.recentForUser(currentUser.id),
        this.workManagementService.getPendingWeeklyReportSummary(currentUser),
        this.prisma.weeklyReport.findUnique({
          where: {
            userId_weekStartDate_partitionKey: {
              userId: currentUser.id,
              weekStartDate: currentWeekStart,
              partitionKey: currentPartition.partitionKey,
            },
          },
          include: {
            reviewItems: true,
            planItems: true,
          },
        }),
      ]);

    const weeklyReportDisplayStatus =
      (now.getDay() === 0 || now.getDay() === 6) &&
      currentWeekReport?.status !== WeeklyReportStatus.SUBMITTED &&
      currentWeekReport?.status !== WeeklyReportStatus.APPROVED
        ? "OVERDUE"
        : currentWeekReport?.status ?? "MISSING";

    return {
      todayTodoCount,
      todayReminderCount,
      weeklyQuotationCount,
      pendingInspectionLinkCount,
      monthlyWonCount: 0,
      customerCount,
      productCount,
      quotationCount,
      pendingWeeklyReport,
      dashboardWeeklyReport: {
        needsAttention:
          weeklyReportDisplayStatus === "OVERDUE" ||
          !currentWeekReport ||
          currentWeekReport.status === WeeklyReportStatus.DRAFT ||
          currentWeekReport.status === WeeklyReportStatus.RETURNED,
        status: currentWeekReport?.status ?? "MISSING",
        displayStatus: weeklyReportDisplayStatus,
        weekStartDate: currentWeekStart,
        weekEndDate: currentWeekEnd,
        href: "/work-management/weekly-reports",
        openReviewCount: currentWeekReport
          ? currentWeekReport.reviewItems.filter(
              (item) => item.status !== WeeklyPlanReviewStatus.COMPLETED,
            ).length
          : 0,
        planItemCount: currentWeekReport?.planItems.length ?? 0,
        reportId: currentWeekReport?.id ?? null,
      },
      pendingApprovalCount:
        currentUser.roleCode === "SUPER_ADMIN" || currentUser.roleCode === "ADMIN"
          ? await this.prisma.approvalRequest.count({
              where: { status: ApprovalStatus.PENDING }
            })
          : (await this.approvalService.listPendingForRoleCodes([currentUser.roleCode], 50)).length,
      recentCustomers,
      recentFiles,
      recentOperations,
      recentNotifications,
      recentQuotations: recentQuotations.map((quotation) => ({
        id: quotation.id,
        quotationNo: quotation.quotationNo,
        type: quotation.quotationType,
        status: quotation.status,
        totalAmount: Number(quotation.totalDiscountedAmount).toFixed(2),
        updatedAt: quotation.updatedAt,
        createdAt: quotation.createdAt,
        customer: {
          id: quotation.customer.id,
          name: quotation.customer.customerName
        }
      }))
    };
  }
}
