import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateFileRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  tagText?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  relatedType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  relatedId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  folderId?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isImportant?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  permissionScope?: string;

  @IsOptional()
  @IsString()
  versionNote?: string;
}
