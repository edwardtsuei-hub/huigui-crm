import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ApprovalStatus,
  DataScope,
  NotificationChannel,
  NotificationSendStatus,
  Prisma,
  UserStatus,
  WecomSyncStatus
} from "@prisma/client";
import bcrypt from "bcrypt";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { AuditService } from "../common/services/audit.service";
import {
  CRM_RULES_SETTING_KEY,
  normalizeCrmRulesConfig
} from "../common/constants/crm-rules";
import { CrmRulesService } from "../common/services/crm-rules.service";
import { WecomService } from "../modules/wecom/wecom.service";
import { WecomMessageService } from "../modules/wecom/wecom-message.service";
import { WecomCalendarService } from "../modules/wecom/wecom-calendar.service";
import { NotificationService } from "../modules/notifications/notification.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  APPROVAL_RULE_TEMPLATES,
  DATA_SCOPE_LABELS,
  DEFAULT_ROLE_PERMISSION_CODES,
  PERMISSION_DEFINITIONS,
  SYSTEM_ROLE_DEFINITIONS
} from "./management.constants";
import {
  AuditLogQueryDto,
  BindMemberWecomDto,
  CreateMemberDto,
  CreateRoleDto,
  MemberQueryDto,
  ResetPasswordDto,
  SendMemberWecomTestMessageDto,
  UpdateApprovalRuleDto,
  UpdateCrmRulesDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
  UpdateRoleDto,
  WecomMemberQueryDto,
  WecomMonitorQueryDto
} from "./dto/management.dto";

type WecomDepartmentListResponse = {
  errcode: number;
  errmsg: string;
  department?: Array<{
    id: number;
    name: string;
    parentid?: number;
  }>;
};

type WecomSimpleUserListResponse = {
  errcode: number;
  errmsg: string;
  userlist?: Array<{
    userid: string;
    name?: string;
    department?: number[];
  }>;
};

type WecomUserProfileResponse = {
  errcode: number;
  errmsg: string;
  userid: string;
  name?: string;
  avatar?: string;
  mobile?: string;
  email?: string;
  department?: number[];
};

function buildRoleCode(name: string) {
  return name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function toDateRange(startDate?: string, endDate?: string) {
  const dateRange: Prisma.DateTimeFilter = {};

  if (startDate) {
    dateRange.gte = new Date(startDate);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateRange.lte = end;
  }

  return Object.keys(dateRange).length ? dateRange : undefined;
}

function startOfCurrentWeek(reference = new Date()) {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function riskAuditLogWhere(): Prisma.AuditLogWhereInput {
  return {
    OR: [
      { action: { in: ["DELETE", "RESET_PASSWORD", "WECOM_BIND", "WECOM_UNBIND", "EXPORT", "DISABLE", "REJECT", "TRANSFER"] } },
      { action: "STATUS", module: "成员" },
      { module: "权限" }
    ]
  };
}

@Injectable()
export class ManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly auditService: AuditService,
    private readonly crmRulesService: CrmRulesService,
    private readonly wecomService: WecomService,
    private readonly wecomMessageService: WecomMessageService,
    private readonly wecomCalendarService: WecomCalendarService,
    private readonly notificationService: NotificationService
  ) {}

  private buildApprovalVisibilityWhere(currentUser: AuthenticatedUser): Prisma.ApprovalRequestWhereInput {
    if (currentUser.roleCode === "SUPER_ADMIN" || currentUser.roleCode === "ADMIN") {
      return {};
    }

    return {
      OR: [
        { requiredRoleCode: currentUser.roleCode },
        { requiredRoleCode: null },
        { requesterUserId: currentUser.id },
        { actorUserId: currentUser.id }
      ]
    };
  }

  private buildPendingApprovalWhere(currentUser: AuthenticatedUser): Prisma.ApprovalRequestWhereInput {
    if (currentUser.roleCode === "SUPER_ADMIN" || currentUser.roleCode === "ADMIN") {
      return { status: ApprovalStatus.PENDING };
    }

    return {
      status: ApprovalStatus.PENDING,
      OR: [{ requiredRoleCode: currentUser.roleCode }, { requiredRoleCode: null }]
    };
  }

  private async findPendingApprovalRequests(currentUser: AuthenticatedUser, take = 80) {
    return this.prisma.approvalRequest.findMany({
      where: this.buildPendingApprovalWhere(currentUser),
      orderBy: { createdAt: "desc" },
      take,
      include: {
        requester: { include: { role: true } },
        actor: { include: { role: true } },
        quotation: {
          include: {
            customer: {
              include: {
                owner: true
              }
            }
          }
        }
      }
    });
  }

  private async findRecentApprovalRequests(currentUser: AuthenticatedUser, take = 20) {
    return this.prisma.approvalRequest.findMany({
      where: {
        AND: [
          this.buildApprovalVisibilityWhere(currentUser),
          { status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] } }
        ]
      },
      orderBy: [{ decidedAt: "desc" }, { updatedAt: "desc" }],
      take,
      include: {
        requester: { include: { role: true } },
        actor: { include: { role: true } },
        quotation: {
          include: {
            customer: {
              include: {
                owner: true
              }
            }
          }
        }
      }
    });
  }

  private serializeApprovalRequestListItem(
    item: any,
    customerMap: Map<
      string,
      {
        id: string;
        customerName: string;
        companyName: string | null;
        ownerProtectedUntil: Date | null;
        owner: { id: string; name: string } | null;
      }
    >
  ) {
    const relatedCustomer =
      item.targetType === "Customer"
        ? customerMap.get(item.targetId) ?? null
        : item.quotation?.customer
          ? {
              id: item.quotation.customer.id,
              customerName: item.quotation.customer.customerName,
              companyName: item.quotation.customer.companyName,
              ownerProtectedUntil: item.quotation.customer.ownerProtectedUntil,
              owner: item.quotation.customer.owner
            }
          : null;

    return {
      id: item.id,
      type: item.type,
      targetType: item.targetType,
      targetId: item.targetId,
      status: item.status,
      title: item.title,
      summary: item.summary,
      requiredRoleCode: item.requiredRoleCode,
      createdAt: item.createdAt,
      decidedAt: item.decidedAt,
      decisionRemark: item.decisionRemark,
      requester: {
        id: item.requester.id,
        name: item.requester.name,
        roleName: item.requester.role.name
      },
      actor: item.actor
        ? {
            id: item.actor.id,
            name: item.actor.name,
            roleName: item.actor.role.name
          }
        : null,
      quotation: item.quotation
        ? {
            id: item.quotation.id,
            quotationNo: item.quotation.quotationNo,
            customerName: item.quotation.customer.customerName,
            approvalStatus: item.quotation.approvalStatus,
            exportApprovalStatus: item.quotation.exportApprovalStatus
          }
        : null,
      customer: relatedCustomer
        ? {
            id: relatedCustomer.id,
            customerName: relatedCustomer.customerName,
            companyName: relatedCustomer.companyName,
            ownerName: relatedCustomer.owner?.name ?? null,
            ownerProtectedUntil: relatedCustomer.ownerProtectedUntil
          }
        : null
    };
  }

  async getOverview(currentUser: AuthenticatedUser) {
    const membersWhere = await this.accessControl.buildMemberVisibilityWhere(currentUser);
    const memberIds = (
      await this.prisma.user.findMany({
        where: membersWhere,
        select: { id: true }
      })
    ).map((item) => item.id);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfWeek = startOfCurrentWeek();
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const highRiskWhere = riskAuditLogWhere();
    const pendingApprovalWhere = this.buildPendingApprovalWhere(currentUser);

    const [
      memberTotal,
      activeMemberCount,
      monthlyNewMembers,
      pendingApprovals,
      permissionChanges,
      weeklyRiskCount,
      monthlyAccountChangeCount,
      last24hRiskCount,
      last24hDisabledCount,
      last24hPermissionChangeCount,
      recentRiskLogs,
      recentExports,
      recentDisabledAccounts
    ] =
      await Promise.all([
        this.prisma.user.count({ where: membersWhere }),
        this.prisma.user.count({
          where: this.mergeUserWhere(membersWhere, { status: UserStatus.ACTIVE })
        }),
        this.prisma.user.count({
          where: this.mergeUserWhere(membersWhere, { createdAt: { gte: startOfMonth } })
        }),
        this.prisma.approvalRequest.count({
          where: pendingApprovalWhere
        }),
        this.prisma.auditLog.count({
          where: {
            module: "权限",
            createdAt: { gte: startOfMonth }
          }
        }),
        this.prisma.auditLog.count({
          where: {
            AND: [highRiskWhere, { createdAt: { gte: startOfWeek } }]
          }
        }),
        this.prisma.auditLog.count({
          where: {
            createdAt: { gte: startOfMonth },
            OR: [
              { module: "权限" },
              { module: "成员" }
            ]
          }
        }),
        this.prisma.auditLog.count({
          where: {
            AND: [highRiskWhere, { createdAt: { gte: last24Hours } }]
          }
        }),
        this.prisma.auditLog.count({
          where: {
            module: "成员",
            action: "STATUS",
            createdAt: { gte: last24Hours }
          }
        }),
        this.prisma.auditLog.count({
          where: {
            module: "权限",
            createdAt: { gte: last24Hours }
          }
        }),
        this.prisma.auditLog.findMany({
          where: highRiskWhere,
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { user: { include: { role: true } } }
        }),
        this.prisma.auditLog.findMany({
          where: {
            action: "EXPORT",
            module: "报价"
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { user: { include: { role: true } } }
        }),
        this.prisma.auditLog.findMany({
          where: {
            module: "成员",
            action: "STATUS"
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { user: { include: { role: true } } }
        })
      ]);

    const pendingApprovalItems = await this.findPendingApprovalRequests(currentUser, 5);

    return {
      memberTotal,
      activeMemberCount,
      monthlyNewMembers,
      pendingApprovalCount: pendingApprovals,
      permissionChangeCount: permissionChanges,
      weeklyRiskCount,
      monthlyAccountChangeCount,
      summary: {
        last24hRiskCount,
        last24hDisabledCount,
        last24hPermissionChangeCount
      },
      recentRiskLogs: recentRiskLogs.map((item) => this.serializeAuditLog(item)),
      recentExportRecords: recentExports.map((item) => this.serializeAuditLog(item)),
      recentDisabledAccounts: recentDisabledAccounts.map((item) => this.serializeAuditLog(item)),
      pendingApprovalItems: pendingApprovalItems.map((item) => ({
        id: item.id,
        type: item.type,
        targetType: item.targetType,
        targetId: item.targetId,
        title: item.title,
        summary: item.summary,
        requiredRoleCode: item.requiredRoleCode,
        requester: {
          id: item.requester.id,
          name: item.requester.name,
          roleName: item.requester.role.name
        },
        quotation: item.quotation
          ? {
              id: item.quotation.id,
              quotationNo: item.quotation.quotationNo,
              customerName: item.quotation.customer.customerName
            }
          : null,
        createdAt: item.createdAt
      })),
      quickActions: [
        {
          key: "members",
          label: "新增成员",
          href: "/management/members?create=1",
          note: "补充新账号并分配角色与数据范围。"
        },
        {
          key: "roles",
          label: "配置角色",
          href: "/management/roles",
          note: "调整可见模块、操作权限与数据边界。"
        },
        {
          key: "rules",
          label: "设置审批规则",
          href: "/management/approvals",
          note: "更新报价审批和客户归属规则。"
        },
        {
          key: "logs",
          label: "查看日志",
          href: "/management/logs",
          note: "追踪删除、导出、停用和权限变更。"
        }
      ],
      visibleMemberIds: memberIds
    };
  }

  async listPendingApprovals(currentUser: AuthenticatedUser) {
    const [items, recentItems] = await Promise.all([
      this.findPendingApprovalRequests(currentUser),
      this.findRecentApprovalRequests(currentUser)
    ]);
    const customerIds = Array.from(
      new Set(
        [...items, ...recentItems]
          .filter((item) => item.targetType === "Customer")
          .map((item) => item.targetId)
      )
    );

    const customers =
      customerIds.length > 0
        ? await this.prisma.customer.findMany({
            where: { id: { in: customerIds } },
            select: {
              id: true,
              customerName: true,
              companyName: true,
              ownerProtectedUntil: true,
              owner: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          })
        : [];

    const customerMap = new Map(customers.map((item) => [item.id, item]));

    return {
      items: items.map((item) => this.serializeApprovalRequestListItem(item, customerMap)),
      recentItems: recentItems.map((item) => this.serializeApprovalRequestListItem(item, customerMap))
    };
  }

  async listMembers(query: MemberQueryDto, currentUser: AuthenticatedUser) {
    const baseWhere: Prisma.UserWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword } },
              { mobile: { contains: query.keyword } },
              { email: { contains: query.keyword } },
              { loginAccount: { contains: query.keyword } },
              { wecomName: { contains: query.keyword } },
              { wecomUserId: { contains: query.keyword } }
            ]
          }
        : {}),
      ...(query.department ? { department: query.department } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dataScope ? { dataScope: query.dataScope } : {}),
      ...(query.roleCode ? { role: { code: query.roleCode } } : {}),
      ...(query.wecomBinding === "bound" ? { wecomUserId: { not: null } } : {}),
      ...(query.wecomBinding === "unbound" ? { wecomUserId: null } : {})
    };
    const where = await this.accessControl.buildMemberVisibilityWhere(currentUser, baseWhere);
    const members = await this.prisma.user.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        },
        manager: true,
        createdByUser: true
      }
    });

    return {
      items: members.map((member) => this.serializeMember(member)),
      filters: {
        departments: this.uniqueValues(members.map((member) => member.department)),
        statuses: Object.values(UserStatus),
        dataScopes: Object.entries(DATA_SCOPE_LABELS).map(([value, label]) => ({ value, label }))
      }
    };
  }

  async getMemberById(id: string, currentUser: AuthenticatedUser) {
    const where = await this.accessControl.buildMemberVisibilityWhere(currentUser, { id });
    const member = await this.prisma.user.findFirst({
      where,
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true }
            }
          }
        },
        manager: true,
        createdByUser: true
      }
    });

    if (!member) {
      throw new NotFoundException("成员不存在或无权查看");
    }

    const recentLogs = await this.prisma.auditLog.findMany({
      where: {
        userId: member.id
      },
      orderBy: { createdAt: "desc" },
      take: 6
    });

    return {
      ...this.serializeMember(member),
      recentLogs: recentLogs.map((log) => this.serializeAuditLog(log))
    };
  }

  async createMember(dto: CreateMemberDto, currentUser: AuthenticatedUser) {
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId }
    });

    if (!role) {
      throw new NotFoundException("角色不存在");
    }

    const member = await this.prisma.user.create({
      data: {
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email,
        loginAccount: dto.loginAccount,
        passwordHash: await bcrypt.hash(dto.password, 10),
        department: dto.department,
        title: dto.title,
        managerUserId: dto.managerUserId,
        roleId: dto.roleId,
        dataScope: dto.dataScope ?? role.defaultDataScope,
        status: dto.status ?? UserStatus.ACTIVE,
        note: dto.note,
        createdByUserId: currentUser.id
      }
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "CREATE",
      module: "成员",
      targetType: "User",
      targetId: member.id,
      targetName: member.name,
      content: "新增系统成员",
      afterSummary: `角色: ${role.name}；数据范围: ${dto.dataScope ?? role.defaultDataScope}`
    });

    return this.getMemberById(member.id, currentUser);
  }

  async updateMember(id: string, dto: UpdateMemberDto, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });

    if (!existing) {
      throw new NotFoundException("成员不存在");
    }

    let role = existing.role;

    if (dto.roleId) {
      const nextRole = await this.prisma.role.findUnique({
        where: { id: dto.roleId }
      });

      if (!nextRole) {
        throw new NotFoundException("角色不存在");
      }

      role = nextRole;
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email,
        loginAccount: dto.loginAccount,
        department: dto.department,
        title: dto.title,
        managerUserId: dto.managerUserId,
        roleId: dto.roleId,
        dataScope: dto.dataScope,
        status: dto.status,
        note: dto.note
      }
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "成员",
      targetType: "User",
      targetId: id,
      targetName: existing.name,
      content: "编辑成员信息",
      afterSummary: this.auditService.summarizeChanges(
        existing as any,
        {
          name: dto.name ?? existing.name,
          department: dto.department ?? existing.department,
          title: dto.title ?? existing.title,
          dataScope: dto.dataScope ?? existing.dataScope,
          roleId: dto.roleId ?? existing.roleId,
          status: dto.status ?? existing.status
        },
        ["name", "department", "title", "dataScope", "roleId", "status"]
      )
    });

    return this.getMemberById(id, currentUser);
  }

  async resetMemberPassword(id: string, dto: ResetPasswordDto, currentUser: AuthenticatedUser) {
    const member = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!member) {
      throw new NotFoundException("成员不存在");
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(dto.password, 10)
      }
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "RESET_PASSWORD",
      module: "成员",
      targetType: "User",
      targetId: id,
      targetName: member.name,
      content: "重置成员密码"
    });

    return {
      success: true
    };
  }

  async listWecomMembers(query: WecomMemberQueryDto) {
    const keyword = query.keyword?.trim().toLowerCase() ?? "";
    const departments = await this.wecomService.get<WecomDepartmentListResponse>(
      "/cgi-bin/department/list"
    );
    const departmentMap = new Map(
      (departments.department ?? []).map((item) => [item.id, item.name])
    );
    const members = new Map<
      string,
      {
        userid: string;
        name: string;
        departmentNames: string[];
      }
    >();

    for (const department of departments.department ?? []) {
      const users = await this.wecomService.get<WecomSimpleUserListResponse>(
        "/cgi-bin/user/simplelist",
        { department_id: department.id, fetch_child: 0 }
      );

      for (const user of users.userlist ?? []) {
        const departmentNames = (user.department ?? [])
          .map((departmentId) => departmentMap.get(departmentId))
          .filter((item): item is string => Boolean(item));
        const existing = members.get(user.userid);

        members.set(user.userid, {
          userid: user.userid,
          name: user.name ?? user.userid,
          departmentNames: Array.from(
            new Set([...(existing?.departmentNames ?? []), ...departmentNames])
          )
        });
      }
    }

    const boundUsers = await this.prisma.user.findMany({
      where: {
        wecomUserId: {
          in: Array.from(members.keys())
        }
      },
      select: {
        id: true,
        name: true,
        loginAccount: true,
        wecomUserId: true
      }
    });
    const boundMap = new Map(boundUsers.map((user) => [user.wecomUserId, user]));
    const items = Array.from(members.values())
      .filter((member) => {
        if (!keyword) {
          return true;
        }

        return (
          member.name.toLowerCase().includes(keyword) ||
          member.userid.toLowerCase().includes(keyword) ||
          member.departmentNames.some((name) => name.toLowerCase().includes(keyword))
        );
      })
      .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))
      .slice(0, 80)
      .map((member) => {
        const boundUser = boundMap.get(member.userid);

        return {
          ...member,
          boundUser: boundUser
            ? {
                id: boundUser.id,
                name: boundUser.name,
                loginAccount: boundUser.loginAccount
              }
            : null
        };
      });

    return { items };
  }

  async bindMemberWecom(
    id: string,
    dto: BindMemberWecomDto,
    currentUser: AuthenticatedUser
  ) {
    const where = await this.accessControl.buildMemberVisibilityWhere(currentUser, { id });
    const member = await this.prisma.user.findFirst({ where });

    if (!member) {
      throw new NotFoundException("成员不存在或无权处理");
    }

    const userid = dto.userid.trim();
    const profile = await this.wecomService.get<WecomUserProfileResponse>(
      "/cgi-bin/user/get",
      { userid }
    );
    const existing = await this.prisma.user.findUnique({
      where: { wecomUserId: profile.userid },
      select: { id: true, name: true, loginAccount: true }
    });

    if (existing && existing.id !== member.id) {
      throw new ConflictException(
        `该企业微信成员已绑定到 ${existing.name}，请先清除原绑定`
      );
    }

    await this.prisma.user.update({
      where: { id: member.id },
      data: {
        wecomUserId: profile.userid,
        wecomName: profile.name,
        wecomAvatar: profile.avatar
      }
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "WECOM_BIND",
      module: "成员",
      targetType: "User",
      targetId: member.id,
      targetName: member.name,
      content: "管理员绑定企业微信成员",
      beforeSummary: member.wecomUserId
        ? `企业微信成员: ${member.wecomName ?? member.wecomUserId}`
        : "此前未绑定企业微信",
      afterSummary: `企业微信成员: ${profile.name ?? profile.userid} (${profile.userid})`
    });

    return this.getMemberById(member.id, currentUser);
  }

  async sendMemberWecomTestMessage(
    id: string,
    dto: SendMemberWecomTestMessageDto,
    currentUser: AuthenticatedUser
  ) {
    const where = await this.accessControl.buildMemberVisibilityWhere(currentUser, { id });
    const member = await this.prisma.user.findFirst({ where });

    if (!member) {
      throw new NotFoundException("成员不存在或无权处理");
    }

    const title = dto.title?.trim() || "企业微信通知测试";
    const content =
      dto.content?.trim() ||
      `这是一条 CRM 企业微信通知测试。接收账号：${member.name}。发送时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;

    const notification = await this.notificationService.deliverEventSystemAndWecom({
      userId: member.id,
      type: "WECOM_TEST_MESSAGE",
      title,
      content,
      relatedType: "USER",
      relatedId: member.id
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "WECOM_TEST_MESSAGE",
      module: "成员",
      targetType: "User",
      targetId: member.id,
      targetName: member.name,
      content: "发送企业微信测试通知",
      afterSummary: `企业微信成员: ${member.wecomName ?? member.wecomUserId}`
    });

    return {
      success: true,
      notificationId: notification.id
    };
  }

  async unbindMemberWecom(id: string, currentUser: AuthenticatedUser) {
    const where = await this.accessControl.buildMemberVisibilityWhere(currentUser, { id });
    const member = await this.prisma.user.findFirst({
      where
    });

    if (!member) {
      throw new NotFoundException("成员不存在或无权处理");
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        wecomUserId: null,
        wecomName: null,
        wecomAvatar: null
      }
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "WECOM_UNBIND",
      module: "成员",
      targetType: "User",
      targetId: id,
      targetName: member.name,
      content: "清除企业微信绑定",
      beforeSummary: member.wecomUserId
        ? `企业微信成员: ${member.wecomName ?? member.wecomUserId}`
        : "此前未绑定企业微信"
    });

    return this.getMemberById(id, currentUser);
  }

  async updateMemberStatus(
    id: string,
    dto: UpdateMemberStatusDto,
    currentUser: AuthenticatedUser
  ) {
    const member = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!member) {
      throw new NotFoundException("成员不存在");
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: dto.status
      }
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "STATUS",
      module: "成员",
      targetType: "User",
      targetId: id,
      targetName: member.name,
      content: dto.status === UserStatus.ACTIVE ? "启用账号" : "停用账号",
      afterSummary: `状态: ${dto.status}`
    });

    return {
      success: true
    };
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { users: true }
        }
      }
    });

    return {
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        isSystem: role.isSystem,
        defaultDataScope: role.defaultDataScope,
        memberCount: role._count.users,
        permissionCodes: role.rolePermissions.map((item) => item.permission.code),
        defaultPermissionCodes:
          DEFAULT_ROLE_PERMISSION_CODES[role.code] ??
          role.rolePermissions.map((item) => item.permission.code)
      })),
      permissionCatalog: this.buildPermissionCatalog(),
      dataScopes: Object.entries(DATA_SCOPE_LABELS).map(([value, label]) => ({ value, label })),
      systemRoleOrder: SYSTEM_ROLE_DEFINITIONS.map((item) => item.code)
    };
  }

  async createRole(dto: CreateRoleDto, currentUser: AuthenticatedUser) {
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        code: dto.code?.trim() || buildRoleCode(dto.name),
        description: dto.description,
        defaultDataScope: dto.defaultDataScope ?? DataScope.OWNED,
        isSystem: false,
        sortOrder: 999
      }
    });

    await this.syncRolePermissions(role.id, dto.permissionCodes);
    await this.auditService.log({
      userId: currentUser.id,
      action: "CREATE",
      module: "权限",
      targetType: "Role",
      targetId: role.id,
      targetName: role.name,
      content: "新增自定义角色",
      afterSummary: `权限数: ${dto.permissionCodes.length}`
    });

    return this.listRoles();
  }

  async updateRole(id: string, dto: UpdateRoleDto, currentUser: AuthenticatedUser) {
    const role = await this.prisma.role.findUnique({
      where: { id }
    });

    if (!role) {
      throw new NotFoundException("角色不存在");
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        defaultDataScope: dto.defaultDataScope
      }
    });

    if (dto.permissionCodes) {
      await this.syncRolePermissions(id, dto.permissionCodes);
    }

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "权限",
      targetType: "Role",
      targetId: id,
      targetName: role.name,
      content: "更新角色权限",
      afterSummary: dto.permissionCodes ? `权限数: ${dto.permissionCodes.length}` : undefined
    });

    return this.listRoles();
  }

  async listApprovalRules() {
    const [rules, crmRulesSetting, roles] = await Promise.all([
      this.prisma.approvalRule.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          updatedBy: {
            include: {
              role: true
            }
          }
        }
      }),
      this.prisma.systemSetting.findUnique({
        where: { settingKey: CRM_RULES_SETTING_KEY },
        include: {
          updatedBy: {
            include: {
              role: true
            }
          }
        }
      }),
      this.prisma.role.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          code: true,
          name: true
        }
      })
    ]);

    return {
      rules: rules.map((rule) => ({
        id: rule.id,
        code: rule.code,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        configJson: rule.configJson,
        updatedAt: rule.updatedAt,
        updatedBy: rule.updatedBy
          ? {
              id: rule.updatedBy.id,
              name: rule.updatedBy.name,
              roleName: rule.updatedBy.role.name
            }
          : null
      })),
      crmRules: {
        configJson: normalizeCrmRulesConfig(
          (crmRulesSetting?.configJson ?? null) as Record<string, unknown> | null
        ),
        updatedAt: crmRulesSetting?.updatedAt ?? null,
        updatedBy: crmRulesSetting?.updatedBy
          ? {
              id: crmRulesSetting.updatedBy.id,
              name: crmRulesSetting.updatedBy.name,
              roleName: crmRulesSetting.updatedBy.role.name
            }
          : null
      },
      roleOptions: roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name
      })),
      flowPreview: APPROVAL_RULE_TEMPLATES.map((item) => ({
        code: item.code,
        title: item.name,
        description: item.description
      })),
      crmFlowPreview: [
        {
          code: "customer-claim",
          title: "负责客户申请",
          description: "到期待维护后，销售可提交负责客户申请，系统按 CRM 规则判断是否必须补近期待跟进并进入审批。"
        },
        {
          code: "customer-extension",
          title: "延长保护期申请",
          description: "当前负责人可申请延长保护期，系统按 CRM 规则判断是否直接生效或提交审批。"
        },
        {
          code: "customer-transfer",
          title: "负责人转移申请",
          description:
            "客户编辑页调整负责人后，系统会按 CRM 规则与转移审批配置决定是否直接生效，或提交给指定审批角色处理。"
        }
      ]
    };
  }

  async updateApprovalRule(id: string, dto: UpdateApprovalRuleDto, currentUser: AuthenticatedUser) {
    const rule = await this.prisma.approvalRule.findUnique({
      where: { id }
    });

    if (!rule) {
      throw new NotFoundException("审批规则不存在");
    }

    await this.prisma.approvalRule.update({
      where: { id },
      data: {
        enabled: dto.enabled,
        configJson: dto.configJson as any,
        updatedByUserId: currentUser.id
      }
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "权限",
      targetType: "ApprovalRule",
      targetId: id,
      targetName: rule.name,
      content: "更新审批规则",
      afterSummary: JSON.stringify(dto.configJson)
    });

    return this.listApprovalRules();
  }

  async updateCrmRules(dto: UpdateCrmRulesDto, currentUser: AuthenticatedUser) {
    const setting = await this.crmRulesService.updateRules(
      dto.configJson,
      currentUser.id
    );

    await this.auditService.log({
      userId: currentUser.id,
      action: "UPDATE",
      module: "权限",
      targetType: "SystemSetting",
      targetId: setting.id,
      targetName: "CRM 归属规则",
      content: "更新 CRM 归属规则",
      afterSummary: JSON.stringify(setting.configJson)
    });

    return this.listApprovalRules();
  }

  async listAuditLogs(query: AuditLogQueryDto) {
    const dateRange = toDateRange(query.startDate, query.endDate);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(dateRange ? { createdAt: dateRange } : {}),
      ...(query.keyword
        ? {
            OR: [
              { content: { contains: query.keyword } },
              { targetName: { contains: query.keyword } },
              { afterSummary: { contains: query.keyword } }
            ]
          }
        : {})
    };

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        user: {
          include: {
            role: true
          }
        }
      }
    });

    const users = await this.prisma.user.findMany({
      orderBy: { name: "asc" },
      include: { role: true }
    });

    return {
      items: logs.map((item) => this.serializeAuditLog(item)),
      filters: {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          roleName: user.role.name
        })),
        modules: this.uniqueValues(logs.map((log) => log.module)),
        actions: this.uniqueValues(logs.map((log) => log.action)),
        results: this.uniqueValues(logs.map((log) => log.result)),
        sources: this.uniqueValues(logs.map((log) => log.source))
      }
    };
  }

  async getWecomMonitor(query: WecomMonitorQueryDto) {
    const keyword = query.keyword?.trim();
    const syncStatus = this.normalizeWecomSyncStatus(query.status);
    const calendarWhere: Prisma.WecomCalendarSyncWhereInput = {
      ...(syncStatus ? { syncStatus } : {}),
      ...(keyword
        ? {
            OR: [
              { scheduleId: { contains: keyword } },
              { calendarId: { contains: keyword } },
              { lastSyncError: { contains: keyword } },
              { task: { is: { title: { contains: keyword } } } },
              { task: { is: { assignee: { is: { name: { contains: keyword } } } } } }
            ]
          }
        : {})
    };

    const [calendarSyncs, callbacks, wecomNotifications, calendarSummary, callbackSummary] =
      await Promise.all([
        this.prisma.wecomCalendarSync.findMany({
          where: calendarWhere,
          orderBy: { updatedAt: "desc" },
          take: 80,
          include: {
            task: {
              include: {
                assignee: true
              }
            }
          }
        }),
        this.prisma.wecomCallbackLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 60
        }),
        this.prisma.notification.findMany({
          where: {
            sendChannel: NotificationChannel.WECOM,
            ...(keyword
              ? {
                  OR: [
                    { title: { contains: keyword } },
                    { content: { contains: keyword } }
                  ]
                }
              : {})
          },
          orderBy: { createdAt: "desc" },
          take: 60,
          include: {
            user: true
          }
        }),
        this.prisma.wecomCalendarSync.groupBy({
          by: ["syncStatus"],
          _count: { _all: true }
        }),
        this.prisma.wecomCallbackLog.groupBy({
          by: ["status"],
          _count: { _all: true }
        })
      ]);

    return {
      summary: {
        calendar: this.buildCountMap(calendarSummary, "syncStatus"),
        callbacks: this.buildCountMap(callbackSummary, "status"),
        notifications: {
          failed: wecomNotifications.filter(
            (item) => item.sendStatus === NotificationSendStatus.FAILED
          ).length,
          sent: wecomNotifications.filter(
            (item) => item.sendStatus === NotificationSendStatus.SENT
          ).length,
          pending: wecomNotifications.filter(
            (item) => item.sendStatus === NotificationSendStatus.PENDING
          ).length
        }
      },
      calendarSyncs: calendarSyncs.map((item) => ({
        id: item.id,
        taskId: item.taskId,
        taskTitle: item.task?.title ?? "已删除日程",
        assigneeName: item.task?.assignee?.wecomName ?? item.task?.assignee?.name ?? null,
        assigneeWecomUserId: item.task?.assignee?.wecomUserId ?? null,
        calendarId: item.calendarId,
        scheduleId: item.scheduleId,
        syncStatus: item.syncStatus,
        lastSyncError: item.lastSyncError,
        retryCount: item.retryCount,
        lastSyncedAt: item.lastSyncedAt,
        updatedAt: item.updatedAt
      })),
      callbacks: callbacks.map((item) => ({
        id: item.id,
        event: item.event,
        changeType: item.changeType,
        fromUserId: item.fromUserId,
        agentId: item.agentId,
        status: item.status,
        error: item.error,
        createdAt: item.createdAt
      })),
      notifications: wecomNotifications.map((item) => ({
        id: item.id,
        userName: item.user.wecomName ?? item.user.name,
        title: item.title,
        type: item.type,
        sendStatus: item.sendStatus,
        sentAt: item.sentAt,
        createdAt: item.createdAt
      }))
    };
  }

  async retryWecomCalendarSync(id: string, currentUser: AuthenticatedUser) {
    const sync = await this.prisma.wecomCalendarSync.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            assignee: true
          }
        }
      }
    });

    if (!sync) {
      throw new NotFoundException("企业微信日历同步记录不存在");
    }

    if (!sync.task) {
      throw new NotFoundException("关联日程已删除，无法重试同步");
    }

    await this.wecomCalendarService.syncTask(sync.task);

    await this.auditService.log({
      userId: currentUser.id,
      action: "WECOM_CALENDAR_RETRY",
      module: "企业微信",
      targetType: "WecomCalendarSync",
      targetId: sync.id,
      targetName: sync.task.title,
      content: "重试企业微信日历同步"
    });

    return this.prisma.wecomCalendarSync.findUnique({
      where: { id }
    });
  }

  async retryFailedWecomCalendarSyncs(currentUser: AuthenticatedUser) {
    const result = await this.wecomCalendarService.retryPendingAndFailed(30);

    await this.auditService.log({
      userId: currentUser.id,
      action: "WECOM_CALENDAR_RETRY_FAILED",
      module: "企业微信",
      targetType: "WecomCalendarSync",
      content: `批量重试企业微信日历同步：扫描 ${result.scanned}，重试 ${result.retried}，成功 ${result.synced}，失败 ${result.failed}，跳过 ${result.skipped}`
    });

    return result;
  }

  private async syncRolePermissions(roleId: string, permissionCodes: string[]) {
    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: permissionCodes }
      }
    });

    await this.prisma.rolePermission.deleteMany({
      where: { roleId }
    });

    if (!permissions.length) {
      return;
    }

    await this.prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permissionId: permission.id
      }))
    });
  }

  private buildPermissionCatalog() {
    const grouped = new Map<string, Array<{ module: string; code: string; name: string }>>();

    for (const permission of PERMISSION_DEFINITIONS) {
      const category = permission.category;
      const items = grouped.get(category) ?? [];
      items.push({
        module: permission.module,
        code: permission.code,
        name: permission.name
      });
      grouped.set(category, items);
    }

    return Array.from(grouped.entries()).map(([category, items]) => ({
      category,
      modules: this.groupByModule(items)
    }));
  }

  private groupByModule(items: Array<{ module: string; code: string; name: string }>) {
    const grouped = new Map<string, Array<{ code: string; name: string }>>();

    for (const item of items) {
      const moduleItems = grouped.get(item.module) ?? [];
      moduleItems.push({ code: item.code, name: item.name });
      grouped.set(item.module, moduleItems);
    }

    return Array.from(grouped.entries()).map(([module, permissions]) => ({
      module,
      permissions
    }));
  }

  private normalizeWecomSyncStatus(status?: string) {
    if (!status || status === "all") {
      return undefined;
    }

    return Object.values(WecomSyncStatus).includes(status as WecomSyncStatus)
      ? (status as WecomSyncStatus)
      : undefined;
  }

  private buildCountMap<T extends Record<string, unknown>>(
    items: Array<T & { _count: { _all: number } }>,
    key: keyof T
  ) {
    return Object.fromEntries(
      items.map((item) => [String(item[key]), item._count._all])
    );
  }

  private serializeMember(member: any) {
    const permissionCodes = member.role.rolePermissions.map((item: any) => item.permission.code);
    return {
      id: member.id,
      name: member.name,
      loginAccount: member.loginAccount,
      mobile: member.mobile,
      email: member.email,
      wecomUserId: member.wecomUserId,
      wecomName: member.wecomName,
      wecomAvatar: member.wecomAvatar,
      department: member.department,
      title: member.title,
      dataScope: member.dataScope,
      dataScopeLabel: DATA_SCOPE_LABELS[member.dataScope as DataScope],
      status: member.status,
      role: {
        id: member.role.id,
        code: member.role.code,
        name: member.role.name
      },
      manager: member.manager
        ? {
            id: member.manager.id,
            name: member.manager.name
          }
        : null,
      createdByUser: member.createdByUser
        ? {
            id: member.createdByUser.id,
            name: member.createdByUser.name
          }
        : null,
      lastLoginAt: member.lastLoginAt,
      createdAt: member.createdAt,
      permissionCodes,
      permissionSummary: this.accessControl.summarizePermissions(permissionCodes)
    };
  }

  private serializeAuditLog(log: any) {
    const riskLevel =
      log.module === "权限" ||
      ["DELETE", "RESET_PASSWORD", "WECOM_BIND", "WECOM_UNBIND", "EXPORT", "DISABLE", "REJECT", "TRANSFER"].includes(log.action) ||
      (log.module === "成员" && log.action === "STATUS")
        ? "HIGH"
        : ["UPDATE", "APPROVE", "CREATE", "SUBMIT"].includes(log.action)
          ? "MEDIUM"
          : "NORMAL";

    return {
      id: log.id,
      createdAt: log.createdAt,
      action: log.action,
      module: log.module,
      targetType: log.targetType,
      targetId: log.targetId,
      targetName: log.targetName,
      result: log.result,
      content: log.content,
      beforeSummary: log.beforeSummary,
      afterSummary: log.afterSummary,
      source: log.source,
      riskLevel,
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            roleName: log.user.role?.name
          }
        : null
    };
  }

  private uniqueValues(values: Array<string | null | undefined>) {
    return Array.from(new Set(values.filter(Boolean) as string[]));
  }

  private mergeUserWhere(baseWhere: Prisma.UserWhereInput, nextWhere: Prisma.UserWhereInput) {
    if (!Object.keys(baseWhere).length) {
      return nextWhere;
    }

    return {
      AND: [baseWhere, nextWhere]
    };
  }
}
