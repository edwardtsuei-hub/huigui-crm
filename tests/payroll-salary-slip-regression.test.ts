import "reflect-metadata";

import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { DataScope, RecordDataScope } from "@prisma/client";
import { PayrollService } from "../apps/api/src/payroll/payroll.service";
import type { AuthenticatedUser } from "../apps/api/src/common/types/authenticated-user";

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const execFileAsync = promisify(execFile);

type SalaryUploadRow = {
  姓名: string;
  企业微信账号?: string;
  员工ID?: string;
  用户ID?: string;
  登录账号?: string;
  系统账号?: string;
  部门?: string;
  岗位?: string;
  应发?: string | number;
  提成?: string | number;
  分润?: string | number;
  扣款?: string | number;
  实发?: string | number;
  人员类型?: string;
  差异状态?: string;
};

type SalaryDraftRow = {
  teacherName: string;
  teacherId: string;
  userId?: string;
  wecomUserId?: string;
  loginAccount?: string;
  department: string;
  position: string;
  employmentType: string;
  grossAmount: number;
  commissionAmount: number;
  profitSharingAmount: number;
  deductionAmount: number;
  netAmount: number;
  differenceStatus: string;
};

type PayrollMockCall = {
  method: "POST";
  path: string;
  body: Record<string, unknown>;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

const REQUIRED_HEADERS = [
  "姓名",
  "企业微信账号",
  "部门",
  "岗位",
  "应发",
  "提成",
  "分润",
  "扣款",
  "实发",
];

function asAmount(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsv(content: string): SalaryUploadRow[] {
  const [headerLine, ...lines] = content.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map((item) => item.trim());
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cells = line.split(",").map((item) => item.trim());
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])) as SalaryUploadRow;
    });
}

function extensionOf(fileName: string) {
  return fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
}

function shouldNotifyWecom(row: SalaryDraftRow) {
  return Boolean(row.wecomUserId)
    && !/合作|外部|partner/i.test(row.employmentType)
    && !/合作/.test(row.position);
}

class PayrollSalarySlipMockApi {
  readonly calls: PayrollMockCall[] = [];
  private batches = new Map<string, {
    month: string;
    fileName: string;
    missingFields: string[];
    previewSupported: boolean;
    formatHint?: string;
    rows: SalaryDraftRow[];
    returnTo: string;
  }>();

  uploadSalaryTable(input: {
    fileName: string;
    month: string;
    content?: string;
    rows?: SalaryUploadRow[];
    returnTo?: string;
  }) {
    const extension = extensionOf(input.fileName);
    if (!["csv", "xlsx", "xls"].includes(extension)) {
      throw new Error("仅支持 .xlsx、.xls、.csv 薪资表。");
    }

    const rawRows = input.rows ?? (extension === "csv" ? parseCsv(input.content ?? "") : []);
    const headers = new Set(rawRows.flatMap((row) => Object.keys(row)));
    const missingFields = REQUIRED_HEADERS.filter((field) => !headers.has(field));
    const previewSupported = extension !== "xls";
    const rows = rawRows.map((row) => this.toDraftRow(row));
    const batchId = `payroll-upload-${input.month}-${this.batches.size + 1}`;
    const batch = {
      month: input.month,
      fileName: input.fileName,
      missingFields,
      previewSupported,
      formatHint: previewSupported ? undefined : ".xls 可上传复核，但不能在浏览器预览，建议另存为 .xlsx。",
      rows,
      returnTo: input.returnTo ?? "/payroll/batch",
    };
    this.batches.set(batchId, batch);

    return {
      batchId,
      month: batch.month,
      fileName: batch.fileName,
      missingFields,
      preview: {
        supported: batch.previewSupported,
        formatHint: batch.formatHint,
        totalRows: rows.length,
        unresolvedDifferenceCount: rows.filter((row) => row.differenceStatus !== "resolved").length,
        notifyableCount: rows.filter(shouldNotifyWecom).length,
      },
      redirectAfterImport: batch.returnTo,
    };
  }

  publishSalarySlips(input: {
    batchId: string;
    reviewedOriginal?: boolean;
    confirmedRecipients?: boolean;
    differencesResolved?: boolean;
  }) {
    const batch = this.batches.get(input.batchId);
    if (!batch) {
      throw new Error("未找到薪资导入批次。");
    }
    if (batch.missingFields.length > 0) {
      throw new Error(`字段缺失阻断发布：${batch.missingFields.join("、")}`);
    }
    if (!input.reviewedOriginal || !input.confirmedRecipients) {
      throw new Error("发布前必须核对原表并确认发送名单。");
    }
    if (!input.differencesResolved || batch.rows.some((row) => row.differenceStatus !== "resolved")) {
      throw new Error("差异未处理，不能发布薪资条。");
    }

    const notifyDelivered = batch.rows
      .filter(shouldNotifyWecom)
      .map((row) => ({
        id: row.teacherId,
        name: row.teacherName,
        department: row.department,
        role: row.position,
        userid: row.wecomUserId,
        netAmount: row.netAmount,
      }));
    const notifySkipped = batch.rows
      .filter((row) => !shouldNotifyWecom(row))
      .map((row) => ({
        id: row.teacherId,
        name: row.teacherName,
        department: row.department,
        role: row.position,
        netAmount: row.netAmount,
        reason: row.wecomUserId ? "合作老师不发送企业微信" : "缺少企业微信账号",
      }));
    const publishBatchId = `salary-publish-${batch.month}-${input.batchId}`;

    this.post("/salary-slips/sync", {
      month: batch.month,
      source: "manual_import",
      publishBatchId,
      items: batch.rows.map((row) => ({
        teacherId: row.teacherId,
        teacherName: row.teacherName,
        userId: row.userId,
        wecomUserId: row.wecomUserId,
        loginAccount: row.loginAccount,
        grossAmount: row.grossAmount,
        commissionAmount: row.commissionAmount,
        profitSharingAmount: row.profitSharingAmount,
        deductionAmount: row.deductionAmount,
        netAmount: row.netAmount,
      })),
    });
    this.post("/salary-notify-logs", {
      month: batch.month,
      actionLabel: "发布并通知",
      status: "preview",
      publishBatchId,
      message: `企业微信可通知 ${notifyDelivered.length} 人，跳过 ${notifySkipped.length} 人。`,
      delivered: notifyDelivered,
      skipped: notifySkipped,
      failed: [],
    });

    return {
      ok: true,
      redirectTo: "/payroll/batch",
      publishBatchId,
      notifyDelivered,
      notifySkipped,
    };
  }

  private post(path: string, body: Record<string, unknown>) {
    this.calls.push({ method: "POST", path, body });
    return { ok: true };
  }

  private toDraftRow(row: SalaryUploadRow): SalaryDraftRow {
    const teacherName = String(row.姓名 ?? "").trim();
    const userId = String(row.用户ID ?? "").trim() || undefined;
    const wecomUserId = String(row.企业微信账号 ?? "").trim() || undefined;
    const loginAccount = String(row.登录账号 ?? row.系统账号 ?? "").trim() || undefined;
    const teacherId = String(row.员工ID ?? "").trim() || wecomUserId || loginAccount || userId || `teacher-${teacherName}`;

    return {
      teacherName,
      teacherId,
      userId,
      wecomUserId,
      loginAccount,
      department: String(row.部门 ?? "未分组").trim(),
      position: String(row.岗位 ?? "成员").trim(),
      employmentType: String(row.人员类型 ?? row.岗位 ?? "正式").trim(),
      grossAmount: asAmount(row.应发),
      commissionAmount: asAmount(row.提成),
      profitSharingAmount: asAmount(row.分润),
      deductionAmount: asAmount(row.扣款),
      netAmount: asAmount(row.实发),
      differenceStatus: String(row.差异状态 ?? "resolved").trim() || "resolved",
    };
  }
}

function baseRows(): SalaryUploadRow[] {
  return [
    {
      姓名: "程程",
      企业微信账号: "chengcheng",
      员工ID: "teacher-chengcheng",
      用户ID: "user-chengcheng",
      登录账号: "chengcheng",
      部门: "道冲元气",
      岗位: "主理人",
      应发: 12000,
      提成: 2000,
      分润: 500,
      扣款: 100,
      实发: 12400,
      人员类型: "正式",
      差异状态: "resolved",
    },
    {
      姓名: "外部老师",
      企业微信账号: "partner-teacher",
      员工ID: "teacher-partner",
      部门: "道冲元气",
      岗位: "合作老师",
      应发: 3000,
      提成: 0,
      分润: 300,
      扣款: 0,
      实发: 3300,
      人员类型: "合作老师",
      差异状态: "resolved",
    },
    {
      姓名: "未绑定员工",
      企业微信账号: "",
      员工ID: "teacher-no-wecom",
      用户ID: "user-no-wecom",
      登录账号: "no-wecom",
      部门: "熊抱大地",
      岗位: "门店员工",
      应发: 5200,
      提成: 100,
      分润: 0,
      扣款: 0,
      实发: 5300,
      人员类型: "正式",
      差异状态: "resolved",
    },
  ];
}

function csvFixture(rows: SalaryUploadRow[]) {
  const headers = REQUIRED_HEADERS.concat(["员工ID", "用户ID", "登录账号", "人员类型", "差异状态"]);
  const lines = rows.map((row) => headers.map((header) => String(row[header as keyof SalaryUploadRow] ?? "")).join(","));
  return [headers.join(","), ...lines].join("\n");
}

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    name: "程程",
    loginAccount: "chengcheng",
    mobile: null,
    email: null,
    department: "道冲元气",
    title: "主理人",
    managerUserId: null,
    dataScope: DataScope.ALL,
    recordDataScope: RecordDataScope.REAL,
    testBatchId: null,
    roleCode: "EMPLOYEE",
    roleName: "员工",
    permissions: [],
    wecomUserId: "chengcheng",
    wecomName: "程程",
    wecomAvatar: null,
    ...overrides,
  };
}

function salarySlip(overrides: Record<string, unknown>) {
  const now = new Date("2026-06-17T01:00:00.000Z");
  return {
    id: "salary-slip-1",
    month: "2026-06",
    publishBatchId: null,
    teacherId: "teacher-chengcheng",
    teacherName: "程程",
    userId: null,
    wecomUserId: null,
    loginAccount: null,
    grossAmount: 12000,
    commissionAmount: 2000,
    profitSharingAmount: 500,
    deductionAmount: 100,
    netAmount: 12400,
    source: "manual_import",
    sourceLabel: null,
    settlementId: null,
    syncedBy: "财务",
    syncedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createPayrollPrismaMock(slips: Array<Record<string, unknown>> = [], options: {
  salarySlipDeleteCount?: number;
  salaryNotifyLogs?: Array<Record<string, unknown>>;
} = {}) {
  const calls = {
    findMany: [] as Array<Record<string, unknown>>,
    deleteMany: [] as Array<Record<string, unknown>>,
    createMany: [] as Array<Record<string, unknown>>,
    salaryNotifyLogFindMany: [] as Array<Record<string, unknown>>,
    salaryNotifyLogUpsert: [] as Array<Record<string, unknown>>,
    salaryNotifyLogDeleteMany: [] as Array<Record<string, unknown>>,
    payrollDraftBatchFindUnique: [] as Array<Record<string, unknown>>,
    payrollDraftBatchFindMany: [] as Array<Record<string, unknown>>,
    payrollDraftBatchUpsert: [] as Array<Record<string, unknown>>,
    payrollDraftBatchDeleteMany: [] as Array<Record<string, unknown>>,
  };
  const identityFields = ["teacherId", "userId", "wecomUserId", "loginAccount"];
  const fieldMatches = (slip: Record<string, unknown>, clause: Record<string, { in?: string[] }>, field: string) => {
    const values = clause[field]?.in ?? [];
    const value = slip[field];
    return value !== undefined && value !== null && values.includes(String(value));
  };
  const exactWhereMatches = (slip: Record<string, unknown>, where: Record<string, unknown>) => {
    return ["month", "publishBatchId", "teacherId", "userId", "wecomUserId", "loginAccount"].every((field) => {
      const expected = where[field];
      if (expected === undefined) return true;
      if (field === "publishBatchId" && expected && typeof expected === "object" && "not" in expected) {
        const notValue = (expected as { not: unknown }).not;
        if (notValue === null) {
          return slip[field] !== null && slip[field] !== undefined;
        }
      }
      return slip[field] === expected;
    });
  };
  const salarySlipModel = {
    findMany: async (args: Record<string, unknown>) => {
      calls.findMany.push(args);
      const where = args.where as ({ OR?: Array<Record<string, { in?: string[] }>> } & Record<string, unknown>) | undefined;
      if (!where?.OR?.length) {
        return where ? slips.filter((slip) => exactWhereMatches(slip, where)) : slips;
      }
      return slips.filter((slip) => where.OR?.some((clause) => {
        return identityFields.some((field) => fieldMatches(slip, clause, field));
      }));
    },
    deleteMany: async (args: Record<string, unknown>) => {
      calls.deleteMany.push(args);
      return { count: options.salarySlipDeleteCount ?? 1 };
    },
    createMany: async (args: Record<string, unknown>) => {
      calls.createMany.push(args);
      const data = Array.isArray(args.data) ? args.data : [];
      return { count: data.length };
    },
  };
  const salaryNotifyLogModel = {
    findMany: async (args: Record<string, unknown>) => {
      calls.salaryNotifyLogFindMany.push(args);
      return options.salaryNotifyLogs ?? [];
    },
    upsert: async (args: Record<string, unknown>) => {
      calls.salaryNotifyLogUpsert.push(args);
      return args.create;
    },
    deleteMany: async (args: Record<string, unknown>) => {
      calls.salaryNotifyLogDeleteMany.push(args);
      return { count: 0 };
    },
  };
  const payrollDraftBatchModel = {
    findUnique: async (args: Record<string, unknown>) => {
      calls.payrollDraftBatchFindUnique.push(args);
      return null;
    },
    findMany: async (args: Record<string, unknown>) => {
      calls.payrollDraftBatchFindMany.push(args);
      return [];
    },
    upsert: async (args: Record<string, unknown>) => {
      calls.payrollDraftBatchUpsert.push(args);
      const create = args.create as Record<string, unknown>;
      const update = args.update as Record<string, unknown>;
      return {
        ...create,
        ...update,
        month: create.month,
        createdAt: new Date("2026-06-17T01:00:00.000Z"),
        updatedAt: new Date("2026-06-17T01:00:00.000Z"),
      };
    },
    deleteMany: async (args: Record<string, unknown>) => {
      calls.payrollDraftBatchDeleteMany.push(args);
      return { count: 0 };
    },
  };

  return {
    calls,
    prisma: {
      salarySlip: salarySlipModel,
      salaryNotifyLog: salaryNotifyLogModel,
      payrollDraftBatch: payrollDraftBatchModel,
      $transaction: async (callback: (tx: { salarySlip: typeof salarySlipModel }) => Promise<void>) => {
        await callback({ salarySlip: salarySlipModel });
      },
    },
  };
}

function currentEmployeeReleaseDir() {
  const releaseFile = join(process.cwd(), "apps/web/public/employee-frontend/current.release");
  const release = readFileSync(releaseFile, "utf8").trim();
  return join(process.cwd(), "apps/web/public/employee-frontend/releases", release);
}

function payrollFixture(fileName: string) {
  return readFileSync(join(process.cwd(), "tests/fixtures/payroll", fileName), "utf8");
}

test("current build keeps the salary table upload entry visible", () => {
  const releaseDir = currentEmployeeReleaseDir();
  const assetsDir = join(releaseDir, "assets");
  const payrollBundle = readdirSync(assetsDir).find((fileName) => fileName.includes("payroll-batch-page"));
  assert.ok(payrollBundle, "当前员工端发布包缺少 payroll batch bundle。");
  const text = readFileSync(join(assetsDir, payrollBundle), "utf8");

  assert.ok(text.includes("上传薪资表"));
  assert.ok(text.includes("去导入中心"));
  assert.ok(text.includes("/finance/imports"));
});

test("CSV upload can preview, return to payroll batch, publish, and build notify list", () => {
  const api = new PayrollSalarySlipMockApi();
  const upload = api.uploadSalaryTable({
    fileName: "2026-06-salary.csv",
    month: "2026-06",
    content: csvFixture(baseRows()),
    returnTo: "/payroll/batch",
  });

  assert.equal(upload.preview.supported, true);
  assert.equal(upload.preview.totalRows, 3);
  assert.equal(upload.redirectAfterImport, "/payroll/batch");

  const result = api.publishSalarySlips({
    batchId: upload.batchId,
    reviewedOriginal: true,
    confirmedRecipients: true,
    differencesResolved: true,
  });

  assert.equal(result.redirectTo, "/payroll/batch");
  assert.deepEqual(result.notifyDelivered.map((person) => person.userid), ["chengcheng"]);
  assert.deepEqual(
    result.notifySkipped.map((person) => person.reason),
    ["合作老师不发送企业微信", "缺少企业微信账号"],
  );
  assert.equal(api.calls.some((call) => call.path === "/salary-slips/sync"), true);
});

test("XLSX upload uses the same preview and publish gate in mock mode", () => {
  const api = new PayrollSalarySlipMockApi();
  const upload = api.uploadSalaryTable({
    fileName: "2026-06-salary.xlsx",
    month: "2026-06",
    rows: baseRows(),
  });

  assert.equal(upload.preview.supported, true);
  assert.equal(upload.missingFields.length, 0);
  assert.throws(
    () => api.publishSalarySlips({ batchId: upload.batchId, reviewedOriginal: true, confirmedRecipients: false, differencesResolved: true }),
    /发布前必须核对原表并确认发送名单/,
  );
});

test("XLS upload is accepted for review but clearly marked as non-previewable", () => {
  const api = new PayrollSalarySlipMockApi();
  const upload = api.uploadSalaryTable({
    fileName: "2026-06-salary.xls",
    month: "2026-06",
    rows: baseRows(),
  });

  assert.equal(upload.preview.supported, false);
  assert.match(upload.preview.formatHint ?? "", /不能在浏览器预览/);
});

test("missing salary fields block publish", () => {
  const api = new PayrollSalarySlipMockApi();
  const incompleteRows = baseRows().map(({ 实发, ...row }) => row);
  const upload = api.uploadSalaryTable({
    fileName: "2026-06-salary.xlsx",
    month: "2026-06",
    rows: incompleteRows,
  });

  assert.deepEqual(upload.missingFields, ["实发"]);
  assert.throws(
    () => api.publishSalarySlips({ batchId: upload.batchId, reviewedOriginal: true, confirmedRecipients: true, differencesResolved: true }),
    /字段缺失阻断发布/,
  );
});

test("unresolved differences block publish before salary-slips sync", () => {
  const api = new PayrollSalarySlipMockApi();
  const rows = baseRows();
  rows[0].差异状态 = "unresolved";
  const upload = api.uploadSalaryTable({
    fileName: "2026-06-salary.csv",
    month: "2026-06",
    content: csvFixture(rows),
  });

  assert.equal(upload.preview.unresolvedDifferenceCount, 1);
  assert.throws(
    () => api.publishSalarySlips({ batchId: upload.batchId, reviewedOriginal: true, confirmedRecipients: true, differencesResolved: false }),
    /差异未处理/,
  );
  assert.equal(api.calls.some((call) => call.path === "/salary-slips/sync"), false);
});

test("UAT resolved salary upload fixture publishes with expected notify and identity payload", () => {
  const api = new PayrollSalarySlipMockApi();
  const upload = api.uploadSalaryTable({
    fileName: "salary-upload-uat-resolved-2026-06.csv",
    month: "2026-06",
    content: payrollFixture("salary-upload-uat-resolved-2026-06.csv"),
    returnTo: "/payroll/batch",
  });

  assert.equal(upload.preview.totalRows, 4);
  assert.equal(upload.preview.unresolvedDifferenceCount, 0);
  assert.equal(upload.preview.notifyableCount, 2);

  const result = api.publishSalarySlips({
    batchId: upload.batchId,
    reviewedOriginal: true,
    confirmedRecipients: true,
    differencesResolved: true,
  });
  const syncCall = api.calls.find((call) => call.path === "/salary-slips/sync");
  const notifyCall = api.calls.find((call) => call.path === "/salary-notify-logs");
  const syncItems = syncCall?.body.items as Array<Record<string, unknown>>;

  assert.equal(result.redirectTo, "/payroll/batch");
  assert.deepEqual(result.notifyDelivered.map((person) => person.userid), ["chengcheng", "chengcheng-2"]);
  assert.deepEqual(
    result.notifySkipped.map((person) => person.reason),
    ["合作老师不发送企业微信", "缺少企业微信账号"],
  );
  assert.equal(syncItems.length, 4);
  assert.equal(syncItems.every((item) => item.teacherId && item.userId && item.loginAccount), true);
  assert.equal(syncItems.some((item) => item.teacherName === "程程" && item.wecomUserId === "chengcheng-2"), true);
  assert.equal(notifyCall?.body.publishBatchId, result.publishBatchId);
});

test("UAT unresolved salary upload fixture blocks before sync", () => {
  const api = new PayrollSalarySlipMockApi();
  const upload = api.uploadSalaryTable({
    fileName: "salary-upload-uat-unresolved-2026-06.csv",
    month: "2026-06",
    content: payrollFixture("salary-upload-uat-unresolved-2026-06.csv"),
    returnTo: "/payroll/batch",
  });

  assert.equal(upload.preview.totalRows, 1);
  assert.equal(upload.preview.unresolvedDifferenceCount, 1);
  assert.throws(
    () => api.publishSalarySlips({ batchId: upload.batchId, reviewedOriginal: true, confirmedRecipients: true, differencesResolved: false }),
    /差异未处理/,
  );
  assert.equal(api.calls.some((call) => call.path === "/salary-slips/sync"), false);
});

test("UAT resolved salary fixture can generate backend API payloads", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-payload-"));
  try {
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      tempDir,
      "--synced-by",
      "UAT 财务",
    ], { cwd: process.cwd(), stdio: "pipe" });

    const summary = JSON.parse(readFileSync(join(tempDir, "summary.json"), "utf8")) as {
      status: string;
      rowCount: number;
      notifyableCount: number;
      skippedCount: number;
    };
    const syncPayload = JSON.parse(readFileSync(join(tempDir, "salary-slips-sync.json"), "utf8")) as {
      publishBatchId: string;
      items: Array<Record<string, unknown>>;
    };
    const notifyPayload = JSON.parse(readFileSync(join(tempDir, "salary-notify-log.json"), "utf8")) as {
      publishBatchId: string;
      delivered: Array<Record<string, unknown>>;
      skipped: Array<Record<string, unknown>>;
    };

    assert.equal(summary.status, "ready");
    assert.equal(summary.rowCount, 4);
    assert.equal(summary.notifyableCount, 2);
    assert.equal(summary.skippedCount, 2);
    assert.equal(syncPayload.items.length, 4);
    assert.equal(syncPayload.items.every((item) => item.teacherId && item.userId && item.loginAccount), true);
    assert.equal(notifyPayload.publishBatchId, syncPayload.publishBatchId);
    assert.equal(notifyPayload.delivered.length, 2);
    assert.equal(notifyPayload.skipped.length, 2);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT salary fixture parses quoted CSV amounts with thousands separators", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-payload-quoted-amount-"));
  try {
    const csvPath = join(tempDir, "salary-quoted-amount.csv");
    writeFileSync(csvPath, [
      "姓名,企业微信账号,员工ID,用户ID,登录账号,部门,岗位,应发,提成,分润,扣款,实发,人员类型,差异状态",
      "\"金额,带逗号老师\",wecom-quoted,teacher-quoted,user-quoted,login-quoted,财务部,老师,\"12,000\",\"1,200\",,\"300\",\"12,900\",正式,resolved",
    ].join("\n"));

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      csvPath,
      "--month",
      "2026-06",
      "--out-dir",
      tempDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const summary = JSON.parse(readFileSync(join(tempDir, "summary.json"), "utf8")) as {
      status: string;
      invalidAmountCount: number;
    };
    const syncPayload = JSON.parse(readFileSync(join(tempDir, "salary-slips-sync.json"), "utf8")) as {
      items: Array<Record<string, unknown>>;
    };
    const item = syncPayload.items[0];

    assert.equal(summary.status, "ready");
    assert.equal(summary.invalidAmountCount, 0);
    assert.equal(item.teacherName, "金额,带逗号老师");
    assert.equal(item.grossAmount, 12000);
    assert.equal(item.commissionAmount, 1200);
    assert.equal(item.profitSharingAmount, 0);
    assert.equal(item.deductionAmount, 300);
    assert.equal(item.netAmount, 12900);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT salary fixture strips UTF-8 BOM from CSV headers", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-payload-bom-"));
  try {
    const csvPath = join(tempDir, "salary-bom.csv");
    writeFileSync(csvPath, [
      "\uFEFF姓名,企业微信账号,员工ID,用户ID,登录账号,部门,岗位,应发,提成,分润,扣款,实发,人员类型,差异状态",
      "BOM老师,wecom-bom,teacher-bom,user-bom,login-bom,财务部,老师,1000,,,,1000,正式,resolved",
    ].join("\n"));

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      csvPath,
      "--month",
      "2026-06",
      "--out-dir",
      tempDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const summary = JSON.parse(readFileSync(join(tempDir, "summary.json"), "utf8")) as {
      status: string;
      invalidAmountCount: number;
    };
    const syncPayload = JSON.parse(readFileSync(join(tempDir, "salary-slips-sync.json"), "utf8")) as {
      items: Array<Record<string, unknown>>;
    };
    const item = syncPayload.items[0];

    assert.equal(summary.status, "ready");
    assert.equal(summary.invalidAmountCount, 0);
    assert.equal(item.teacherName, "BOM老师");
    assert.equal(item.teacherId, "teacher-bom");
    assert.equal(item.grossAmount, 1000);
    assert.equal(item.netAmount, 1000);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT salary fixture rejects unclosed quoted CSV cells", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-payload-bad-csv-"));
  try {
    const csvPath = join(tempDir, "salary-bad-csv.csv");
    writeFileSync(csvPath, [
      "姓名,企业微信账号,员工ID,用户ID,登录账号,部门,岗位,应发,提成,分润,扣款,实发,人员类型,差异状态",
      "\"未闭合老师,wecom-bad,teacher-bad,user-bad,login-bad,财务部,老师,1000,,,,1000,正式,resolved",
    ].join("\n"));

    assert.throws(
      () => execFileSync(process.execPath, [
        "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
        "--csv",
        csvPath,
        "--month",
        "2026-06",
        "--out-dir",
        tempDir,
      ], { cwd: process.cwd(), stdio: "pipe" }),
      /CSV has an unclosed quoted cell/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT unresolved salary fixture generates blocked summary without publish payloads", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-payload-blocked-"));
  try {
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-unresolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      tempDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const summary = JSON.parse(readFileSync(join(tempDir, "summary.json"), "utf8")) as {
      status: string;
      unresolvedDifferenceCount: number;
      outputFiles: string[];
    };

    assert.equal(summary.status, "blocked_unresolved_differences");
    assert.equal(summary.unresolvedDifferenceCount, 1);
    assert.deepEqual(summary.outputFiles, ["summary.json"]);
    assert.equal(existsSync(join(tempDir, "salary-slips-sync.json")), false);
    assert.equal(existsSync(join(tempDir, "salary-notify-log.json")), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT salary fixture blocks invalid required amounts before generating publish payloads", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-payload-invalid-amount-"));
  try {
    const csvPath = join(tempDir, "salary-invalid-amount.csv");
    writeFileSync(csvPath, [
      "姓名,企业微信账号,员工ID,用户ID,登录账号,部门,岗位,应发,提成,分润,扣款,实发,人员类型,差异状态",
      "金额异常老师,wecom-invalid,teacher-invalid,user-invalid,login-invalid,财务部,老师,abc,,,,1000,正式,resolved",
    ].join("\n"));

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      csvPath,
      "--month",
      "2026-06",
      "--out-dir",
      tempDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const summary = JSON.parse(readFileSync(join(tempDir, "summary.json"), "utf8")) as {
      status: string;
      invalidAmountCount: number;
      invalidAmounts: Array<{ teacherId: string; fields: string[] }>;
      outputFiles: string[];
    };

    assert.equal(summary.status, "blocked_invalid_amounts");
    assert.equal(summary.invalidAmountCount, 1);
    assert.deepEqual(summary.invalidAmounts[0].fields, ["应发"]);
    assert.equal(summary.invalidAmounts[0].teacherId, "teacher-invalid");
    assert.deepEqual(summary.outputFiles, ["summary.json"]);
    assert.equal(existsSync(join(tempDir, "salary-slips-sync.json")), false);
    assert.equal(existsSync(join(tempDir, "salary-notify-log.json")), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT salary fixture blocks rows without explicit employee identity", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-payload-missing-identity-"));
  try {
    const csvPath = join(tempDir, "salary-missing-identity.csv");
    writeFileSync(csvPath, [
      "姓名,企业微信账号,员工ID,用户ID,登录账号,部门,岗位,应发,提成,分润,扣款,实发,人员类型,差异状态",
      "缺身份老师,,,,,财务部,老师,1000,,,,1000,正式,resolved",
    ].join("\n"));

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      csvPath,
      "--month",
      "2026-06",
      "--out-dir",
      tempDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const summary = JSON.parse(readFileSync(join(tempDir, "summary.json"), "utf8")) as {
      status: string;
      missingIdentityCount: number;
      missingIdentities: Array<{ teacherName: string }>;
      outputFiles: string[];
    };

    assert.equal(summary.status, "blocked_missing_identity");
    assert.equal(summary.missingIdentityCount, 1);
    assert.equal(summary.missingIdentities[0].teacherName, "缺身份老师");
    assert.deepEqual(summary.outputFiles, ["summary.json"]);
    assert.equal(existsSync(join(tempDir, "salary-slips-sync.json")), false);
    assert.equal(existsSync(join(tempDir, "salary-notify-log.json")), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT salary fixture blocks CSV files with missing required headers before generating publish payloads", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-payload-missing-header-"));
  try {
    const csvPath = join(tempDir, "salary-missing-header.csv");
    writeFileSync(csvPath, [
      "姓名,部门,岗位,应发,提成,分润,扣款,人员类型,差异状态",
      "缺表头老师,财务部,老师,1000,,,,正式,resolved",
    ].join("\n"));

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      csvPath,
      "--month",
      "2026-06",
      "--out-dir",
      tempDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const summary = JSON.parse(readFileSync(join(tempDir, "summary.json"), "utf8")) as {
      status: string;
      missingRequiredHeaders: string[];
      outputFiles: string[];
    };

    assert.equal(summary.status, "blocked_missing_required_headers");
    assert.ok(summary.missingRequiredHeaders.includes("实发"));
    assert.ok(summary.missingRequiredHeaders.includes("员工ID/用户ID/企业微信账号/登录账号/系统账号"));
    assert.deepEqual(summary.outputFiles, ["summary.json"]);
    assert.equal(existsSync(join(tempDir, "salary-slips-sync.json")), false);
    assert.equal(existsSync(join(tempDir, "salary-notify-log.json")), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT payroll API submitter defaults to dry-run and refuses to write without execute", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-api-uat-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const out = join(tempDir, "submit-plan.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-api-uat-submit.mjs",
      "--payload-dir",
      payloadDir,
      "--api-base-url",
      "http://127.0.0.1:4000/api",
      "--out",
      out,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const plan = JSON.parse(readFileSync(out, "utf8")) as {
      writesDatabase: boolean;
      status: string;
      requests: Array<{ name: string; endpoint: string; itemCount?: number }>;
      responses: unknown[];
    };

    assert.equal(plan.writesDatabase, false);
    assert.equal(plan.status, "dry_run_ready");
    assert.equal(plan.requests.length, 4);
    assert.equal(plan.requests[0].name, "syncSalarySlips");
    assert.equal(plan.requests[0].endpoint, "http://127.0.0.1:4000/api/salary-slips/sync");
    assert.equal(plan.requests[0].itemCount, 4);
    assert.equal(plan.requests.some((request) => request.name === "listSalarySlips"), true);
    assert.equal(plan.requests.some((request) => request.name === "listSalaryNotifyLogs"), true);
    assert.deepEqual(plan.responses, []);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT payroll API submitter requires explicit test database confirmation before execute", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-api-uat-confirm-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const out = join(tempDir, "submit-result.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    assert.throws(
      () => execFileSync(process.execPath, [
        "scripts/migrations/payroll/salary-api-uat-submit.mjs",
        "--payload-dir",
        payloadDir,
        "--api-base-url",
        "http://127.0.0.1:4000/api",
        "--token",
        "uat-token",
        "--out",
        out,
        "--execute",
      ], { cwd: process.cwd(), stdio: "pipe" }),
      /--execute requires --confirm-test-db PAYROLL_UAT_TEST_DB/,
    );
    assert.equal(existsSync(out), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT payroll API submitter blocks unresolved payloads and production-like hosts", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-api-uat-blocked-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const out = join(tempDir, "submit-plan.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-unresolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-api-uat-submit.mjs",
      "--payload-dir",
      payloadDir,
      "--api-base-url",
      "http://127.0.0.1:4000/api",
      "--out",
      out,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const plan = JSON.parse(readFileSync(out, "utf8")) as {
      writesDatabase: boolean;
      status: string;
      requests: unknown[];
      blockers: string[];
    };

    assert.equal(plan.writesDatabase, false);
    assert.equal(plan.status, "blocked");
    assert.deepEqual(plan.requests, []);
    assert.ok(plan.blockers.some((blocker) => blocker.includes("blocked_unresolved_differences")));
    assert.throws(
      () => execFileSync(process.execPath, [
        "scripts/migrations/payroll/salary-api-uat-submit.mjs",
        "--payload-dir",
        payloadDir,
        "--api-base-url",
        "https://management.hui-health.com/api",
      ], { cwd: process.cwd(), stdio: "pipe" }),
      /Refusing to execute against production-like host/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT payroll API submitter blocks inconsistent payload files before dry-run plan", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-api-uat-inconsistent-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const out = join(tempDir, "submit-plan.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const notifyPath = join(payloadDir, "salary-notify-log.json");
    const notifyPayload = JSON.parse(readFileSync(notifyPath, "utf8")) as Record<string, unknown>;
    writeFileSync(notifyPath, `${JSON.stringify({
      ...notifyPayload,
      publishBatchId: "wrong-notify-publish-batch",
    }, null, 2)}\n`);

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-api-uat-submit.mjs",
      "--payload-dir",
      payloadDir,
      "--api-base-url",
      "http://127.0.0.1:4000/api",
      "--out",
      out,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const plan = JSON.parse(readFileSync(out, "utf8")) as {
      status: string;
      blockers: string[];
      requests: unknown[];
    };

    assert.equal(plan.status, "blocked");
    assert.ok(plan.blockers.some((blocker) => blocker.includes("payload_publish_batch_mismatch_with_notify_log")));
    assert.deepEqual(plan.requests, []);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT payroll API submitter validates sync response before recording notify log", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-api-uat-validate-"));
  const receivedPaths: string[] = [];
  const server = createServer((req, res) => {
    receivedPaths.push(req.url ?? "");
    req.resume();
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/salary-slips/sync") {
      res.end(JSON.stringify({
        ok: true,
        createdCount: 4,
        updatedCount: 0,
        skippedCount: 0,
        teacherIds: ["HG-1001", "HG-1002", "HG-1003", "HG-1004"],
        publishBatchId: "wrong-publish-batch",
        warnings: [],
      }));
      return;
    }
    if (req.url === "/api/salary-notify-logs") {
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false }));
  });

  try {
    const payloadDir = join(tempDir, "payload");
    const out = join(tempDir, "submit-result.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address !== "object") {
      throw new Error("UAT mock API server did not expose a port.");
    }
    const apiBaseUrl = `http://127.0.0.1:${address.port}/api`;

    await assert.rejects(
      execFileAsync(process.execPath, [
        "scripts/migrations/payroll/salary-api-uat-submit.mjs",
        "--payload-dir",
        payloadDir,
        "--api-base-url",
        apiBaseUrl,
        "--token",
        "uat-token",
        "--out",
        out,
        "--execute",
        "--confirm-test-db",
        "PAYROLL_UAT_TEST_DB",
      ], { cwd: process.cwd() }),
      /Command failed/,
    );

    const plan = JSON.parse(readFileSync(out, "utf8")) as {
      status: string;
      blockers: string[];
      validations: Array<{ name: string; ok: boolean; failures: string[] }>;
      responses: Array<{ name: string }>;
    };

    assert.equal(plan.status, "failed");
    assert.equal(plan.validations[0].name, "syncSalarySlips");
    assert.equal(plan.validations[0].ok, false);
    assert.ok(plan.validations[0].failures.includes("sync_response_publish_batch_id_mismatch"));
    assert.ok(plan.blockers.includes("salary_notify_log_skipped_because_sync_response_validation_failed"));
    assert.equal(plan.responses.some((response) => response.name === "recordSalaryNotifyLog"), false);
    assert.equal(receivedPaths.includes("/api/salary-slips/sync"), true);
    assert.equal(receivedPaths.includes("/api/salary-notify-logs"), false);
    assert.equal(receivedPaths.some((pathName) => pathName.startsWith("/api/salary-slips?")), false);
    assert.equal(receivedPaths.some((pathName) => pathName.startsWith("/api/salary-notify-logs?")), false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT payroll API submitter records notify log after validated sync response", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-api-uat-success-"));
  const receivedPaths: string[] = [];
  let syncedItems: Array<Record<string, unknown>> = [];
  let notifyPayload: Record<string, unknown> | null = null;
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      receivedPaths.push(req.url ?? "");
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/salary-slips/sync") {
        syncedItems = body.items;
        res.end(JSON.stringify({
          ok: true,
          createdCount: body.items.length,
          updatedCount: 0,
          skippedCount: 0,
          teacherIds: body.items.map((item: { teacherId: string }) => item.teacherId),
          publishBatchId: body.publishBatchId,
          warnings: [],
        }));
        return;
      }
      if (req.url === "/api/salary-notify-logs") {
        notifyPayload = body;
        res.end(JSON.stringify({ ok: true, publishBatchId: body.publishBatchId }));
        return;
      }
      if (req.url?.startsWith("/api/salary-slips?")) {
        res.end(JSON.stringify({
          data: syncedItems.map((item) => ({
            ...item,
            id: `salary-slip-${item.teacherId}`,
            month: "2026-06",
            publishBatchId: body.publishBatchId ?? "salary-publish-2026-06-uat-fixture",
            source: "manual_import",
            syncedBy: "UAT 财务",
            syncedAt: "2026-06-17T01:00:00.000Z",
            createdAt: "2026-06-17T01:00:00.000Z",
            updatedAt: "2026-06-17T01:00:00.000Z",
          })),
        }));
        return;
      }
      if (req.url?.startsWith("/api/salary-notify-logs?")) {
        res.end(JSON.stringify({
          data: notifyPayload ? [{
            id: "notify-1",
            month: "2026-06",
            publishBatchId: notifyPayload.publishBatchId,
            at: "2026-06-17T01:00:00.000Z",
            actionLabel: "发布并通知",
            modeLabel: "企业微信预览",
            status: "preview",
            message: "已记录通知。",
            delivered: notifyPayload.delivered,
            skipped: notifyPayload.skipped,
            failed: [],
            createdBy: "UAT 财务",
            createdAt: "2026-06-17T01:00:00.000Z",
          }] : [],
        }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false }));
    });
  });

  try {
    const payloadDir = join(tempDir, "payload");
    const out = join(tempDir, "submit-result.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address !== "object") {
      throw new Error("UAT mock API server did not expose a port.");
    }

    await execFileAsync(process.execPath, [
      "scripts/migrations/payroll/salary-api-uat-submit.mjs",
      "--payload-dir",
      payloadDir,
      "--api-base-url",
      `http://127.0.0.1:${address.port}/api`,
      "--token",
      "uat-token",
      "--out",
      out,
      "--execute",
      "--confirm-test-db",
      "PAYROLL_UAT_TEST_DB",
    ], { cwd: process.cwd() });

    const plan = JSON.parse(readFileSync(out, "utf8")) as {
      status: string;
      validations: Array<{ name: string; ok: boolean; failures: string[] }>;
      responses: Array<{ name: string; ok: boolean }>;
    };

    assert.equal(plan.status, "executed");
    assert.equal(plan.validations[0].name, "syncSalarySlips");
    assert.equal(plan.validations[0].ok, true);
    assert.deepEqual(plan.validations[0].failures, []);
    assert.equal(plan.responses.some((response) => response.name === "syncSalarySlips" && response.ok), true);
    assert.equal(plan.responses.some((response) => response.name === "recordSalaryNotifyLog" && response.ok), true);
    assert.equal(plan.responses.some((response) => response.name === "listSalarySlips" && response.ok), true);
    assert.equal(plan.responses.some((response) => response.name === "listSalaryNotifyLogs" && response.ok), true);
    assert.equal(plan.validations.some((validation) => validation.name === "recordSalaryNotifyLog" && validation.ok), true);
    assert.equal(plan.validations.some((validation) => validation.name === "listSalarySlips" && validation.ok), true);
    assert.equal(plan.validations.some((validation) => validation.name === "listSalaryNotifyLogs" && validation.ok), true);
    assert.equal(receivedPaths.includes("/api/salary-slips/sync"), true);
    assert.equal(receivedPaths.includes("/api/salary-notify-logs"), true);
    assert.equal(receivedPaths.some((pathName) => pathName.startsWith("/api/salary-slips?")), true);
    assert.equal(receivedPaths.some((pathName) => pathName.startsWith("/api/salary-notify-logs?")), true);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT payroll API submitter validates notify log response publish batch", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-api-uat-notify-validate-"));
  let syncedItems: Array<Record<string, unknown>> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/salary-slips/sync") {
        syncedItems = body.items;
        res.end(JSON.stringify({
          ok: true,
          createdCount: body.items.length,
          updatedCount: 0,
          skippedCount: 0,
          teacherIds: body.items.map((item: { teacherId: string }) => item.teacherId),
          publishBatchId: body.publishBatchId,
          warnings: [],
        }));
        return;
      }
      if (req.url === "/api/salary-notify-logs") {
        res.end(JSON.stringify({ ok: true, publishBatchId: "wrong-notify-publish-batch" }));
        return;
      }
      if (req.url?.startsWith("/api/salary-slips?")) {
        res.end(JSON.stringify({
          data: syncedItems.map((item) => ({
            ...item,
            id: `salary-slip-${item.teacherId}`,
            month: "2026-06",
            publishBatchId: item.publishBatchId ?? "salary-publish-2026-06-uat-fixture",
          })),
        }));
        return;
      }
      if (req.url?.startsWith("/api/salary-notify-logs?")) {
        res.end(JSON.stringify({ data: [] }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false }));
    });
  });

  try {
    const payloadDir = join(tempDir, "payload");
    const out = join(tempDir, "submit-result.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address !== "object") {
      throw new Error("UAT mock API server did not expose a port.");
    }

    await assert.rejects(
      execFileAsync(process.execPath, [
        "scripts/migrations/payroll/salary-api-uat-submit.mjs",
        "--payload-dir",
        payloadDir,
        "--api-base-url",
        `http://127.0.0.1:${address.port}/api`,
        "--token",
        "uat-token",
        "--out",
        out,
        "--execute",
        "--confirm-test-db",
        "PAYROLL_UAT_TEST_DB",
      ], { cwd: process.cwd() }),
      /Command failed/,
    );

    const plan = JSON.parse(readFileSync(out, "utf8")) as {
      status: string;
      validations: Array<{ name: string; ok: boolean; failures: string[] }>;
    };
    const notifyValidation = plan.validations.find((validation) => validation.name === "recordSalaryNotifyLog");

    assert.equal(plan.status, "failed");
    assert.equal(notifyValidation?.ok, false);
    assert.ok(notifyValidation?.failures.includes("notify_response_publish_batch_id_mismatch"));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT payroll API submitter fails when read-back amounts identities or notify counts drift", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-api-uat-readback-drift-"));
  let syncedItems: Array<Record<string, unknown>> = [];
  let notifyPayload: Record<string, unknown> | null = null;
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/salary-slips/sync") {
        syncedItems = body.items;
        res.end(JSON.stringify({
          ok: true,
          createdCount: body.items.length,
          updatedCount: 0,
          skippedCount: 0,
          teacherIds: body.items.map((item: { teacherId: string }) => item.teacherId),
          publishBatchId: body.publishBatchId,
          warnings: [],
        }));
        return;
      }
      if (req.url === "/api/salary-notify-logs") {
        notifyPayload = body;
        res.end(JSON.stringify({ ok: true, publishBatchId: body.publishBatchId }));
        return;
      }
      if (req.url?.startsWith("/api/salary-slips?")) {
        const returnedRows = syncedItems.map((item, index) => ({
          ...item,
          id: `salary-slip-${item.teacherId}`,
          month: "2026-06",
          publishBatchId: item.publishBatchId ?? "salary-publish-2026-06-uat-fixture",
          netAmount: index === 0 ? Number(item.netAmount) + 1 : item.netAmount,
          userId: index === 1 ? "wrong-user-id" : item.userId,
          source: "manual_import",
        }));
        res.end(JSON.stringify({ data: returnedRows }));
        return;
      }
      if (req.url?.startsWith("/api/salary-notify-logs?")) {
        res.end(JSON.stringify({
          data: notifyPayload ? [{
            id: "notify-1",
            month: "2026-06",
            publishBatchId: notifyPayload.publishBatchId,
            delivered: [],
            skipped: [],
            failed: [],
          }] : [],
        }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false }));
    });
  });

  try {
    const payloadDir = join(tempDir, "payload");
    const out = join(tempDir, "submit-result.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address !== "object") {
      throw new Error("UAT mock API server did not expose a port.");
    }

    await assert.rejects(
      execFileAsync(process.execPath, [
        "scripts/migrations/payroll/salary-api-uat-submit.mjs",
        "--payload-dir",
        payloadDir,
        "--api-base-url",
        `http://127.0.0.1:${address.port}/api`,
        "--token",
        "uat-token",
        "--out",
        out,
        "--execute",
        "--confirm-test-db",
        "PAYROLL_UAT_TEST_DB",
      ], { cwd: process.cwd() }),
      /Command failed/,
    );

    const plan = JSON.parse(readFileSync(out, "utf8")) as {
      status: string;
      validations: Array<{
        name: string;
        ok: boolean;
        failures: string[];
        amountMismatchCount?: number;
        identityMismatchCount?: number;
      }>;
    };
    const salaryValidation = plan.validations.find((validation) => validation.name === "listSalarySlips");
    const notifyValidation = plan.validations.find((validation) => validation.name === "listSalaryNotifyLogs");

    assert.equal(plan.status, "failed");
    assert.equal(salaryValidation?.ok, false);
    assert.ok(salaryValidation?.failures.includes("salary_slips_readback_amount_mismatch"));
    assert.ok(salaryValidation?.failures.includes("salary_slips_readback_identity_mismatch"));
    assert.equal(salaryValidation?.amountMismatchCount, 1);
    assert.equal(salaryValidation?.identityMismatchCount, 1);
    assert.equal(notifyValidation?.ok, false);
    assert.ok(notifyValidation?.failures.includes("notify_logs_readback_no_single_log_matches_counts"));
    assert.ok(notifyValidation?.failures.includes("notify_logs_readback_delivered_count_mismatch"));
    assert.ok(notifyValidation?.failures.includes("notify_logs_readback_skipped_count_mismatch"));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT audit package exports payload evidence without writing data", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-audit-package-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const auditDir = join(tempDir, "audit");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-audit-package.mjs",
      "--payload-dir",
      payloadDir,
      "--out-dir",
      auditDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const manifest = JSON.parse(readFileSync(join(auditDir, "manifest.json"), "utf8")) as {
      writesDatabase: boolean;
      status: string;
      sourceMode: string;
      counts: {
        salarySlipRows: number;
        notifyDeliveredRows: number;
        notifySkippedRows: number;
      };
      files: Array<{ name: string; sha256: string }>;
    };
    const salaryCsv = readFileSync(join(auditDir, "salary-slips.csv"), "utf8");
    const readme = readFileSync(join(auditDir, "README.md"), "utf8");

    assert.equal(manifest.writesDatabase, false);
    assert.equal(manifest.status, "ready");
    assert.equal(manifest.sourceMode, "payload");
    assert.equal(manifest.counts.salarySlipRows, 4);
    assert.equal(manifest.counts.notifyDeliveredRows, 2);
    assert.equal(manifest.counts.notifySkippedRows, 2);
    assert.deepEqual(
      manifest.files.map((file) => file.name),
      [
        "salary-slips.csv",
        "notify-delivered.csv",
        "notify-skipped.csv",
        "notify-failed.csv",
        "notify-log-readback.json",
      ],
    );
    assert.equal(manifest.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)), true);
    assert.ok(salaryCsv.includes("\"teacherId\",\"teacherName\",\"userId\",\"wecomUserId\",\"loginAccount\""));
    assert.ok(salaryCsv.includes("\"teacher-chengcheng\""));
    assert.ok(salaryCsv.includes("\"程程\""));
    assert.ok(readme.includes("Status: ready"));
    assert.ok(readme.includes("Source mode: payload"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT audit package prefers API readback evidence when submit result is provided", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-audit-readback-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const auditDir = join(tempDir, "audit");
    const submitResultPath = join(tempDir, "api-submit-result.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const syncPayload = JSON.parse(readFileSync(join(payloadDir, "salary-slips-sync.json"), "utf8")) as {
      publishBatchId: string;
      items: Array<Record<string, unknown>>;
    };
    const readbackRows = syncPayload.items.slice(0, 2).map((item) => ({
      ...item,
      id: `salary-slip-${item.teacherId}`,
      month: "2026-06",
      publishBatchId: syncPayload.publishBatchId,
      source: "manual_import",
    }));
    writeFileSync(submitResultPath, `${JSON.stringify({
      status: "executed",
      writesDatabase: true,
      responses: [
        { name: "listSalarySlips", ok: true, body: { data: readbackRows } },
        {
          name: "listSalaryNotifyLogs",
          ok: true,
          body: {
            data: [{
              id: "notify-log-1",
              month: "2026-06",
              publishBatchId: syncPayload.publishBatchId,
              delivered: [],
              skipped: [],
              failed: [],
            }],
          },
        },
      ],
      validations: [
        { name: "syncSalarySlips", ok: true, failures: [] },
        { name: "recordSalaryNotifyLog", ok: true, failures: [] },
        { name: "listSalarySlips", ok: true, failures: [] },
        { name: "listSalaryNotifyLogs", ok: true, failures: [] },
      ],
    }, null, 2)}\n`);

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-audit-package.mjs",
      "--payload-dir",
      payloadDir,
      "--submit-result",
      submitResultPath,
      "--out-dir",
      auditDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const manifest = JSON.parse(readFileSync(join(auditDir, "manifest.json"), "utf8")) as {
      writesDatabase: boolean;
      status: string;
      sourceMode: string;
      counts: { salarySlipRows: number; readbackNotifyLogRows: number };
      validations: Array<{ name: string; ok: boolean }>;
      inputs: { submitResult: { sha256: string } | null };
    };
    const readbackLog = JSON.parse(readFileSync(join(auditDir, "notify-log-readback.json"), "utf8")) as Array<Record<string, unknown>>;
    const salaryCsv = readFileSync(join(auditDir, "salary-slips.csv"), "utf8");

    assert.equal(manifest.writesDatabase, false);
    assert.equal(manifest.status, "ready");
    assert.equal(manifest.sourceMode, "api_readback");
    assert.equal(manifest.counts.salarySlipRows, 2);
    assert.equal(manifest.counts.readbackNotifyLogRows, 1);
    assert.equal(manifest.validations.some((validation) => validation.name === "listSalarySlips" && validation.ok), true);
    assert.ok(manifest.inputs.submitResult?.sha256);
    assert.equal(readbackLog.length, 1);
    assert.ok(salaryCsv.includes("\"salary-publish-2026-06-uat-fixture\""));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT audit package blocks submit results that lack API readback evidence", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-audit-missing-readback-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const auditDir = join(tempDir, "audit");
    const submitResultPath = join(tempDir, "api-submit-result.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    writeFileSync(submitResultPath, `${JSON.stringify({
      status: "executed",
      writesDatabase: true,
      responses: [
        { name: "listSalarySlips", ok: true, body: { data: [] } },
        { name: "listSalaryNotifyLogs", ok: true, body: { data: [] } },
      ],
      validations: [
        { name: "syncSalarySlips", ok: true, failures: [] },
        { name: "recordSalaryNotifyLog", ok: true, failures: [] },
        { name: "listSalarySlips", ok: true, failures: [] },
        { name: "listSalaryNotifyLogs", ok: true, failures: [] },
      ],
    }, null, 2)}\n`);

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-audit-package.mjs",
      "--payload-dir",
      payloadDir,
      "--submit-result",
      submitResultPath,
      "--out-dir",
      auditDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const manifest = JSON.parse(readFileSync(join(auditDir, "manifest.json"), "utf8")) as {
      writesDatabase: boolean;
      status: string;
      blockers: string[];
      files: unknown[];
    };

    assert.equal(manifest.writesDatabase, false);
    assert.equal(manifest.status, "blocked");
    assert.ok(manifest.blockers.some((blocker) => blocker.includes("missing salary slip read-back rows")));
    assert.ok(manifest.blockers.some((blocker) => blocker.includes("missing salary notify log read-back rows")));
    assert.deepEqual(manifest.files, []);
    assert.equal(existsSync(join(auditDir, "salary-slips.csv")), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT audit package blocks failed API submit results instead of exporting misleading evidence", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-audit-failed-submit-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const auditDir = join(tempDir, "audit");
    const submitResultPath = join(tempDir, "api-submit-result.json");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    writeFileSync(submitResultPath, `${JSON.stringify({
      status: "failed",
      writesDatabase: true,
      responses: [
        {
          name: "listSalarySlips",
          ok: true,
          body: {
            data: [{
              teacherId: "teacher-chengcheng",
              teacherName: "程程",
              publishBatchId: "salary-publish-2026-06-uat-fixture",
              netAmount: 1,
            }],
          },
        },
      ],
      validations: [
        {
          name: "listSalarySlips",
          ok: false,
          failures: ["salary_slips_readback_amount_mismatch"],
        },
      ],
    }, null, 2)}\n`);

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-audit-package.mjs",
      "--payload-dir",
      payloadDir,
      "--submit-result",
      submitResultPath,
      "--out-dir",
      auditDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const manifest = JSON.parse(readFileSync(join(auditDir, "manifest.json"), "utf8")) as {
      writesDatabase: boolean;
      status: string;
      blockers: string[];
      validations: Array<{ name: string; ok: boolean; failures: string[] }>;
      files: unknown[];
    };

    assert.equal(manifest.writesDatabase, false);
    assert.equal(manifest.status, "blocked");
    assert.ok(manifest.blockers.some((blocker) => blocker.includes("Submit result status is failed")));
    assert.ok(manifest.blockers.some((blocker) => blocker.includes("salary_slips_readback_amount_mismatch")));
    assert.equal(manifest.validations[0].ok, false);
    assert.deepEqual(manifest.files, []);
    assert.equal(existsSync(join(auditDir, "salary-slips.csv")), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("UAT audit package records blockers when payload is not ready", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-audit-blocked-"));
  try {
    const payloadDir = join(tempDir, "payload");
    const auditDir = join(tempDir, "audit");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-fixture-to-api-payload.mjs",
      "--csv",
      "tests/fixtures/payroll/salary-upload-uat-unresolved-2026-06.csv",
      "--month",
      "2026-06",
      "--out-dir",
      payloadDir,
    ], { cwd: process.cwd(), stdio: "pipe" });
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-audit-package.mjs",
      "--payload-dir",
      payloadDir,
      "--out-dir",
      auditDir,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const manifest = JSON.parse(readFileSync(join(auditDir, "manifest.json"), "utf8")) as {
      writesDatabase: boolean;
      status: string;
      blockers: string[];
      files: unknown[];
    };

    assert.equal(manifest.writesDatabase, false);
    assert.equal(manifest.status, "blocked");
    assert.ok(manifest.blockers.some((blocker) => blocker.includes("blocked_unresolved_differences")));
    assert.deepEqual(manifest.files, []);
    assert.equal(existsSync(join(auditDir, "salary-slips.csv")), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("SalarySlips sync reports counts, teacher ids, publish batch id, and duplicate warnings", async () => {
  const { prisma, calls } = createPayrollPrismaMock();
  const service = new PayrollService(prisma as never);
  const result = await service.syncSalarySlips({
    month: "2026-06",
    publishBatchId: "salary-publish-test",
    items: [
      {
        teacherId: "teacher-1",
        teacherName: "老师一",
        userId: "user-1",
        wecomUserId: "wecom-1",
        loginAccount: "login-1",
        grossAmount: 100,
        deductionAmount: 0,
        netAmount: 100,
      },
      {
        teacherId: "teacher-1",
        teacherName: "老师一",
        userId: "user-1",
        wecomUserId: "wecom-1",
        loginAccount: "login-1",
        grossAmount: 120,
        deductionAmount: 0,
        netAmount: 120,
      },
      {
        teacherId: "teacher-2",
        teacherName: "老师二",
        userId: "user-2",
        wecomUserId: "wecom-2",
        loginAccount: "login-2",
        grossAmount: 80,
        deductionAmount: 0,
        netAmount: 80,
      },
    ],
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(result.ok, true);
  assert.equal(result.createdCount, 1);
  assert.equal(result.updatedCount, 1);
  assert.equal(result.teacherIds.length, 2);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.publishBatchId, "salary-publish-test");
  assert.equal(result.warnings.length, 1);
  assert.equal(calls.deleteMany.length, 1);
  assert.equal(calls.createMany.length, 1);
  const createdRows = calls.createMany[0].data as Array<Record<string, unknown>>;
  const explicitIdentityRow = createdRows.find((row) => row.teacherId === "teacher-1");
  assert.equal(explicitIdentityRow?.publishBatchId, "salary-publish-test");
  assert.equal(explicitIdentityRow?.userId, "user-1");
  assert.equal(explicitIdentityRow?.wecomUserId, "wecom-1");
  assert.equal(explicitIdentityRow?.loginAccount, "login-1");
});

test("SalarySlips sync rejects rows without explicit employee identity before writing", async () => {
  const { prisma, calls } = createPayrollPrismaMock();
  const service = new PayrollService(prisma as never);

  await assert.rejects(
    () => service.syncSalarySlips({
      month: "2026-06",
      publishBatchId: "salary-publish-missing-identity",
      items: [
        {
          teacherName: "缺身份老师",
          grossAmount: 100,
          deductionAmount: 0,
          netAmount: 100,
        },
      ],
    }, makeUser({ roleCode: "FINANCE", roleName: "财务" })),
    (error) => error instanceof Error && /缺少明确员工身份/.test(error.message),
  );
  assert.equal(calls.deleteMany.length, 0);
  assert.equal(calls.createMany.length, 0);
});

test("SalarySlips sync rejects empty and invalid amount payloads before writing", async () => {
  const empty = createPayrollPrismaMock();
  const emptyService = new PayrollService(empty.prisma as never);
  await assert.rejects(
    () => emptyService.syncSalarySlips({
      month: "2026-06",
      items: [],
    }, makeUser({ roleCode: "FINANCE", roleName: "财务" })),
    (error) => error instanceof Error && /至少需要一条明细/.test(error.message),
  );
  assert.equal(empty.calls.deleteMany.length, 0);
  assert.equal(empty.calls.createMany.length, 0);

  const invalidAmount = createPayrollPrismaMock();
  const invalidAmountService = new PayrollService(invalidAmount.prisma as never);
  await assert.rejects(
    () => invalidAmountService.syncSalarySlips({
      month: "2026-06",
      items: [
        {
          teacherId: "teacher-amount",
          teacherName: "金额异常老师",
          grossAmount: "not-a-number",
          deductionAmount: 0,
          netAmount: 100,
        },
      ],
    }, makeUser({ roleCode: "FINANCE", roleName: "财务" })),
    (error) => error instanceof Error && /薪资条金额不是有效数字/.test(error.message),
  );
  assert.equal(invalidAmount.calls.deleteMany.length, 0);
  assert.equal(invalidAmount.calls.createMany.length, 0);
});

test("SalarySlips sync warns about amount mismatches without blocking publish", async () => {
  const { prisma, calls } = createPayrollPrismaMock([], { salarySlipDeleteCount: 0 });
  const service = new PayrollService(prisma as never);
  const result = await service.syncSalarySlips({
    month: "2026-06",
    items: [
      {
        teacherId: "teacher-amount-warning",
        teacherName: "金额复核老师",
        grossAmount: 100,
        commissionAmount: 10,
        profitSharingAmount: 5,
        deductionAmount: 3,
        netAmount: 120,
      },
    ],
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(result.ok, true);
  assert.equal(result.createdCount, 1);
  assert.equal(result.warnings.some((warning) => /金额异常需复核/.test(warning)), true);
  assert.equal(calls.deleteMany.length, 1);
  assert.equal(calls.createMany.length, 1);
  const createdRows = calls.createMany[0].data as Array<Record<string, unknown>>;
  assert.equal(createdRows[0].netAmount, 120);
});

test("SalarySlips sync replaces only the current publish batch", async () => {
  const { prisma, calls } = createPayrollPrismaMock([], { salarySlipDeleteCount: 1 });
  const service = new PayrollService(prisma as never);
  await service.syncSalarySlips({
    month: "2026-06",
    publishBatchId: "salary-publish-batch-current",
    items: [
      {
        teacherId: "teacher-batch",
        teacherName: "批次老师",
        grossAmount: 100,
        deductionAmount: 0,
        netAmount: 100,
      },
    ],
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(calls.deleteMany.length, 1);
  assert.deepEqual(calls.deleteMany[0].where, {
    month: "2026-06",
    publishBatchId: "salary-publish-batch-current",
    teacherId: { in: ["teacher-batch"] },
  });
});

test("SalarySlips sync default ids are stable within a publish batch and distinct across batches", async () => {
  const first = createPayrollPrismaMock();
  const firstService = new PayrollService(first.prisma as never);
  await firstService.syncSalarySlips({
    month: "2026-06",
    publishBatchId: "salary-publish-batch-a",
    items: [
      { teacherId: "teacher-z", teacherName: "老师 Z", grossAmount: 90, deductionAmount: 0, netAmount: 90 },
      { teacherId: "teacher-a", teacherName: "老师 A", grossAmount: 100, deductionAmount: 0, netAmount: 100 },
    ],
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  const second = createPayrollPrismaMock();
  const secondService = new PayrollService(second.prisma as never);
  await secondService.syncSalarySlips({
    month: "2026-06",
    publishBatchId: "salary-publish-batch-a",
    items: [
      { teacherId: "teacher-a", teacherName: "老师 A", grossAmount: 100, deductionAmount: 0, netAmount: 100 },
    ],
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  const third = createPayrollPrismaMock();
  const thirdService = new PayrollService(third.prisma as never);
  await thirdService.syncSalarySlips({
    month: "2026-06",
    publishBatchId: "salary-publish-batch-b",
    items: [
      { teacherId: "teacher-a", teacherName: "老师 A", grossAmount: 100, deductionAmount: 0, netAmount: 100 },
    ],
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  const firstRows = first.calls.createMany[0].data as Array<Record<string, unknown>>;
  const secondRows = second.calls.createMany[0].data as Array<Record<string, unknown>>;
  const thirdRows = third.calls.createMany[0].data as Array<Record<string, unknown>>;
  const firstTeacherAId = firstRows.find((row) => row.teacherId === "teacher-a")?.id;
  const secondTeacherAId = secondRows.find((row) => row.teacherId === "teacher-a")?.id;
  const thirdTeacherAId = thirdRows.find((row) => row.teacherId === "teacher-a")?.id;

  assert.equal(firstTeacherAId, secondTeacherAId);
  assert.notEqual(firstTeacherAId, thirdTeacherAId);
  assert.match(String(firstTeacherAId), /^salary-slip-2026-06-teacher-a-[a-f0-9]{16}$/);
  assert.notEqual(firstTeacherAId, "salary-slip-2026-06-2");
});

test("employees can only query their own salary slips through database-level identity filters", async () => {
  const { prisma, calls } = createPayrollPrismaMock([
    salarySlip({
      id: "slip-chengcheng",
      teacherId: "legacy-teacher-id",
      userId: "user-chengcheng",
      wecomUserId: "chengcheng",
      loginAccount: "chengcheng",
      teacherName: "程程",
    }),
    salarySlip({
      id: "slip-same-name",
      teacherId: "another-chengcheng",
      userId: "user-other",
      wecomUserId: "other-wecom",
      loginAccount: "other-login",
      teacherName: "程程",
      netAmount: 99999,
    }),
    salarySlip({ id: "slip-other", teacherId: "other-user", teacherName: "其他员工" }),
  ]);
  const service = new PayrollService(prisma as never);

  const result = await service.getMySalarySlips(makeUser({
    id: "user-chengcheng",
    loginAccount: "chengcheng",
    wecomUserId: "chengcheng",
    name: "程程",
  }));

  assert.deepEqual(result.data.map((item) => item.id), ["slip-chengcheng"]);
  const whereText = JSON.stringify(calls.findMany[0].where);
  assert.ok(whereText.includes('"teacherId"'));
  assert.ok(whereText.includes('"userId"'));
  assert.ok(whereText.includes('"wecomUserId"'));
  assert.ok(whereText.includes('"loginAccount"'));
  assert.equal(whereText.includes('"teacherName"'), false);
});

test("payroll maintainers can query salary slips by month and publish batch id", async () => {
  const { prisma, calls } = createPayrollPrismaMock([
    salarySlip({
      id: "salary-slip-1",
      month: "2026-06",
      publishBatchId: "salary-publish-test",
      teacherId: "teacher-1",
      teacherName: "老师一",
      userId: "user-1",
      wecomUserId: "wecom-1",
      loginAccount: "login-1",
    }),
    salarySlip({
      id: "salary-slip-2",
      month: "2026-05",
      publishBatchId: "salary-publish-old",
      teacherId: "teacher-2",
      teacherName: "老师二",
      userId: "user-2",
      wecomUserId: "wecom-2",
      loginAccount: "login-2",
    }),
  ]);
  const service = new PayrollService(prisma as never);
  const result = await service.listSalarySlips({
    month: "2026-06",
    publishBatchId: "salary-publish-test",
    limit: "5000",
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, "salary-slip-1");
  assert.equal(result.data[0].publishBatchId, "salary-publish-test");
  assert.deepEqual(result.filters, {
    month: "2026-06",
    publishBatchId: "salary-publish-test",
    teacherId: undefined,
    userId: undefined,
    wecomUserId: undefined,
    loginAccount: undefined,
    limit: 2000,
  });
  assert.equal(calls.findMany.length, 1);
  assert.deepEqual(calls.findMany[0].where, {
    month: "2026-06",
    publishBatchId: "salary-publish-test",
  });
  assert.equal(calls.findMany[0].take, 2000);

  await assert.rejects(
    () => service.listSalarySlips({ month: "2026-06" }, makeUser({ roleCode: "EMPLOYEE", roleName: "员工" })),
    (error) => error instanceof Error && /无权维护薪资条/.test(error.message),
  );
  await assert.rejects(
    () => service.listSalarySlips({ limit: "20" }, makeUser({ roleCode: "FINANCE", roleName: "财务" })),
    (error) => error instanceof Error && /至少需要月份、发布批次或明确员工身份条件/.test(error.message),
  );
});

test("matching names alone do not authorize salary slip access", async () => {
  const { prisma, calls } = createPayrollPrismaMock([
    salarySlip({
      id: "slip-same-name",
      teacherId: "another-chengcheng",
      userId: "user-other",
      wecomUserId: "other-wecom",
      loginAccount: "other-login",
      teacherName: "程程",
      netAmount: 99999,
    }),
  ]);
  const service = new PayrollService(prisma as never);

  const result = await service.getMySalarySlips(makeUser({
    id: "user-chengcheng",
    loginAccount: null,
    wecomUserId: null,
    name: "程程",
    wecomName: "程程",
  }));

  assert.deepEqual(result.data, []);
  const whereText = JSON.stringify(calls.findMany[0].where);
  assert.equal(whereText.includes('"teacherName"'), false);
});

test("payroll maintenance no longer allows finance-looking text or member-management permission", async () => {
  const { prisma } = createPayrollPrismaMock();
  const service = new PayrollService(prisma as never);
  const payload = {
    month: "2026-06",
    items: [{
      teacherId: "teacher-permission",
      teacherName: "权限老师",
      grossAmount: 100,
      deductionAmount: 0,
      netAmount: 100,
    }],
  };

  await assert.rejects(
    () => service.syncSalarySlips(payload, makeUser({
      roleCode: "EMPLOYEE",
      roleName: "财务专员",
      department: "财务人事",
      permissions: ["action.management.member.update"],
    })),
    (error) => error instanceof Error && /无权维护薪资条/.test(error.message),
  );

  const allowed = await service.syncSalarySlips(payload, makeUser({
    roleCode: "EMPLOYEE",
    roleName: "员工",
    department: "道冲元气",
    permissions: ["action.payroll.publish"],
  }));
  assert.equal(allowed.ok, true);
});

test("salary notify logs keep publish batch id and do not prune history", async () => {
  const { prisma, calls } = createPayrollPrismaMock();
  const service = new PayrollService(prisma as never);
  const result = await service.recordSalaryNotifyLog({
    month: "2026-06",
    publishBatchId: "salary-publish-test",
    actionLabel: "发布并通知",
    status: "sent",
    message: "已发送 1 人。",
    delivered: [{ id: "teacher-1", name: "老师一", userid: "wecom-1", netAmount: 100 }],
    skipped: [],
    failed: [],
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(result.ok, true);
  assert.equal(result.publishBatchId, "salary-publish-test");
  assert.equal(calls.salaryNotifyLogUpsert.length, 1);
  const upsert = calls.salaryNotifyLogUpsert[0];
  assert.equal((upsert.create as Record<string, unknown>).publishBatchId, "salary-publish-test");
  assert.equal((upsert.update as Record<string, unknown>).publishBatchId, "salary-publish-test");
  assert.match(String((upsert.where as Record<string, unknown>).id), /^salary-notify-log-2026-06-salary-publish-test-[a-f0-9-]{8}$/);
  assert.equal(calls.salaryNotifyLogFindMany.length, 0);
  assert.equal(calls.salaryNotifyLogDeleteMany.length, 0);
});

test("salary notify logs create distinct default ids for repeated publish batch records", async () => {
  const { prisma, calls } = createPayrollPrismaMock();
  const service = new PayrollService(prisma as never);
  const payload = {
    month: "2026-06",
    publishBatchId: "salary-publish-repeat",
    actionLabel: "发布并通知",
    status: "sent",
    message: "已发送 1 人。",
    delivered: [{ id: "teacher-1", name: "老师一", userid: "wecom-1", netAmount: 100 }],
    skipped: [],
    failed: [],
  };

  await service.recordSalaryNotifyLog(payload, makeUser({ roleCode: "FINANCE", roleName: "财务" }));
  await service.recordSalaryNotifyLog(payload, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  const firstId = String((calls.salaryNotifyLogUpsert[0].where as Record<string, unknown>).id);
  const secondId = String((calls.salaryNotifyLogUpsert[1].where as Record<string, unknown>).id);

  assert.match(firstId, /^salary-notify-log-2026-06-salary-publish-repeat-[a-f0-9-]{8}$/);
  assert.match(secondId, /^salary-notify-log-2026-06-salary-publish-repeat-[a-f0-9-]{8}$/);
  assert.notEqual(firstId, secondId);
});

test("salary notify logs require publish batch id and filtered queries", async () => {
  const { prisma, calls } = createPayrollPrismaMock();
  const service = new PayrollService(prisma as never);

  await assert.rejects(
    () => service.recordSalaryNotifyLog({
      month: "2026-06",
      actionLabel: "发布并通知",
      status: "sent",
      message: "已发送 1 人。",
      delivered: [],
      skipped: [],
      failed: [],
    }, makeUser({ roleCode: "FINANCE", roleName: "财务" })),
    (error) => error instanceof Error && /缺少发布批次号/.test(error.message),
  );
  assert.equal(calls.salaryNotifyLogUpsert.length, 0);

  await assert.rejects(
    () => service.listSalaryNotifyLogs({ limit: "20" }, makeUser({ roleCode: "FINANCE", roleName: "财务" })),
    (error) => error instanceof Error && /至少需要月份或发布批次条件/.test(error.message),
  );
  assert.equal(calls.salaryNotifyLogFindMany.length, 0);
});

test("salary notify logs infer a single publish batch id but reject ambiguous months", async () => {
  const uniqueBatch = createPayrollPrismaMock([
    salarySlip({
      id: "salary-slip-a",
      month: "2026-06",
      publishBatchId: "salary-publish-unique",
      teacherId: "teacher-a",
    }),
    salarySlip({
      id: "salary-slip-b",
      month: "2026-06",
      publishBatchId: "salary-publish-unique",
      teacherId: "teacher-b",
    }),
  ]);
  const uniqueService = new PayrollService(uniqueBatch.prisma as never);
  const inferred = await uniqueService.recordSalaryNotifyLog({
    month: "2026-06",
    actionLabel: "发布并通知",
    status: "sent",
    message: "已发送 2 人。",
    delivered: [],
    skipped: [],
    failed: [],
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(inferred.publishBatchId, "salary-publish-unique");
  assert.equal(uniqueBatch.calls.findMany.length, 1);
  assert.equal(uniqueBatch.calls.salaryNotifyLogUpsert.length, 1);
  const upsert = uniqueBatch.calls.salaryNotifyLogUpsert[0];
  assert.equal((upsert.create as Record<string, unknown>).publishBatchId, "salary-publish-unique");

  const ambiguousBatch = createPayrollPrismaMock([
    salarySlip({
      id: "salary-slip-a",
      month: "2026-06",
      publishBatchId: "salary-publish-a",
      teacherId: "teacher-a",
    }),
    salarySlip({
      id: "salary-slip-b",
      month: "2026-06",
      publishBatchId: "salary-publish-b",
      teacherId: "teacher-b",
    }),
  ]);
  const ambiguousService = new PayrollService(ambiguousBatch.prisma as never);
  await assert.rejects(
    () => ambiguousService.recordSalaryNotifyLog({
      month: "2026-06",
      actionLabel: "发布并通知",
      status: "sent",
      message: "已发送 2 人。",
      delivered: [],
      skipped: [],
      failed: [],
    }, makeUser({ roleCode: "FINANCE", roleName: "财务" })),
    (error) => error instanceof Error && /当月存在多个发布批次/.test(error.message),
  );
  assert.equal(ambiguousBatch.calls.salaryNotifyLogUpsert.length, 0);
});

test("salary notify logs can be queried by month and publish batch id", async () => {
  const now = new Date("2026-06-17T01:00:00.000Z");
  const { prisma, calls } = createPayrollPrismaMock([], {
    salaryNotifyLogs: [{
      id: "notify-1",
      month: "2026-06",
      publishBatchId: "salary-publish-test",
      at: now,
      actionLabel: "发布并通知",
      modeLabel: "企业微信预览",
      status: "sent",
      tone: null,
      message: "已发送 1 人。",
      delivered: [],
      skipped: [],
      failed: [],
      notifyUrl: null,
      createdBy: "财务",
      createdAt: now,
    }],
  });
  const service = new PayrollService(prisma as never);
  const result = await service.listSalaryNotifyLogs({
    month: "2026-06",
    publishBatchId: "salary-publish-test",
    limit: "5000",
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].publishBatchId, "salary-publish-test");
  assert.deepEqual(result.filters, {
    month: "2026-06",
    publishBatchId: "salary-publish-test",
    limit: 1000,
  });
  assert.equal(calls.salaryNotifyLogFindMany.length, 1);
  assert.deepEqual(calls.salaryNotifyLogFindMany[0].where, {
    month: "2026-06",
    publishBatchId: "salary-publish-test",
  });
  assert.equal(calls.salaryNotifyLogFindMany[0].take, 1000);
});

test("salary WeCom test send only targets explicit allowlist and records the result", async () => {
  const { prisma, calls } = createPayrollPrismaMock([
    salarySlip({
      id: "salary-slip-chengcheng",
      month: "2026-06",
      publishBatchId: "salary-publish-test",
      teacherId: "teacher-chengcheng",
      teacherName: "程程",
      wecomUserId: "chengcheng",
      netAmount: 12400,
    }),
    salarySlip({
      id: "salary-slip-limeng",
      month: "2026-06",
      publishBatchId: "salary-publish-test",
      teacherId: "finance-zhoulimeng",
      teacherName: "周立猛",
      wecomUserId: "finance-zhoulimeng",
      netAmount: 8800,
    }),
    salarySlip({
      id: "salary-slip-other",
      month: "2026-06",
      publishBatchId: "salary-publish-test",
      teacherId: "teacher-other",
      teacherName: "其他员工",
      wecomUserId: "other-wecom",
      netAmount: 6000,
    }),
  ]);
  const sent: Array<{ toUser: string; payload: Record<string, unknown> }> = [];
  const service = new PayrollService(
    prisma as never,
    {
      sendTextCardMessage: async (toUser: string, payload: Record<string, unknown>) => {
        sent.push({ toUser, payload });
        return { success: true };
      },
    } as never,
    { get: () => "https://management.hui-health.com" } as never,
  );

  const result = await service.sendSalaryWecomTest({
    month: "2026-06",
    publishBatchId: "salary-publish-test",
    testUserids: ["chengcheng", "finance-zhoulimeng"],
    dryRun: false,
    createdBy: "财务",
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(result.status, "sent");
  assert.deepEqual(sent.map((item) => item.toUser).sort(), ["chengcheng", "finance-zhoulimeng"]);
  assert.equal(String(sent[0].payload.url).includes("/payroll/mine?month=2026-06"), true);
  assert.deepEqual(result.delivered.map((person) => person.userid).sort(), ["chengcheng", "finance-zhoulimeng"]);
  assert.deepEqual(result.skipped.map((person) => person.userid), ["other-wecom"]);
  assert.equal(result.skipped[0].reason, "不在本次测试名单");
  assert.equal(calls.salaryNotifyLogUpsert.length, 1);
  const create = calls.salaryNotifyLogUpsert[0].create as Record<string, unknown>;
  assert.equal(create.status, "sent");
  assert.equal(create.modeLabel, "企业微信测试发送");
  assert.equal(create.publishBatchId, "salary-publish-test");
});

test("salary WeCom test send skips already sent recipients to avoid duplicates", async () => {
  const now = new Date("2026-06-17T01:00:00.000Z");
  const { prisma, calls } = createPayrollPrismaMock([
    salarySlip({
      id: "salary-slip-chengcheng",
      month: "2026-06",
      publishBatchId: "salary-publish-test",
      teacherId: "teacher-chengcheng",
      teacherName: "程程",
      wecomUserId: "chengcheng",
    }),
    salarySlip({
      id: "salary-slip-limeng",
      month: "2026-06",
      publishBatchId: "salary-publish-test",
      teacherId: "finance-zhoulimeng",
      teacherName: "周立猛",
      wecomUserId: "finance-zhoulimeng",
    }),
  ], {
    salaryNotifyLogs: [{
      id: "sent-before",
      month: "2026-06",
      publishBatchId: "salary-publish-test",
      at: now,
      actionLabel: "测试企微发送",
      modeLabel: "企业微信测试发送",
      status: "sent",
      tone: "success",
      message: "已发送 1 人。",
      delivered: [{ id: "finance-zhoulimeng", name: "周立猛", userid: "finance-zhoulimeng", netAmount: 8800 }],
      skipped: [],
      failed: [],
      notifyUrl: null,
      createdBy: "财务",
      createdAt: now,
    }],
  });
  const sent: string[] = [];
  const service = new PayrollService(
    prisma as never,
    {
      sendTextCardMessage: async (toUser: string) => {
        sent.push(toUser);
        return { success: true };
      },
    } as never,
    { get: () => "https://management.hui-health.com" } as never,
  );

  const result = await service.sendSalaryWecomTest({
    month: "2026-06",
    publishBatchId: "salary-publish-test",
    testUserids: "chengcheng,finance-zhoulimeng",
    dryRun: false,
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.deepEqual(sent, ["chengcheng"]);
  assert.deepEqual(result.delivered.map((person) => person.userid), ["chengcheng"]);
  assert.equal(result.skipped.find((person) => person.userid === "finance-zhoulimeng")?.reason, "本批次已发送过，避免重复");
  assert.deepEqual(calls.salaryNotifyLogFindMany[0].where, {
    month: "2026-06",
    publishBatchId: "salary-publish-test",
  });
});

test("payroll draft batch stores publish batch id for later reconciliation", async () => {
  const { prisma, calls } = createPayrollPrismaMock();
  const service = new PayrollService(prisma as never);
  const saved = await service.savePayrollDraftBatch("2026-06", {
    publishBatchId: "salary-publish-test",
    drafts: { rows: [{ teacherId: "teacher-1" }] },
    notifyStatus: "sent",
  }, makeUser({ roleCode: "FINANCE", roleName: "财务" }));

  assert.equal(saved.publishBatchId, "salary-publish-test");
  assert.equal(calls.payrollDraftBatchUpsert.length, 1);
  const upsert = calls.payrollDraftBatchUpsert[0];
  assert.equal((upsert.create as Record<string, unknown>).publishBatchId, "salary-publish-test");
  assert.equal((upsert.update as Record<string, unknown>).publishBatchId, "salary-publish-test");
  assert.equal(calls.payrollDraftBatchDeleteMany.length, 0);
});

test("salary identity backfill dry-run only auto-updates explicit identity matches", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-identity-"));
  try {
    const usersTsv = join(tempDir, "users.tsv");
    const salarySlipsTsv = join(tempDir, "salary-slips.tsv");
    const out = join(tempDir, "plan.json");
    const markdownOut = join(tempDir, "plan.md");
    const sqlOut = join(tempDir, "plan.sql");

    writeFileSync(usersTsv, [
      "id\tloginAccount\tname\twecomUserId\twecomName\tdepartment\troleCode",
      "user-chengcheng\tchengcheng\t程程\tchengcheng\t程程\t道冲元气\tEMPLOYEE",
      "user-yanzi\tyanzi\t燕子\tyanzi\t燕子\t道冲元气\tEMPLOYEE",
    ].join("\n"));
    writeFileSync(salarySlipsTsv, [
      "id\tmonth\tpublishBatchId\tteacherId\tteacherName\tuserId\twecomUserId\tloginAccount",
      "slip-auto\t2026-06\t\tchengcheng\t程程\t\t\t",
      "slip-name-only\t2026-06\t\tteacher-yanzi\t燕子\t\t\t",
      "slip-unmatched\t2026-06\t\tteacher-unknown\t无人\t\t\t",
    ].join("\n"));

    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-identity-backfill-dryrun.mjs",
      "--users-tsv",
      usersTsv,
      "--salary-slips-tsv",
      salarySlipsTsv,
      "--out",
      out,
      "--markdown-out",
      markdownOut,
      "--sql-out",
      sqlOut,
      "--no-write",
    ], { cwd: process.cwd(), stdio: "pipe" });

    const plan = JSON.parse(readFileSync(out, "utf8")) as {
      summary: { autoUpdateCandidates: number; needsManualReview: number };
      items: Array<{ id: string; status: string; recommendedAction: string }>;
    };
    const sql = readFileSync(sqlOut, "utf8");
    const markdown = readFileSync(markdownOut, "utf8");

    assert.equal(plan.summary.autoUpdateCandidates, 1);
    assert.equal(plan.summary.needsManualReview, 2);
    assert.equal(plan.items.find((item) => item.id === "slip-auto")?.recommendedAction, "generate_update_sql");
    assert.equal(plan.items.find((item) => item.id === "slip-name-only")?.status, "name_hint_needs_manual");
    assert.ok(sql.includes("UPDATE `SalarySlip`"));
    assert.ok(sql.includes("ROLLBACK;"));
    assert.equal(sql.includes("COMMIT;"), false);
    assert.ok(markdown.includes("name_hint_needs_manual"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("salary slip preflight passes code safety checks and reports environmental blockers", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-preflight-"));
  try {
    const out = join(tempDir, "preflight.json");
    const markdownOut = join(tempDir, "preflight.md");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-slip-preflight.mjs",
      "--out",
      out,
      "--markdown-out",
      markdownOut,
    ], { cwd: process.cwd(), stdio: "pipe" });

    const report = JSON.parse(readFileSync(out, "utf8")) as {
      status: string;
      blockers: string[];
      failures: string[];
      checks: {
        protectedReleaseDiffLines: number;
        frontendSourceCandidates: string[];
        frontendReleaseEvidence: {
          routeHits: Array<{ file: string; matchedTokens: string[]; bytes: number }>;
          sourceMapFiles: string[];
          sourceMappingUrlFiles: string[];
        };
        serviceForbiddenTokens: string[];
        destructiveMigrationTokens: string[];
      };
    };
    const markdown = readFileSync(markdownOut, "utf8");

    assert.equal(report.status, "passed_with_blockers");
    assert.deepEqual(report.failures, []);
    assert.equal(report.checks.protectedReleaseDiffLines, 0);
    assert.equal(report.checks.frontendSourceCandidates.some((file) => {
      return file.startsWith("apps/employee-frontend/src/")
        && (file.endsWith("App.tsx") || file.endsWith("lib/payroll.ts"));
    }), true);
    assert.equal(report.checks.frontendReleaseEvidence.routeHits.some((hit) => {
      return hit.file.endsWith("assets/payroll-batch-page-CXA8ZBid.js")
        && hit.matchedTokens.includes("上传薪资表");
    }), true);
    assert.equal(report.checks.frontendReleaseEvidence.routeHits.some((hit) => {
      return hit.file.endsWith("assets/index-C20sRqov.js")
        && hit.matchedTokens.includes("/payroll/batch");
    }), true);
    assert.equal(report.checks.frontendReleaseEvidence.routeHits.some((hit) => {
      return hit.matchedTokens.includes("/finance/imports");
    }), true);
    assert.deepEqual(report.checks.frontendReleaseEvidence.sourceMapFiles, []);
    assert.deepEqual(report.checks.frontendReleaseEvidence.sourceMappingUrlFiles, []);
    assert.deepEqual(report.checks.serviceForbiddenTokens, []);
    assert.deepEqual(report.checks.destructiveMigrationTokens, []);
    assert.equal(report.blockers.includes("blocked_waiting_for_vite_source"), false);
    assert.ok(report.blockers.includes("blocked_waiting_for_local_docker"));
    assert.ok(markdown.includes("Regression coverage checks: pass"));
    assert.ok(markdown.includes("Release Route Evidence"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("salary slip db verification is read-only and reports missing local database as blocker", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "payroll-db-verify-"));
  try {
    const out = join(tempDir, "db-verify.json");
    const markdownOut = join(tempDir, "db-verify.md");
    execFileSync(process.execPath, [
      "scripts/migrations/payroll/salary-slip-db-verify.mjs",
      "--out",
      out,
      "--markdown-out",
      markdownOut,
    ], {
      cwd: process.cwd(),
      stdio: "pipe",
      env: {
        ...process.env,
        DATABASE_URL: "mysql://root:password@127.0.0.1:1/huigui_test",
      },
    });

    const report = JSON.parse(readFileSync(out, "utf8")) as {
      writesDatabase: boolean;
      status: string;
      blockers: string[];
      failures: string[];
    };
    const markdown = readFileSync(markdownOut, "utf8");

    assert.equal(report.writesDatabase, false);
    assert.equal(report.status, "blocked");
    assert.deepEqual(report.failures, []);
    assert.ok(report.blockers.includes("blocked_waiting_for_database_connection"));
    assert.ok(markdown.includes("Writes database: no"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

async function main() {
  const missingRelease = !existsSync(join(process.cwd(), "apps/web/public/employee-frontend/current.release"));
  if (missingRelease) {
    console.error("not ok - current employee frontend release marker is missing");
    process.exitCode = 1;
    return;
  }

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
    console.error(`${failures.length} payroll salary slip regression test(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${tests.length} payroll salary slip regression test(s) passed.`);
}

void main();
