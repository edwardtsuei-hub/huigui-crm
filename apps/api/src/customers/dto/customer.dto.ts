import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { CustomerStatus } from "@prisma/client";

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedValue = value.trim();
  return normalizedValue ? normalizedValue : undefined;
}

export class CreateCustomerDto {
  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  wechatId?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  industryGroupId?: string;

  @IsOptional()
  @IsString()
  industrySubgroupId?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsString()
  ownerUserId!: string;

  @IsOptional()
  @IsString()
  cooperationDirection?: string;

  @IsOptional()
  @IsString()
  cooperationContent?: string;

  @IsOptional()
  @IsNumber()
  estimatedAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  dealProbability?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  wechatId?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  industryGroupId?: string;

  @IsOptional()
  @IsString()
  industrySubgroupId?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  cooperationDirection?: string;

  @IsOptional()
  @IsString()
  cooperationContent?: string;

  @IsOptional()
  @IsNumber()
  estimatedAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  dealProbability?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  transferReason?: string;
}

export class CustomerQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  industryGroupId?: string;

  @IsOptional()
  @IsString()
  industrySubgroupId?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;

  @IsOptional()
  @IsString()
  includeSystemRecords?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}

export class CreateCustomerFollowupDto {
  @IsString()
  followupDate!: string;

  @IsString()
  followupType!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  keyPoints?: string;

  @IsOptional()
  @IsString()
  nextAction?: string;

  @IsOptional()
  @IsString()
  nextContactAt?: string;

  @IsOptional()
  @IsBoolean()
  needReminder?: boolean;
}

export class UpdateCustomerFollowupDto {
  @IsOptional()
  @IsString()
  followupDate?: string;

  @IsOptional()
  @IsString()
  followupType?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  keyPoints?: string;

  @IsOptional()
  @IsString()
  nextAction?: string;

  @IsOptional()
  @IsString()
  nextContactAt?: string;

  @IsOptional()
  @IsBoolean()
  needReminder?: boolean;
}

export class ReviewCustomerApprovalDto {
  @IsIn(["claim", "extension", "transfer"])
  type!: "claim" | "extension" | "transfer";

  @IsIn(["approve", "reject"])
  decision!: "approve" | "reject";

  @IsOptional()
  @IsString()
  remark?: string;
}
