import { Controller, Get, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { MetaService } from "./meta.service";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("meta")
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get("industries")
  async industries() {
    return this.metaService.getIndustries();
  }

  @Get("users")
  @Permissions("page.customers.list")
  async users(@Req() req: RequestWithUser) {
    return this.metaService.getUsers(req.user);
  }

  @Get("dashboard")
  @Permissions("page.dashboard.home")
  async dashboard(@Req() req: RequestWithUser) {
    return this.metaService.getDashboard(req.user);
  }
}

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly metaService: MetaService) {}

  @Get("summary")
  @Permissions("page.dashboard.home")
  async summary(@Req() req: RequestWithUser) {
    return this.metaService.getDashboard(req.user);
  }
}

@Controller("industry-groups")
export class IndustryGroupsController {
  constructor(private readonly metaService: MetaService) {}

  @Get()
  async list() {
    return this.metaService.getIndustries();
  }
}

@Controller("industry-subgroups")
export class IndustrySubgroupsController {
  constructor(private readonly metaService: MetaService) {}

  @Get()
  async list(@Query("groupId") groupId?: string) {
    return this.metaService.getIndustrySubgroups(groupId);
  }
}
