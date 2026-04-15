import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ProductStatus, QuotationStatus, QuotationType } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import {
  CalculateGeneralQuoteDto,
  CreateGeneralQuoteDto
} from "./dto/general-quote.dto";

function round2(value: number) {
  return Number(value.toFixed(2));
}

function formatMoney(value: number | string | { toString(): string } | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function buildQuotationNo() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GEN-${date}-${suffix}`;
}

@Injectable()
export class GeneralQuotesService {
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
      throw new ForbiddenException("无权为该客户创建报价");
    }

    return customer;
  }

  private computeDiscountAmount(subtotal: number, discountType?: string, discountValue?: number) {
    const safeValue = Number(discountValue ?? 0);

    if (!safeValue) {
      return 0;
    }

    if (discountType === "percentage") {
      return round2((subtotal * safeValue) / 100);
    }

    return round2(Math.min(safeValue, subtotal));
  }

  async calculate(dto: CalculateGeneralQuoteDto) {
    if (!dto.products.length) {
      throw new ForbiddenException("请至少选择一个产品");
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: dto.products.map((item) => item.productId) },
        status: ProductStatus.ENABLED,
        quoteEnabled: true
      },
      include: {
        industryGroup: true,
        industrySubgroup: true
      }
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    const items = dto.products.map((entry) => {
      const product = productMap.get(entry.productId);

      if (!product) {
        throw new NotFoundException("存在不可报价的产品，请刷新后重试");
      }

      const quantity = Number(entry.quantity);
      const unitPrice = Number(product.salePrice ?? 0);
      const originalAmount = round2(quantity * unitPrice);

      return {
        productId: product.id,
        itemName: product.displayName,
        displayName: product.displayName,
        specification: product.spec,
        unit: product.unit,
        quantity,
        unitPrice,
        originalAmount,
        discountedAmount: originalAmount,
        lineTotal: originalAmount,
        note: entry.remark,
        detailJson: {
          productName: product.name,
          industryGroupId: product.industryGroupId,
          industrySubgroupId: product.industrySubgroupId
        }
      };
    });

    const subtotal = round2(items.reduce((sum, item) => sum + item.originalAmount, 0));
    const discountAmount = this.computeDiscountAmount(
      subtotal,
      dto.discountType,
      dto.discountValue
    );
    const totalAmount = round2(Math.max(subtotal - discountAmount, 0));

    let assignedDiscount = 0;
    const discountedItems = items.map((item, index) => {
      const itemDiscount =
        index === items.length - 1
          ? round2(discountAmount - assignedDiscount)
          : round2(subtotal === 0 ? 0 : (discountAmount * item.originalAmount) / subtotal);

      assignedDiscount = round2(assignedDiscount + itemDiscount);
      const discountedAmount = round2(Math.max(item.originalAmount - itemDiscount, 0));

      return {
        ...item,
        discountedAmount,
        lineTotal: discountedAmount
      };
    });

    return {
      customerId: dto.customerId,
      industryGroupId: dto.industryGroupId,
      items: discountedItems,
      subtotal,
      totalOriginalAmount: subtotal,
      discountType: dto.discountType ?? "amount",
      discountValue: dto.discountValue ?? 0,
      discountAmount,
      totalAmount,
      totalDiscountedAmount: totalAmount,
      discountReason: dto.discountReason,
      remark: dto.remark
    };
  }

  async create(dto: CreateGeneralQuoteDto, user: AuthenticatedUser) {
    const customer = await this.ensureCustomerAccessible(dto.customerId, user);
    const preview = await this.calculate(dto);
    const quotationNo = buildQuotationNo();
    const targetIndustryGroupId = dto.industryGroupId ?? customer.industryGroupId;
    const industryGroup = targetIndustryGroupId
      ? await this.prisma.industryGroup.findUnique({
          where: { id: targetIndustryGroupId }
        })
      : null;

    const quotationType =
      industryGroup?.name === "工业"
        ? QuotationType.INDUSTRY
        : industryGroup?.name === "服务业"
          ? QuotationType.SERVICE
          : industryGroup?.name === "养殖业"
            ? QuotationType.BREEDING
            : QuotationType.GENERAL;

    const quotation = await this.prisma.$transaction(async (tx) => {
      const createdQuotation = await tx.quotation.create({
        data: {
          quotationNo,
          customerId: customer.id,
          industryGroupId: targetIndustryGroupId,
          quotationType,
          totalOriginalAmount: preview.totalOriginalAmount,
          totalDiscountedAmount: preview.totalDiscountedAmount,
          discountType: preview.discountType,
          discountValue: preview.discountValue,
          discountReason: preview.discountReason,
          remark: preview.remark,
          creatorUserId: user.id,
          status: QuotationStatus.GENERATED
        }
      });

      await tx.quotationItem.createMany({
        data: preview.items.map((item) => ({
          quotationId: createdQuotation.id,
          productId: item.productId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          originalAmount: item.originalAmount,
          discountedAmount: item.discountedAmount,
          detailJson: {
            displayName: item.displayName,
            specification: item.specification,
            unit: item.unit,
            note: item.note,
            ...item.detailJson
          }
        }))
      });

      return createdQuotation;
    });

    return {
      id: quotation.id,
      quotationId: quotation.id,
      quotationNo: quotation.quotationNo
    };
  }

  async getById(id: string, user: AuthenticatedUser) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true
      }
    });

    if (!quotation) {
      throw new NotFoundException("报价不存在");
    }

    if (
      this.isStaff(user) &&
      quotation.creatorUserId !== user.id &&
      quotation.customer.ownerUserId !== user.id
    ) {
      throw new ForbiddenException("无权查看该通用报价");
    }

    return {
      id: quotation.id,
      quotationNo: quotation.quotationNo,
      type: quotation.quotationType,
      totalOriginalAmount: formatMoney(quotation.totalOriginalAmount),
      totalDiscountedAmount: formatMoney(quotation.totalDiscountedAmount)
    };
  }
}
