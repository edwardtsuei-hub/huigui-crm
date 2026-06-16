import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";

export class UpdateCompanyProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsString()
  servicePhone?: string;

  @IsOptional()
  @IsString()
  supportWechat?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  quotationValidityDays?: number;

  @IsOptional()
  @IsString()
  quotationFooter?: string;
}

export class UpdateNotificationPolicyDto {
  @IsOptional()
  @IsBoolean()
  enableSystemNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDiscussionNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  enableApprovalNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  dailyDigestEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  dailyDigestHour?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  dueSoonReminderHours?: number;
}

export class UpdateWorkspacePreferencesDto {
  @IsOptional()
  @IsIn(["week", "month"])
  defaultScheduleView?: "week" | "month";

  @IsOptional()
  @IsIn(["comfortable", "compact"])
  dashboardDensity?: "comfortable" | "compact";

  @IsOptional()
  @IsBoolean()
  showFirstRunGuides?: boolean;

  @IsOptional()
  @IsBoolean()
  enableTestDataTools?: boolean;
}

export class UpdateSystemSettingsDto {
  @ValidateNested()
  @Type(() => UpdateCompanyProfileDto)
  companyProfile!: UpdateCompanyProfileDto;

  @ValidateNested()
  @Type(() => UpdateNotificationPolicyDto)
  notificationPolicy!: UpdateNotificationPolicyDto;

  @ValidateNested()
  @Type(() => UpdateWorkspacePreferencesDto)
  workspacePreferences!: UpdateWorkspacePreferencesDto;
}
