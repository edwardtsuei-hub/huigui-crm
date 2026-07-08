import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, UserStatus } from "@prisma/client";
import { AuditService } from "../../common/services/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { WecomService } from "./wecom.service";

const userWithRoleInclude = {
  role: {
    include: {
      rolePermissions: {
        include: {
          permission: true
        }
      }
    }
  }
} satisfies Prisma.UserInclude;

type UserWithRole = Prisma.UserGetPayload<{
  include: typeof userWithRoleInclude;
}>;

type WecomIdentityResponse = {
  UserId?: string;
  userid?: string;
  OpenId?: string;
  openid?: string;
  DeviceId?: string;
  external_userid?: string;
  user_ticket?: string;
};

type WecomUserProfileResponse = {
  userid: string;
  name?: string;
  avatar?: string;
  mobile?: string;
  email?: string;
};

type EmployeeIdentityMapEntry = {
  identityId?: string;
  userId?: string;
  userid?: string;
  employeeId?: string;
  name?: string;
  displayName?: string;
  role?: string;
  roleCode?: string;
  department?: string;
  modules?: string[];
  moduleScopes?: string[];
  permissions?: string[];
};

@Injectable()
export class WecomAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly wecomService: WecomService,
    private readonly auditService: AuditService
  ) {}

  getClientConfig(origin?: string) {
    return this.wecomService.getClientConfig(origin);
  }

  async loginWithCode(code: string, origin?: string) {
    const profile = await this.getProfileByCode(code, origin);
    const user = await this.resolveSystemUser(profile);
    if (!user) {
      throw new ForbiddenException("当前企业微信账号未绑定系统用户，请联系管理员");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("账号不存在或不可用");
    }

    const loggedInUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date()
      },
      include: userWithRoleInclude
    });

    return this.buildAuthPayload(loggedInUser);
  }

  async loginWithOAuthCallback(code: string, state?: string, origin?: string) {
    const payload = await this.loginWithCode(code, origin);
    const user = payload.user;
    const fallbackUserId = user.wecomUserId ?? user.loginAccount ?? user.id;
    const mappedIdentity = this.resolveMappedEmployeeIdentity(fallbackUserId);
    const userId = mappedIdentity?.userId ?? mappedIdentity?.userid ?? mappedIdentity?.employeeId ?? fallbackUserId;
    const moduleScopes = this.mergeModuleScopes(
      this.resolveMappedModuleScopes(mappedIdentity),
      this.resolveEmployeeModuleScopes(
      user.roleCode,
      user.permissions,
      `${user.roleName ?? ""} ${user.department ?? ""} ${user.title ?? ""} ${user.name ?? ""} ${user.wecomName ?? ""} ${user.loginAccount ?? ""}`
      )
    );
    const identityId = mappedIdentity?.identityId ?? this.resolveEmployeeIdentityId(
      user.roleCode,
      user.roleName,
      user.department,
      user.permissions
    );
    const employee = {
      identityId,
      userId,
      userid: userId,
      employeeId: user.id,
      name: mappedIdentity?.name ?? mappedIdentity?.displayName ?? user.wecomName ?? user.name,
      displayName: mappedIdentity?.displayName ?? mappedIdentity?.name ?? user.displayName,
      role: mappedIdentity?.role ?? user.roleName ?? user.roleCode,
      roleCode: mappedIdentity?.roleCode ?? user.roleCode,
      department: mappedIdentity?.department ?? user.department ?? "管理中心",
      modules: moduleScopes,
      moduleScopes,
      permissions: user.permissions,
      loginAccount: user.loginAccount,
      title: user.title,
      wecomUserId: user.wecomUserId,
      wecomName: user.wecomName,
      wecomAvatar: user.wecomAvatar
    };

    return {
      ...payload,
      ok: true,
      mode: "live",
      message: "企业微信登录成功。",
      warnings: [],
      state,
      createdAt: new Date().toISOString(),
      identityId,
      userId,
      userid: userId,
      name: employee.name,
      role: employee.role,
      department: employee.department,
      moduleScopes,
      permissions: user.permissions,
      employee,
      account: user,
      session: {
        accessToken: payload.accessToken,
        token: payload.token
      }
    };
  }

  async bindCurrentUserWithCode(userId: string, code: string, origin?: string) {
    const profile = await this.getProfileByCode(code, origin);
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userWithRoleInclude
    });

    if (!currentUser || currentUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("账号不存在或不可用");
    }

    const boundUser = await this.prisma.user.findUnique({
      where: { wecomUserId: profile.userid },
      select: { id: true, name: true }
    });

    if (boundUser && boundUser.id !== currentUser.id) {
      throw new ForbiddenException(`该企业微信账号已绑定到 ${boundUser.name}，请联系管理员处理`);
    }

    if (currentUser.wecomUserId && currentUser.wecomUserId !== profile.userid) {
      throw new ForbiddenException("当前系统账号已绑定其他企业微信账号，请先联系管理员清除绑定");
    }

    const user = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        wecomUserId: profile.userid,
        wecomName: profile.name,
        wecomAvatar: profile.avatar,
        lastLoginAt: new Date()
      },
      include: userWithRoleInclude
    });

    await this.auditService.log({
      userId: currentUser.id,
      action: "WECOM_BIND",
      module: "成员",
      targetType: "User",
      targetId: currentUser.id,
      targetName: currentUser.name,
      content: "完成企业微信绑定",
      beforeSummary: currentUser.wecomUserId
        ? `企业微信成员: ${currentUser.wecomName ?? currentUser.wecomUserId}`
        : "此前未绑定企业微信",
      afterSummary: `企业微信成员: ${profile.name ?? profile.userid} (${profile.userid})`
    });

    return this.buildAuthPayload(user);
  }

  private async getProfileByCode(code: string, origin?: string) {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      throw new BadRequestException("缺少企业微信授权 code");
    }

    let identity: WecomIdentityResponse & { errcode: number; errmsg: string };
    try {
      identity = await this.wecomService.get<WecomIdentityResponse & { errcode: number; errmsg: string }>(
        "/cgi-bin/auth/getuserinfo",
        { code: trimmedCode },
        origin
      );
    } catch (error) {
      if (this.isInvalidOAuthCodeError(error)) {
        throw new BadRequestException("企业微信授权 code 无效或已过期，请重新发起企业微信登录");
      }
      throw error;
    }

    const wecomUserId = identity.UserId ?? identity.userid;

    if (!wecomUserId) {
      throw new ForbiddenException("未识别到企业微信内部成员身份，请确认应用可见范围和授权方式");
    }

    return this.wecomService.get<WecomUserProfileResponse & { errcode: number; errmsg: string }>(
      "/cgi-bin/user/get",
      { userid: wecomUserId },
      origin
    );
  }

  private async resolveSystemUser(profile: WecomUserProfileResponse) {
    const boundUser = await this.prisma.user.findUnique({
      where: { wecomUserId: profile.userid },
      include: userWithRoleInclude
    });

    if (boundUser) {
      if (
        boundUser.wecomName !== profile.name ||
        boundUser.wecomAvatar !== profile.avatar
      ) {
        return this.prisma.user.update({
          where: { id: boundUser.id },
          data: {
            wecomName: profile.name,
            wecomAvatar: profile.avatar
          },
          include: userWithRoleInclude
        });
      }

      return boundUser;
    }

    const matchConditions: Prisma.UserWhereInput[] = [];
    if (profile.mobile?.trim()) {
      matchConditions.push({ mobile: profile.mobile.trim() });
    }
    if (profile.email?.trim()) {
      matchConditions.push({ email: profile.email.trim() });
    }

    if (!matchConditions.length) {
      return null;
    }

    const candidates = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        OR: matchConditions
      },
      include: userWithRoleInclude
    });

    const uniqueCandidates = Array.from(
      new Map(candidates.map((item) => [item.id, item])).values()
    );

    if (uniqueCandidates.length !== 1) {
      return null;
    }

    const candidate = uniqueCandidates[0];
    if (candidate.wecomUserId && candidate.wecomUserId !== profile.userid) {
      return null;
    }

    return this.prisma.user.update({
      where: { id: candidate.id },
      data: {
        wecomUserId: profile.userid,
        wecomName: profile.name,
        wecomAvatar: profile.avatar
      },
      include: userWithRoleInclude
    });
  }

  private async buildAuthPayload(user: UserWithRole) {
    const permissions = user.role.rolePermissions
      .map((item) => item.permission.code)
      .sort((left, right) => left.localeCompare(right));

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      name: user.name,
      roleCode: user.role.code
    });

    return {
      token: accessToken,
      accessToken,
      user: {
        id: user.id,
        username: user.name,
        displayName: user.wecomName ?? user.name,
        name: user.name,
        loginAccount: user.loginAccount,
        mobile: user.mobile,
        email: user.email,
        department: user.department,
        title: user.title,
        managerUserId: user.managerUserId,
        dataScope: user.dataScope,
        roleCode: user.role.code,
        roleName: user.role.name,
        permissions,
        lastLoginAt: user.lastLoginAt,
        wecomUserId: user.wecomUserId,
        wecomName: user.wecomName,
        wecomAvatar: user.wecomAvatar
      }
    };
  }

  private resolveMappedEmployeeIdentity(userid: string) {
    const map = this.readEmployeeIdentityMap();
    const entry = map[userid];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }

    return entry;
  }

  private readEmployeeIdentityMap(): Record<string, EmployeeIdentityMapEntry> {
    const raw = process.env.WECOM_EMPLOYEE_IDENTITY_MAP?.trim();
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      return parsed as Record<string, EmployeeIdentityMapEntry>;
    } catch {
      return {};
    }
  }

  private resolveMappedModuleScopes(entry: EmployeeIdentityMapEntry | null) {
    const scopes = entry?.moduleScopes ?? entry?.modules ?? entry?.permissions;
    if (!Array.isArray(scopes)) {
      return undefined;
    }

    return scopes.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  private mergeModuleScopes(...scopeGroups: Array<string[] | undefined>) {
    const scopes = new Set<string>();
    scopeGroups.forEach((scopeGroup) => {
      scopeGroup?.forEach((scope) => {
        if (scope.trim()) {
          scopes.add(scope.trim());
        }
      });
    });
    return Array.from(scopes);
  }

  private resolveEmployeeModuleScopes(roleCode: string, permissions: string[], profileText = "") {
    if (roleCode === "SUPER_ADMIN") {
      return ["platform", "schedule", "finance", "daochong", "courses", "bearhug", "ecotech", "products"];
    }

    const scopes = new Set<string>(["platform"]);
    const permissionText = permissions.join(" ");
    const identityText = `${roleCode} ${profileText} ${permissionText}`.toLowerCase();

    if (/schedule|attendance|shift|leave/i.test(permissionText)) {
      scopes.add("schedule");
    }
    if (/finance|payment|expense|order|contract/i.test(permissionText)) {
      scopes.add("finance");
    }
    if (/customer|daochong/i.test(permissionText)) {
      scopes.add("daochong");
    }
    if (/course|courses|课程|課程|光的家园|光的家園/i.test(identityText)) {
      scopes.add("courses");
    }
    if (/sales|bearhug|restaurant|store|kitchen/i.test(identityText)) {
      scopes.add("bearhug");
    }
    if (/ecotech|洄归|洄歸/i.test(identityText)) {
      scopes.add("ecotech");
    }
    if (/ecommerce|电商|電商|product|产品|產品|郭美辰|尹筱娟|yinxiaojuan/i.test(identityText)) {
      scopes.add("products");
      scopes.add("ecommerce");
      scopes.add("ecommerce-manager");
      scopes.add("ecom");
      scopes.add("ecom-weekly");
      scopes.add("ecom-profit");
      scopes.add("work-management");
      scopes.add("work-report");
      scopes.add("weekly-report");
      scopes.add("电商");
      scopes.add("電商");
    }

    return Array.from(scopes);
  }

  private resolveEmployeeIdentityId(
    roleCode: string,
    roleName: string,
    department: string | null,
    permissions: string[]
  ) {
    const text = `${roleCode} ${roleName} ${department ?? ""} ${permissions.join(" ")}`.toLowerCase();

    if (/finance|财务/.test(text)) return "finance_reviewer";
    if (/洄归|洄歸|ecotech|譚喜|谭喜|tanxi|book chen|bookchen/.test(text)) return "ecotech_manager";
    if (/ecommerce|电商|電商|product|产品|產品|郭美辰/.test(text)) return "ecommerce_manager";
    if (/course|课程|光的家园|work-management|weekly|monthly/.test(text)) {
      return "course_coordinator";
    }
    if (/daochong|customer|客户|道冲/.test(text)) return "daochong_manager";
    if (/sales|销售|bearhug|熊抱|餐饮|restaurant|store|kitchen|chef/.test(text)) {
      return "bearhug_manager";
    }
    if (/super_admin|admin|管理|office|办公室|創辦|创办/.test(text)) {
      return "office_admin";
    }

    return "office_admin";
  }

  private isInvalidOAuthCodeError(error: unknown) {
    if (!(error instanceof BadGatewayException)) {
      return false;
    }

    const response = error.getResponse();
    const message = typeof response === "string"
      ? response
      : response && typeof response === "object" && "message" in response
        ? String((response as { message?: unknown }).message ?? "")
        : error.message;

    return /\b40029\b|invalid code/i.test(message);
  }
}
