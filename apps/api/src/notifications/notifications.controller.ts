import { Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { NotificationService } from "../modules/notifications/notification.service";
import { QueryNotificationsDto } from "./dto/query-notifications.dto";

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(@Req() req: RequestWithUser, @Query() query: QueryNotificationsDto) {
    return this.notificationService.listForUser(req.user.id, query);
  }

  @Get("summary")
  async summary(@Req() req: RequestWithUser) {
    return this.notificationService.getSummaryForUser(req.user.id);
  }

  @Patch(":id/read")
  async markAsRead(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  @Patch(":id/unread")
  async markAsUnread(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.notificationService.markAsUnread(req.user.id, id);
  }

  @Post("read-all")
  async markAllAsRead(@Req() req: RequestWithUser) {
    return this.notificationService.markAllAsRead(req.user.id);
  }
}
