import { BadRequestException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { ParseProductMixedDto, ParseProductTextDto } from "./dto/product-parser.dto";
import { FieldMapperService } from "./field-mapper.service";
import { ImageParserService } from "./image-parser.service";
import { ProductParserLogService } from "./product-parser-log.service";
import { UploadedImageFile } from "./product-parser.types";
import { TextParserService } from "./text-parser.service";

@Injectable()
export class ProductParserService {
  constructor(
    private readonly textParserService: TextParserService,
    private readonly imageParserService: ImageParserService,
    private readonly fieldMapperService: FieldMapperService,
    private readonly productParserLogService: ProductParserLogService
  ) {}

  async parseText(dto: ParseProductTextDto, user: AuthenticatedUser) {
    const textDraft = this.textParserService.parse(dto.rawText, "text");
    const response = this.fieldMapperService.merge({
      textDraft,
      originalText: textDraft.rawText
    });
    await this.productParserLogService.createLog({
      sourceType: "TEXT",
      rawText: textDraft.rawText,
      parsed: response,
      user
    });
    return response;
  }

  async parseImage(file: UploadedImageFile, user: AuthenticatedUser, imageUrl?: string) {
    const imageText = await this.imageParserService.extractTextFromFile(file);
    const imageDraft = this.textParserService.parse(imageText, "image");
    const response = this.fieldMapperService.merge({
      imageDraft,
      imageText
    });
    await this.productParserLogService.createLog({
      sourceType: "IMAGE",
      rawText: imageText,
      imageUrl,
      parsed: response,
      user
    });
    return response;
  }

  async parseMixed(dto: ParseProductMixedDto, user: AuthenticatedUser, file?: UploadedImageFile) {
    if (!dto.rawText?.trim() && !dto.imageUrl?.trim() && !file) {
      throw new BadRequestException("至少提供文字或图片其一");
    }

    const originalText = dto.rawText?.trim() || "";
    const imageText = file
      ? await this.imageParserService.extractTextFromFile(file)
      : dto.imageUrl
        ? await this.imageParserService.extractTextFromUrl(dto.imageUrl)
        : "";

    const textDraft = originalText
      ? this.textParserService.parse(originalText, "text")
      : undefined;
    const imageDraft = imageText
      ? this.textParserService.parse(imageText, "image")
      : undefined;

    const response = this.fieldMapperService.merge({
      textDraft,
      imageDraft,
      originalText,
      imageText
    });
    await this.productParserLogService.createLog({
      sourceType: "MIXED",
      rawText: [originalText, imageText].filter(Boolean).join("\n\n") || undefined,
      imageUrl: dto.imageUrl?.trim() || undefined,
      parsed: response,
      user
    });
    return response;
  }
}
