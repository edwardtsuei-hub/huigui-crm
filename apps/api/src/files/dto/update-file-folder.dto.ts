import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateFileFolderDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  tagText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  permissionScope?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
