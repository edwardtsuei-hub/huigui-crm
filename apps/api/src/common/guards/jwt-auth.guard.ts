import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthenticatedUser } from "../types/authenticated-user";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

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
    const tokenFromQuery =
      typeof request.query?.token === "string" ? request.query.token : undefined;

    if (!header?.startsWith("Bearer ") && !tokenFromQuery) {
      throw new UnauthorizedException("请先登录");
    }

    const token = header?.startsWith("Bearer ")
      ? header.replace("Bearer ", "")
      : tokenFromQuery;

    if (!token) {
      throw new UnauthorizedException("请先登录");
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true }
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException("账号不可用");
      }

      request.user = {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        roleCode: user.role.code,
        roleName: user.role.name,
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
