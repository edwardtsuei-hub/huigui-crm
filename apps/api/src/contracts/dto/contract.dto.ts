import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { ContractStatus, PermissionLevel } from "@prisma/client";

export class CreateContractDto {
  @IsString()
  customerId!: string;

  @IsString()
  contractName!: string;

  @IsOptional()
  @IsString()
  contractNo?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  signedAt?: string;

  @IsOptional()
  @IsString()
  effectiveAt?: string;

  @IsOptional()
  @IsString()
  expiredAt?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsEnum(PermissionLevel)
  permissionLevel!: PermissionLevel;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  contractName?: string;

  @IsOptional()
  @IsString()
  contractNo?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  signedAt?: string;

  @IsOptional()
  @IsString()
  effectiveAt?: string;

  @IsOptional()
  @IsString()
  expiredAt?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsEnum(PermissionLevel)
  permissionLevel?: PermissionLevel;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
