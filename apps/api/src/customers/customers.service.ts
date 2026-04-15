import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CustomerStatus, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateCustomerDto,
  CreateCustomerFollowupDto,
  CustomerQueryDto,
  UpdateCustomerDto,
  UpdateCustomerFollowupDto
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
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(user: AuthenticatedUser) {
    return user.roleCode === "STAFF";
  }

  private async ensureCustomerAccess(id: string, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        owner: { include: { role: true } },
        industryGroup: true,
        industrySubgroup: true,
        followups: {
          orderBy: { followupDate: "desc" },
          include: { creator: { include: { role: true } } }
        },
        quotations: {
          orderBy: { createdAt: "desc" },
          include: { creator: { include: { role: true } } }
        },
        contracts: {
          orderBy: { createdAt: "desc" },
          include: { creator: { include: { role: true } } }
        },
        tasks: {
          orderBy: { startAt: "desc" },
          include: {
            assignee: { include: { role: true } },
            creator: { include: { role: true } }
          }
        }
      }
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    if (this.isStaff(user) && customer.ownerUserId !== user.id) {
      throw new ForbiddenException("无权访问该客户");
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
            displayName: customer.owner.name
          }
        : null,
      followups: Array.isArray(customer.followups)
        ? customer.followups.map((followup: any) => ({
            ...followup,
            nextFollowupAt: followup.nextContactAt,
            creator: followup.creator
              ? {
                  ...followup.creator,
                  displayName: followup.creator.name
                }
              : null
          }))
        : [],
      quotations: Array.isArray(customer.quotations)
        ? customer.quotations.map((quotation: any) => ({
            ...quotation,
            type: quotation.quotationType,
            totalAmount: Number(quotation.totalDiscountedAmount ?? 0).toFixed(2)
          }))
        : [],
      recentFollowupAt: customer.followups?.[0]?.followupDate ?? null,
      recentQuotation: customer.quotations?.[0] ?? null
    };
  }

  async list(query: CustomerQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.CustomerWhereInput = {
      ...(this.isStaff(user) ? { ownerUserId: user.id } : {}),
      ...(query.keyword
        ? {
            OR: [
              { customerName: { contains: query.keyword } },
              { companyName: { contains: query.keyword } },
              { contactName: { contains: query.keyword } },
              { mobile: { contains: query.keyword } },
              { wechatId: { contains: query.keyword } }
            ]
          }
        : {}),
      ...(query.status ? { status: query.status as CustomerStatus } : {}),
      ...(query.industryGroupId ? { industryGroupId: query.industryGroupId } : {}),
      ...(query.industrySubgroupId ? { industrySubgroupId: query.industrySubgroupId } : {}),
      ...(query.province ? { province: query.province } : {}),
      ...(query.city ? { city: query.city } : {}),
      ...(query.ownerUserId && !this.isStaff(user) ? { ownerUserId: query.ownerUserId } : {})
    };

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
            take: 1
          },
          quotations: {
            orderBy: { createdAt: "desc" },
            take: 1
          },
          _count: {
            select: { followups: true, quotations: true, contracts: true, tasks: true }
          }
        }
      }),
      this.prisma.customer.count({ where })
    ]);

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => this.serializeCustomer(item))
    };
  }

  async create(dto: CreateCustomerDto, user: AuthenticatedUser) {
    const ownerUserId = this.isStaff(user) ? user.id : dto.ownerUserId;

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
        remark: dto.remark
      }
    });

    return this.getById(customer.id, user);
  }

  async getById(id: string, user: AuthenticatedUser) {
    const customer = await this.ensureCustomerAccess(id, user);
    return this.serializeCustomer(customer);
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthenticatedUser) {
    await this.ensureCustomerAccess(id, user);
    const ownerUserId =
      this.isStaff(user) ? user.id : toNullable(dto.ownerUserId);

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
        remark: dto.remark
      }
    });

    return this.getById(id, user);
  }

  async remove(id: string, user: AuthenticatedUser) {
    const customer = await this.ensureCustomerAccess(id, user);
    const [quotationCount, contractCount, taskCount] = await Promise.all([
      this.prisma.quotation.count({ where: { customerId: customer.id } }),
      this.prisma.contract.count({ where: { customerId: customer.id } }),
      this.prisma.task.count({ where: { customerId: customer.id } })
    ]);

    if (quotationCount > 0 || contractCount > 0 || taskCount > 0) {
      throw new ForbiddenException("客户已有关联业务数据，暂不允许删除");
    }

    return this.prisma.customer.delete({ where: { id: customer.id } });
  }

  async listFollowups(customerId: string, user: AuthenticatedUser) {
    const customer = await this.ensureCustomerAccess(customerId, user);
    return customer.followups;
  }

  async createFollowup(customerId: string, dto: CreateCustomerFollowupDto, user: AuthenticatedUser) {
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
        creatorUserId: user.id
      }
    });
  }

  async updateFollowup(id: string, dto: UpdateCustomerFollowupDto, user: AuthenticatedUser) {
    const followup = await this.prisma.customerFollowup.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!followup) {
      throw new NotFoundException("跟进记录不存在");
    }

    if (this.isStaff(user) && followup.customer.ownerUserId !== user.id) {
      throw new ForbiddenException("无权修改该跟进记录");
    }

    return this.prisma.customerFollowup.update({
      where: { id },
      data: {
        followupDate: dto.followupDate ? toDate(dto.followupDate) : undefined,
        followupType: dto.followupType,
        content: dto.content,
        keyPoints: dto.keyPoints,
        nextAction: dto.nextAction,
        nextContactAt:
          dto.nextContactAt !== undefined ? toDate(dto.nextContactAt) : undefined,
        needReminder: dto.needReminder
      }
    });
  }

  async deleteFollowup(id: string, user: AuthenticatedUser) {
    const followup = await this.prisma.customerFollowup.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!followup) {
      throw new NotFoundException("跟进记录不存在");
    }

    if (this.isStaff(user) && followup.customer.ownerUserId !== user.id) {
      throw new ForbiddenException("无权删除该跟进记录");
    }

    return this.prisma.customerFollowup.delete({
      where: { id }
    });
  }
}
