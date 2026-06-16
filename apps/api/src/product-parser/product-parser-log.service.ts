import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ProductParseReviewStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import type {
  ProductParseQueueDetail,
  ProductParseQueueItem,
  ProductParseResponse,
} from "./product-parser.types";

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
      return await this.prisma.productParseLog.create({
        data: {
          rawText: params.rawText,
          imageUrl: params.imageUrl,
          parsedJson: params.parsed,
          sourceType: params.sourceType,
          operatorUserId: params.user.id,
        },
      });
    } catch (error) {
      this.logger.warn(
        `记录产品解析日志失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
      return null;
    }
  }

  async listLogs(params: {
    reviewStatus?: ProductParseReviewStatus;
    keyword?: string;
    sourceType?: string;
    take?: number;
  }): Promise<ProductParseQueueItem[]> {
    const items = await this.prisma.productParseLog.findMany({
      where: {
        ...(params.reviewStatus ? { reviewStatus: params.reviewStatus } : {}),
        ...(params.sourceType?.trim()
          ? { sourceType: params.sourceType.trim().toUpperCase() }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: params.take ?? 60,
      include: {
        operator: {
          select: {
            id: true,
            name: true,
            loginAccount: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            loginAccount: true,
          },
        },
      },
    });

    const serialized = items.map((item) => this.serializeQueueItem(item));
    const keyword = params.keyword?.trim().toLowerCase();

    if (!keyword) {
      return serialized;
    }

    return serialized.filter((item) =>
      [
        item.title,
        item.summary,
        item.rawText,
        item.parsed.name,
        item.parsed.displayName,
        item.parsed.scenarios,
        item.operator.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }

  async getLogById(id: string): Promise<ProductParseQueueDetail> {
    const item = await this.prisma.productParseLog.findUnique({
      where: { id },
      include: {
        operator: {
          select: {
            id: true,
            name: true,
            loginAccount: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            loginAccount: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("解析记录不存在");
    }

    return this.serializeQueueItem(item, true);
  }

  async reviewLog(params: {
    id: string;
    reviewStatus: ProductParseReviewStatus;
    reviewNote?: string;
    user: AuthenticatedUser;
  }) {
    const existing = await this.prisma.productParseLog.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!existing) {
      throw new NotFoundException("解析记录不存在");
    }

    const reviewStatus = params.reviewStatus;
    const reviewNote = params.reviewNote?.trim() || null;
    const updated = await this.prisma.productParseLog.update({
      where: {
        id: params.id,
      },
      data:
        reviewStatus === ProductParseReviewStatus.PENDING
          ? {
              reviewStatus,
              reviewNote: null,
              reviewedAt: null,
              reviewedByUserId: null,
            }
          : {
              reviewStatus,
              reviewNote,
              reviewedAt: new Date(),
              reviewedByUserId: params.user.id,
            },
      include: {
        operator: {
          select: {
            id: true,
            name: true,
            loginAccount: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            loginAccount: true,
          },
        },
      },
    });

    return this.serializeQueueItem(updated);
  }

  private serializeQueueItem(
    log: {
      id: string;
      rawText: string | null;
      imageUrl: string | null;
      parsedJson: unknown;
      sourceType: string;
      reviewStatus: ProductParseReviewStatus;
      reviewNote: string | null;
      createdAt: Date;
      reviewedAt: Date | null;
      operator: {
        id: string;
        name: string;
        loginAccount: string | null;
      };
      reviewer?: {
        id: string;
        name: string;
        loginAccount: string | null;
      } | null;
    },
    includeResult: true,
  ): ProductParseQueueDetail;
  private serializeQueueItem(
    log: {
      id: string;
      rawText: string | null;
      imageUrl: string | null;
      parsedJson: unknown;
      sourceType: string;
      reviewStatus: ProductParseReviewStatus;
      reviewNote: string | null;
      createdAt: Date;
      reviewedAt: Date | null;
      operator: {
        id: string;
        name: string;
        loginAccount: string | null;
      };
      reviewer?: {
        id: string;
        name: string;
        loginAccount: string | null;
      } | null;
    },
    includeResult?: false,
  ): ProductParseQueueItem;
  private serializeQueueItem(
    log: {
    id: string;
    rawText: string | null;
    imageUrl: string | null;
    parsedJson: unknown;
    sourceType: string;
    reviewStatus: ProductParseReviewStatus;
    reviewNote: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    operator: {
      id: string;
      name: string;
      loginAccount: string | null;
    };
    reviewer?: {
      id: string;
      name: string;
      loginAccount: string | null;
    } | null;
  },
    includeResult = false,
  ): ProductParseQueueItem | ProductParseQueueDetail {
    const parsedPayload = this.toParseResponse(log.parsedJson);
    const confidenceValues = Object.values(parsedPayload.confidence ?? {});
    const parsedValues = Object.values(parsedPayload.parsed ?? {}).filter(Boolean);
    const title =
      parsedPayload.parsed.displayName ||
      parsedPayload.parsed.name ||
      this.pickFirstLine(log.rawText) ||
      "未命名解析记录";
    const summaryParts = [
      parsedPayload.parsed.industryGroupSuggestion,
      parsedPayload.parsed.industrySubgroupSuggestion,
      parsedPayload.parsed.outputTemplateTypeSuggestion,
    ].filter(Boolean);

    const baseItem: ProductParseQueueItem = {
      id: log.id,
      sourceType: log.sourceType,
      reviewStatus: log.reviewStatus,
      reviewNote: log.reviewNote,
      createdAt: log.createdAt.toISOString(),
      reviewedAt: log.reviewedAt?.toISOString() ?? null,
      rawText: log.rawText,
      imageUrl: log.imageUrl,
      parsed: parsedPayload.parsed,
      confidence: parsedPayload.confidence,
      conflicts: parsedPayload.conflicts,
      parsedFieldCount: parsedValues.length,
      lowConfidenceCount: confidenceValues.filter((value) => value === "low").length,
      mediumConfidenceCount: confidenceValues.filter((value) => value === "medium").length,
      conflictCount: parsedPayload.conflicts.length,
      title,
      summary:
        summaryParts.join(" / ") ||
        parsedPayload.parsed.scenarios ||
        "等待人工确认行业、模板和文案是否可直接进入正式产品库。",
      operator: log.operator,
      reviewer: log.reviewer ?? null,
    };

    if (!includeResult) {
      return baseItem;
    }

    return {
      ...baseItem,
      result: parsedPayload,
    };
  }

  private toParseResponse(value: unknown): ProductParseResponse {
    const fallback: ProductParseResponse = {
      rawText: "",
      parsed: {},
      confidence: {},
      sources: {},
      reasons: {},
      conflicts: [],
    };

    if (!value || typeof value !== "object") {
      return fallback;
    }

    const parsed = value as Partial<ProductParseResponse>;
    return {
      rawText: typeof parsed.rawText === "string" ? parsed.rawText : "",
      originalText:
        typeof parsed.originalText === "string" ? parsed.originalText : undefined,
      imageText: typeof parsed.imageText === "string" ? parsed.imageText : undefined,
      parsed: parsed.parsed ?? {},
      confidence: parsed.confidence ?? {},
      sources: parsed.sources ?? {},
      reasons: parsed.reasons ?? {},
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
    };
  }

  private pickFirstLine(rawText?: string | null) {
    const firstLine = rawText?.split(/\r?\n/).find((line) => line.trim())?.trim();
    if (!firstLine) {
      return "";
    }

    return firstLine.length > 32 ? `${firstLine.slice(0, 32)}...` : firstLine;
  }
}
