import { ForbiddenException, Injectable } from "@nestjs/common";
import { DataScope, Prisma, UserStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../types/authenticated-user";
import { PrismaService } from "../../prisma/prisma.service";
import { RecordPartitionService } from "./record-partition.service";

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recordPartition: RecordPartitionService,
  ) {}

  hasPermission(
    user: Pick<AuthenticatedUser, "roleCode" | "permissions">,
    permissionCode: string,
  ) {
    if (user.roleCode === "SUPER_ADMIN") {
      return true;
    }

    return user.permissions.includes(permissionCode);
  }

  assertPermission(
    user: Pick<AuthenticatedUser, "roleCode" | "permissions">,
    permissionCode: string,
    message = "当前账号没有该操作权限",
  ) {
    if (!this.hasPermission(user, permissionCode)) {
      throw new ForbiddenException(message);
    }
  }

  getEffectiveDataScope(
    user: Pick<AuthenticatedUser, "roleCode" | "dataScope">,
  ) {
    if (user.roleCode === "SUPER_ADMIN") {
      return DataScope.ALL;
    }

    return user.dataScope ?? DataScope.OWNED;
  }

  async buildCustomerWhere(
    user: AuthenticatedUser,
    baseWhere: Prisma.CustomerWhereInput = {},
  ): Promise<Prisma.CustomerWhereInput> {
    return this.mergeWhere(
      await this.getCustomerScopeWhere(user),
      this.mergeWhere(
        this.recordPartition.buildWhere(user) as Prisma.CustomerWhereInput,
        baseWhere,
      ),
    );
  }

  async buildQuotationWhere(
    user: AuthenticatedUser,
    baseWhere: Prisma.QuotationWhereInput = {},
  ): Promise<Prisma.QuotationWhereInput> {
    return this.mergeWhere(
      await this.getQuotationScopeWhere(user),
      this.mergeWhere(
        this.recordPartition.buildWhere(user) as Prisma.QuotationWhereInput,
        baseWhere,
      ),
    );
  }

  async buildInspectionWhere(
    user: AuthenticatedUser,
    baseWhere: Prisma.InspectionOrderWhereInput = {},
  ): Promise<Prisma.InspectionOrderWhereInput> {
    return this.mergeWhere(
      await this.getInspectionScopeWhere(user),
      this.mergeWhere(
        this.recordPartition.buildWhere(user) as Prisma.InspectionOrderWhereInput,
        baseWhere,
      ),
    );
  }

  async buildTaskWhere(
    user: AuthenticatedUser,
    baseWhere: Prisma.TaskWhereInput = {},
  ): Promise<Prisma.TaskWhereInput> {
    return this.mergeWhere(
      await this.getTaskScopeWhere(user),
      this.mergeWhere(
        this.recordPartition.buildWhere(user) as Prisma.TaskWhereInput,
        baseWhere,
      ),
    );
  }

  async buildMemberVisibilityWhere(
    user: AuthenticatedUser,
    baseWhere: Prisma.UserWhereInput = {},
  ): Promise<Prisma.UserWhereInput> {
    const scope = this.getEffectiveDataScope(user);

    if (scope === DataScope.ALL || user.roleCode === "ADMIN") {
      return baseWhere;
    }

    if (scope === DataScope.DEPARTMENT && user.department) {
      return this.mergeWhere({ department: user.department }, baseWhere);
    }

    if (scope === DataScope.TEAM) {
      const ids = await this.getTeamUserIds(user.id);
      return this.mergeWhere({ id: { in: ids } }, baseWhere);
    }

    return this.mergeWhere({ id: user.id }, baseWhere);
  }

  async getClaimableCustomerOwnerIds(user: AuthenticatedUser) {
    const scope = this.getEffectiveDataScope(user);

    if (scope === DataScope.ALL) {
      return undefined;
    }

    if (scope === DataScope.DEPARTMENT && user.department) {
      const members = await this.prisma.user.findMany({
        where: { department: user.department, status: UserStatus.ACTIVE },
        select: { id: true },
      });
      return members.map((member) => member.id);
    }

    if (scope === DataScope.TEAM) {
      return this.getTeamUserIds(user.id);
    }

    if (scope === DataScope.OWNED) {
      const teamRootId = user.managerUserId ?? user.id;
      return this.getTeamUserIds(teamRootId);
    }

    return [user.id];
  }

  async getAssignableUsers(user: AuthenticatedUser) {
    const where = await this.buildMemberVisibilityWhere(user, {
      status: UserStatus.ACTIVE,
    });
    return this.prisma.user.findMany({
      where,
      orderBy: [{ department: "asc" }, { name: "asc" }],
      include: { role: true },
    });
  }

  summarizePermissions(permissionCodes: string[]) {
    const permissions = new Set(permissionCodes);
    return {
      canExportPdf: permissions.has("action.quotation.export_pdf"),
      canApproveDiscount:
        permissions.has("action.quotation.approve") ||
        permissions.has("action.quotation.reject"),
      canViewAllCustomers: permissions.has("action.customer.view_all"),
      canOpenManagement: permissions.has("menu.management"),
    };
  }

  private async getCustomerScopeWhere(
    user: AuthenticatedUser,
  ): Promise<Prisma.CustomerWhereInput> {
    const scope = this.getEffectiveDataScope(user);
    const now = new Date();

    if (scope === DataScope.ALL) {
      return {};
    }

    if (scope === DataScope.DEPARTMENT && user.department) {
      return {
        owner: {
          department: user.department,
        },
      };
    }

    if (scope === DataScope.TEAM) {
      return {
        ownerUserId: {
          in: await this.getTeamUserIds(user.id),
        },
      };
    }

    if (scope === DataScope.PARTICIPATED) {
      return {
        OR: [
          { ownerUserId: user.id },
          { followups: { some: { creatorUserId: user.id } } },
          {
            tasks: {
              some: {
                OR: [{ assigneeUserId: user.id }, { createdBy: user.id }],
              },
            },
          },
          { quotations: { some: { creatorUserId: user.id } } },
        ],
      };
    }

    const claimableOwnerIds = await this.getClaimableCustomerOwnerIds(user);

    if (!claimableOwnerIds?.length) {
      return {
        ownerUserId: user.id,
      };
    }

    return {
      OR: [
        { ownerUserId: user.id },
        {
          ownerUserId: { in: claimableOwnerIds },
          ownerProtectedUntil: { lte: now },
        },
      ],
    };
  }

  private async getQuotationScopeWhere(
    user: AuthenticatedUser,
  ): Promise<Prisma.QuotationWhereInput> {
    const scope = this.getEffectiveDataScope(user);

    if (scope === DataScope.ALL) {
      return {};
    }

    if (scope === DataScope.DEPARTMENT && user.department) {
      return {
        OR: [
          { creator: { department: user.department } },
          { customer: { owner: { department: user.department } } },
        ],
      };
    }

    if (scope === DataScope.TEAM) {
      const ids = await this.getTeamUserIds(user.id);
      return {
        OR: [
          { creatorUserId: { in: ids } },
          { customer: { ownerUserId: { in: ids } } },
        ],
      };
    }

    if (scope === DataScope.PARTICIPATED) {
      return {
        OR: [
          { creatorUserId: user.id },
          { customer: { ownerUserId: user.id } },
          {
            tasks: {
              some: {
                OR: [{ assigneeUserId: user.id }, { createdBy: user.id }],
              },
            },
          },
        ],
      };
    }

    return {
      OR: [{ creatorUserId: user.id }, { customer: { ownerUserId: user.id } }],
    };
  }

  private async getTaskScopeWhere(
    user: AuthenticatedUser,
  ): Promise<Prisma.TaskWhereInput> {
    const scope = this.getEffectiveDataScope(user);

    if (scope === DataScope.ALL) {
      return {};
    }

    if (scope === DataScope.DEPARTMENT && user.department) {
      return {
        OR: [
          { assignee: { department: user.department } },
          { creator: { department: user.department } },
          { customer: { owner: { department: user.department } } },
          { quotation: { creator: { department: user.department } } },
          {
            quotation: { customer: { owner: { department: user.department } } },
          },
        ],
      };
    }

    if (scope === DataScope.TEAM) {
      const ids = await this.getTeamUserIds(user.id);
      return {
        OR: [
          { assigneeUserId: { in: ids } },
          { createdBy: { in: ids } },
          { customer: { ownerUserId: { in: ids } } },
          { quotation: { creatorUserId: { in: ids } } },
          { quotation: { customer: { ownerUserId: { in: ids } } } },
        ],
      };
    }

    if (scope === DataScope.PARTICIPATED) {
      return {
        OR: [
          { assigneeUserId: user.id },
          { createdBy: user.id },
          { customer: { ownerUserId: user.id } },
          { quotation: { creatorUserId: user.id } },
          { quotation: { customer: { ownerUserId: user.id } } },
        ],
      };
    }

    return {
      OR: [{ assigneeUserId: user.id }, { createdBy: user.id }],
    };
  }

  private async getInspectionScopeWhere(
    user: AuthenticatedUser,
  ): Promise<Prisma.InspectionOrderWhereInput> {
    const scope = this.getEffectiveDataScope(user);

    if (scope === DataScope.ALL) {
      return {};
    }

    if (scope === DataScope.DEPARTMENT && user.department) {
      return {
        OR: [
          { creator: { department: user.department } },
          { customer: { owner: { department: user.department } } },
        ],
      };
    }

    if (scope === DataScope.TEAM) {
      const ids = await this.getTeamUserIds(user.id);
      return {
        OR: [
          { createdByUserId: { in: ids } },
          { customer: { ownerUserId: { in: ids } } },
        ],
      };
    }

    return {
      OR: [{ createdByUserId: user.id }, { customer: { ownerUserId: user.id } }],
    };
  }

  private async getTeamUserIds(userId: string) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        managerUserId: true,
      },
    });

    const queue = [userId];
    const collected = new Set<string>([userId]);

    while (queue.length) {
      const current = queue.shift();

      for (const user of users) {
        if (user.managerUserId !== current || collected.has(user.id)) {
          continue;
        }

        collected.add(user.id);
        queue.push(user.id);
      }
    }

    return Array.from(collected);
  }

  private mergeWhere<
    T extends
      | Prisma.CustomerWhereInput
      | Prisma.InspectionOrderWhereInput
      | Prisma.QuotationWhereInput
      | Prisma.TaskWhereInput
      | Prisma.UserWhereInput,
  >(scopeWhere: T, baseWhere: T) {
    const hasScope = Object.keys(scopeWhere).length > 0;
    const hasBase = Object.keys(baseWhere).length > 0;

    if (hasScope && hasBase) {
      return {
        AND: [scopeWhere, baseWhere],
      } as T;
    }

    if (hasScope) {
      return scopeWhere;
    }

    return baseWhere;
  }
}
