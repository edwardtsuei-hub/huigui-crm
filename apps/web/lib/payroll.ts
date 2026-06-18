import { apiFetch, type CurrentUser } from "./api";

export type PayrollRow = {
  rowNumber: number;
  teacherName: string;
  teacherId: string;
  userId?: string;
  wecomUserId?: string;
  loginAccount?: string;
  department: string;
  position: string;
  employmentType: string;
  grossAmount: number;
  commissionAmount?: number;
  profitSharingAmount?: number;
  deductionAmount: number;
  netAmount: number;
  differenceStatus: "resolved" | "unresolved";
  differenceNote?: string;
  amountErrors: string[];
  hasExplicitIdentity: boolean;
};

export type PayrollDraft = {
  month: string;
  publishBatchId: string;
  fileName: string;
  uploadedAt: string;
  rows: PayrollRow[];
  validation: PayrollValidation;
};

export type PayrollValidation = {
  status: "ready" | "blocked_missing_required_headers" | "blocked_invalid_amounts" | "blocked_missing_identity" | "blocked_unresolved_differences" | "blocked_unsupported_format";
  missingRequiredHeaders: string[];
  invalidAmountRows: PayrollRow[];
  missingIdentityRows: PayrollRow[];
  unresolvedRows: PayrollRow[];
  warnings: string[];
};

export type UploadParseResult = {
  draft: PayrollDraft;
  supportedPreview: boolean;
};

export type NotifyPerson = {
  id: string;
  name: string;
  department: string;
  role: string;
  userid?: string;
  netAmount: number;
  reason?: string;
};

export type SalarySlipSyncResponse = {
  ok: boolean;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  teacherIds: string[];
  publishBatchId: string;
  warnings: string[];
};

export type SalarySlip = {
  id: string;
  month: string;
  publishBatchId?: string;
  teacherId: string;
  teacherName: string;
  userId?: string;
  wecomUserId?: string;
  loginAccount?: string;
  grossAmount: number;
  commissionAmount?: number;
  profitSharingAmount?: number;
  deductionAmount: number;
  netAmount: number;
  source?: string;
  sourceLabel?: string;
  syncedBy?: string;
  syncedAt?: string;
};

export type SalaryNotifyLog = {
  id: string;
  month: string;
  publishBatchId?: string;
  actionLabel: string;
  modeLabel?: string;
  status?: string;
  message: string;
  delivered: NotifyPerson[];
  skipped: NotifyPerson[];
  failed: NotifyPerson[];
  createdBy?: string;
  createdAt?: string;
};

export type SalaryWecomTestSendResponse = {
  ok: boolean;
  mode: "dry_run" | "live";
  status: "sent" | "preview" | "skipped" | "failed";
  month: string;
  publishBatchId: string;
  notifyUrl: string;
  delivered: NotifyPerson[];
  skipped: NotifyPerson[];
  failed: NotifyPerson[];
  message: string;
};

export type PayrollDraftBatchResponse = {
  month: string;
  publishBatchId?: string;
  drafts?: unknown;
  publishedAt?: string;
  notifyStatus?: string;
  excelReviewedAt?: string;
  updatedBy?: string;
  updatedAt?: string;
} | null;

const REQUIRED_HEADERS = ["姓名", "应发", "实发"];
const IDENTITY_HEADERS = ["员工ID", "用户ID", "企业微信账号", "登录账号", "系统账号"];

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatAmount(value: number | undefined) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

export function buildUploadUrl(month: string, returnTo = "/payroll/batch") {
  const params = new URLSearchParams({
    type: "salary_slip",
    month,
    returnTo,
  });
  return `/finance/imports?${params.toString()}`;
}

export function parseCsvRows(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some((item) => item.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((item) => item.length > 0)) {
    rows.push(row);
  }

  if (inQuotes) {
    throw new Error("CSV 有未闭合的引号单元格。");
  }

  return rows;
}

function cleanCell(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function tableRowsToObjects(tableRows: unknown[][]) {
  const [rawHeaders, ...bodyRows] = tableRows;
  const headers = (rawHeaders ?? []).map(cleanCell);
  const rows = bodyRows
    .filter((row) => row.some((cell) => cleanCell(cell)))
    .map((row) => {
      return Object.fromEntries(headers.map((header, index) => [header, cleanCell(row[index])]));
    });
  return { headers, rows };
}

function parseAmount(value: unknown, required: boolean) {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  if (!raw) {
    return { value: 0, valid: !required };
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed)
    ? { value: parsed, valid: true }
    : { value: 0, valid: false };
}

function text(value: unknown) {
  return String(value ?? "").trim() || undefined;
}

function toPayrollRow(row: Record<string, string>, index: number): PayrollRow {
  const teacherName = text(row.姓名) ?? "未命名";
  const userId = text(row.用户ID);
  const wecomUserId = text(row.企业微信账号);
  const loginAccount = text(row.登录账号) ?? text(row.系统账号);
  const employeeId = text(row.员工ID);
  const hasExplicitIdentity = Boolean(employeeId || userId || wecomUserId || loginAccount);
  const teacherId = employeeId ?? wecomUserId ?? loginAccount ?? userId ?? `teacher-${teacherName}`;
  const amountFields = [
    ["应发", "grossAmount", true],
    ["提成", "commissionAmount", false],
    ["分润", "profitSharingAmount", false],
    ["扣款", "deductionAmount", false],
    ["实发", "netAmount", true],
  ] as const;
  const parsedAmounts = Object.fromEntries(amountFields.map(([header, field, required]) => {
    return [field, parseAmount(row[header], required)];
  })) as Record<string, { value: number; valid: boolean }>;
  const amountErrors = amountFields
    .filter(([, field]) => !parsedAmounts[field].valid)
    .map(([header]) => header);

  return {
    rowNumber: index + 2,
    teacherName,
    teacherId,
    userId,
    wecomUserId,
    loginAccount,
    hasExplicitIdentity,
    department: text(row.部门) ?? "未分组",
    position: text(row.岗位) ?? "成员",
    employmentType: text(row.人员类型) ?? text(row.岗位) ?? "正式",
    grossAmount: parsedAmounts.grossAmount.value,
    commissionAmount: parsedAmounts.commissionAmount.value,
    profitSharingAmount: parsedAmounts.profitSharingAmount.value,
    deductionAmount: parsedAmounts.deductionAmount.value,
    netAmount: parsedAmounts.netAmount.value,
    differenceStatus: text(row.差异状态) === "unresolved" || text(row.差异状态) === "未处理"
      ? "unresolved"
      : "resolved",
    differenceNote: text(row.差异说明),
    amountErrors,
  };
}

function validateRows(headers: string[], rows: PayrollRow[], supportedPreview: boolean): PayrollValidation {
  const headerSet = new Set(headers);
  const missingRequiredHeaders = REQUIRED_HEADERS.filter((header) => !headerSet.has(header));
  if (!IDENTITY_HEADERS.some((header) => headerSet.has(header))) {
    missingRequiredHeaders.push("员工ID/用户ID/企业微信账号/登录账号/系统账号");
  }

  const invalidAmountRows = rows.filter((row) => row.amountErrors.length > 0);
  const missingIdentityRows = rows.filter((row) => !row.hasExplicitIdentity);
  const unresolvedRows = rows.filter((row) => row.differenceStatus !== "resolved");
  const warnings = rows.flatMap((row) => {
    const rowWarnings: string[] = [];
    if (row.netAmount < 0) {
      rowWarnings.push(`${row.teacherName} 的实发金额为负数，请复核。`);
    }
    const expectedNet = row.grossAmount
      + (row.commissionAmount ?? 0)
      + (row.profitSharingAmount ?? 0)
      - row.deductionAmount;
    if (Math.abs(row.netAmount - expectedNet) > 0.01) {
      rowWarnings.push(`${row.teacherName} 的实发与应发、提成、分润、扣款合计不一致。`);
    }
    return rowWarnings;
  });

  const status = !supportedPreview
    ? "blocked_unsupported_format"
    : missingRequiredHeaders.length > 0
      ? "blocked_missing_required_headers"
      : invalidAmountRows.length > 0
        ? "blocked_invalid_amounts"
        : missingIdentityRows.length > 0
          ? "blocked_missing_identity"
          : unresolvedRows.length > 0
            ? "blocked_unresolved_differences"
            : "ready";

  return {
    status,
    missingRequiredHeaders,
    invalidAmountRows,
    missingIdentityRows,
    unresolvedRows,
    warnings,
  };
}

function publishBatchIdFor(month: string) {
  const compactTime = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `salary-publish-${month}-${compactTime}`;
}

export async function parseSalaryFile(file: File, month: string): Promise<UploadParseResult> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const publishBatchId = publishBatchIdFor(month);

  if (lowerName.endsWith(".xls") && !lowerName.endsWith(".xlsx")) {
    const validation = validateRows([], [], false);
    validation.warnings.push("旧版 .xls 暂不做浏览器预览；请另存为 .xlsx 或 .csv 后上传发布。");
    return {
      supportedPreview: false,
      draft: {
        month,
        publishBatchId,
        fileName,
        uploadedAt: new Date().toISOString(),
        rows: [],
        validation,
      },
    };
  }

  let table;
  if (lowerName.endsWith(".csv")) {
    table = tableRowsToObjects(parseCsvRows(await file.text()));
  } else if (lowerName.endsWith(".xlsx")) {
    const xlsx = await import("xlsx");
    const workbook = xlsx.read(await file.arrayBuffer(), { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    if (!worksheet) {
      throw new Error("工作簿中没有可读取的工作表。");
    }
    const rows = xlsx.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: false, defval: "" });
    table = tableRowsToObjects(rows);
  } else {
    throw new Error("仅支持 .csv、.xlsx、.xls 薪资表。");
  }

  const rows = table.rows.map(toPayrollRow);
  return {
    supportedPreview: true,
    draft: {
      month,
      publishBatchId,
      fileName,
      uploadedAt: new Date().toISOString(),
      rows,
      validation: validateRows(table.headers, rows, true),
    },
  };
}

export function shouldNotifyWecom(row: PayrollRow) {
  return Boolean(row.wecomUserId)
    && !/合作|外部|partner/i.test(row.employmentType)
    && !/合作/.test(row.position);
}

export function notifyLists(rows: PayrollRow[]) {
  const delivered = rows.filter(shouldNotifyWecom).map((row): NotifyPerson => ({
    id: row.teacherId,
    name: row.teacherName,
    department: row.department,
    role: row.position,
    userid: row.wecomUserId,
    netAmount: row.netAmount,
  }));
  const skipped = rows.filter((row) => !shouldNotifyWecom(row)).map((row): NotifyPerson => ({
    id: row.teacherId,
    name: row.teacherName,
    department: row.department,
    role: row.position,
    netAmount: row.netAmount,
    reason: row.wecomUserId ? "合作老师不发送企业微信" : "缺少企业微信账号",
  }));

  return { delivered, skipped, failed: [] as NotifyPerson[] };
}

export function netAmountTotal(rows: PayrollRow[]) {
  return rows.reduce((total, row) => total + row.netAmount, 0);
}

export function draftIsReady(draft: PayrollDraft | null) {
  return draft?.validation.status === "ready";
}

export function loadDraftBatch(month: string) {
  return apiFetch<PayrollDraftBatchResponse>(`/payroll/draft-batches/${encodeURIComponent(month)}`);
}

export function saveDraftBatch(draft: PayrollDraft, input?: {
  publishedAt?: string;
  notifyStatus?: string;
  excelReviewedAt?: string;
  updatedBy?: string;
}) {
  return apiFetch<PayrollDraftBatchResponse>(`/payroll/draft-batches/${encodeURIComponent(draft.month)}`, {
    method: "PUT",
    body: JSON.stringify({
      publishBatchId: draft.publishBatchId,
      drafts: {
        salarySlipUpload: draft,
      },
      ...input,
    }),
  });
}

export function draftFromBatch(batch: PayrollDraftBatchResponse) {
  const drafts = batch?.drafts as { salarySlipUpload?: PayrollDraft } | undefined;
  return drafts?.salarySlipUpload ?? null;
}

export function syncSalarySlips(draft: PayrollDraft, user: CurrentUser | null) {
  return apiFetch<SalarySlipSyncResponse>("/salary-slips/sync", {
    method: "POST",
    body: JSON.stringify({
      month: draft.month,
      source: "manual_import",
      syncedBy: user?.displayName ?? user?.name ?? "财务",
      publishBatchId: draft.publishBatchId,
      items: draft.rows.map((row) => ({
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
    }),
  });
}

export function recordNotifyLog(draft: PayrollDraft, user: CurrentUser | null) {
  const lists = notifyLists(draft.rows);
  return apiFetch<{ ok: boolean; publishBatchId: string }>("/salary-notify-logs", {
    method: "POST",
    body: JSON.stringify({
      month: draft.month,
      publishBatchId: draft.publishBatchId,
      actionLabel: "发布并通知",
      status: "preview",
      modeLabel: "企业微信预览",
      message: `企业微信可通知 ${lists.delivered.length} 人，跳过 ${lists.skipped.length} 人。`,
      delivered: lists.delivered,
      skipped: lists.skipped,
      failed: lists.failed,
      createdBy: user?.displayName ?? user?.name ?? "财务",
    }),
  });
}

export function listSalarySlips(month: string, publishBatchId?: string) {
  const params = new URLSearchParams({ month, limit: "500" });
  if (publishBatchId) {
    params.set("publishBatchId", publishBatchId);
  }
  return apiFetch<{ data: SalarySlip[] }>(`/salary-slips?${params.toString()}`);
}

export function listMySalarySlips() {
  return apiFetch<{ data: SalarySlip[]; warnings?: string[] }>("/me/salary-slips");
}

export function listNotifyLogs(month: string, publishBatchId?: string) {
  const params = new URLSearchParams({ month, limit: "240" });
  if (publishBatchId) {
    params.set("publishBatchId", publishBatchId);
  }
  return apiFetch<{ data: SalaryNotifyLog[] }>(`/salary-notify-logs?${params.toString()}`);
}

export function sendSalaryWecomTest(input: {
  month: string;
  publishBatchId?: string;
  testUserids: string[];
  notifyUrl?: string;
  dryRun?: boolean;
  createdBy?: string;
}) {
  return apiFetch<SalaryWecomTestSendResponse>("/salary-notify-logs/send-test", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function statusLabel(status: PayrollValidation["status"]) {
  switch (status) {
    case "ready":
      return "可发布";
    case "blocked_missing_required_headers":
      return "缺少表头";
    case "blocked_invalid_amounts":
      return "金额异常";
    case "blocked_missing_identity":
      return "缺少身份";
    case "blocked_unresolved_differences":
      return "差异未处理";
    case "blocked_unsupported_format":
      return "格式需转换";
    default:
      return status;
  }
}
