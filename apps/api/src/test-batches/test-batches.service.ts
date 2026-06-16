import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TestBatchStatus } from "@prisma/client";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTestBatchDto } from "./dto/test-batch.dto";

function buildTestBatchCode() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TB-${date}-${time}-${random}`;
}

@Injectable()
export class TestBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly auditService: AuditService,
  ) {}

  async list(currentUser: AuthenticatedUser) {
    this.assertManageAllowed(currentUser);
    const batches = await this.prisma.testBatch.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const items = await Promise.all(
      batches.map(async (batch) => ({
        id: batch.id,
        name: batch.name,
        code: batch.code,
        description: batch.description,
        status: batch.status,
        startedAt: batch.startedAt,
        closedAt: batch.closedAt,
        clearedAt: batch.clearedAt,
        createdAt: batch.createdAt,
        creator: batch.creator
          ? {
              id: batch.creator.id,
              name: batch.creator.name,
            }
          : null,
        summary: await this.buildSummary(batch.id),
      })),
    );

    return { items };
  }

  async create(dto: CreateTestBatchDto, currentUser: AuthenticatedUser) {
    this.assertManageAllowed(currentUser);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("测试批次名称不能为空");
    }

    const created = await this.prisma.testBatch.create({
      data: {
        name,
        code: buildTestBatchCode(),
        description: dto.description?.trim() || null,
        createdByUserId: currentUser.id,
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "CREATE",
      module: "测试数据",
      targetType: "TestBatch",
      targetId: created.id,
      targetName: created.name,
      content: "创建测试批次",
      afterSummary: created.code,
    });

    return {
      message: "测试批次已创建",
      batch: {
        id: created.id,
        name: created.name,
        code: created.code,
        status: created.status,
      },
    };
  }

  async close(id: string, currentUser: AuthenticatedUser) {
    this.assertManageAllowed(currentUser);
    const batch = await this.requireBatch(id);
    if (batch.clearedAt || batch.status === TestBatchStatus.CLEARED) {
      throw new BadRequestException("测试批次已清空，不能再次关闭");
    }

    const updated = await this.prisma.testBatch.update({
      where: { id },
      data: {
        status: TestBatchStatus.CLOSED,
        closedAt: batch.closedAt ?? new Date(),
      },
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "测试数据",
      targetType: "TestBatch",
      targetId: updated.id,
      targetName: updated.name,
      content: "关闭测试批次",
      afterSummary: updated.code,
    });

    return {
      message: "测试批次已关闭",
      batch: {
        id: updated.id,
        status: updated.status,
        closedAt: updated.closedAt,
      },
    };
  }

  async clear(id: string, currentUser: AuthenticatedUser) {
    this.assertManageAllowed(currentUser);
    const batch = await this.requireBatch(id);
    if (batch.clearedAt || batch.status === TestBatchStatus.CLEARED) {
      throw new BadRequestException("该测试批次已经清空");
    }

    const summary = await this.buildSummary(id);
    const taskIds = await this.prisma.task.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const weeklyReportIds = await this.prisma.weeklyReport.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const monthlyGoalIds = await this.prisma.monthlyGoal.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const inspectionOrderIds = await this.prisma.inspectionOrder.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const inspectionSampleIds = await this.prisma.inspectionSample.findMany({
      where: { orderId: { in: inspectionOrderIds.map((item) => item.id) } },
      select: { id: true },
    });
    const salesOrderIds = await this.prisma.salesOrder.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const salesOrderItemIds = await this.prisma.salesOrderItem.findMany({
      where: { orderId: { in: salesOrderIds.map((item) => item.id) } },
      select: { id: true },
    });
    const shipmentIds = await this.prisma.shipmentRecord.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const paymentIds = await this.prisma.paymentRecord.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const settlementIds = await this.prisma.channelSettlement.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const quotationIds = await this.prisma.quotation.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const agriculturePlanIds = await this.prisma.agriculturePlan.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const customerIds = await this.prisma.customer.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const contractIds = await this.prisma.contract.findMany({
      where: { testBatchId: id },
      select: { id: true },
    });
    const folderRows = await this.prisma.fileFolder.findMany({
      where: { testBatchId: id },
      select: { id: true, parentId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (taskIds.length) {
        await tx.discussionComment.deleteMany({
          where: {
            relatedType: "TASK",
            relatedId: { in: taskIds.map((item) => item.id) },
          },
        });
        await tx.taskComment.deleteMany({
          where: {
            taskId: { in: taskIds.map((item) => item.id) },
          },
        });
      }

      if (weeklyReportIds.length) {
        await tx.discussionComment.deleteMany({
          where: {
            relatedType: "WEEKLY_REPORT",
            relatedId: { in: weeklyReportIds.map((item) => item.id) },
          },
        });
        await tx.weeklyReportPlanItem.deleteMany({
          where: {
            reportId: { in: weeklyReportIds.map((item) => item.id) },
          },
        });
        await tx.weeklyReportReviewItem.deleteMany({
          where: {
            reportId: { in: weeklyReportIds.map((item) => item.id) },
          },
        });
      }

      if (monthlyGoalIds.length) {
        await tx.discussionComment.deleteMany({
          where: {
            relatedType: "MONTHLY_GOAL",
            relatedId: { in: monthlyGoalIds.map((item) => item.id) },
          },
        });
        await tx.monthlyGoalItem.deleteMany({
          where: {
            monthlyGoalId: { in: monthlyGoalIds.map((item) => item.id) },
          },
        });
      }

      if (inspectionSampleIds.length) {
        await tx.inspectionSampleItem.deleteMany({
          where: {
            sampleId: { in: inspectionSampleIds.map((item) => item.id) },
          },
        });
      }
      if (inspectionOrderIds.length) {
        await tx.inspectionTimeline.deleteMany({
          where: {
            orderId: { in: inspectionOrderIds.map((item) => item.id) },
          },
        });
        await tx.inspectionPayment.deleteMany({
          where: {
            orderId: { in: inspectionOrderIds.map((item) => item.id) },
          },
        });
        await tx.inspectionSample.deleteMany({
          where: {
            orderId: { in: inspectionOrderIds.map((item) => item.id) },
          },
        });
      }

      if (settlementIds.length || salesOrderIds.length || salesOrderItemIds.length) {
        await tx.channelSettlementItem.deleteMany({
          where: {
            OR: [
              settlementIds.length
                ? { settlementId: { in: settlementIds.map((item) => item.id) } }
                : undefined,
              salesOrderIds.length
                ? { orderId: { in: salesOrderIds.map((item) => item.id) } }
                : undefined,
              salesOrderItemIds.length
                ? { orderItemId: { in: salesOrderItemIds.map((item) => item.id) } }
                : undefined,
            ].filter(Boolean) as any,
          },
        });
      }

      if (shipmentIds.length || salesOrderItemIds.length) {
        await tx.shipmentItem.deleteMany({
          where: {
            OR: [
              shipmentIds.length
                ? { shipmentId: { in: shipmentIds.map((item) => item.id) } }
                : undefined,
              salesOrderItemIds.length
                ? { orderItemId: { in: salesOrderItemIds.map((item) => item.id) } }
                : undefined,
            ].filter(Boolean) as any,
          },
        });
      }

      if (quotationIds.length || customerIds.length) {
        await tx.approvalRequest.deleteMany({
          where: {
            OR: [
              quotationIds.length
                ? { quotationId: { in: quotationIds.map((item) => item.id) } }
                : undefined,
              customerIds.length
                ? {
                    targetType: "Customer",
                    targetId: { in: customerIds.map((item) => item.id) },
                  }
                : undefined,
              quotationIds.length
                ? {
                    targetType: "Quotation",
                    targetId: { in: quotationIds.map((item) => item.id) },
                  }
                : undefined,
            ].filter(Boolean) as any,
          },
        });
      }

      if (taskIds.length) {
        await tx.task.deleteMany({
          where: { id: { in: taskIds.map((item) => item.id) } },
        });
      }

      if (salesOrderIds.length) {
        await tx.paymentRecord.deleteMany({
          where: { id: { in: paymentIds.map((item) => item.id) } },
        });
        await tx.shipmentRecord.deleteMany({
          where: { id: { in: shipmentIds.map((item) => item.id) } },
        });
        await tx.channelSettlement.deleteMany({
          where: { id: { in: settlementIds.map((item) => item.id) } },
        });
        await tx.salesOrderItem.deleteMany({
          where: { orderId: { in: salesOrderIds.map((item) => item.id) } },
        });
        await tx.salesOrder.deleteMany({
          where: { id: { in: salesOrderIds.map((item) => item.id) } },
        });
      }

      if (agriculturePlanIds.length) {
        await tx.agriculturePlan.deleteMany({
          where: { id: { in: agriculturePlanIds.map((item) => item.id) } },
        });
      }
      if (quotationIds.length) {
        await tx.quotationItem.deleteMany({
          where: { quotationId: { in: quotationIds.map((item) => item.id) } },
        });
        await tx.quotation.deleteMany({
          where: { id: { in: quotationIds.map((item) => item.id) } },
        });
      }
      if (contractIds.length) {
        await tx.contract.deleteMany({
          where: { id: { in: contractIds.map((item) => item.id) } },
        });
      }
      if (customerIds.length) {
        await tx.customerFollowup.deleteMany({
          where: { customerId: { in: customerIds.map((item) => item.id) } },
        });
        await tx.customer.deleteMany({
          where: { id: { in: customerIds.map((item) => item.id) } },
        });
      }

      await tx.fileRecord.deleteMany({
        where: { testBatchId: id },
      });

      const foldersById = new Map(folderRows.map((item) => [item.id, item]));
      const folderDepth = (folderId: string) => {
        let depth = 0;
        let pointer = foldersById.get(folderId)?.parentId ?? null;
        while (pointer) {
          depth += 1;
          pointer = foldersById.get(pointer)?.parentId ?? null;
        }
        return depth;
      };

      for (const folder of [...folderRows].sort((left, right) => folderDepth(right.id) - folderDepth(left.id))) {
        await tx.fileFolder.deleteMany({
          where: { id: folder.id },
        });
      }

      if (weeklyReportIds.length) {
        await tx.weeklyReport.deleteMany({
          where: { id: { in: weeklyReportIds.map((item) => item.id) } },
        });
      }
      if (monthlyGoalIds.length) {
        await tx.monthlyGoal.deleteMany({
          where: { id: { in: monthlyGoalIds.map((item) => item.id) } },
        });
      }
      if (inspectionOrderIds.length) {
        await tx.inspectionOrder.deleteMany({
          where: { id: { in: inspectionOrderIds.map((item) => item.id) } },
        });
      }
      await tx.channelPartner.deleteMany({
        where: { testBatchId: id },
      });

      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { targetType: "Customer", targetId: { in: customerIds.map((item) => item.id) } },
            { targetType: "Quotation", targetId: { in: quotationIds.map((item) => item.id) } },
            { targetType: "SalesOrder", targetId: { in: salesOrderIds.map((item) => item.id) } },
            { targetType: "Task", targetId: { in: taskIds.map((item) => item.id) } },
            { targetType: "WeeklyReport", targetId: { in: weeklyReportIds.map((item) => item.id) } },
            { targetType: "MonthlyGoal", targetId: { in: monthlyGoalIds.map((item) => item.id) } },
            { targetType: "InspectionOrder", targetId: { in: inspectionOrderIds.map((item) => item.id) } },
          ],
        },
      });

      await tx.notification.deleteMany({
        where: {
          OR: [
            { relatedType: "TASK", relatedId: { in: taskIds.map((item) => item.id) } },
            { relatedType: "WEEKLY_REPORT", relatedId: { in: weeklyReportIds.map((item) => item.id) } },
            { relatedType: "MONTHLY_GOAL", relatedId: { in: monthlyGoalIds.map((item) => item.id) } },
          ],
        },
      });

      await tx.testBatch.update({
        where: { id },
        data: {
          status: TestBatchStatus.CLEARED,
          closedAt: batch.closedAt ?? new Date(),
          clearedAt: new Date(),
        },
      });
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "DELETE",
      module: "测试数据",
      targetType: "TestBatch",
      targetId: batch.id,
      targetName: batch.name,
      content: "清空测试批次",
      afterSummary: JSON.stringify(summary),
    });

    return {
      message: "测试批次已清空",
      summary,
    };
  }

  private async requireBatch(id: string) {
    const batch = await this.prisma.testBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      throw new NotFoundException("测试批次不存在");
    }

    return batch;
  }

  private assertManageAllowed(currentUser: AuthenticatedUser) {
    this.accessControl.assertPermission(
      currentUser,
      "menu.management",
      "当前账号无权管理测试数据",
    );
  }

  private async buildSummary(batchId: string) {
    const [
      customers,
      quotations,
      agriculturePlans,
      contracts,
      salesOrders,
      payments,
      shipments,
      channelPartners,
      settlements,
      tasks,
      weeklyReports,
      monthlyGoals,
      inspections,
      fileFolders,
      files,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { testBatchId: batchId } }),
      this.prisma.quotation.count({ where: { testBatchId: batchId } }),
      this.prisma.agriculturePlan.count({ where: { testBatchId: batchId } }),
      this.prisma.contract.count({ where: { testBatchId: batchId } }),
      this.prisma.salesOrder.count({ where: { testBatchId: batchId } }),
      this.prisma.paymentRecord.count({ where: { testBatchId: batchId } }),
      this.prisma.shipmentRecord.count({ where: { testBatchId: batchId } }),
      this.prisma.channelPartner.count({ where: { testBatchId: batchId } }),
      this.prisma.channelSettlement.count({ where: { testBatchId: batchId } }),
      this.prisma.task.count({ where: { testBatchId: batchId } }),
      this.prisma.weeklyReport.count({ where: { testBatchId: batchId } }),
      this.prisma.monthlyGoal.count({ where: { testBatchId: batchId } }),
      this.prisma.inspectionOrder.count({ where: { testBatchId: batchId } }),
      this.prisma.fileFolder.count({ where: { testBatchId: batchId } }),
      this.prisma.fileRecord.count({ where: { testBatchId: batchId } }),
    ]);

    return {
      customers,
      quotations,
      agriculturePlans,
      contracts,
      salesOrders,
      payments,
      shipments,
      channelPartners,
      settlements,
      tasks,
      weeklyReports,
      monthlyGoals,
      inspections,
      fileFolders,
      files,
      total:
        customers +
        quotations +
        agriculturePlans +
        contracts +
        salesOrders +
        payments +
        shipments +
        channelPartners +
        settlements +
        tasks +
        weeklyReports +
        monthlyGoals +
        inspections +
        fileFolders +
        files,
    };
  }
}
