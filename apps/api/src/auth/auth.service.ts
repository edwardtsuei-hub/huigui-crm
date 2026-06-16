import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/auth.dto";

type UserWithRole = Prisma.UserGetPayload<{
  include: {
    role: {
      include: {
        rolePermissions: {
          include: {
            permission: true;
          };
        };
      };
    };
  };
}>;

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
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { name: dto.username },
          { loginAccount: dto.username },
          { mobile: dto.username },
          { email: dto.username }
        ]
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== UserStatus.ACTIVE || !user.passwordHash) {
      throw new UnauthorizedException("账号不存在或不可用");
    }

    const matched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date()
      }
    });

    return this.buildAuthPayload({
      ...user,
      lastLoginAt: new Date()
    } as UserWithRole);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return this.serializeUser(user);
  }

  buildEmployeeSession(user: AuthenticatedUser) {
    const fallbackUserId = user.wecomUserId ?? user.loginAccount ?? user.id;
    const mappedIdentity = this.resolveMappedEmployeeIdentity(fallbackUserId);
    const userId = mappedIdentity?.userId ?? mappedIdentity?.userid ?? mappedIdentity?.employeeId ?? fallbackUserId;
    const identityId = mappedIdentity?.identityId ?? user.wecomUserId ?? user.id;
    const moduleScopes = this.resolveMappedModuleScopes(mappedIdentity) ?? this.resolveEmployeeModuleScopes(user);

    return {
      authenticated: true,
      checkedAt: new Date().toISOString(),
      message: "已恢復正式員工會話。",
      userid: userId,
      identityId,
      role: mappedIdentity?.role ?? user.roleName ?? user.roleCode,
      department: mappedIdentity?.department ?? user.department ?? "管理中心",
      name: mappedIdentity?.name ?? mappedIdentity?.displayName ?? user.wecomName ?? user.name,
      moduleScopes,
      permissions: user.permissions,
      employee: {
        identityId,
        userId,
        userid: userId,
        name: mappedIdentity?.name ?? mappedIdentity?.displayName ?? user.wecomName ?? user.name,
        displayName: mappedIdentity?.displayName ?? mappedIdentity?.name ?? user.wecomName ?? user.name,
        role: mappedIdentity?.role ?? user.roleName ?? user.roleCode,
        roleCode: mappedIdentity?.roleCode ?? user.roleCode,
        department: mappedIdentity?.department ?? user.department ?? "管理中心",
        moduleScopes,
        permissions: user.permissions,
        loginAccount: user.loginAccount,
        title: user.title,
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

  private async buildAuthPayload(user: NonNullable<UserWithRole>) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      name: user.name,
      roleCode: user.role.code
    });

    return {
      token: accessToken,
      accessToken,
      user: this.serializeUser(user)
    };
  }

  private serializeUser(user: NonNullable<UserWithRole>) {
    const permissions = user.role.rolePermissions
      .map((item) => item.permission.code)
      .sort((left, right) => left.localeCompare(right));

    return {
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
    };
  }

  private resolveEmployeeModuleScopes(user: AuthenticatedUser) {
    if (user.roleCode === "SUPER_ADMIN") {
      return ["platform", "schedule", "finance", "daochong", "courses", "ecotech", "products"];
    }

    const scopes = new Set<string>(["platform"]);
    const permissionText = user.permissions.join(" ");
    const identityText = `${user.roleCode} ${user.roleName} ${user.department ?? ""} ${user.title ?? ""} ${user.name} ${user.wecomName ?? ""} ${user.loginAccount ?? ""} ${permissionText}`.toLowerCase();

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
    if (/洄归|洄歸|ecotech|譚喜|谭喜|tanxi|book chen|bookchen/i.test(identityText)) {
      scopes.add("ecotech");
    }
    if (/ecommerce|电商|電商|产品|產品|product|郭美辰/i.test(identityText)) {
      scopes.add("products");
    }

    return Array.from(scopes);
  }
}
