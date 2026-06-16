import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateTestBatchDto {
  @IsString()
  @MaxLength(128)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
