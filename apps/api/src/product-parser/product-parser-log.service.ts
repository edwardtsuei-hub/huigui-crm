import { Injectable, Logger } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import type { ProductParseResponse } from "./product-parser.types";

type ProductParseSourceType = "TEXT" | "IMAGE" | "MIXED";

@Injectable()
export class ProductParserLogService {
  private readonly logger = new Logger(ProductParserLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(params: {
    sourceType: ProductParseSourceType;
    rawText?: string;
    imageUrl?: string;
    parsed: ProductParseResponse;
    user: AuthenticatedUser;
  }) {
    try {
      await this.prisma.productParseLog.create({
        data: {
          rawText: params.rawText,
          imageUrl: params.imageUrl,
          parsedJson: params.parsed,
          sourceType: params.sourceType,
          operatorUserId: params.user.id
        }
      });
    } catch (error) {
      this.logger.warn(
        `记录产品解析日志失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }
}
