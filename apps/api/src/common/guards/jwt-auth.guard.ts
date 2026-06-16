import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { RecordDataScope, UserStatus } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthenticatedUser } from "../types/authenticated-user";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

function normalizeRecordScopeHeader(value: unknown) {
  if (typeof value !== "string") {
    return RecordDataScope.REAL;
  }

  return value.trim().toUpperCase() === RecordDataScope.TEST
    ? RecordDataScope.TEST
    : RecordDataScope.REAL;
}

function normalizeBatchHeader(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function canUseTestDataMode(user: {
  role: {
    code: string;
    rolePermissions: Array<{ permission: { code: string } }>;
  };
}) {
  return (
    user.role.code === "SUPER_ADMIN" ||
    user.role.rolePermissions.some((item) => item.permission.code === "menu.management")
  );
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("请先登录");
    }

    const token = header.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedException("请先登录");
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
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

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException("账号不可用");
      }

      const requestedRecordScope = normalizeRecordScopeHeader(
        request.headers["x-huigui-record-scope"],
      );
      const recordDataScope =
        requestedRecordScope === RecordDataScope.TEST && canUseTestDataMode(user)
          ? RecordDataScope.TEST
          : RecordDataScope.REAL;

      request.user = {
        id: user.id,
        name: user.name,
        loginAccount: user.loginAccount,
        mobile: user.mobile,
        email: user.email,
        department: user.department,
        title: user.title,
        managerUserId: user.managerUserId,
        dataScope: user.dataScope,
        recordDataScope,
        testBatchId:
          recordDataScope === RecordDataScope.TEST
            ? normalizeBatchHeader(request.headers["x-huigui-test-batch-id"])
            : null,
        roleCode: user.role.code,
        roleName: user.role.name,
        permissions: user.role.rolePermissions.map((item) => item.permission.code),
        wecomUserId: user.wecomUserId,
        wecomName: user.wecomName,
        wecomAvatar: user.wecomAvatar
      };

      return true;
    } catch {
      throw new UnauthorizedException("登录态已失效");
    }
  }
}
