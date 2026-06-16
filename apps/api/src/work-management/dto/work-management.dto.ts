import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  MonthlyGoalStatus,
  WeeklyPlanReviewStatus,
  WeeklyReportStatus,
} from "@prisma/client";

export class CreateWeeklyReportDraftDto {
  @IsOptional()
  @IsString()
  weekStartDate?: string;
}

export class WeeklyReportTeamClosureQueryDto {
  @IsOptional()
  @IsString()
  weekStartDate?: string;
}

export class RemindWeeklyReportsDto {
  @IsOptional()
  @IsString()
  weekStartDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  userIds?: string[];
}

export class DeriveWeeklyReportTasksDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  planItemIds?: string[];
}

export class WeeklyReportArchiveQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsEnum(WeeklyReportStatus)
  status?: WeeklyReportStatus;

  @IsOptional()
  @IsIn(["mine", "team"])
  view?: "mine" | "team";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class WeeklyReportReviewItemInputDto {
  @IsString()
  id!: string;

  @IsEnum(WeeklyPlanReviewStatus)
  status!: WeeklyPlanReviewStatus;

  @IsOptional()
  @IsString()
  incompleteReason?: string;
}

export class WeeklyReportPlanItemInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  sourceReviewItemId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  plannedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateWeeklyReportDto {
  @IsOptional()
  @IsString()
  completedSummary?: string;

  @IsOptional()
  @IsString()
  focusSummary?: string;

  @IsOptional()
  @IsEnum(WeeklyReportStatus)
  status?: WeeklyReportStatus;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => WeeklyReportReviewItemInputDto)
  reviewItems!: WeeklyReportReviewItemInputDto[];

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => WeeklyReportPlanItemInputDto)
  planItems!: WeeklyReportPlanItemInputDto[];
}

export class ReviewWeeklyReportDto {
  @IsIn(["approve", "return"])
  decision!: "approve" | "return";

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateWeeklyPublicDigestDto {
  @IsString()
  summary!: string;
}

export class CreateMonthlyGoalDraftDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  targetYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  targetMonth?: number;
}

export class GenerateMonthlyGoalAiSummaryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  sourceYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  sourceMonth?: number;
}

export class MonthlyGoalItemInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  progressNote?: string;

  @IsOptional()
  @IsString()
  riskNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateMonthlyGoalDto {
  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(MonthlyGoalStatus)
  status?: MonthlyGoalStatus;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => MonthlyGoalItemInputDto)
  items!: MonthlyGoalItemInputDto[];
}
