import { IsEnum, IsOptional, IsString } from "class-validator";
import { NotificationChannel } from "@prisma/client";

export class SendNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;

  @IsEnum(NotificationChannel)
  sendChannel!: NotificationChannel;
}
