import { BadRequestException, Injectable } from "@nestjs/common";
import {
  RecordDataScope,
  TestBatchStatus,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedUser } from "../types/authenticated-user";

export const REAL_PARTITION_KEY = "REAL";

export type RecordPartitionContext = {
  dataScope: RecordDataScope;
  partitionKey: string;
  testBatchId: string | null;
};

@Injectable()
export class RecordPartitionService {
  constructor(private readonly prisma: PrismaService) {}

  resolveContext(
    user: Pick<AuthenticatedUser, "recordDataScope" | "testBatchId">,
  ): RecordPartitionContext {
    if (user.recordDataScope === RecordDataScope.TEST) {
      const testBatchId = user.testBatchId?.trim();
      if (!testBatchId) {
        throw new BadRequestException("测试模式缺少批次，请先选择测试批次");
      }

      return {
        dataScope: RecordDataScope.TEST,
        partitionKey: testBatchId,
        testBatchId,
      };
    }

    return {
      dataScope: RecordDataScope.REAL,
      partitionKey: REAL_PARTITION_KEY,
      testBatchId: null,
    };
  }

  buildWhere(
    user: Pick<AuthenticatedUser, "recordDataScope" | "testBatchId">,
  ): {
    dataScope: RecordDataScope;
    partitionKey: string;
    testBatchId: string | null;
  } {
    const context = this.resolveContext(user);
    return {
      dataScope: context.dataScope,
      partitionKey: context.partitionKey,
      testBatchId: context.testBatchId,
    };
  }

  async getWritableCreateData(
    user: Pick<AuthenticatedUser, "recordDataScope" | "testBatchId">,
  ) {
    const context = this.resolveContext(user);
    if (context.dataScope === RecordDataScope.TEST && context.testBatchId) {
      const batch = await this.prisma.testBatch.findUnique({
        where: { id: context.testBatchId },
        select: { id: true, status: true, clearedAt: true },
      });

      if (!batch || batch.clearedAt) {
        throw new BadRequestException("测试批次不存在或已清空，请重新选择");
      }

      if (batch.status !== TestBatchStatus.ACTIVE) {
        throw new BadRequestException("当前测试批次已关闭，不能继续写入测试数据");
      }
    }

    return context;
  }

  assertSamePartition(
    user: Pick<AuthenticatedUser, "recordDataScope" | "testBatchId">,
    entity: {
      dataScope?: RecordDataScope | null;
      partitionKey?: string | null;
      testBatchId?: string | null;
    },
    label: string,
  ) {
    const context = this.resolveContext(user);
    if (
      entity.partitionKey !== context.partitionKey ||
      entity.dataScope !== context.dataScope ||
      (entity.testBatchId ?? null) !== context.testBatchId
    ) {
      throw new BadRequestException(`${label}不在当前数据模式下，不能混用真实与测试数据`);
    }
  }

  mergeWhere<T extends Prisma.CustomerWhereInput | Prisma.QuotationWhereInput | Prisma.TaskWhereInput | Prisma.InspectionOrderWhereInput | Prisma.SalesOrderWhereInput | Prisma.ChannelPartnerWhereInput | Prisma.PaymentRecordWhereInput | Prisma.ShipmentRecordWhereInput | Prisma.ChannelSettlementWhereInput | Prisma.FileFolderWhereInput | Prisma.FileRecordWhereInput | Prisma.WeeklyReportWhereInput | Prisma.MonthlyGoalWhereInput>(
    baseWhere: T,
    partitionWhere: Partial<T>,
  ): T {
    const hasBase = Object.keys(baseWhere).length > 0;
    const hasPartition = Object.keys(partitionWhere).length > 0;

    if (hasBase && hasPartition) {
      return {
        AND: [baseWhere, partitionWhere],
      } as T;
    }

    if (hasPartition) {
      return partitionWhere as T;
    }

    return baseWhere;
  }
}
