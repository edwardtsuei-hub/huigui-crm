import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProductStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from "./dto/product.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(user: AuthenticatedUser) {
    return user.roleCode === "STAFF";
  }

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
      costPrice: this.isStaff(user) ? null : product.costPrice
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
              { intro: { contains: query.keyword } }
            ]
          }
        : {}),
      ...(query.industryGroupId ? { industryGroupId: query.industryGroupId } : {}),
      ...(query.industrySubgroupId ? { industrySubgroupId: query.industrySubgroupId } : {}),
      ...(query.status ? { status: query.status as ProductStatus } : {})
    };

    const items = await this.prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        industryGroup: true,
        industrySubgroup: true
      }
    });

    return items.map((item) => this.serializeProduct(item, user));
  }

  async getById(id: string, user: AuthenticatedUser) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        industryGroup: true,
        industrySubgroup: true
      }
    });

    if (!product) {
      throw new NotFoundException("产品不存在");
    }

    return this.serializeProduct(product, user);
  }

  async create(dto: CreateProductDto, user: AuthenticatedUser) {
    if (this.isStaff(user)) {
      throw new ForbiddenException("员工角色暂不允许创建产品");
    }

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
        status: dto.status ?? ProductStatus.ENABLED
      }
    });

    return this.getById(product.id, user);
  }

  async update(id: string, dto: UpdateProductDto, user: AuthenticatedUser) {
    if (this.isStaff(user)) {
      throw new ForbiddenException("员工角色暂不允许修改产品");
    }

    await this.getById(id, user);

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
        status: dto.status
      }
    });

    return this.getById(id, user);
  }

  async remove(id: string, user: AuthenticatedUser) {
    if (this.isStaff(user)) {
      throw new ForbiddenException("员工角色暂不允许删除产品");
    }

    const linkedCount = await this.prisma.quotationItem.count({
      where: { productId: id }
    });

    if (linkedCount > 0) {
      return this.prisma.product.update({
        where: { id },
        data: { status: ProductStatus.DISABLED, quoteEnabled: false }
      });
    }

    return this.prisma.product.delete({
      where: { id }
    });
  }
}
