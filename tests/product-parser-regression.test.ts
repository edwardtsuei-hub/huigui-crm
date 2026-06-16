import "reflect-metadata";

import assert from "node:assert/strict";
import { ProductParseReviewStatus } from "@prisma/client";
import { ProductParserLogService } from "../apps/api/src/product-parser/product-parser-log.service";
import { ProductParserService } from "../apps/api/src/product-parser/product-parser.service";
import type { AuthenticatedUser } from "../apps/api/src/common/types/authenticated-user";
import type { ProductParseResponse } from "../apps/api/src/product-parser/product-parser.types";

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

const parsedPayload: ProductParseResponse = {
  rawText: "月度会议用产品标签\n适用生猪养殖场",
  originalText: "月度会议用产品标签",
  imageText: "适用生猪养殖场",
  parsed: {
    name: "monthly_meeting_product",
    displayName: "月度会议产品",
    intro: "用于月度会议复盘的产品资料",
    industryGroupSuggestion: "养殖",
    industrySubgroupSuggestion: "生猪",
    outputTemplateTypeSuggestion: "PRODUCT_QUOTE",
  },
  confidence: {
    name: "high",
    displayName: "high",
    intro: "low",
    outputTemplateTypeSuggestion: "medium",
  },
  sources: {
    name: "text",
    displayName: "mixed",
    intro: "image",
  },
  reasons: {
    intro: "图片说明较短，需要人工复核",
  },
  conflicts: [
    {
      field: "displayName",
      preferredValue: "月度会议产品",
      candidates: [
        {
          value: "月度会议产品",
          confidence: "high",
          source: "text",
          reason: "文本名称更完整",
        },
        {
          value: "会议产品",
          confidence: "medium",
          source: "image",
          reason: "图片识别结果较短",
        },
      ],
    },
  ],
};

function createLog(overrides: Record<string, unknown> = {}) {
  return {
    id: "parse-log-1",
    rawText: parsedPayload.rawText,
    imageUrl: "https://crm.example.com/product-label.jpg",
    parsedJson: parsedPayload,
    sourceType: "MIXED",
    reviewStatus: ProductParseReviewStatus.PENDING,
    reviewNote: null,
    createdAt: new Date("2026-05-11T01:00:00.000Z"),
    reviewedAt: null,
    operator: {
      id: "operator-1",
      name: "诚恳心",
      loginAccount: "edwardtsuei",
    },
    reviewer: null,
    ...overrides,
  };
}

function createLogPrisma(logs = [createLog()]) {
  const calls = {
    findMany: [] as Array<Record<string, unknown>>,
    findUnique: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
  };

  return {
    calls,
    prisma: {
      productParseLog: {
        findMany: async (args: Record<string, unknown>) => {
          calls.findMany.push(args);
          return logs;
        },
        findUnique: async (args: Record<string, unknown>) => {
          calls.findUnique.push(args);
          const id = (args.where as { id?: string }).id;
          return logs.find((item) => item.id === id) ?? null;
        },
        update: async (args: Record<string, unknown>) => {
          calls.updates.push(args);
          const data = args.data as {
            reviewStatus: ProductParseReviewStatus;
            reviewNote: string | null;
            reviewedAt: Date | null;
            reviewedByUserId: string | null;
          };

          return {
            ...logs[0],
            reviewStatus: data.reviewStatus,
            reviewNote: data.reviewNote,
            reviewedAt: data.reviewedAt,
            reviewer: data.reviewedByUserId
              ? {
                  id: data.reviewedByUserId,
                  name: "Reviewer",
                  loginAccount: "reviewer",
                }
              : null,
          };
        },
      },
    },
  };
}

const reviewerUser = {
  id: "reviewer-1",
  username: "reviewer",
  displayName: "Reviewer",
  roleCode: "PRODUCT_SPECIALIST",
  roleName: "产品 / 方案专员",
  permissions: ["action.product.update", "page.products.ai_import"],
} as unknown as AuthenticatedUser;

test("ProductParserLogService lists parse queue records with review signals", async () => {
  const { prisma, calls } = createLogPrisma();
  const service = new ProductParserLogService(prisma as never);

  const items = await service.listLogs({
    reviewStatus: ProductParseReviewStatus.PENDING,
    keyword: "月度会议",
    sourceType: "mixed",
  });

  assert.equal(calls.findMany.length, 1);
  assert.deepEqual(calls.findMany[0].where, {
    reviewStatus: ProductParseReviewStatus.PENDING,
    sourceType: "MIXED",
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, "月度会议产品");
  assert.equal(items[0].reviewStatus, ProductParseReviewStatus.PENDING);
  assert.equal(items[0].sourceType, "MIXED");
  assert.equal(items[0].parsedFieldCount, 6);
  assert.equal(items[0].lowConfidenceCount, 1);
  assert.equal(items[0].mediumConfidenceCount, 1);
  assert.equal(items[0].conflictCount, 1);
  assert.equal(items[0].operator.loginAccount, "edwardtsuei");
  assert.equal(items[0].summary, "养殖 / 生猪 / PRODUCT_QUOTE");
});

test("ProductParserLogService returns queue details with full parse result", async () => {
  const { prisma } = createLogPrisma();
  const service = new ProductParserLogService(prisma as never);

  const detail = await service.getLogById("parse-log-1");

  assert.equal(detail.id, "parse-log-1");
  assert.equal(detail.result.rawText, parsedPayload.rawText);
  assert.equal(detail.result.conflicts.length, 1);
  assert.equal(detail.result.parsed.displayName, "月度会议产品");
});

test("ProductParserLogService stamps reviewer fields when confirming a queue item", async () => {
  const { prisma, calls } = createLogPrisma();
  const service = new ProductParserLogService(prisma as never);

  const updated = await service.reviewLog({
    id: "parse-log-1",
    reviewStatus: ProductParseReviewStatus.CONFIRMED,
    reviewNote: "确认可进入正式产品库",
    user: reviewerUser,
  });

  assert.equal(calls.updates.length, 1);
  assert.deepEqual(calls.updates[0].where, { id: "parse-log-1" });
  assert.equal(
    (calls.updates[0].data as { reviewedByUserId: string }).reviewedByUserId,
    "reviewer-1",
  );
  assert.ok((calls.updates[0].data as { reviewedAt: Date }).reviewedAt instanceof Date);
  assert.equal(updated.reviewStatus, ProductParseReviewStatus.CONFIRMED);
  assert.equal(updated.reviewNote, "确认可进入正式产品库");
  assert.equal(updated.reviewer?.id, "reviewer-1");
});

test("ProductParserService rejects manual reset to pending from the review endpoint", async () => {
  const service = new ProductParserService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  await assert.rejects(
    () =>
      service.reviewQueueItem(
        "parse-log-1",
        { reviewStatus: ProductParseReviewStatus.PENDING },
        reviewerUser,
      ),
    /待确认状态无需手动提交/,
  );
});

async function main() {
  const failures: Array<{ name: string; error: unknown }> = [];

  for (const item of tests) {
    try {
      await item.run();
      console.log(`ok - ${item.name}`);
    } catch (error) {
      failures.push({ name: item.name, error });
      console.error(`not ok - ${item.name}`);
      console.error(error);
    }
  }

  if (failures.length) {
    console.error(`${failures.length} product parser regression test(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${tests.length} product parser regression test(s) passed.`);
}

void main();
