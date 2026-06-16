import { Body, Controller, Get, Patch, Req } from "@nestjs/common";
import type { Request } from "express";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { SettingsService } from "./settings.service";
import { UpdateSystemSettingsDto } from "./dto/settings.dto";
import { UpdateShiftRosterDto } from "./dto/shift-roster.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Permissions("page.settings.overview")
  @Get("overview")
  async overview() {
    return this.settingsService.getOverview();
  }

  @Permissions("page.settings.overview")
  @Patch("overview")
  async updateOverview(
    @Body() dto: UpdateSystemSettingsDto,
    @Req() req: RequestWithUser
  ) {
    return this.settingsService.updateOverview(dto, req.user);
  }

  @Permissions("page.schedule.center")
  @Get("shift-roster")
  async getShiftRoster() {
    return this.settingsService.getShiftRoster();
  }

  @Permissions("action.schedule.update")
  @Patch("shift-roster")
  async updateShiftRoster(
    @Body() dto: UpdateShiftRosterDto,
    @Req() req: RequestWithUser
  ) {
    return this.settingsService.updateShiftRoster(dto, req.user);
  }
}
