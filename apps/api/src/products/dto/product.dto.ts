import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { OutputTemplateType, ProductStatus } from "@prisma/client";

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  industryGroupId?: string;

  @IsOptional()
  @IsString()
  industrySubgroupId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  spec?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsString()
  enterpriseStandardNo?: string;

  @IsOptional()
  @IsString()
  intro?: string;

  @IsOptional()
  @IsString()
  scenarios?: string;

  @IsOptional()
  @IsString()
  labelText?: string;

  @IsOptional()
  @IsString()
  labelImageUrl?: string;

  @IsOptional()
  @IsString()
  productImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  quoteEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  employeeVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  customerVisible?: boolean;

  @IsEnum(OutputTemplateType)
  outputTemplateType!: OutputTemplateType;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  industryGroupId?: string;

  @IsOptional()
  @IsString()
  industrySubgroupId?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  spec?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsString()
  enterpriseStandardNo?: string;

  @IsOptional()
  @IsString()
  intro?: string;

  @IsOptional()
  @IsString()
  scenarios?: string;

  @IsOptional()
  @IsString()
  labelText?: string;

  @IsOptional()
  @IsString()
  labelImageUrl?: string;

  @IsOptional()
  @IsString()
  productImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  quoteEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  employeeVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  customerVisible?: boolean;

  @IsOptional()
  @IsEnum(OutputTemplateType)
  outputTemplateType?: OutputTemplateType;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  industryGroupId?: string;

  @IsOptional()
  @IsString()
  industrySubgroupId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
