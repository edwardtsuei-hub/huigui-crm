import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export enum DaochongServiceNoteStatusQuery {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  OVERDUE = "OVERDUE",
  RETURNED = "RETURNED",
  CANCELLED = "CANCELLED",
}

export enum DaochongPreferenceTypeQuery {
  ROOM = "ROOM",
  LIGHT = "LIGHT",
  PRESSURE = "PRESSURE",
  AROMA = "AROMA",
  TABOO = "TABOO",
  HOBBY = "HOBBY",
  OTHER = "OTHER",
}

export enum DaochongPreferenceVisibilityQuery {
  SERVICE_TEAM = "SERVICE_TEAM",
  MANAGEMENT_ONLY = "MANAGEMENT_ONLY",
  PRIVATE_NOTE = "PRIVATE_NOTE",
}

export enum DaochongPaymentMethodQuery {
  WECHAT = "WECHAT",
  ALIPAY = "ALIPAY",
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  CARD_CONSUME = "CARD_CONSUME",
  OTHER = "OTHER",
}

export const DaochongServiceNoteSourceTypes = [
  "APPOINTMENT_COMPLETED",
  "SETTLEMENT_DRAFT_CREATED",
  "MANUAL_BACKFILL",
] as const;

export type DaochongServiceNoteSourceTypeInput = (typeof DaochongServiceNoteSourceTypes)[number];

export class DaochongServiceNotePreferenceWriteDto {
  @IsEnum(DaochongPreferenceTypeQuery)
  preferenceType!: DaochongPreferenceTypeQuery;

  @IsString()
  preferenceLabel!: string;

  @IsString()
  preferenceValue!: string;

  @IsOptional()
  @IsString()
  roomPreference?: string;

  @IsOptional()
  @IsString()
  lightPreference?: string;

  @IsOptional()
  @IsString()
  pressurePreference?: string;

  @IsOptional()
  @IsString()
  tabooNotes?: string;

  @IsOptional()
  @IsString()
  hobbyNotes?: string;

  @IsOptional()
  @IsEnum(DaochongPreferenceVisibilityQuery)
  visibility?: DaochongPreferenceVisibilityQuery;
}

export class CreateDaochongServiceNoteDto {
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  settlementDraftId?: string;

  @IsString()
  customerId!: string;

  @IsString()
  teacherId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsIn(DaochongServiceNoteSourceTypes)
  sourceType?: DaochongServiceNoteSourceTypeInput;

  @IsOptional()
  @IsString()
  pendingReason?: string;

  @IsOptional()
  @IsString()
  serviceSummary?: string;

  @IsOptional()
  @IsString()
  customerFeedback?: string;

  @IsOptional()
  @IsString()
  nextSuggestion?: string;

  @IsOptional()
  @IsString()
  preferenceNote?: string;

  @IsOptional()
  @IsEnum(DaochongServiceNoteStatusQuery)
  noteStatus?: DaochongServiceNoteStatusQuery;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  reminderScheduledAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DaochongServiceNotePreferenceWriteDto)
  preferences?: DaochongServiceNotePreferenceWriteDto[];
}

export class UpdateDaochongServiceNoteDto {
  @IsOptional()
  @IsString()
  settlementDraftId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  pendingReason?: string;

  @IsOptional()
  @IsString()
  serviceSummary?: string;

  @IsOptional()
  @IsString()
  customerFeedback?: string;

  @IsOptional()
  @IsString()
  nextSuggestion?: string;

  @IsOptional()
  @IsString()
  preferenceNote?: string;

  @IsOptional()
  @IsEnum(DaochongServiceNoteStatusQuery)
  noteStatus?: DaochongServiceNoteStatusQuery;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  reminderScheduledAt?: string;

  @IsOptional()
  @IsString()
  completedAt?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  syncPreferences?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DaochongServiceNotePreferenceWriteDto)
  preferences?: DaochongServiceNotePreferenceWriteDto[];
}

export class SendDaochongWecomReminderTestDto {
  @IsString()
  serviceNoteId!: string;

  @IsString()
  toUser!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notifyUrl?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  markReminded?: boolean = true;
}

export class CreateDaochongRechargeDto {
  @IsString()
  customerId!: string;

  @Transform(({ value }) => value === null || value === undefined ? value : String(value))
  @IsString()
  amount!: string;

  @IsEnum(DaochongPaymentMethodQuery)
  paymentMethod!: DaochongPaymentMethodQuery;

  @IsArray()
  @IsString({ each: true })
  evidenceAssetIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cashPhotoAssetIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value === null || value === undefined ? value : String(value))
  @IsString()
  cashAmount?: string;

  @IsOptional()
  @IsString()
  cashCustodianUserId?: string;
}

export class ReturnDaochongRechargeByChengchengDto {
  @IsString()
  returnReason!: string;
}

export class ReturnDaochongRechargeByLimengDto {
  @IsString()
  returnReason!: string;
}

export class DaochongServiceNotesReadonlyQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsEnum(DaochongServiceNoteStatusQuery)
  noteStatus?: DaochongServiceNoteStatusQuery;

  @IsOptional()
  @IsString()
  dueBefore?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class DaochongWecomReminderDryRunsReadonlyQueryDto extends DaochongServiceNotesReadonlyQueryDto {}

export class DaochongCustomerPreferencesReadonlyQueryDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsEnum(DaochongPreferenceTypeQuery)
  preferenceType?: DaochongPreferenceTypeQuery;

  @IsOptional()
  @IsEnum(DaochongPreferenceVisibilityQuery)
  visibility?: DaochongPreferenceVisibilityQuery;
}

export class DaochongCustomerCardBalancesReadonlyQueryDto {
  @IsString()
  customerId!: string;
}

export class DaochongHighRiskReadonlyQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @IsString()
  relatedType?: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  summaryMonth?: string;

  @IsOptional()
  @IsString()
  effectiveMonth?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
