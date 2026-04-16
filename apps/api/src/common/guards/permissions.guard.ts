import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AccessControlService } from "../services/access-control.service";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import type { AuthenticatedUser } from "../types/authenticated-user";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService
  ) {}

  canActivate(context: ExecutionContext) {
    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!permissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new ForbiddenException("未获取到登录身份");
    }

    const missingPermission = permissions.find(
      (permissionCode) => !this.accessControl.hasPermission(request.user, permissionCode)
    );

    if (missingPermission) {
      throw new ForbiddenException("当前账号无权执行该操作");
    }

    return true;
  }
}
