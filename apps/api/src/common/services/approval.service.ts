import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ApprovalRuleType,
  ApprovalStatus,
  Prisma,
  RecordDataScope,
  UserStatus,
} from "@prisma/client";
import type { AuthenticatedUser } from "../types/authenticated-user";
import { PrismaService } from "../../prisma/prisma.service";
import { REAL_PARTITION_KEY } from "./record-partition.service";
import { NotificationService } from "../../modules/notifications/notification.service";

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return Number(value ?? 0);
}

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async syncQuotationApprovals(quotationId: string, requester: AuthenticatedUser) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId }
    });

    if (!quotation) {
      throw new NotFoundException("报价不存在");
    }

    const discountRate = this.calculateDiscountRate(
      quotation.totalOriginalAmount,
      quotation.totalDiscountedAmount
    );

    if (!this.isRealQuotation(quotation)) {
      await this.resetQuotationApprovalsForNonRealData(quotationId);

      return {
        approvalStatus: ApprovalStatus.NOT_REQUIRED,
        discountRate
      };
    }

    const discountRule = await this.prisma.approvalRule.findUnique({
      where: { code: ApprovalRuleType.DISCOUNT }
    });

    if (!discountRule?.enabled) {
      await this.prisma.quotation.update({
        where: { id: quotationId },
        data: { approvalStatus: ApprovalStatus.NOT_REQUIRED }
      });

      return {
        approvalStatus: ApprovalStatus.NOT_REQUIRED,
        discountRate
      };
    }

    const config = (discountRule.configJson ?? {}) as Record<string, unknown>;
    const autoApproveMax = Number(config.autoApproveMax ?? 5);
    const managerApproveMax = Number(config.managerApproveMax ?? 15);
    let requiredRoleCode: string | null = null;

    if (discountRate > managerApproveMax) {
      requiredRoleCode = String(config.secondApproverRoleCode ?? "ADMIN");
    } else if (discountRate > autoApproveMax) {
      requiredRoleCode = String(config.firstApproverRoleCode ?? "SALES_MANAGER");
    }

    if (!requiredRoleCode) {
      await this.prisma.approvalRequest.updateMany({
        where: {
          quotationId,
          type: ApprovalRuleType.DISCOUNT,
          status: ApprovalStatus.PENDING
        },
        data: {
          status: ApprovalStatus.APPROVED,
          actorUserId: requester.id,
          decisionRemark: "命中自动通过区间",
          decidedAt: new Date()
        }
      });

      await this.prisma.quotation.update({
        where: { id: quotationId },
        data: {
          approvalStatus: ApprovalStatus.NOT_REQUIRED
        }
      });

      return {
        approvalStatus: ApprovalStatus.NOT_REQUIRED,
        discountRate
      };
    }

    const approvalRequest = await this.createOrRefreshRequest({
      quotationId,
      type: ApprovalRuleType.DISCOUNT,
      requesterUserId: requester.id,
      requiredRoleCode,
      title: "报价折扣审批",
      summary: `报价 ${quotation.quotationNo} 折扣 ${discountRate.toFixed(1)}%，需要 ${requiredRoleCode} 审批`
    });

    if (approvalRequest?.created) {
      await this.notifyApprovalCreated(approvalRequest.request);
    }

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        approvalStatus: ApprovalStatus.PENDING
      }
    });

    return {
      approvalStatus: ApprovalStatus.PENDING,
      discountRate,
      requiredRoleCode
    };
  }

  async ensureQuotationExportable(quotationId: string, requester: AuthenticatedUser) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId }
    });

    if (!quotation) {
      throw new NotFoundException("报价不存在");
    }

    if (!this.isRealQuotation(quotation)) {
      await this.resetQuotationApprovalsForNonRealData(quotationId);
      return quotation;
    }

    if (quotation.approvalStatus === ApprovalStatus.PENDING) {
      throw new ForbiddenException("当前报价仍在折扣审批中，审批通过后才可导出");
    }

    if (quotation.approvalStatus === ApprovalStatus.REJECTED) {
      throw new ForbiddenException("当前报价审批未通过，无法导出");
    }

    const exportRule = await this.prisma.approvalRule.findUnique({
      where: { code: ApprovalRuleType.EXPORT_QUOTATION }
    });

    if (!exportRule?.enabled) {
      return quotation;
    }

    const config = (exportRule.configJson ?? {}) as Record<string, unknown>;
    const scope = String(config.scope ?? "discount_sensitive_only");
    const discountRate = this.calculateDiscountRate(
      quotation.totalOriginalAmount,
      quotation.totalDiscountedAmount
    );
    const needsExportApproval =
      scope === "all" || (scope === "discount_sensitive_only" && discountRate > 0);

    if (!needsExportApproval) {
      if (quotation.exportApprovalStatus !== ApprovalStatus.NOT_REQUIRED) {
        await this.prisma.quotation.update({
          where: { id: quotationId },
          data: { exportApprovalStatus: ApprovalStatus.NOT_REQUIRED }
        });
      }

      return quotation;
    }

    if (quotation.exportApprovalStatus === ApprovalStatus.APPROVED) {
      return quotation;
    }

    const requiredRoleCode = String(config.approverRoleCode ?? "SALES_MANAGER");

    const approvalRequest = await this.createOrRefreshRequest({
      quotationId,
      type: ApprovalRuleType.EXPORT_QUOTATION,
      requesterUserId: requester.id,
      requiredRoleCode,
      title: "正式报价导出审批",
      summary: `报价 ${quotation.quotationNo} 导出 PDF 前需要 ${requiredRoleCode} 审批`
    });

    if (approvalRequest?.created) {
      await this.notifyApprovalCreated(approvalRequest.request);
    }

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { exportApprovalStatus: ApprovalStatus.PENDING }
    });

    throw new ForbiddenException("正式报价导出已提交审批，请审批通过后再导出 PDF");
  }

  async reviewQuotationRequest(
    quotationId: string,
    type: ApprovalRuleType,
    decision: "approve" | "reject",
    actor: AuthenticatedUser,
    remark?: string
  ) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: {
        quotationId,
        type,
        status: ApprovalStatus.PENDING,
        quotation: {
          is: {
            dataScope: RecordDataScope.REAL,
            partitionKey: REAL_PARTITION_KEY,
            testBatchId: null
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!request) {
      throw new NotFoundException("当前没有待处理的审批记录");
    }

    if (
      actor.roleCode !== "SUPER_ADMIN" &&
      request.requiredRoleCode &&
      request.requiredRoleCode !== actor.roleCode
    ) {
      throw new ForbiddenException("当前角色无法处理这条审批");
    }

    const nextStatus = decision === "approve" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          actorUserId: actor.id,
          decisionRemark: remark,
          decidedAt: new Date()
        }
      }),
      this.prisma.quotation.update({
        where: { id: quotationId },
        data:
          type === ApprovalRuleType.DISCOUNT
            ? { approvalStatus: nextStatus }
            : { exportApprovalStatus: nextStatus }
      })
    ]);

    await this.notifyApprovalDecision(updatedRequest);

    return {
      requestId: request.id,
      status: nextStatus
    };
  }

  async listPendingForRoleCodes(roleCodes: string[], take = 8) {
    return this.prisma.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        OR: [{ requiredRoleCode: { in: roleCodes } }, { requiredRoleCode: null }],
        quotation: {
          is: {
            dataScope: RecordDataScope.REAL,
            partitionKey: REAL_PARTITION_KEY,
            testBatchId: null
          }
        }
      },
      include: {
        requester: {
          include: { role: true }
        },
        quotation: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take
    });
  }

  private async createOrRefreshRequest(input: {
    quotationId: string;
    type: ApprovalRuleType;
    requesterUserId: string;
    requiredRoleCode: string;
    title: string;
    summary: string;
  }) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: input.quotationId }
    });

    if (!quotation) {
      throw new NotFoundException("报价不存在");
    }

    if (!this.isRealQuotation(quotation)) {
      return null;
    }

    const existingRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        quotationId: input.quotationId,
        type: input.type,
        status: ApprovalStatus.PENDING
      }
    });

    if (existingRequest) {
      const request = await this.prisma.approvalRequest.update({
        where: { id: existingRequest.id },
        data: {
          requiredRoleCode: input.requiredRoleCode,
          title: input.title,
          summary: input.summary
        }
      });

      return { request, created: false };
    }

    const request = await this.prisma.approvalRequest.create({
      data: {
        type: input.type,
        targetType: "Quotation",
        targetId: input.quotationId,
        quotationId: input.quotationId,
        requesterUserId: input.requesterUserId,
        requiredRoleCode: input.requiredRoleCode,
        title: input.title,
        summary: input.summary
      }
    });

    return { request, created: true };
  }

  private async notifyApprovalCreated(request: {
    id: string;
    requesterUserId: string;
    requiredRoleCode: string | null;
    title: string;
    summary: string | null;
    targetType: string;
    targetId: string;
  }) {
    const approvers = await this.findApprovalRecipients(request.requiredRoleCode);
    const recipientUserIds = approvers
      .map((user) => user.id)
      .filter((userId) => userId !== request.requesterUserId);

    if (!recipientUserIds.length) {
      return;
    }

    await this.notificationService.deliverManyEventsSystemAndWecom(
      recipientUserIds.map((userId) => ({
        userId,
        type: "APPROVAL_REQUEST_CREATED",
        title: request.title,
        content: request.summary ?? "有新的审批申请待处理。",
        relatedType: request.targetType.toUpperCase(),
        relatedId: request.targetId,
      })),
    );
  }

  private async notifyApprovalDecision(request: {
    id: string;
    requesterUserId: string;
    title: string;
    summary: string | null;
    status: ApprovalStatus;
    targetType: string;
    targetId: string;
    decisionRemark: string | null;
  }) {
    const statusText = request.status === ApprovalStatus.APPROVED ? "已通过" : "已驳回";

    await this.notificationService.deliverEventSystemAndWecom({
      userId: request.requesterUserId,
      type: "APPROVAL_REQUEST_DECIDED",
      title: `审批${statusText}`,
      content: [
        `${request.title}${statusText}`,
        request.summary,
        request.decisionRemark ? `备注：${request.decisionRemark}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      relatedType: request.targetType.toUpperCase(),
      relatedId: request.targetId,
    });
  }

  private async findApprovalRecipients(requiredRoleCode: string | null) {
    if (requiredRoleCode) {
      return this.prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          role: {
            is: {
              code: requiredRoleCode,
            },
          },
        },
        select: { id: true },
      });
    }

    return this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        role: {
          is: {
            code: {
              in: ["SUPER_ADMIN", "ADMIN"],
            },
          },
        },
      },
      select: { id: true },
    });
  }

  private calculateDiscountRate(
    totalOriginalAmount: Prisma.Decimal | number | string,
    totalDiscountedAmount: Prisma.Decimal | number | string
  ) {
    const original = toNumber(totalOriginalAmount);
    const discounted = toNumber(totalDiscountedAmount);

    if (original <= 0) {
      return 0;
    }

    return ((original - discounted) / original) * 100;
  }

  private isRealQuotation(input: {
    dataScope: RecordDataScope;
    partitionKey: string;
    testBatchId: string | null;
  }) {
    return (
      input.dataScope === RecordDataScope.REAL &&
      input.partitionKey === REAL_PARTITION_KEY &&
      input.testBatchId === null
    );
  }

  private async resetQuotationApprovalsForNonRealData(quotationId: string) {
    await this.prisma.$transaction([
      this.prisma.approvalRequest.deleteMany({
        where: { quotationId }
      }),
      this.prisma.quotation.update({
        where: { id: quotationId },
        data: {
          approvalStatus: ApprovalStatus.NOT_REQUIRED,
          exportApprovalStatus: ApprovalStatus.NOT_REQUIRED
        }
      })
    ]);
  }
}
