import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CustomerStatus, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCustomerDto,
  CreateCustomerFollowupDto,
  CustomerQueryDto,
  UpdateCustomerDto,
  UpdateCustomerFollowupDto,
} from "./dto/customer.dto";

function toDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toNullable<T>(value: T | undefined) {
  return value === undefined ? undefined : value;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly auditService: AuditService,
  ) {}

  private async ensureCustomerAccess(id: string, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findFirst({
      where: await this.accessControl.buildCustomerWhere(user, { id }),
      include: {
        owner: { include: { role: true } },
        industryGroup: true,
        industrySubgroup: true,
        followups: {
          orderBy: { followupDate: "desc" },
          include: { creator: { include: { role: true } } },
        },
        quotations: {
          orderBy: { createdAt: "desc" },
          include: { creator: { include: { role: true } } },
        },
        agriculturePlans: {
          orderBy: { createdAt: "desc" },
          include: {
            quotation: true,
          },
        },
        contracts: {
          orderBy: { createdAt: "desc" },
          include: { creator: { include: { role: true } } },
        },
        tasks: {
          orderBy: { startAt: "desc" },
          include: {
            assignee: { include: { role: true } },
            creator: { include: { role: true } },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在或无权访问");
    }

    return customer;
  }

  private serializeCustomer(customer: any) {
    return {
      ...customer,
      name: customer.customerName,
      wechat: customer.wechatId,
      successProbability: customer.dealProbability,
      owner: customer.owner
        ? {
            ...customer.owner,
            displayName: customer.owner.name,
          }
        : null,
      followups: Array.isArray(customer.followups)
        ? customer.followups.map((followup: any) => ({
            ...followup,
            nextFollowupAt: followup.nextContactAt,
            creator: followup.creator
              ? {
                  ...followup.creator,
                  displayName: followup.creator.name,
                }
              : null,
          }))
        : [],
      quotations: Array.isArray(customer.quotations)
        ? customer.quotations.map((quotation: any) => ({
            ...quotation,
            type: quotation.quotationType,
            totalAmount: Number(quotation.totalDiscountedAmount ?? 0).toFixed(
              2,
            ),
          }))
        : [],
      agriculturePlans: Array.isArray(customer.agriculturePlans)
        ? customer.agriculturePlans.map((plan: any) => ({
            ...plan,
            quotation: plan.quotation
              ? {
                  ...plan.quotation,
                  type: plan.quotation.quotationType,
                  totalAmount: Number(
                    plan.quotation.totalDiscountedAmount ?? 0,
                  ).toFixed(2),
                }
              : null,
          }))
        : [],
      recentFollowupAt: customer.followups?.[0]?.followupDate ?? null,
      recentQuotation: customer.quotations?.[0] ?? null,
    };
  }

  async list(query: CustomerQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const baseWhere: Prisma.CustomerWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { customerName: { contains: query.keyword } },
              { companyName: { contains: query.keyword } },
              { contactName: { contains: query.keyword } },
              { mobile: { contains: query.keyword } },
              { wechatId: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status as CustomerStatus } : {}),
      ...(query.industryGroupId
        ? { industryGroupId: query.industryGroupId }
        : {}),
      ...(query.industrySubgroupId
        ? { industrySubgroupId: query.industrySubgroupId }
        : {}),
      ...(query.province ? { province: query.province } : {}),
      ...(query.city ? { city: query.city } : {}),
      ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
    };
    const where = await this.accessControl.buildCustomerWhere(user, baseWhere);

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          owner: { include: { role: true } },
          industryGroup: true,
          industrySubgroup: true,
          followups: {
            orderBy: { followupDate: "desc" },
            take: 1,
          },
          quotations: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              followups: true,
              quotations: true,
              contracts: true,
              tasks: true,
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => this.serializeCustomer(item)),
    };
  }

  async create(dto: CreateCustomerDto, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.customer.create",
      "当前账号无权新增客户",
    );
    const ownerUserId = this.accessControl.hasPermission(
      user,
      "action.customer.transfer",
    )
      ? dto.ownerUserId
      : user.id;

    const customer = await this.prisma.customer.create({
      data: {
        customerName: dto.customerName,
        companyName: dto.companyName,
        contactName: dto.contactName,
        mobile: dto.mobile,
        wechatId: dto.wechatId,
        email: dto.email,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        address: dto.address,
        source: dto.source,
        industryGroupId: dto.industryGroupId,
        industrySubgroupId: dto.industrySubgroupId,
        status: dto.status ?? CustomerStatus.UNCONTACTED,
        ownerUserId,
        cooperationDirection: dto.cooperationDirection,
        cooperationContent: dto.cooperationContent,
        estimatedAmount: dto.estimatedAmount,
        dealProbability: dto.dealProbability,
        remark: dto.remark,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: "CREATE",
      module: "客户",
      targetType: "Customer",
      targetId: customer.id,
      targetName: customer.customerName,
      content: "新增客户档案",
      afterSummary: `负责人: ${ownerUserId}；状态: ${customer.status}`,
    });

    return this.getById(customer.id, user);
  }

  async getById(id: string, user: AuthenticatedUser) {
    const customer = await this.ensureCustomerAccess(id, user);
    return this.serializeCustomer(customer);
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.customer.update",
      "当前账号无权编辑客户",
    );
    const currentCustomer = await this.ensureCustomerAccess(id, user);

    if (
      dto.ownerUserId &&
      dto.ownerUserId !== currentCustomer.ownerUserId &&
      !this.accessControl.hasPermission(user, "action.customer.transfer")
    ) {
      throw new ForbiddenException("当前账号无权调整客户负责人");
    }

    const ownerUserId =
      dto.ownerUserId !== undefined ? toNullable(dto.ownerUserId) : undefined;

    await this.prisma.customer.update({
      where: { id },
      data: {
        customerName: dto.customerName,
        companyName: dto.companyName,
        contactName: dto.contactName,
        mobile: dto.mobile,
        wechatId: dto.wechatId,
        email: dto.email,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        address: dto.address,
        source: dto.source,
        industryGroupId: dto.industryGroupId,
        industrySubgroupId: dto.industrySubgroupId,
        status: dto.status,
        ownerUserId,
        cooperationDirection: dto.cooperationDirection,
        cooperationContent: dto.cooperationContent,
        estimatedAmount: dto.estimatedAmount,
        dealProbability: dto.dealProbability,
        remark: dto.remark,
      },
    });

    const action =
      ownerUserId && ownerUserId !== currentCustomer.ownerUserId
        ? "TRANSFER"
        : "UPDATE";

    await this.auditService.log({
      userId: user.id,
      action,
      module: "客户",
      targetType: "Customer",
      targetId: id,
      targetName: currentCustomer.customerName,
      content: action === "TRANSFER" ? "调整客户负责人" : "编辑客户资料",
      beforeSummary: this.auditService.summarizeChanges(
        currentCustomer as any,
        null,
        [],
      ),
      afterSummary: this.auditService.summarizeChanges(
        currentCustomer as any,
        {
          customerName: dto.customerName ?? currentCustomer.customerName,
          companyName: dto.companyName ?? currentCustomer.companyName,
          ownerUserId: ownerUserId ?? currentCustomer.ownerUserId,
          status: dto.status ?? currentCustomer.status,
        },
        ["customerName", "companyName", "ownerUserId", "status"],
      ),
    });

    return this.getById(id, user);
  }

  async remove(id: string, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.customer.delete",
      "当前账号无权删除客户",
    );
    const customer = await this.ensureCustomerAccess(id, user);
    const [quotationCount, contractCount, taskCount] = await Promise.all([
      this.prisma.quotation.count({ where: { customerId: customer.id } }),
      this.prisma.contract.count({ where: { customerId: customer.id } }),
      this.prisma.task.count({ where: { customerId: customer.id } }),
    ]);

    if (quotationCount > 0 || contractCount > 0 || taskCount > 0) {
      throw new ForbiddenException("客户已有关联业务数据，暂不允许删除");
    }

    const removed = await this.prisma.customer.delete({
      where: { id: customer.id },
    });

    await this.auditService.log({
      userId: user.id,
      action: "DELETE",
      module: "客户",
      targetType: "Customer",
      targetId: customer.id,
      targetName: customer.customerName,
      content: "删除客户档案",
      beforeSummary: `负责人: ${customer.ownerUserId}；状态: ${customer.status}`,
    });

    return removed;
  }

  async listFollowups(customerId: string, user: AuthenticatedUser) {
    const customer = await this.ensureCustomerAccess(customerId, user);
    return customer.followups;
  }

  async createFollowup(
    customerId: string,
    dto: CreateCustomerFollowupDto,
    user: AuthenticatedUser,
  ) {
    this.accessControl.assertPermission(
      user,
      "action.schedule.create",
      "当前账号无权新增提醒",
    );
    await this.ensureCustomerAccess(customerId, user);

    return this.prisma.customerFollowup.create({
      data: {
        customerId,
        followupDate: toDate(dto.followupDate) ?? new Date(),
        followupType: dto.followupType,
        content: dto.content,
        keyPoints: dto.keyPoints,
        nextAction: dto.nextAction,
        nextContactAt: toDate(dto.nextContactAt),
        needReminder: dto.needReminder ?? false,
        creatorUserId: user.id,
      },
    });
  }

  async updateFollowup(
    id: string,
    dto: UpdateCustomerFollowupDto,
    user: AuthenticatedUser,
  ) {
    this.accessControl.assertPermission(
      user,
      "action.schedule.update",
      "当前账号无权编辑提醒",
    );
    const followup = await this.prisma.customerFollowup.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!followup) {
      throw new NotFoundException("跟进记录不存在");
    }

    await this.ensureCustomerAccess(followup.customer.id, user);

    return this.prisma.customerFollowup.update({
      where: { id },
      data: {
        followupDate: dto.followupDate ? toDate(dto.followupDate) : undefined,
        followupType: dto.followupType,
        content: dto.content,
        keyPoints: dto.keyPoints,
        nextAction: dto.nextAction,
        nextContactAt:
          dto.nextContactAt !== undefined
            ? toDate(dto.nextContactAt)
            : undefined,
        needReminder: dto.needReminder,
      },
    });
  }

  async deleteFollowup(id: string, user: AuthenticatedUser) {
    this.accessControl.assertPermission(
      user,
      "action.schedule.delete",
      "当前账号无权删除提醒",
    );
    const followup = await this.prisma.customerFollowup.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!followup) {
      throw new NotFoundException("跟进记录不存在");
    }

    await this.ensureCustomerAccess(followup.customer.id, user);

    return this.prisma.customerFollowup.delete({
      where: { id },
    });
  }
}
