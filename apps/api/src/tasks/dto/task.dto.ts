import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { TaskStatus, TaskType } from "@prisma/client";

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsEnum(TaskType)
  type!: TaskType;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  quotationId?: string;

  @IsOptional()
  @IsString()
  agriculturePlanId?: string;

  @IsString()
  assigneeUserId!: string;

  @IsString()
  startAt!: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsOptional()
  @IsString()
  reminderAt?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  quotationId?: string;

  @IsOptional()
  @IsString()
  agriculturePlanId?: string;

  @IsOptional()
  @IsString()
  assigneeUserId?: string;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsOptional()
  @IsString()
  reminderAt?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

export class CreateTaskCommentDto {
  @IsString()
  content!: string;
}

export class QueryTasksDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  assigneeUserId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  quotationId?: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeArchived?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;
}
