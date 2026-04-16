import { Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStatus, DataScope, Prisma, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { AccessControlService } from "../common/services/access-control.service";
import { ApprovalService } from "../common/services/approval.service";
import { AuditService } from "../common/services/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  APPROVAL_RULE_TEMPLATES,
  DATA_SCOPE_LABELS,
  PERMISSION_DEFINITIONS,
  SYSTEM_ROLE_DEFINITIONS
} from "./management.constants";
import {
  AuditLogQueryDto,
  CreateMemberDto,
  CreateRoleDto,
  MemberQueryDto,
  ResetPasswordDto,
  UpdateApprovalRuleDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
  UpdateRoleDto
} from "./dto/management.dto";

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

@Injectable()
export class ManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly approvalService: ApprovalService,
    private readonly auditService: AuditService
  ) {}

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

    const [memberTotal, activeMemberCount, monthlyNewMembers, pendingApprovals, permissionChanges, recentRiskLogs, recentExports, recentDisabledAccounts] =
      await Promise.all([
        this.prisma.user.count({ where: membersWhere }),
        this.prisma.user.count({
          where: this.mergeUserWhere(membersWhere, { status: UserStatus.ACTIVE })
        }),
        this.prisma.user.count({
          where: this.mergeUserWhere(membersWhere, { createdAt: { gte: startOfMonth } })
        }),
        currentUser.roleCode === "SUPER_ADMIN" || currentUser.roleCode === "ADMIN"
          ? this.prisma.approvalRequest.count({
              where: { status: ApprovalStatus.PENDING }
            })
          : this.prisma.approvalRequest.count({
              where: {
                status: ApprovalStatus.PENDING,
                OR: [{ requiredRoleCode: currentUser.roleCode }, { requiredRoleCode: null }]
              }
            }),
        this.prisma.auditLog.count({
          where: {
            module: "权限",
            createdAt: { gte: startOfMonth }
          }
        }),
        this.prisma.auditLog.findMany({
          where: {
            OR: [
              { action: "DELETE" },
              { action: "DISABLE" },
              { action: "REJECT" },
              { action: "TRANSFER" }
            ]
          },
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

    const pendingApprovalItems =
      currentUser.roleCode === "SUPER_ADMIN" || currentUser.roleCode === "ADMIN"
        ? await this.prisma.approvalRequest.findMany({
            where: { status: ApprovalStatus.PENDING },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              requester: { include: { role: true } },
              quotation: { include: { customer: true } }
            }
          })
        : await this.approvalService.listPendingForRoleCodes([currentUser.roleCode], 5);

    return {
      memberTotal,
      activeMemberCount,
      monthlyNewMembers,
      pendingApprovalCount: pendingApprovals,
      permissionChangeCount: permissionChanges,
      recentRiskLogs: recentRiskLogs.map((item) => this.serializeAuditLog(item)),
      recentExportRecords: recentExports.map((item) => this.serializeAuditLog(item)),
      recentDisabledAccounts: recentDisabledAccounts.map((item) => this.serializeAuditLog(item)),
      pendingApprovalItems: pendingApprovalItems.map((item) => ({
        id: item.id,
        type: item.type,
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
        { key: "members", label: "新增成员", href: "/management/members" },
        { key: "roles", label: "配置角色", href: "/management/roles" },
        { key: "rules", label: "设置审批规则", href: "/management/approvals" },
        { key: "logs", label: "查看日志", href: "/management/logs" }
      ],
      visibleMemberIds: memberIds
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
              { loginAccount: { contains: query.keyword } }
            ]
          }
        : {}),
      ...(query.department ? { department: query.department } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dataScope ? { dataScope: query.dataScope } : {}),
      ...(query.roleCode ? { role: { code: query.roleCode } } : {})
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
        permissionCodes: role.rolePermissions.map((item) => item.permission.code)
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
    const rules = await this.prisma.approvalRule.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        updatedBy: {
          include: {
            role: true
          }
        }
      }
    });

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
      flowPreview: APPROVAL_RULE_TEMPLATES.map((item) => ({
        code: item.code,
        title: item.name,
        description: item.description
      }))
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

  async listAuditLogs(query: AuditLogQueryDto) {
    const dateRange = toDateRange(query.startDate, query.endDate);
    const where: Prisma.AuditLogWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.result ? { result: query.result } : {}),
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
        results: this.uniqueValues(logs.map((log) => log.result))
      }
    };
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

  private serializeMember(member: any) {
    const permissionCodes = member.role.rolePermissions.map((item: any) => item.permission.code);
    return {
      id: member.id,
      name: member.name,
      loginAccount: member.loginAccount,
      mobile: member.mobile,
      email: member.email,
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
    return {
      id: log.id,
      createdAt: log.createdAt,
      action: log.action,
      module: log.module,
      targetName: log.targetName,
      result: log.result,
      content: log.content,
      beforeSummary: log.beforeSummary,
      afterSummary: log.afterSummary,
      source: log.source,
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
