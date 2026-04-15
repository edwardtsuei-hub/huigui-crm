import { IsEnum, IsOptional, IsString } from "class-validator";
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
