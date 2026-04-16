import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProductStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from "./dto/product.dto";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly auditService: AuditService,
  ) {}

  private serializeProduct(product: any, user: AuthenticatedUser) {
    return {
      ...product,
      specification: product.spec,
      suggestedPrice: product.salePrice,
      standardNumber: product.enterpriseStandardNo,
      summary: product.intro,
      tagScreenshotUrl: product.labelImageUrl,
      imageUrl: product.productImageUrl,
      enabled: product.status === ProductStatus.ENABLED,
      recentQuotationItems: Array.isArray(product.quotationItems)
        ? product.quotationItems.map((item: any) => ({
            ...item,
            quantity: Number(item.quantity ?? 0).toFixed(2),
            unitPrice: Number(item.unitPrice ?? 0).toFixed(2),
            lineTotal: Number(item.discountedAmount ?? 0).toFixed(2),
            quotation: item.quotation
              ? {
                  ...item.quotation,
                  type: item.quotation.quotationType,
                  totalAmount: Number(
                    item.quotation.totalDiscountedAmount ?? 0,
                  ).toFixed(2),
                  customer: item.quotation.customer
                    ? {
                        ...item.quotation.customer,
                        name: item.quotation.customer.customerName,
                      }
                    : null,
                }
              : null,
          }))
        : [],
      referenceCount: Array.isArray(product.quotationItems)
        ? product.quotationItems.length
        : 0,
      costPrice: this.accessControl.hasPermission(
        user,
        "action.product.change_price",
      )
        ? product.costPrice
        : null,
    };
  }

  async list(query: ProductQueryDto, user: AuthenticatedUser) {
    const where: Prisma.ProductWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword } },
              { displayName: { contains: query.keyword } },
              { sku: { contains: query.keyword } },
              { intro: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.industryGroupId
        ? { industryGroupId: query.industryGroupId }
        : {}),
      ...(query.industrySubgroupId
        ? { industrySubgroupId: query.industrySubgroupId }
        : {}),
      ...(query.status ? { status: query.status as ProductStatus } : {}),
    };

    const items = await this.prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        industryGroup: true,
        industrySubgroup: true,
      },
    });

    return items.map((item) => this.serializeProduct(item, user));
  }

  async getById(id: string, user: AuthenticatedUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        industryGroup: true,
        industrySubgroup: true,
        quotationItems: {
          take: 12,
          orderBy: {
            quotation: {
              createdAt: "desc",
            },
          },
          include: {
            quotation: {
              include: {
                customer: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("产品不存在");
    }

    return this.serializeProduct(product, user);
  }

  async create(dto: CreateProductDto, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.product.create",
      "当前账号无权新增产品",
    );

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        industryGroupId: dto.industryGroupId,
        industrySubgroupId: dto.industrySubgroupId,
        sku: dto.sku,
        spec: dto.spec,
        unit: dto.unit,
        costPrice: dto.costPrice,
        salePrice: dto.salePrice,
        enterpriseStandardNo: dto.enterpriseStandardNo,
        intro: dto.intro,
        scenarios: dto.scenarios,
        labelText: dto.labelText,
        labelImageUrl: dto.labelImageUrl,
        productImageUrl: dto.productImageUrl,
        quoteEnabled: dto.quoteEnabled ?? true,
        employeeVisible: dto.employeeVisible ?? true,
        customerVisible: dto.customerVisible ?? true,
        outputTemplateType: dto.outputTemplateType,
        remark: dto.remark,
        status: dto.status ?? ProductStatus.ENABLED,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: "CREATE",
      module: "产品",
      targetType: "Product",
      targetId: product.id,
      targetName: product.displayName,
      content: "新增产品资料",
      afterSummary: `建议售价: ${product.salePrice ?? "空"}；状态: ${product.status}`,
    });

    return this.getById(product.id, user);
  }

  async update(id: string, dto: UpdateProductDto, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.product.update",
      "当前账号无权编辑产品",
    );
    const currentProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      throw new NotFoundException("产品不存在");
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        displayName: dto.displayName,
        industryGroupId: dto.industryGroupId,
        industrySubgroupId: dto.industrySubgroupId,
        sku: dto.sku,
        spec: dto.spec,
        unit: dto.unit,
        costPrice: dto.costPrice,
        salePrice: dto.salePrice,
        enterpriseStandardNo: dto.enterpriseStandardNo,
        intro: dto.intro,
        scenarios: dto.scenarios,
        labelText: dto.labelText,
        labelImageUrl: dto.labelImageUrl,
        productImageUrl: dto.productImageUrl,
        quoteEnabled: dto.quoteEnabled,
        employeeVisible: dto.employeeVisible,
        customerVisible: dto.customerVisible,
        outputTemplateType: dto.outputTemplateType,
        remark: dto.remark,
        status: dto.status,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: "UPDATE",
      module: "产品",
      targetType: "Product",
      targetId: id,
      targetName: currentProduct.displayName,
      content: "编辑产品资料",
      afterSummary: this.auditService.summarizeChanges(
        currentProduct as any,
        {
          displayName: dto.displayName ?? currentProduct.displayName,
          salePrice: dto.salePrice ?? currentProduct.salePrice,
          outputTemplateType:
            dto.outputTemplateType ?? currentProduct.outputTemplateType,
          status: dto.status ?? currentProduct.status,
        },
        ["displayName", "salePrice", "outputTemplateType", "status"],
      ),
    });

    return this.getById(id, user);
  }

  async remove(id: string, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.product.delete",
      "当前账号无权删除产品",
    );

    const targetProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!targetProduct) {
      throw new NotFoundException("产品不存在");
    }

    const linkedCount = await this.prisma.quotationItem.count({
      where: { productId: id },
    });

    if (linkedCount > 0) {
      const disabled = await this.prisma.product.update({
        where: { id },
        data: { status: ProductStatus.DISABLED, quoteEnabled: false },
      });

      await this.auditService.log({
        userId: user.id,
        action: "DISABLE",
        module: "产品",
        targetType: "Product",
        targetId: id,
        targetName: targetProduct.displayName,
        content: "关联报价存在，系统自动改为停用",
        afterSummary: `状态: ${disabled.status}`,
      });

      return disabled;
    }

    const removed = await this.prisma.product.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: user.id,
      action: "DELETE",
      module: "产品",
      targetType: "Product",
      targetId: id,
      targetName: targetProduct.displayName,
      content: "删除产品资料",
    });

    return removed;
  }
}
