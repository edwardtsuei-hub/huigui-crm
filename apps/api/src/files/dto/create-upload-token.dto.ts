import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateUploadTokenDto {
  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  fileType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  businessId?: string;
}
