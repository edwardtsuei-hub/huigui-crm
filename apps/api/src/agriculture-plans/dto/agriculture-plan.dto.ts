import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class AgricultureCropDto {
  @IsString()
  cropName!: string;

  @IsOptional()
  @IsString()
  manualCropType?: string;

  @IsNumber()
  areaMu!: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  actualCycleDays?: number;

  @IsString()
  stage!: "initial" | "maintenance";

  @IsBoolean()
  isOrganic!: boolean;

  @IsBoolean()
  needGC!: boolean;

  @IsOptional()
  @IsNumber()
  gcWaterLiters?: number;
}

export class CalculateAgriculturePlanDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgricultureCropDto)
  crops!: AgricultureCropDto[];

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

export class CreateAgriculturePlanDto extends CalculateAgriculturePlanDto {
  @IsString()
  declare customerId: string;
}
