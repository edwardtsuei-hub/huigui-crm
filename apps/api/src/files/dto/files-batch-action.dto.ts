import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class FilesBatchActionDto {
  @IsString()
  @MaxLength(32)
  action!: string;

  @IsOptional()
  @IsArray()
  @Type(() => String)
  fileIds?: string[];

  @IsOptional()
  @IsArray()
  @Type(() => String)
  folderIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(191)
  targetFolderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  tagText?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isImportant?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deleteReason?: string;
}
