import { IsArray, IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class EcotechRecordDto {
  @IsObject()
  record!: Record<string, unknown>;
}

export class EcotechBulkRecordsDto {
  @IsArray()
  records!: Array<Record<string, unknown>>;
}

export class EcotechQuotationReviewDto {
  @IsIn(["approved", "rejected"])
  decision!: "approved" | "rejected";

  @IsString()
  reviewer!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
