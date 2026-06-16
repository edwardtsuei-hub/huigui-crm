import { ProductParseReviewStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";

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

export class ProductParseQueueQueryDto {
  @IsOptional()
  @IsEnum(ProductParseReviewStatus)
  reviewStatus?: ProductParseReviewStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;
}

export class ReviewProductParseLogDto {
  @IsEnum(ProductParseReviewStatus)
  reviewStatus!: ProductParseReviewStatus;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}
