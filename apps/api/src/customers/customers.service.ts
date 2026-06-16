import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ApprovalRuleType,
  ApprovalStatus,
  CustomerStatus,
  Prisma,
} from "@prisma/client";
import { SYSTEM_RECORD_CUSTOMER_SOURCES } from "../common/constants/system-records";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import { CrmRulesService } from "../common/services/crm-rules.service";
import { RecordPartitionService } from "../common/services/record-partition.service";
import { NotificationService } from "../modules/notifications/notification.service";
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

function parseBooleanFilter(value?: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function normalizeOptionalRelationId(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

const OWNER_PROTECTION_MONTHS = 3;

function addMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

function buildOwnerProtectionWindow(
  base = new Date(),
  months = OWNER_PROTECTION_MONTHS,
) {
  const ownerAssignedAt = new Date(base);
  const protectionMonths = Math.max(1, months);
  return {
    ownerAssignedAt,
    ownerProtectionMonths: protectionMonths,
    ownerProtectedUntil: addMonths(ownerAssignedAt, protectionMonths),
  };
}

type CustomerActionResult = {
  mode: "completed" | "approval_submitted";
  message: string;
  requiredRoleCode?: string | null;
};

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly auditService: AuditService,
    private readonly crmRulesService: CrmRulesService,
    private readonly recordPartition: RecordPartitionService,
    private readonly notificationService: NotificationService,
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

  private getOwnerProtectionStatus(customer: { ownerProtectedUntil: Date }) {
    return customer.ownerProtectedUntil.getTime() > Date.now()
      ? "PROTECTED"
      : "PENDING_MAINTENANCE";
  }

  private canClaimOwnership(customer: any, user: AuthenticatedUser) {
    if (
      customer.ownerUserId === user.id ||
      this.getOwnerProtectionStatus(customer) !== "PENDING_MAINTENANCE"
    ) {
      return false;
    }

    return Boolean(
      customer.followups?.some(
        (followup: any) =>
          followup.creatorUserId === user.id &&
          new Date(followup.createdAt).getTime() >=
            customer.ownerProtectedUntil.getTime(),
      ),
    );
  }

  private getCustomerApprovalRuleType(type: "claim" | "extension" | "transfer") {
    if (type === "claim") {
      return ApprovalRuleType.CUSTOMER_CLAIM;
    }

    if (type === "extension") {
      return ApprovalRuleType.CUSTOMER_PROTECTION_EXTENSION;
    }

    return ApprovalRuleType.CUSTOMER_TRANSFER;
  }

  private canReviewApprovalRequest(request: any, user: AuthenticatedUser) {
    if (user.roleCode === "SUPER_ADMIN") {
      return true;
    }

    if (!request.requiredRoleCode) {
      return true;
    }

    return request.requiredRoleCode === user.roleCode;
  }

  private serializeCustomerApprovalRequest(request: any) {
    return {
      ...request,
      requester: request.requester
        ? {
            id: request.requester.id,
            displayName: request.requester.name,
            roleName: request.requester.role?.name ?? "",
          }
        : null,
      actor: request.actor
        ? {
            id: request.actor.id,
            displayName: request.actor.name,
            roleName: request.actor.role?.name ?? "",
          }
        : null,
    };
  }

  private async listCustomerApprovalRequests(customerId: string) {
    return this.prisma.approvalRequest.findMany({
      where: {
        targetType: "Customer",
        targetId: customerId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        requester: {
          include: { role: true },
        },
        actor: {
          include: { role: true },
        },
      },
    });
  }

  private async createOrRefreshCustomerApprovalRequest(input: {
    customerId: string;
    requesterUserId: string;
    type: ApprovalRuleType;
    requiredRoleCode: string;
    title: string;
    summary: string;
    payloadJson?: Prisma.InputJsonValue;
  }) {
    const existingRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        targetType: "Customer",
        targetId: input.customerId,
        type: input.type,
        status: ApprovalStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    });

    if (
      existingRequest &&
      existingRequest.requesterUserId !== input.requesterUserId
    ) {
      throw new ForbiddenException("当前已有待处理的客户申请，请等待审批完成");
    }

    if (existingRequest) {
      const request = await this.prisma.approvalRequest.update({
        where: { id: existingRequest.id },
        data: {
          requiredRoleCode: input.requiredRoleCode,
          title: input.title,
          summary: input.summary,
          payloadJson: input.payloadJson,
        },
      });
      return request;
    }

    const request = await this.prisma.approvalRequest.create({
      data: {
        type: input.type,
        targetType: "Customer",
        targetId: input.customerId,
        requesterUserId: input.requesterUserId,
        requiredRoleCode: input.requiredRoleCode,
        title: input.title,
        summary: input.summary,
        payloadJson: input.payloadJson,
      },
    });
    await this.notifyCustomerApprovalCreated(request);
    return request;
  }

  private buildProtectionExtensionDraft(
    customer: { ownerProtectionMonths: number; ownerProtectedUntil: Date },
    defaultProtectionMonths: number,
    maxProtectionMonths: number,
  ) {
    const now = new Date();
    const isProtected = this.getOwnerProtectionStatus(customer) === "PROTECTED";
    const currentProtectionMonths = Math.max(
      1,
      customer.ownerProtectionMonths || defaultProtectionMonths,
    );

    if (isProtected && currentProtectionMonths >= maxProtectionMonths) {
      throw new ForbiddenException(
        `当前保护期已达到上限 ${maxProtectionMonths} 个月`,
      );
    }

    const nextProtectionMonths = isProtected
      ? Math.min(
          currentProtectionMonths + defaultProtectionMonths,
          maxProtectionMonths,
        )
      : defaultProtectionMonths;
    const monthsToAdd = isProtected
      ? nextProtectionMonths - currentProtectionMonths
      : defaultProtectionMonths;
    const nextProtectedUntil = addMonths(
      isProtected ? customer.ownerProtectedUntil : now,
      monthsToAdd,
    );

    return {
      currentProtectionMonths,
      nextProtectionMonths,
      nextProtectedUntil,
    };
  }

  private serializeCustomer(
    customer: any,
    options?: {
      viewer?: AuthenticatedUser;
      includeClaimOwnership?: boolean;
      approvalRequests?: any[];
    },
  ) {
    const ownerProtectionStatus = this.getOwnerProtectionStatus(customer);
    const approvalRequests = options?.approvalRequests ?? customer.approvalRequests;
    return {
      ...customer,
      name: customer.customerName,
      wechat: customer.wechatId,
      successProbability: customer.dealProbability,
      ownerProtectionMonths: customer.ownerProtectionMonths,
      ownerProtectionStatus,
      canClaimOwnership:
        options?.viewer && options.includeClaimOwnership
          ? this.canClaimOwnership(customer, options.viewer)
          : undefined,
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
      approvalRequests: Array.isArray(approvalRequests)
        ? approvalRequests.map((request: any) =>
            this.serializeCustomerApprovalRequest(request),
          )
        : [],
      recentFollowupAt: customer.followups?.[0]?.followupDate ?? null,
      recentQuotation: customer.quotations?.[0] ?? null,
    };
  }

  async list(query: CustomerQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const includeSystemRecords = parseBooleanFilter(
      query.includeSystemRecords,
    );
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
      ...(includeSystemRecords
        ? {}
        : {
            NOT: {
              source: {
                in: [...SYSTEM_RECORD_CUSTOMER_SOURCES],
              },
            },
          }),
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
    const rules = await this.crmRulesService.getRules();
    const ownerProtectionWindow = buildOwnerProtectionWindow(
      new Date(),
      rules.defaultProtectionMonths,
    );
    const partition = await this.recordPartition.getWritableCreateData(user);

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
        industryGroupId:
          normalizeOptionalRelationId(dto.industryGroupId) ?? null,
        industrySubgroupId:
          normalizeOptionalRelationId(dto.industrySubgroupId) ?? null,
        status: dto.status ?? CustomerStatus.UNCONTACTED,
        ownerUserId,
        ...ownerProtectionWindow,
        cooperationDirection: dto.cooperationDirection,
        cooperationContent: dto.cooperationContent,
        estimatedAmount: dto.estimatedAmount,
        dealProbability: dto.dealProbability,
        remark: dto.remark,
        dataScope: partition.dataScope,
        partitionKey: partition.partitionKey,
        testBatchId: partition.testBatchId,
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
    const [customer, approvalRequests] = await Promise.all([
      this.ensureCustomerAccess(id, user),
      this.listCustomerApprovalRequests(id),
    ]);
    return this.serializeCustomer(customer, {
      viewer: user,
      includeClaimOwnership: true,
      approvalRequests,
    });
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
    const ownerChanged =
      Boolean(ownerUserId) && ownerUserId !== currentCustomer.ownerUserId;
    const rules = await this.crmRulesService.getRules();
    const transferRule = await this.prisma.approvalRule.findUnique({
      where: { code: ApprovalRuleType.CUSTOMER_TRANSFER },
    });
    const transferRuleConfig = (transferRule?.configJson ?? {}) as Record<
      string,
      unknown
    >;
    const transferRequiresApproval =
      ownerChanged &&
      rules.transferRequiresApproval &&
      transferRule?.enabled !== false &&
      transferRuleConfig.requiresManagerApproval !== false &&
      !(rules.superAdminBypassApproval && user.roleCode === "SUPER_ADMIN");
    const ownerProtectionWindow =
      ownerChanged && rules.transferResetsProtection && !transferRequiresApproval
        ? buildOwnerProtectionWindow(new Date(), rules.defaultProtectionMonths)
        : undefined;

    if (
      ownerChanged &&
      rules.transferReasonRequired &&
      !dto.transferReason?.trim()
    ) {
      throw new ForbiddenException("调整负责人时请填写转移原因");
    }

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
        industryGroupId: normalizeOptionalRelationId(dto.industryGroupId),
        industrySubgroupId: normalizeOptionalRelationId(dto.industrySubgroupId),
        status: dto.status,
        ownerUserId: transferRequiresApproval ? undefined : ownerUserId,
        ...(ownerProtectionWindow ?? {}),
        cooperationDirection: dto.cooperationDirection,
        cooperationContent: dto.cooperationContent,
        estimatedAmount: dto.estimatedAmount,
        dealProbability: dto.dealProbability,
        remark: dto.remark,
      },
    });

    let transferResult: CustomerActionResult | null = null;

    if (transferRequiresApproval && ownerUserId) {
      const targetOwner = await this.prisma.user.findUnique({
        where: { id: ownerUserId },
        select: { name: true },
      });
      const request = await this.createOrRefreshCustomerApprovalRequest({
        customerId: id,
        requesterUserId: user.id,
        type: ApprovalRuleType.CUSTOMER_TRANSFER,
        requiredRoleCode: String(
          transferRuleConfig.approverRoleCode ?? "SALES_MANAGER",
        ),
        title: "申请转移客户负责人",
        summary: dto.transferReason?.trim()
          ? `申请将客户 ${currentCustomer.customerName} 的负责人由 ${currentCustomer.owner.name} 调整为 ${targetOwner?.name || ownerUserId}。转移原因：${dto.transferReason.trim()}`
          : `申请将客户 ${currentCustomer.customerName} 的负责人由 ${currentCustomer.owner.name} 调整为 ${targetOwner?.name || ownerUserId}。`,
        payloadJson: {
          previousOwnerUserId: currentCustomer.ownerUserId,
          requestedOwnerUserId: ownerUserId,
          transferReason: dto.transferReason?.trim() || null,
          transferResetsProtection: rules.transferResetsProtection,
          defaultProtectionMonths: rules.defaultProtectionMonths,
        },
      });

      transferResult = {
        mode: "approval_submitted",
        message: `已提交负责人转移申请，待 ${request.requiredRoleCode || "审批人"} 审批。`,
        requiredRoleCode: request.requiredRoleCode,
      };
    }

    const action =
      ownerChanged && !transferRequiresApproval ? "TRANSFER" : "UPDATE";

    await this.auditService.log({
      userId: user.id,
      action,
      module: "客户",
      targetType: "Customer",
      targetId: id,
      targetName: currentCustomer.customerName,
      content:
        transferRequiresApproval
          ? "提交负责人转移申请"
          : action === "TRANSFER"
            ? "调整客户负责人"
            : "编辑客户资料",
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
          ownerUserId:
            transferRequiresApproval
              ? currentCustomer.ownerUserId
              : ownerUserId ?? currentCustomer.ownerUserId,
          status: dto.status ?? currentCustomer.status,
        },
        ["customerName", "companyName", "ownerUserId", "status"],
      ),
    });

    return {
      customer: await this.getById(id, user),
      transferResult,
    };
  }

  async claimOwnership(id: string, user: AuthenticatedUser): Promise<CustomerActionResult> {
    this.accessControl.assertPermission(
      user,
      "action.customer.update",
      "当前账号无权负责客户",
    );
    const customer = await this.ensureCustomerAccess(id, user);

    if (customer.ownerUserId === user.id) {
      throw new ForbiddenException("你已经是当前负责人");
    }

    if (this.getOwnerProtectionStatus(customer) === "PROTECTED") {
      throw new ForbiddenException("当前负责人仍在保护期内");
    }

    if (!this.canClaimOwnership(customer, user)) {
      throw new ForbiddenException("请先补一条新的沟通记录，再负责客户");
    }

    const rules = await this.crmRulesService.getRules();

    if (
      rules.claimRequiresApproval &&
      !(rules.superAdminBypassApproval && user.roleCode === "SUPER_ADMIN")
    ) {
      const request = await this.createOrRefreshCustomerApprovalRequest({
        customerId: id,
        requesterUserId: user.id,
        type: ApprovalRuleType.CUSTOMER_CLAIM,
        requiredRoleCode: rules.claimApprovalRoleCode,
        title: "申请负责客户",
        summary: `申请负责客户 ${customer.customerName}，当前负责人为 ${customer.owner.name}，客户已到期待维护。`,
        payloadJson: {
          requestedOwnerUserId: user.id,
          previousOwnerUserId: customer.ownerUserId,
          previousProtectedUntil: customer.ownerProtectedUntil.toISOString(),
          defaultProtectionMonths: rules.defaultProtectionMonths,
        },
      });

      await this.auditService.log({
        userId: user.id,
        action: "UPDATE",
        module: "客户",
        targetType: "Customer",
        targetId: id,
        targetName: customer.customerName,
        content: "提交负责客户申请",
        afterSummary: `审批角色: ${request.requiredRoleCode ?? rules.claimApprovalRoleCode}`,
      });

      return {
        mode: "approval_submitted",
        message: `已提交申请，待 ${request.requiredRoleCode ?? rules.claimApprovalRoleCode} 审批。`,
        requiredRoleCode: request.requiredRoleCode,
      };
    }

    const ownerProtectionWindow = buildOwnerProtectionWindow(
      new Date(),
      rules.defaultProtectionMonths,
    );

    await this.prisma.customer.update({
      where: { id },
      data: {
        ownerUserId: user.id,
        ...ownerProtectionWindow,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: "TRANSFER",
      module: "客户",
      targetType: "Customer",
      targetId: id,
      targetName: customer.customerName,
      content: "认领客户负责人",
      beforeSummary: `负责人: ${customer.ownerUserId}；保护截止: ${customer.ownerProtectedUntil.toISOString()}`,
      afterSummary: `负责人: ${user.id}；保护截止: ${ownerProtectionWindow.ownerProtectedUntil.toISOString()}`,
    });

    return {
      mode: "completed",
      message: "你已成为当前客户负责人，客户归属已更新。",
    };
  }

  async extendProtection(id: string, user: AuthenticatedUser): Promise<CustomerActionResult> {
    this.accessControl.assertPermission(
      user,
      "action.customer.update",
      "当前账号无权延长保护期",
    );
    const customer = await this.ensureCustomerAccess(id, user);
    const rules = await this.crmRulesService.getRules();

    if (!rules.allowProtectionExtension) {
      throw new ForbiddenException("当前系统未启用延长保护期");
    }

    if (customer.ownerUserId !== user.id) {
      throw new ForbiddenException("只有当前负责人可以申请延长保护期");
    }

    const extensionDraft = this.buildProtectionExtensionDraft(
      customer,
      rules.defaultProtectionMonths,
      rules.maxProtectionMonths,
    );

    if (
      rules.extensionRequiresApproval &&
      !(rules.superAdminBypassApproval && user.roleCode === "SUPER_ADMIN")
    ) {
      const request = await this.createOrRefreshCustomerApprovalRequest({
        customerId: id,
        requesterUserId: user.id,
        type: ApprovalRuleType.CUSTOMER_PROTECTION_EXTENSION,
        requiredRoleCode: rules.extensionApprovalRoleCode,
        title: "申请延长保护期",
        summary: `申请将客户 ${customer.customerName} 的保护期从 ${extensionDraft.currentProtectionMonths} 个月调整为 ${extensionDraft.nextProtectionMonths} 个月。`,
        payloadJson: {
          ownerUserId: user.id,
          currentProtectionMonths: extensionDraft.currentProtectionMonths,
          nextProtectionMonths: extensionDraft.nextProtectionMonths,
          nextProtectedUntil: extensionDraft.nextProtectedUntil.toISOString(),
        },
      });

      await this.auditService.log({
        userId: user.id,
        action: "UPDATE",
        module: "客户",
        targetType: "Customer",
        targetId: id,
        targetName: customer.customerName,
        content: "提交延长保护期申请",
        afterSummary: `审批角色: ${request.requiredRoleCode ?? rules.extensionApprovalRoleCode}`,
      });

      return {
        mode: "approval_submitted",
        message: `已提交延长保护期申请，待 ${request.requiredRoleCode ?? rules.extensionApprovalRoleCode} 审批。`,
        requiredRoleCode: request.requiredRoleCode,
      };
    }

    await this.prisma.customer.update({
      where: { id },
      data: {
        ownerProtectionMonths: extensionDraft.nextProtectionMonths,
        ownerProtectedUntil: extensionDraft.nextProtectedUntil,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: "UPDATE",
      module: "客户",
      targetType: "Customer",
      targetId: id,
      targetName: customer.customerName,
      content: "延长客户保护期",
      beforeSummary: `保护期: ${extensionDraft.currentProtectionMonths} 个月；保护截止: ${customer.ownerProtectedUntil.toISOString()}`,
      afterSummary: `保护期: ${extensionDraft.nextProtectionMonths} 个月；保护截止: ${extensionDraft.nextProtectedUntil.toISOString()}`,
    });

    return {
      mode: "completed",
      message: "保护期已更新。",
    };
  }

  async reviewApproval(
    id: string,
    type: "claim" | "extension" | "transfer",
    decision: "approve" | "reject",
    user: AuthenticatedUser,
    remark?: string,
  ) {
    const customer = await this.ensureCustomerAccess(id, user);
    const approvalType = this.getCustomerApprovalRuleType(type);
    const request = await this.prisma.approvalRequest.findFirst({
      where: {
        targetType: "Customer",
        targetId: id,
        type: approvalType,
        status: ApprovalStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!request) {
      throw new NotFoundException("当前没有待处理的客户审批记录");
    }

    if (!this.canReviewApprovalRequest(request, user)) {
      throw new ForbiddenException("当前角色无法处理这条审批");
    }

    const rules = await this.crmRulesService.getRules();
    let nextStatus =
      decision === "approve" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    let nextRemark = remark;
    const updates: Array<Prisma.PrismaPromise<any>> = [
      this.prisma.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          actorUserId: user.id,
          decisionRemark: nextRemark,
          decidedAt: new Date(),
        },
      }),
    ];

    if (decision === "approve") {
      if (approvalType === ApprovalRuleType.CUSTOMER_CLAIM) {
        const payload = (request.payloadJson ?? null) as Record<
          string,
          unknown
        > | null;
        const requestedOwnerUserId =
          typeof payload?.requestedOwnerUserId === "string"
            ? String(payload.requestedOwnerUserId)
            : request.requesterUserId;

        if (
          customer.ownerUserId !== requestedOwnerUserId &&
          this.getOwnerProtectionStatus(customer) === "PROTECTED"
        ) {
          nextStatus = ApprovalStatus.REJECTED;
          nextRemark = nextRemark
            ? `${nextRemark}；客户已重新进入保护期，系统自动驳回`
            : "客户已重新进入保护期，系统自动驳回";
          updates[0] = this.prisma.approvalRequest.update({
            where: { id: request.id },
            data: {
              status: nextStatus,
              actorUserId: user.id,
              decisionRemark: nextRemark,
              decidedAt: new Date(),
            },
          });
        } else {
          const ownerProtectionWindow = buildOwnerProtectionWindow(
            new Date(),
            rules.defaultProtectionMonths,
          );
          updates.push(
            this.prisma.customer.update({
              where: { id },
              data: {
                ownerUserId: requestedOwnerUserId,
                ...ownerProtectionWindow,
              },
            }),
          );
        }
      } else if (
        approvalType === ApprovalRuleType.CUSTOMER_PROTECTION_EXTENSION
      ) {
        const payload = (request.payloadJson ?? null) as Record<
          string,
          unknown
        > | null;
        const ownerUserId =
          typeof payload?.ownerUserId === "string"
            ? String(payload.ownerUserId)
            : request.requesterUserId;

        if (customer.ownerUserId !== ownerUserId) {
          nextStatus = ApprovalStatus.REJECTED;
          nextRemark = nextRemark
            ? `${nextRemark}；申请人已不是当前负责人，系统自动驳回`
            : "申请人已不是当前负责人，系统自动驳回";
          updates[0] = this.prisma.approvalRequest.update({
            where: { id: request.id },
            data: {
              status: nextStatus,
              actorUserId: user.id,
              decisionRemark: nextRemark,
              decidedAt: new Date(),
            },
          });
        } else {
          const extensionDraft = this.buildProtectionExtensionDraft(
            customer,
            rules.defaultProtectionMonths,
            rules.maxProtectionMonths,
          );
          updates.push(
            this.prisma.customer.update({
              where: { id },
              data: {
                ownerProtectionMonths: extensionDraft.nextProtectionMonths,
                ownerProtectedUntil: extensionDraft.nextProtectedUntil,
              },
            }),
          );
        }
      } else {
        const payload = (request.payloadJson ?? null) as Record<
          string,
          unknown
        > | null;
        const previousOwnerUserId =
          typeof payload?.previousOwnerUserId === "string"
            ? String(payload.previousOwnerUserId)
            : null;
        const requestedOwnerUserId =
          typeof payload?.requestedOwnerUserId === "string"
            ? String(payload.requestedOwnerUserId)
            : null;
        const transferResetsProtection =
          typeof payload?.transferResetsProtection === "boolean"
            ? payload.transferResetsProtection
            : rules.transferResetsProtection;
        const defaultProtectionMonths =
          typeof payload?.defaultProtectionMonths === "number"
            ? payload.defaultProtectionMonths
            : rules.defaultProtectionMonths;

        if (
          !previousOwnerUserId ||
          !requestedOwnerUserId ||
          customer.ownerUserId !== previousOwnerUserId
        ) {
          nextStatus = ApprovalStatus.REJECTED;
          nextRemark = nextRemark
            ? `${nextRemark}；客户负责人已变化，系统自动驳回该转移申请`
            : "客户负责人已变化，系统自动驳回该转移申请";
          updates[0] = this.prisma.approvalRequest.update({
            where: { id: request.id },
            data: {
              status: nextStatus,
              actorUserId: user.id,
              decisionRemark: nextRemark,
              decidedAt: new Date(),
            },
          });
        } else {
          const nextTransferData = transferResetsProtection
            ? {
                ownerUserId: requestedOwnerUserId,
                ...buildOwnerProtectionWindow(
                  new Date(),
                  defaultProtectionMonths,
                ),
              }
            : {
                ownerUserId: requestedOwnerUserId,
              };

          updates.push(
            this.prisma.customer.update({
              where: { id },
              data: nextTransferData,
            }),
          );
        }
      }
    }

    await this.prisma.$transaction(updates);

    await this.notifyCustomerApprovalDecision({
      ...request,
      status: nextStatus,
      decisionRemark: nextRemark ?? null,
    });

    await this.auditService.log({
      userId: user.id,
      action: nextStatus === ApprovalStatus.APPROVED ? "APPROVE" : "REJECT",
      module: "客户",
      targetType: "Customer",
      targetId: id,
      targetName: customer.customerName,
      content:
        approvalType === ApprovalRuleType.CUSTOMER_CLAIM
          ? "处理负责客户申请"
          : approvalType === ApprovalRuleType.CUSTOMER_PROTECTION_EXTENSION
            ? "处理延长保护期申请"
            : "处理负责人转移申请",
      afterSummary: nextRemark ?? nextStatus,
    });

    return {
      requestId: request.id,
      status: nextStatus,
    };
  }

  private async notifyCustomerApprovalCreated(request: {
    requesterUserId: string;
    requiredRoleCode: string | null;
    title: string;
    summary: string | null;
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
        type: "CUSTOMER_APPROVAL_REQUEST_CREATED",
        title: request.title,
        content: request.summary ?? "有新的客户审批申请待处理。",
        relatedType: "CUSTOMER",
        relatedId: request.targetId,
      })),
    );
  }

  private async notifyCustomerApprovalDecision(request: {
    requesterUserId: string;
    title: string;
    summary: string | null;
    status: ApprovalStatus;
    targetId: string;
    decisionRemark: string | null;
  }) {
    const statusText = request.status === ApprovalStatus.APPROVED ? "已通过" : "已驳回";

    await this.notificationService.deliverEventSystemAndWecom({
      userId: request.requesterUserId,
      type: "CUSTOMER_APPROVAL_REQUEST_DECIDED",
      title: `客户审批${statusText}`,
      content: [
        `${request.title}${statusText}`,
        request.summary,
        request.decisionRemark ? `备注：${request.decisionRemark}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      relatedType: "CUSTOMER",
      relatedId: request.targetId,
    });
  }

  private async findApprovalRecipients(requiredRoleCode: string | null) {
    if (requiredRoleCode) {
      return this.prisma.user.findMany({
        where: {
          status: "ACTIVE",
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
        status: "ACTIVE",
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
