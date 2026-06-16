import "reflect-metadata";

import assert from "node:assert/strict";
import { FileRecordStatus, RecordDataScope } from "@prisma/client";
import { FilesService } from "../apps/api/src/files/files.service";
import type { AuthenticatedUser } from "../apps/api/src/common/types/authenticated-user";

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

const user = {
  id: "user-1",
  username: "edward",
  displayName: "Edward",
  roleCode: "SUPER_ADMIN",
  roleName: "超级管理员",
  recordDataScope: RecordDataScope.REAL,
  permissions: ["page.files.center"],
} as unknown as AuthenticatedUser;

function createFileRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-05-11T02:00:00.000Z");
  return {
    id: "file-1",
    fileName: "月度會議.pdf",
    fileUrl: "https://crm.example.com/file.pdf",
    fileType: "application/pdf",
    fileSizeBytes: 1024,
    category: "报价附件",
    tagText: "报价, 月度會議",
    note: null,
    businessType: "QUOTATION",
    businessId: "quote-1",
    relatedType: "QUOTATION",
    relatedId: "quote-1",
    folderId: "folder-quote",
    status: FileRecordStatus.ARCHIVED,
    isImportant: false,
    isArchived: true,
    permissionScope: null,
    versionGroupId: "file-1",
    versionNumber: 1,
    versionNote: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
    deletedReason: null,
    deletedBy: null,
    uploader: {
      id: "user-1",
      name: "Edward",
      loginAccount: "edward",
    },
    ...overrides,
  };
}

function createPrismaMock() {
  const calls = {
    folderCreates: [] as Array<Record<string, unknown>>,
    fileCreates: [] as Array<Record<string, unknown>>,
    fileUpdates: [] as Array<Record<string, unknown>>,
  };
  const folders = new Map<string, { id: string; name: string; parentId: string | null }>();
  let folderSequence = 0;

  return {
    calls,
    prisma: {
      testBatch: {
        findUnique: async () => null,
      },
      customer: {
        findFirst: async () => null,
      },
      quotation: {
        findFirst: async () => ({ quotationNo: "Q-20260511-001" }),
      },
      salesOrder: {
        findFirst: async () => null,
      },
      inspectionOrder: {
        findFirst: async () => null,
      },
      product: {
        findFirst: async () => null,
      },
      contract: {
        findFirst: async () => null,
      },
      fileFolder: {
        findFirst: async (args: { where: unknown; select?: unknown }) => {
          const whereText = JSON.stringify(args.where);
          for (const folder of folders.values()) {
            if (whereText.includes(`"name":"${folder.name}"`)) {
              return { id: folder.id };
            }
          }
          return null;
        },
        create: async (args: { data: Record<string, unknown>; select?: unknown }) => {
          folderSequence += 1;
          const folder = {
            id: `folder-${folderSequence}`,
            name: String(args.data.name),
            parentId: (args.data.parentId as string | null) ?? null,
          };
          folders.set(folder.id, folder);
          calls.folderCreates.push(args);
          return { id: folder.id };
        },
        update: async (args: { where: { id: string }; data: unknown; select?: unknown }) => ({
          parentId: folders.get(args.where.id)?.parentId ?? null,
        }),
      },
      fileRecord: {
        findFirst: async (args: { where: unknown; orderBy?: unknown; select?: unknown }) => {
          const whereText = JSON.stringify(args.where);
          if (whereText.includes('"fileName":"月度會議.pdf"')) {
            return { id: "existing-file", versionGroupId: "existing-group", versionNumber: 2 };
          }
          return null;
        },
        create: async (args: { data: Record<string, unknown>; select?: unknown }) => {
          calls.fileCreates.push(args);
          return createFileRecord({
            ...args.data,
            id: "file-created",
            createdAt: new Date("2026-05-11T02:00:00.000Z"),
            updatedAt: new Date("2026-05-11T02:00:00.000Z"),
            deletedAt: null,
            deletedBy: null,
            uploader: {
              id: "user-1",
              name: "Edward",
              loginAccount: "edward",
            },
          });
        },
        update: async (args: { where: { id: string }; data: Record<string, unknown>; select?: unknown }) => {
          calls.fileUpdates.push(args);
          return createFileRecord({
            id: args.where.id,
            ...args.data,
            versionGroupId: args.data.versionGroupId,
          });
        },
      },
    },
  };
}

function createService(prisma: unknown) {
  return new FilesService(
    prisma as never,
    {} as never,
    { log: async () => null } as never,
    {
      buildWhere: () => ({
        dataScope: RecordDataScope.REAL,
        partitionKey: "REAL",
        testBatchId: null,
      }),
      mergeWhere: (baseWhere: unknown, partitionWhere: unknown) => ({
        AND: [baseWhere, partitionWhere],
      }),
      getWritableCreateData: async () => ({
        dataScope: RecordDataScope.REAL,
        partitionKey: "REAL",
        testBatchId: null,
      }),
    } as never,
  );
}

test("FilesService auto archives business files into business folders and version chains", async () => {
  const { prisma, calls } = createPrismaMock();
  const service = createService(prisma);

  const file = await service.createFileRecord(
    {
      fileName: "月度會議.pdf",
      fileUrl: "https://crm.example.com/file.pdf",
      fileType: "application/pdf",
      businessType: "quotation",
      businessId: "quote-1",
      tagText: "月度會議",
      fileSizeBytes: 1024,
    },
    user,
  );

  assert.equal(calls.folderCreates.length, 2);
  assert.equal(calls.folderCreates[0].data.name, "报价档案");
  assert.equal(calls.folderCreates[1].data.name, "Q-20260511-001");
  assert.equal(calls.fileCreates.length, 1);
  assert.equal(calls.fileCreates[0].data.category, "报价附件");
  assert.equal(calls.fileCreates[0].data.businessType, "QUOTATION");
  assert.equal(calls.fileCreates[0].data.businessId, "quote-1");
  assert.equal(calls.fileCreates[0].data.relatedType, "QUOTATION");
  assert.equal(calls.fileCreates[0].data.relatedId, "quote-1");
  assert.equal(calls.fileCreates[0].data.status, FileRecordStatus.ARCHIVED);
  assert.equal(calls.fileCreates[0].data.isArchived, true);
  assert.equal(calls.fileCreates[0].data.versionGroupId, "existing-group");
  assert.equal(calls.fileCreates[0].data.versionNumber, 3);
  assert.equal(file.relatedEntity?.label, "报价");
  assert.equal(file.relatedEntity?.href, "/quotations/quote-1");
});

test("FilesService filters business files by related type and id across archive folders", () => {
  const { prisma } = createPrismaMock();
  const service = createService(prisma);
  const normalized = (service as never as {
    normalizeQuery: (
      query: Record<string, string>,
      user: AuthenticatedUser,
    ) => Record<string, unknown>;
    buildFileWhere: (
      options: Record<string, unknown>,
      user: AuthenticatedUser,
      descendantIds: string[],
    ) => Record<string, unknown>;
  }).normalizeQuery(
    {
      view: "all",
      relatedType: "quotation",
      relatedId: "quote-1",
    },
    user,
  );

  const where = (service as never as {
    buildFileWhere: (
      options: Record<string, unknown>,
      user: AuthenticatedUser,
      descendantIds: string[],
    ) => Record<string, unknown>;
  }).buildFileWhere(normalized, user, []);
  const serialized = JSON.stringify(where);

  assert.equal(serialized.includes('"folderId":null'), false);
  assert.ok(serialized.includes('"relatedType":"QUOTATION"'));
  assert.ok(serialized.includes('"businessType":"QUOTATION"'));
  assert.ok(serialized.includes('"relatedId":"quote-1"'));
  assert.ok(serialized.includes('"businessId":"quote-1"'));
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
    console.error(`${failures.length} files regression test(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${tests.length} files regression test(s) passed.`);
}

void main();
