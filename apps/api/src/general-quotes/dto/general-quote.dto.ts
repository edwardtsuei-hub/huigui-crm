import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class GeneralQuoteProductDto {
  @IsString()
  productId!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CalculateGeneralQuoteDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  industryGroupId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneralQuoteProductDto)
  products!: GeneralQuoteProductDto[];

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
}

export class CreateGeneralQuoteDto extends CalculateGeneralQuoteDto {
  @IsString()
  declare customerId: string;
}
