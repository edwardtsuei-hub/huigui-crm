import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { DataScope, RecordDataScope } from "@prisma/client";
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from "../apps/api/src/common/decorators/permissions.decorator";
import { PermissionsGuard } from "../apps/api/src/common/guards/permissions.guard";
import { DAOCHONG_MOBILE_PERMISSIONS } from "../apps/api/src/daochong-mobile/daochong-mobile.permissions";
import { DaochongMobileReadonlyController } from "../apps/api/src/daochong-mobile/daochong-mobile.controller";
import { DaochongMobileReadonlyService } from "../apps/api/src/daochong-mobile/daochong-mobile.service";
import {
  DEFAULT_ROLE_PERMISSION_CODES,
  PERMISSION_DEFINITIONS,
} from "../apps/api/src/management/management.constants";

const baseUser = {
  id: "admin-1",
  name: "Admin",
  dataScope: DataScope.ALL,
  recordDataScope: RecordDataScope.REAL,
  testBatchId: null,
  roleCode: "SUPER_ADMIN",
  roleName: "Super Admin",
  permissions: ["page.customers.detail"],
};

function config(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  };
}

function createPartition() {
  return {
    getWritableCreateData: async () => ({
      dataScope: RecordDataScope.REAL,
      partitionKey: "REAL",
      testBatchId: null,
    }),
    resolveContext: () => ({
      dataScope: RecordDataScope.REAL,
      partitionKey: "REAL",
      testBatchId: null,
    }),
    assertSamePartition: () => undefined,
  };
}

function createAccessControl() {
  return {
    hasPermission: (
      user: { roleCode?: string; permissions?: string[] },
      permissionCode: string,
    ) => user.roleCode === "SUPER_ADMIN" || (user.permissions ?? []).includes(permissionCode),
    buildCustomerWhere: async (_user: unknown, baseWhere = {}) => baseWhere,
    buildTaskWhere: async (_user: unknown, baseWhere = {}) => baseWhere,
  };
}

function createPermissionContext(user: unknown) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  };
}

test("Daochong Limeng dedicated permissions are cataloged without granting Finance customer detail", () => {
  const permissionCodes = new Set(PERMISSION_DEFINITIONS.map((item) => item.code));
  assert.equal(permissionCodes.has(DAOCHONG_MOBILE_PERMISSIONS.rechargeReviewRead), true);
  assert.equal(permissionCodes.has(DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReview), true);
  assert.equal(permissionCodes.has(DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReturn), true);

  assert.equal(DEFAULT_ROLE_PERMISSION_CODES.FINANCE.includes(DAOCHONG_MOBILE_PERMISSIONS.rechargeReviewRead), true);
  assert.equal(DEFAULT_ROLE_PERMISSION_CODES.FINANCE.includes(DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReview), true);
  assert.equal(DEFAULT_ROLE_PERMISSION_CODES.FINANCE.includes(DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReturn), true);
  assert.equal(DEFAULT_ROLE_PERMISSION_CODES.FINANCE.includes("page.customers.detail"), false);
});

test("Daochong Limeng routes use dedicated permissions while recharge list supports narrow review read", () => {
  const controller = DaochongMobileReadonlyController.prototype;

  assert.deepEqual(
    Reflect.getMetadata(ANY_PERMISSIONS_KEY, controller.listRecharges),
    ["page.customers.detail", DAOCHONG_MOBILE_PERMISSIONS.rechargeReviewRead],
  );
  assert.deepEqual(
    Reflect.getMetadata(PERMISSIONS_KEY, controller.reviewRechargeByLimeng),
    [DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReview],
  );
  assert.deepEqual(
    Reflect.getMetadata(PERMISSIONS_KEY, controller.returnRechargeByLimeng),
    [DAOCHONG_MOBILE_PERMISSIONS.limengRechargeReturn],
  );
  assert.deepEqual(
    Reflect.getMetadata(PERMISSIONS_KEY, controller.approveRechargeByChengcheng),
    ["page.customers.detail"],
  );
});

test("Permission guard accepts any one of the narrow read permissions", () => {
  const guard = new PermissionsGuard(
    {
      getAllAndOverride: (key: string) => (
        key === ANY_PERMISSIONS_KEY
          ? ["page.customers.detail", DAOCHONG_MOBILE_PERMISSIONS.rechargeReviewRead]
          : undefined
      ),
    } as never,
    createAccessControl() as never,
  );

  assert.equal(guard.canActivate(createPermissionContext({
    roleCode: "FINANCE",
    permissions: [DAOCHONG_MOBILE_PERMISSIONS.rechargeReviewRead],
  }) as never), true);

  assert.throws(
    () => guard.canActivate(createPermissionContext({
      roleCode: "FINANCE",
      permissions: [],
    }) as never),
    ForbiddenException,
  );
});

function serviceNoteRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-06-23T04:00:00.000Z");
  return {
    id: "note-1",
    appointmentId: null,
    settlementDraftId: null,
    customerId: "customer-1",
    teacherId: "teacher-1",
    projectId: null,
    roomId: null,
    sourceType: "MANUAL_BACKFILL",
    pendingReason: null,
    serviceSummary: "Shoulder therapy completed",
    customerFeedback: null,
    nextSuggestion: null,
    preferenceNote: null,
    preferenceSyncStatus: "NOT_SYNCED",
    noteStatus: "PENDING",
    dueAt: null,
    reminderScheduledAt: null,
    remindedAt: null,
    completedAt: null,
    createdByUserId: "admin-1",
    dataScope: RecordDataScope.REAL,
    partitionKey: "REAL",
    testBatchId: null,
    createdAt: now,
    updatedAt: now,
    customer: {
      id: "customer-1",
      customerName: "Lin",
      contactName: null,
      companyName: null,
    },
    teacher: {
      id: "teacher-1",
      loginAccount: "teacher",
      name: "Teacher",
      wecomName: "Teacher WeCom",
      wecomUserId: "teacher-wecom",
    },
    project: null,
    createdBy: {
      id: "admin-1",
      loginAccount: "admin",
      name: "Admin",
    },
    ...overrides,
  };
}

function rechargeRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-06-23T04:00:00.000Z");
  return {
    id: "recharge-1",
    customerId: "customer-1",
    submittedByUserId: "admin-1",
    amount: "688.00",
    paymentMethod: "WECHAT",
    evidenceAssetIds: ["asset-1"],
    cashPhotoAssetIds: null,
    cashAmount: null,
    cashCustodianUserId: null,
    rechargeStatus: "PENDING_CHENGCHENG_APPROVAL",
    chengchengApprovedByUserId: null,
    chengchengApprovedAt: null,
    limengReviewedByUserId: null,
    limengReviewedAt: null,
    returnReason: null,
    balanceAppliedAt: null,
    financeSummaryMonth: null,
    dataScope: RecordDataScope.REAL,
    partitionKey: "REAL",
    testBatchId: null,
    createdAt: now,
    updatedAt: now,
    customer: {
      id: "customer-1",
      customerName: "Lin",
      contactName: null,
      companyName: null,
    },
    submittedBy: {
      id: "admin-1",
      loginAccount: "admin",
      name: "Admin",
    },
    cashCustodian: null,
    chengchengApprover: null,
    limengReviewer: null,
    ...overrides,
  };
}

function createPrisma(calls: {
  noteCreates?: Array<Record<string, unknown>>;
  noteUpdates?: Array<Record<string, unknown>>;
  preferenceCreates?: Array<Record<string, unknown>>;
  rechargeCreates?: Array<Record<string, unknown>>;
  rechargeUpdates?: Array<Record<string, unknown>>;
  rechargeFindFirst?: Record<string, unknown> | null;
  rechargeFindFirstArgs?: Array<Record<string, unknown>>;
}) {
  return {
    customer: {
      findFirst: async () => ({
        id: "customer-1",
        customerName: "Lin",
        contactName: null,
        companyName: null,
        dataScope: RecordDataScope.REAL,
        partitionKey: "REAL",
        testBatchId: null,
      }),
    },
    user: {
      findFirst: async () => ({
        id: "teacher-1",
        loginAccount: "teacher",
        name: "Teacher",
        wecomName: "Teacher WeCom",
        wecomUserId: "teacher-wecom",
      }),
    },
    product: {
      findFirst: async () => null,
    },
    daochongServiceNote: {
      findFirst: async () => serviceNoteRecord(),
      create: async (args: Record<string, unknown>) => {
        calls.noteCreates?.push(args);
        return serviceNoteRecord(args.data as Record<string, unknown>);
      },
      update: async (args: Record<string, unknown>) => {
        calls.noteUpdates?.push(args);
        return serviceNoteRecord(args.data as Record<string, unknown>);
      },
    },
    daochongCustomerPreference: {
      create: async (args: Record<string, unknown>) => {
        calls.preferenceCreates?.push(args);
        return args.data;
      },
    },
    daochongCustomerRecharge: {
      findFirst: async (args: Record<string, unknown>) => {
        calls.rechargeFindFirstArgs?.push(args);
        return calls.rechargeFindFirst === undefined ? rechargeRecord() : calls.rechargeFindFirst;
      },
      create: async (args: Record<string, unknown>) => {
        calls.rechargeCreates?.push(args);
        return rechargeRecord(args.data as Record<string, unknown>);
      },
      update: async (args: Record<string, unknown>) => {
        calls.rechargeUpdates?.push(args);
        return rechargeRecord(args.data as Record<string, unknown>);
      },
    },
    $transaction: async (run: (tx: unknown) => Promise<unknown>) => run({
      daochongServiceNote: {
        create: async (args: Record<string, unknown>) => {
          calls.noteCreates?.push(args);
          return serviceNoteRecord(args.data as Record<string, unknown>);
        },
        update: async (args: Record<string, unknown>) => {
          calls.noteUpdates?.push(args);
          return serviceNoteRecord(args.data as Record<string, unknown>);
        },
      },
      daochongCustomerPreference: {
        create: async (args: Record<string, unknown>) => {
          calls.preferenceCreates?.push(args);
          return args.data;
        },
      },
    }),
  };
}

function createService(options?: {
  config?: Record<string, string | undefined>;
  prisma?: unknown;
  wecomCalls?: Array<Record<string, unknown>>;
}) {
  const wecomCalls = options?.wecomCalls ?? [];
  return new DaochongMobileReadonlyService(
    (options?.prisma ?? createPrisma({})) as never,
    createAccessControl() as never,
    config({
      DAOCHONG_MOBILE_WRITE_ENABLED: "true",
      DAOCHONG_WECOM_TEST_SEND_ENABLED: "false",
      ...options?.config,
    }) as never,
    createPartition() as never,
    {
      sendTextCardMessage: async (
        toUser: string,
        payload: Record<string, unknown>,
      ) => {
        wecomCalls.push({ toUser, payload });
        return { success: true };
      },
    } as never,
  );
}

test("Daochong service note write creates the note and synced preference rows", async () => {
  const calls = {
    noteCreates: [] as Array<Record<string, unknown>>,
    preferenceCreates: [] as Array<Record<string, unknown>>,
  };
  const service = createService({ prisma: createPrisma(calls) });

  const result = await service.createServiceNote({
    customerId: "customer-1",
    teacherId: "teacher-1",
    serviceSummary: "Shoulder therapy completed",
    preferences: [
      {
        preferenceType: "ROOM",
        preferenceLabel: "Room",
        preferenceValue: "Quiet room",
      },
    ],
  }, baseUser as never);

  assert.equal(result.ok, true);
  assert.equal(result.preferenceWrites, 1);
  assert.equal(calls.noteCreates.length, 1);
  assert.deepEqual((calls.noteCreates[0].data as Record<string, unknown>).dataScope, RecordDataScope.REAL);
  assert.equal((calls.noteCreates[0].data as Record<string, unknown>).preferenceSyncStatus, "SYNCED");
  assert.equal(calls.preferenceCreates.length, 1);
  assert.equal((calls.preferenceCreates[0].data as Record<string, unknown>).sourceServiceNoteId, "note-1");
  assert.equal((calls.preferenceCreates[0].data as Record<string, unknown>).preferenceType, "ROOM");
});

test("Daochong recharge write creates a pending Chengcheng approval without applying balance", async () => {
  const calls = {
    rechargeCreates: [] as Array<Record<string, unknown>>,
  };
  const service = createService({ prisma: createPrisma(calls) });

  const result = await service.createRecharge({
    customerId: "customer-1",
    amount: "688",
    paymentMethod: "WECHAT",
    evidenceAssetIds: ["asset-1", "asset-1", "asset-2"],
  }, baseUser as never);

  assert.equal(result.ok, true);
  assert.equal(result.action, "created_pending_chengcheng_approval");
  assert.equal(result.safety.balanceApplied, false);
  assert.equal(result.safety.financeConfirmed, false);
  assert.equal(result.safety.wecomSent, false);
  assert.equal(calls.rechargeCreates.length, 1);

  const data = calls.rechargeCreates[0].data as Record<string, unknown>;
  assert.equal(data.customerId, "customer-1");
  assert.equal(data.submittedByUserId, "admin-1");
  assert.equal(data.amount, "688.00");
  assert.equal(data.paymentMethod, "WECHAT");
  assert.deepEqual(data.evidenceAssetIds, ["asset-1", "asset-2"]);
  assert.equal(data.rechargeStatus, "PENDING_CHENGCHENG_APPROVAL");
  assert.equal(data.balanceAppliedAt, null);
  assert.equal(data.financeSummaryMonth, null);
  assert.deepEqual(data.dataScope, RecordDataScope.REAL);
  assert.equal(data.partitionKey, "REAL");
});

test("Daochong cash recharge requires cash amount and cash photo ids", async () => {
  const service = createService({ prisma: createPrisma({}) });

  await assert.rejects(
    () => service.createRecharge({
      customerId: "customer-1",
      amount: "300",
      paymentMethod: "CASH",
      evidenceAssetIds: ["cash-receipt-1"],
      cashAmount: "300",
    }, baseUser as never),
    BadRequestException,
  );
});

test("Daochong Chengcheng approval moves recharge to Limeng review without applying balance", async () => {
  const calls = {
    rechargeFindFirstArgs: [] as Array<Record<string, unknown>>,
    rechargeUpdates: [] as Array<Record<string, unknown>>,
  };
  const service = createService({ prisma: createPrisma(calls) });

  const result = await service.approveRechargeByChengcheng("recharge-1", baseUser as never);

  assert.equal(result.ok, true);
  assert.equal(result.action, "chengcheng_approved_pending_limeng_review");
  assert.equal(result.safety.balanceApplied, false);
  assert.equal(result.safety.financeConfirmed, false);
  assert.equal(result.safety.wecomSent, false);
  assert.equal(calls.rechargeUpdates.length, 1);

  const data = calls.rechargeUpdates[0].data as Record<string, unknown>;
  assert.equal(data.rechargeStatus, "PENDING_LIMENG_REVIEW");
  assert.equal(data.chengchengApprovedByUserId, "admin-1");
  assert.ok(data.chengchengApprovedAt instanceof Date);
  assert.equal(data.limengReviewedByUserId, null);
  assert.equal(data.limengReviewedAt, null);
  assert.equal(data.returnReason, null);
  assert.equal(data.balanceAppliedAt, null);
  assert.equal(data.financeSummaryMonth, null);
  assert.ok((calls.rechargeFindFirstArgs[0].where as Record<string, unknown>).customer);
});

test("Daochong Chengcheng return keeps recharge out of Limeng review and finance", async () => {
  const calls = {
    rechargeUpdates: [] as Array<Record<string, unknown>>,
  };
  const service = createService({ prisma: createPrisma(calls) });

  const result = await service.returnRechargeByChengcheng("recharge-1", {
    returnReason: "凭证不清晰",
  }, baseUser as never);

  assert.equal(result.ok, true);
  assert.equal(result.action, "chengcheng_returned");
  assert.equal(result.safety.balanceApplied, false);
  assert.equal(result.safety.financeConfirmed, false);
  assert.equal(result.safety.wecomSent, false);
  assert.equal(calls.rechargeUpdates.length, 1);

  const data = calls.rechargeUpdates[0].data as Record<string, unknown>;
  assert.equal(data.rechargeStatus, "RETURNED_BY_CHENGCHENG");
  assert.equal(data.chengchengApprovedByUserId, null);
  assert.equal(data.chengchengApprovedAt, null);
  assert.equal(data.limengReviewedByUserId, null);
  assert.equal(data.limengReviewedAt, null);
  assert.equal(data.returnReason, "凭证不清晰");
  assert.equal(data.balanceAppliedAt, null);
  assert.equal(data.financeSummaryMonth, null);
});

test("Daochong Chengcheng approval rejects recharges that already left the pending state", async () => {
  const service = createService({
    prisma: createPrisma({
      rechargeFindFirst: rechargeRecord({
        rechargeStatus: "PENDING_LIMENG_REVIEW",
      }),
    }),
  });

  await assert.rejects(
    () => service.approveRechargeByChengcheng("recharge-1", baseUser as never),
    BadRequestException,
  );
});

test("Daochong Limeng review confirms recharge and applies balance marker", async () => {
  const calls = {
    rechargeFindFirstArgs: [] as Array<Record<string, unknown>>,
    rechargeUpdates: [] as Array<Record<string, unknown>>,
  };
  const service = createService({
    prisma: createPrisma({
      ...calls,
      rechargeFindFirst: rechargeRecord({
        rechargeStatus: "PENDING_LIMENG_REVIEW",
      }),
    }),
  });

  const result = await service.reviewRechargeByLimeng("recharge-1", baseUser as never);

  assert.equal(result.ok, true);
  assert.equal(result.action, "limeng_reviewed_confirmed");
  assert.equal(result.safety.balanceApplied, true);
  assert.equal(result.safety.financeConfirmed, false);
  assert.equal(result.safety.wecomSent, false);
  assert.equal(calls.rechargeUpdates.length, 1);

  const data = calls.rechargeUpdates[0].data as Record<string, unknown>;
  assert.equal(data.rechargeStatus, "CONFIRMED");
  assert.equal(data.limengReviewedByUserId, "admin-1");
  assert.ok(data.limengReviewedAt instanceof Date);
  assert.equal(data.returnReason, null);
  assert.ok(data.balanceAppliedAt instanceof Date);
  assert.match(String(data.financeSummaryMonth), /^\d{4}-\d{2}$/);
  assert.equal((calls.rechargeFindFirstArgs[0].where as Record<string, unknown>).customer, undefined);
});

test("Daochong Limeng return keeps recharge out of confirmed balance", async () => {
  const calls = {
    rechargeFindFirstArgs: [] as Array<Record<string, unknown>>,
    rechargeUpdates: [] as Array<Record<string, unknown>>,
  };
  const service = createService({
    prisma: createPrisma({
      ...calls,
      rechargeFindFirst: rechargeRecord({
        rechargeStatus: "PENDING_LIMENG_REVIEW",
      }),
    }),
  });

  const result = await service.returnRechargeByLimeng("recharge-1", {
    returnReason: "付款凭证与金额不一致",
  }, baseUser as never);

  assert.equal(result.ok, true);
  assert.equal(result.action, "limeng_returned");
  assert.equal(result.safety.balanceApplied, false);
  assert.equal(result.safety.financeConfirmed, false);
  assert.equal(result.safety.wecomSent, false);
  assert.equal(calls.rechargeUpdates.length, 1);

  const data = calls.rechargeUpdates[0].data as Record<string, unknown>;
  assert.equal(data.rechargeStatus, "RETURNED_BY_LIMENG");
  assert.equal(data.limengReviewedByUserId, null);
  assert.equal(data.limengReviewedAt, null);
  assert.equal(data.returnReason, "付款凭证与金额不一致");
  assert.equal(data.balanceAppliedAt, null);
  assert.equal(data.financeSummaryMonth, null);
  assert.equal((calls.rechargeFindFirstArgs[0].where as Record<string, unknown>).customer, undefined);
});

test("Daochong Limeng review rejects non pending Limeng state", async () => {
  const service = createService({
    prisma: createPrisma({
      rechargeFindFirst: rechargeRecord({
        rechargeStatus: "PENDING_CHENGCHENG_APPROVAL",
      }),
    }),
  });

  await assert.rejects(
    () => service.reviewRechargeByLimeng("recharge-1", baseUser as never),
    BadRequestException,
  );
});

test("Daochong WeCom test send rejects targets outside the allowlist before sending", async () => {
  const wecomCalls: Array<Record<string, unknown>> = [];
  const service = createService({
    config: {
      DAOCHONG_WECOM_TEST_SEND_ENABLED: "true",
      DAOCHONG_WECOM_TEST_ALLOWLIST: "allowed-user",
    },
    wecomCalls,
  });

  await assert.rejects(
    () => service.sendWecomReminderTest({
      serviceNoteId: "note-1",
      toUser: "blocked-user",
    }, baseUser as never),
    ForbiddenException,
  );
  assert.equal(wecomCalls.length, 0);
});

test("Daochong WeCom test send marks reminded only when the allowlisted target is the note teacher", async () => {
  const calls = {
    noteUpdates: [] as Array<Record<string, unknown>>,
  };
  const wecomCalls: Array<Record<string, unknown>> = [];
  const service = createService({
    config: {
      DAOCHONG_WECOM_TEST_SEND_ENABLED: "true",
      DAOCHONG_WECOM_TEST_ALLOWLIST: "teacher-wecom",
    },
    prisma: createPrisma(calls),
    wecomCalls,
  });

  const result = await service.sendWecomReminderTest({
    serviceNoteId: "note-1",
    toUser: "teacher-wecom",
  }, baseUser as never);

  assert.equal(result.ok, true);
  assert.equal(result.markedReminded, true);
  assert.equal(wecomCalls.length, 1);
  assert.equal(wecomCalls[0].toUser, "teacher-wecom");
  assert.equal(calls.noteUpdates.length, 1);
  assert.ok((calls.noteUpdates[0].data as Record<string, unknown>).remindedAt instanceof Date);
});
