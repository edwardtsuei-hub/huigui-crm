import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { QuotationStatus, QuotationType } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { previewAgriculturePlan, PRICE_PER_BUCKET } from "../agriculture-engine";
import { PrismaService } from "../prisma/prisma.service";
import { CalculateAgriculturePlanDto, CreateAgriculturePlanDto } from "./dto/agriculture-plan.dto";

function buildQuotationNo() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AGR-${date}-${suffix}`;
}

@Injectable()
export class AgriculturePlansService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(user: AuthenticatedUser) {
    return user.roleCode === "STAFF";
  }

  private async ensureCustomerAccessible(customerId: string, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    if (this.isStaff(user) && customer.ownerUserId !== user.id) {
      throw new ForbiddenException("无权为该客户创建农业方案");
    }

    return customer;
  }

  calculate(dto: CalculateAgriculturePlanDto) {
    return previewAgriculturePlan({
      planName: "农业生态种植方案",
      discountType: (dto.discountType as "percentage" | "perBucket") || "percentage",
      discountValue: dto.discountValue ?? 0,
      discountReason: dto.discountReason,
      remark: dto.remark,
      crops: dto.crops.map((crop) => ({
        cropName: crop.cropName,
        manualCropType: crop.manualCropType as any,
        areaMu: crop.areaMu,
        startDate: crop.startDate,
        actualCycleDays: crop.actualCycleDays,
        stage: crop.stage,
        isOrganic: crop.isOrganic,
        needGC: crop.needGC,
        gcWaterLiters: crop.gcWaterLiters ?? 0
      }))
    });
  }

  async create(dto: CreateAgriculturePlanDto, user: AuthenticatedUser) {
    const customer = await this.ensureCustomerAccessible(dto.customerId, user);
    const preview = this.calculate(dto);

    if (preview.unresolvedCount > 0) {
      throw new ForbiddenException("存在未识别作物，请先手动修正类别");
    }

    const quotationNo = buildQuotationNo();

    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          quotationNo,
          customerId: customer.id,
          industryGroupId: customer.industryGroupId,
          quotationType: QuotationType.AGRICULTURE,
          totalOriginalAmount: preview.totals.totalOriginal,
          totalDiscountedAmount: preview.totals.totalDiscounted,
          discountType: preview.discountType,
          discountValue: dto.discountValue ?? 0,
          discountReason: dto.discountReason,
          remark: dto.remark,
          creatorUserId: user.id,
          status: QuotationStatus.GENERATED
        }
      });

      await tx.quotationItem.createMany({
        data: preview.quoteItems.map((item) => ({
          quotationId: quotation.id,
          itemName: item.displayName,
          quantity: item.bucketCount,
          unitPrice: preview.perBucketPrice,
          originalAmount: item.bucketCount * PRICE_PER_BUCKET,
          discountedAmount: item.lineTotal,
          detailJson: item as any
        }))
      });

      const agriculturePlan = await tx.agriculturePlan.create({
        data: {
          quotationId: quotation.id,
          customerId: customer.id,
          totalOriginalAmount: preview.totals.totalOriginal,
          totalDiscountedAmount: preview.totals.totalDiscounted,
          detailJson: {
            ...preview,
            input: dto
          } as any
        }
      });

      return {
        agriculturePlanId: agriculturePlan.id,
        quotationId: quotation.id,
        quotationNo: quotation.quotationNo
      };
    });
  }

  async getById(id: string, user: AuthenticatedUser) {
    const plan = await this.prisma.agriculturePlan.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: {
          include: {
            items: true,
            creator: { include: { role: true } }
          }
        }
      }
    });

    if (!plan) {
      throw new NotFoundException("农业方案不存在");
    }

    if (this.isStaff(user) && plan.customer.ownerUserId !== user.id) {
      throw new ForbiddenException("无权查看该农业方案");
    }

    return plan;
  }
}
