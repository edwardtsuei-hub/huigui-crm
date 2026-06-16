import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  InspectionItemStatus,
  InspectionOrderStatus,
  InspectionPaymentStatus,
} from "@prisma/client";

export class CreateInspectionSampleItemDto {
  @IsString()
  itemName!: string;

  @IsOptional()
  @IsString()
  itemCategory?: string;

  @IsOptional()
  @IsString()
  feeText?: string;

  @IsOptional()
  @IsNumber()
  feeAmount?: number;

  @IsOptional()
  @IsEnum(InspectionItemStatus)
  status?: InspectionItemStatus;

  @IsOptional()
  @IsString()
  resultSummary?: string;

  @IsOptional()
  @IsString()
  progressNote?: string;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class CreateInspectionSampleDto {
  @IsString()
  sampleName!: string;

  @IsOptional()
  @IsString()
  sampleType?: string;

  @IsOptional()
  @IsString()
  sampleTarget?: string;

  @IsOptional()
  @IsString()
  sampleQuantityText?: string;

  @IsOptional()
  @IsString()
  sampledAt?: string;

  @IsOptional()
  @IsString()
  submittedAt?: string;

  @IsOptional()
  @IsString()
  plannedTestScope?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionSampleItemDto)
  items?: CreateInspectionSampleItemDto[];
}

export class CreateInspectionPaymentDto {
  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  amountText?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  payerName?: string;

  @IsOptional()
  @IsString()
  voucherFileId?: string;

  @IsOptional()
  @IsString()
  invoiceFileId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateInspectionTimelineDto {
  @IsString()
  eventType!: string;

  @IsOptional()
  @IsString()
  eventAt?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  sampleId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;
}

export class CreateInspectionOrderDto {
  @IsOptional()
  @IsString()
  inspectionNo?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsString()
  inspectionTarget!: string;

  @IsString()
  labName!: string;

  @IsOptional()
  @IsString()
  labCity?: string;

  @IsOptional()
  @IsString()
  labAddress?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  expectedCycleText?: string;

  @IsOptional()
  @IsString()
  bankInfo?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  submittedAt?: string;

  @IsOptional()
  @IsString()
  receivedAt?: string;

  @IsOptional()
  @IsEnum(InspectionOrderStatus)
  status?: InspectionOrderStatus;

  @IsOptional()
  @IsEnum(InspectionPaymentStatus)
  paymentStatus?: InspectionPaymentStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionSampleDto)
  samples?: CreateInspectionSampleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionPaymentDto)
  payments?: CreateInspectionPaymentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionTimelineDto)
  timelines?: CreateInspectionTimelineDto[];
}

export class UpdateInspectionOrderDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  productId?: string | null;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsString()
  inspectionTarget?: string;

  @IsOptional()
  @IsString()
  labName?: string;

  @IsOptional()
  @IsString()
  labCity?: string;

  @IsOptional()
  @IsString()
  labAddress?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  expectedCycleText?: string;

  @IsOptional()
  @IsString()
  bankInfo?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  submittedAt?: string;

  @IsOptional()
  @IsString()
  receivedAt?: string;

  @IsOptional()
  @IsEnum(InspectionOrderStatus)
  status?: InspectionOrderStatus;

  @IsOptional()
  @IsEnum(InspectionPaymentStatus)
  paymentStatus?: InspectionPaymentStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionSampleDto)
  samples?: CreateInspectionSampleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionPaymentDto)
  payments?: CreateInspectionPaymentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionTimelineDto)
  timelines?: CreateInspectionTimelineDto[];
}

export class InspectionQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ""
      ? undefined
      : value === true || value === "true",
  )
  @IsBoolean()
  customerLinked?: boolean;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ""
      ? undefined
      : value === true || value === "true",
  )
  @IsBoolean()
  productLinked?: boolean;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ""
      ? undefined
      : value === true || value === "true",
  )
  @IsBoolean()
  needsLinking?: boolean;

  @IsOptional()
  @IsString()
  labName?: string;

  @IsOptional()
  @IsString()
  sampleType?: string;

  @IsOptional()
  @IsEnum(InspectionOrderStatus)
  status?: InspectionOrderStatus;

  @IsOptional()
  @IsEnum(InspectionPaymentStatus)
  paymentStatus?: InspectionPaymentStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
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
