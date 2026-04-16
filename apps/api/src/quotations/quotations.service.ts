import { Injectable, NotFoundException } from "@nestjs/common";
import PDFDocument from "pdfkit";
import fs from "fs";
import { ApprovalRuleType, ApprovalStatus, QuotationType } from "@prisma/client";
import type { Response } from "express";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { ApprovalService } from "../common/services/approval.service";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";

function formatMoney(value: any) {
  return Number(value || 0).toFixed(2);
}

function resolvePdfFontPath() {
  const candidates = [
    process.env.PDF_FONT_PATH,
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
  ].filter(Boolean) as string[];

  return candidates.find((fontPath) => fs.existsSync(fontPath)) ?? null;
}

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly approvalService: ApprovalService,
    private readonly auditService: AuditService
  ) {}

  private serializeQuotation(quotation: any) {
    const totalOriginalAmount = Number(quotation.totalOriginalAmount || 0);
    const totalDiscountedAmount = Number(quotation.totalDiscountedAmount || 0);
    const discountRate =
      totalOriginalAmount > 0
        ? (((totalOriginalAmount - totalDiscountedAmount) / totalOriginalAmount) * 100).toFixed(1)
        : "0.0";

    return {
      ...quotation,
      type: quotation.quotationType,
      subtotal: formatMoney(quotation.totalOriginalAmount),
      discountAmount: formatMoney(
        Number(quotation.totalOriginalAmount || 0) - Number(quotation.totalDiscountedAmount || 0)
      ),
      totalAmount: formatMoney(quotation.totalDiscountedAmount),
      customer: quotation.customer
        ? {
            ...quotation.customer,
            name: quotation.customer.customerName
          }
        : quotation.customer,
      creator: quotation.creator
        ? {
            ...quotation.creator,
            displayName: quotation.creator.name
          }
        : quotation.creator,
      items: Array.isArray(quotation.items)
        ? quotation.items.map((item: any) => ({
            ...item,
            displayName:
              (item.detailJson as Record<string, any> | null)?.displayName ?? item.itemName,
            specification:
              (item.detailJson as Record<string, any> | null)?.specification ?? null,
            unit: (item.detailJson as Record<string, any> | null)?.unit ?? null,
            lineTotal: formatMoney(item.discountedAmount),
            note: (item.detailJson as Record<string, any> | null)?.note ?? null,
            quantity: formatMoney(item.quantity),
            unitPrice: formatMoney(item.unitPrice),
            originalAmount: formatMoney(item.originalAmount),
            discountedAmount: formatMoney(item.discountedAmount)
          }))
        : [],
      agriculturePlan: quotation.agriculturePlan
        ? {
            ...quotation.agriculturePlan,
            planName:
              (quotation.agriculturePlan.detailJson as Record<string, any>)?.planName ??
              "农业生态种植方案",
            plantingMode:
              ((quotation.agriculturePlan.detailJson as Record<string, any>)?.crops as
                | Array<Record<string, any>>
                | undefined)?.every((crop) => crop.isOrganic)
                ? "organic"
                : "conventional",
            cropSummary:
              ((quotation.agriculturePlan.detailJson as Record<string, any>)?.crops as
                | Array<Record<string, any>>
                | undefined)
                ?.map((crop) => crop.cropName)
                .join("、") ?? "",
            useGc:
              ((quotation.agriculturePlan.detailJson as Record<string, any>)?.crops as
                | Array<Record<string, any>>
                | undefined)?.some((crop) => crop.needGC) ?? false,
            gcWaterAmount: String(
              ((quotation.agriculturePlan.detailJson as Record<string, any>)?.crops as
                | Array<Record<string, any>>
                | undefined)?.reduce(
                (sum, crop) => sum + Number(crop.gcWaterLiters ?? 0),
                0
              ) ?? 0
            )
          }
        : null,
      discountRate,
      approvalRequests: Array.isArray(quotation.approvalRequests)
        ? quotation.approvalRequests.map((request: any) => ({
            id: request.id,
            type: request.type,
            status: request.status,
            title: request.title,
            summary: request.summary,
            requiredRoleCode: request.requiredRoleCode,
            createdAt: request.createdAt
          }))
        : []
    };
  }

  async list(user: AuthenticatedUser) {
    const where = await this.accessControl.buildQuotationWhere(user);
    const items = await this.prisma.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        creator: { include: { role: true } },
        industryGroup: true,
        items: true,
        agriculturePlan: true,
        approvalRequests: {
          where: { status: ApprovalStatus.PENDING },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    return items.map((item) => this.serializeQuotation(item));
  }

  async getById(id: string, user: AuthenticatedUser) {
    const quotation = await this.prisma.quotation.findFirst({
      where: await this.accessControl.buildQuotationWhere(user, { id }),
      include: {
        customer: true,
        creator: { include: { role: true } },
        industryGroup: true,
        items: true,
        agriculturePlan: true,
        approvalRequests: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!quotation) {
      throw new NotFoundException("报价不存在或无权访问");
    }

    return this.serializeQuotation(quotation);
  }

  async streamPdf(id: string, user: AuthenticatedUser, res: Response) {
    this.accessControl.assertPermission(user, "action.quotation.export_pdf", "当前账号无权导出 PDF");
    await this.approvalService.ensureQuotationExportable(id, user);
    const quotation = await this.getById(id, user);
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const fontPath = resolvePdfFontPath();
    if (fontPath) {
      doc.font(fontPath);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${encodeURIComponent(`${quotation.quotationNo}.pdf`)}`
    );

    doc.pipe(res);
    doc.fontSize(20).text("洄归生态客户管理与报价协同系统", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(16)
      .text(quotation.quotationType === QuotationType.AGRICULTURE ? "农业方案说明书" : "报价单", {
        align: "center"
      });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`报价编号：${quotation.quotationNo}`);
    doc.text(`客户：${quotation.customer.customerName}`);
    doc.text(`创建人：${quotation.creator.name}`);
    doc.text(`创建时间：${new Date(quotation.createdAt).toLocaleString("zh-CN")}`);
    doc.moveDown();

    if (quotation.quotationType === QuotationType.AGRICULTURE && quotation.agriculturePlan) {
      const detail = quotation.agriculturePlan.detailJson as Record<string, any>;
      doc.fontSize(14).text("农业方案摘要");
      doc.fontSize(11).text(`总桶数：${detail?.totals?.totalBuckets ?? "-"}`);
      doc.text(`原价：¥${formatMoney(quotation.totalOriginalAmount)}`);
      doc.text(`优惠后：¥${formatMoney(quotation.totalDiscountedAmount)}`);
      doc.moveDown();
    }

    doc.fontSize(14).text("报价明细");
    doc.moveDown(0.5);
    quotation.items.forEach((item: any, index: number) => {
      doc
        .fontSize(11)
        .text(
          `${index + 1}. ${item.itemName} | 数量：${formatMoney(item.quantity)} | 单价：¥${formatMoney(
            item.unitPrice
          )} | 原价：¥${formatMoney(item.originalAmount)} | 优惠价：¥${formatMoney(item.discountedAmount)}`
        );
    });
    doc.moveDown();

    doc.text(`原价合计：¥${formatMoney(quotation.totalOriginalAmount)}`);
    doc.text(`优惠后合计：¥${formatMoney(quotation.totalDiscountedAmount)}`);
    if (quotation.discountReason) {
      doc.text(`优惠原因：${quotation.discountReason}`);
    }
    if (quotation.remark) {
      doc.text(`备注：${quotation.remark}`);
    }
    doc.end();

    await this.prisma.quotation.update({
      where: { id },
      data: {
        exportedAt: new Date()
      }
    });

    await this.auditService.log({
      userId: user.id,
      action: "EXPORT",
      module: "报价",
      targetType: "Quotation",
      targetId: quotation.id,
      targetName: quotation.quotationNo,
      content: "导出正式报价 PDF",
      afterSummary: `总价: ${quotation.totalAmount}`
    });
  }

  async reviewApproval(
    id: string,
    type: "discount" | "export",
    decision: "approve" | "reject",
    user: AuthenticatedUser,
    remark?: string
  ) {
    if (decision === "approve") {
      this.accessControl.assertPermission(user, "action.quotation.approve", "当前账号无权审批通过");
    } else {
      this.accessControl.assertPermission(user, "action.quotation.reject", "当前账号无权驳回审批");
    }

    const normalizedType =
      type === "discount" ? ApprovalRuleType.DISCOUNT : ApprovalRuleType.EXPORT_QUOTATION;
    const result = await this.approvalService.reviewQuotationRequest(
      id,
      normalizedType,
      decision,
      user,
      remark
    );

    const quotation = await this.prisma.quotation.findUnique({
      where: { id }
    });

    if (quotation) {
      await this.auditService.log({
        userId: user.id,
        action: decision === "approve" ? "APPROVE" : "REJECT",
        module: "报价",
        targetType: "Quotation",
        targetId: id,
        targetName: quotation.quotationNo,
        content: type === "discount" ? "处理折扣审批" : "处理导出审批",
        afterSummary: remark
      });
    }

    return result;
  }
}
