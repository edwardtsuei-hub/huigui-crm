import { IsOptional, IsString, MaxLength } from "class-validator";

export class FileListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(191)
  folderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  view?: string;

  @IsOptional()
  @IsString()
  itemIds?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  keyword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  relatedType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  uploaderUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deleteReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sortBy?: string;

  @IsOptional()
  @IsString()
  updatedFrom?: string;

  @IsOptional()
  @IsString()
  updatedTo?: string;
}
