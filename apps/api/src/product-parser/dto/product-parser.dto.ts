import { IsOptional, IsString, MinLength } from "class-validator";

export class ParseProductTextDto {
  @IsString()
  @MinLength(2)
  rawText!: string;
}

export class ParseProductMixedDto {
  @IsOptional()
  @IsString()
  rawText?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
