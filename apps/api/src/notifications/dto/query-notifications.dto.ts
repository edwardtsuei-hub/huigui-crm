import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

const notificationStatuses = ["all", "unread", "read"] as const;
const notificationChannels = ["all", "SYSTEM", "WECOM"] as const;
const notificationSendStatuses = ["all", "PENDING", "SENT", "FAILED"] as const;

export type NotificationFilterStatus = (typeof notificationStatuses)[number];
export type NotificationFilterChannel = (typeof notificationChannels)[number];
export type NotificationFilterSendStatus = (typeof notificationSendStatuses)[number];

export class QueryNotificationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsIn(notificationStatuses)
  status?: NotificationFilterStatus;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(notificationChannels)
  channel?: NotificationFilterChannel;

  @IsOptional()
  @IsIn(notificationSendStatuses)
  sendStatus?: NotificationFilterSendStatus;
}
