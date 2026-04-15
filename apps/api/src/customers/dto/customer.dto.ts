import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { CustomerStatus } from "@prisma/client";

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
