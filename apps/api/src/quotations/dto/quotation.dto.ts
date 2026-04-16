import { IsArray, IsEnum, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { QuotationStatus, QuotationType } from "@prisma/client";

export class CreateQuotationItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  itemName!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsNumber()
  originalAmount!: number;

  @IsNumber()
  discountedAmount!: number;

  @IsOptional()
  detailJson?: Record<string, any>;
}

export class CreateQuotationDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  industryGroupId?: string;

  @IsEnum(QuotationType)
  quotationType!: QuotationType;

  @IsNumber()
  totalOriginalAmount!: number;

  @IsNumber()
  totalDiscountedAmount!: number;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @IsOptional()
  @IsString()
  discountReason?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items!: CreateQuotationItemDto[];
}

export class UpdateQuotationDto {
  @IsOptional()
  @IsEnum(QuotationStatus)
  status?: QuotationStatus;

  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ReviewQuotationApprovalDto {
  @IsIn(["discount", "export"])
  type!: "discount" | "export";

  @IsIn(["approve", "reject"])
  decision!: "approve" | "reject";

  @IsOptional()
  @IsString()
  remark?: string;
}
