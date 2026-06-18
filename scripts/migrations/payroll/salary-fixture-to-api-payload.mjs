#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_HEADERS = ["姓名", "应发", "实发"];
const IDENTITY_HEADERS = ["员工ID", "用户ID", "企业微信账号", "登录账号", "系统账号"];
const DEDUCTION_COMPONENT_HEADERS = ["社保扣费", "社保", "公积金", "个税"];
const DEDUCTION_DISPLAY_LABELS = {
  扣款: "其他调整",
  扣除: "其他调整",
  扣费: "其他调整",
  社保扣费: "社保个人部分",
  社保: "社保个人部分",
  公积金: "公积金个人部分",
  个税: "个人所得税",
};

function parseArgs(argv) {
  const args = {
    csv: "",
    month: "",
    outDir: "",
    syncedBy: "UAT 财务",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--csv" && next) {
      args.csv = next;
      index += 1;
    } else if (arg === "--month" && next) {
      args.month = next;
      index += 1;
    } else if (arg === "--out-dir" && next) {
      args.outDir = next;
      index += 1;
    } else if (arg === "--synced-by" && next) {
      args.syncedBy = next;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (!args.csv || !args.month || !args.outDir) {
    throw new Error("--csv, --month and --out-dir are required.");
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/payroll/salary-fixture-to-api-payload.mjs \\
  --csv tests/fixtures/payroll/salary-upload-uat-resolved-2026-06.csv \\
  --month 2026-06 \\
  --out-dir output/payroll/uat-payloads \\
  --synced-by "UAT 财务"`);
}

function parseCsvRows(content) {
  const rows = [];
  let row = [];
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
    throw new Error("CSV has an unclosed quoted cell.");
  }
  return rows;
}

function cleanCsvCell(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function parseCsv(content) {
  const [headers, ...lines] = parseCsvRows(content);
  if (!headers?.length) {
    return { headers: [], rows: [] };
  }
  const normalizedHeaders = headers.map(cleanCsvCell);
  return {
    headers: normalizedHeaders,
    rows: lines.map((cells) => {
      return Object.fromEntries(normalizedHeaders.map((header, index) => [header, cleanCsvCell(cells[index])]));
    }),
  };
}

function missingRequiredHeaders(headers) {
  const headerSet = new Set(headers);
  const missing = REQUIRED_HEADERS.filter((header) => !headerSet.has(header));
  if (!IDENTITY_HEADERS.some((header) => headerSet.has(header))) {
    missing.push("员工ID/用户ID/企业微信账号/登录账号/系统账号");
  }
  return missing;
}

function parseAmount(value, required) {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  if (!raw) {
    return { value: 0, valid: !required };
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed)
    ? { value: parsed, valid: true }
    : { value: 0, valid: false };
}

function parseDeductionItems(row) {
  const items = [];
  let total = 0;
  let valid = true;
  let used = false;
  DEDUCTION_COMPONENT_HEADERS.forEach((header) => {
    if (!Object.prototype.hasOwnProperty.call(row, header)) {
      return;
    }
    const parsed = parseAmount(row[header], false);
    if (!parsed.valid) {
      valid = false;
    }
    if (text(row[header])) {
      used = true;
      total += parsed.value;
      if (Math.abs(parsed.value) > 0.001) {
        items.push({ label: DEDUCTION_DISPLAY_LABELS[header] ?? header, amount: parsed.value });
      }
    }
  });
  if (used) {
    return { value: total, valid, items };
  }
  const parsed = parseAmount(row.扣款, false);
  return {
    value: parsed.value,
    valid: parsed.valid,
    items: parsed.valid && Math.abs(parsed.value) > 0.001
      ? [{ label: "其他调整", amount: parsed.value }]
      : [],
  };
}

function text(value) {
  return String(value ?? "").trim() || undefined;
}

function toDraftRow(row, index) {
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
    ["实发", "netAmount", true],
  ];
  const parsedAmounts = Object.fromEntries(amountFields.map(([header, field, required]) => {
    return [field, parseAmount(row[header], required)];
  }));
  const parsedDeduction = parseDeductionItems(row);
  const amountErrors = amountFields
    .filter(([, field]) => !parsedAmounts[field].valid)
    .map(([header]) => header);
  if (!parsedDeduction.valid) {
    amountErrors.push("个人承担");
  }

  return {
    rowNumber: index + 2,
    teacherName,
    teacherId,
    hasExplicitIdentity,
    userId,
    wecomUserId,
    loginAccount,
    department: text(row.部门) ?? "未分组",
    position: text(row.岗位) ?? "成员",
    employmentType: text(row.人员类型) ?? text(row.岗位) ?? "正式",
    grossAmount: parsedAmounts.grossAmount.value,
    commissionAmount: parsedAmounts.commissionAmount.value,
    profitSharingAmount: parsedAmounts.profitSharingAmount.value,
    deductionAmount: parsedDeduction.value,
    deductionItems: parsedDeduction.items,
    netAmount: parsedAmounts.netAmount.value,
    amountErrors,
    differenceStatus: text(row.差异状态) ?? "resolved",
  };
}

function shouldNotifyWecom(row) {
  return Boolean(row.wecomUserId)
    && !/合作|外部|partner/i.test(row.employmentType)
    && !/合作/.test(row.position);
}

function notifyPerson(row) {
  return {
    id: row.teacherId,
    name: row.teacherName,
    department: row.department,
    role: row.position,
    userid: row.wecomUserId,
    netAmount: row.netAmount,
  };
}

function skippedPerson(row) {
  return {
    id: row.teacherId,
    name: row.teacherName,
    department: row.department,
    role: row.position,
    netAmount: row.netAmount,
    reason: row.wecomUserId ? "合作老师不发送企业微信" : "缺少企业微信账号",
  };
}

function buildPayloads(args) {
  const parsedCsv = parseCsv(readFileSync(args.csv, "utf8"));
  const missingHeaders = missingRequiredHeaders(parsedCsv.headers);
  const rows = parsedCsv.rows.map(toDraftRow);
  const unresolved = rows.filter((row) => row.differenceStatus !== "resolved");
  const invalidAmountRows = rows.filter((row) => row.amountErrors.length > 0);
  const missingIdentityRows = rows.filter((row) => !row.hasExplicitIdentity);
  const publishBatchId = `salary-publish-${args.month}-uat-fixture`;
  const delivered = rows.filter(shouldNotifyWecom).map(notifyPerson);
  const skipped = rows.filter((row) => !shouldNotifyWecom(row)).map(skippedPerson);
  const status = missingHeaders.length > 0
    ? "blocked_missing_required_headers"
    : unresolved.length > 0
      ? "blocked_unresolved_differences"
      : invalidAmountRows.length > 0
        ? "blocked_invalid_amounts"
        : missingIdentityRows.length > 0
          ? "blocked_missing_identity"
          : "ready";
  const summary = {
    generatedAt: new Date().toISOString(),
    writesDatabase: false,
    sourceCsv: args.csv,
    month: args.month,
    publishBatchId,
    rowCount: rows.length,
    missingRequiredHeaders: missingHeaders,
    unresolvedDifferenceCount: unresolved.length,
    invalidAmountCount: invalidAmountRows.length,
    invalidAmounts: invalidAmountRows.map((row) => ({
      rowNumber: row.rowNumber,
      teacherId: row.teacherId,
      teacherName: row.teacherName,
      fields: row.amountErrors,
    })),
    missingIdentityCount: missingIdentityRows.length,
    missingIdentities: missingIdentityRows.map((row) => ({
      rowNumber: row.rowNumber,
      teacherId: row.teacherId,
      teacherName: row.teacherName,
    })),
    notifyableCount: delivered.length,
    skippedCount: skipped.length,
    status,
    outputFiles: status !== "ready"
      ? ["summary.json"]
      : ["summary.json", "salary-slips-sync.json", "salary-notify-log.json"],
  };
  if (status !== "ready") {
    return {
      summary,
      syncPayload: null,
      notifyPayload: null,
    };
  }
  return {
    summary,
    syncPayload: {
      month: args.month,
      source: "manual_import",
      syncedBy: args.syncedBy,
      publishBatchId,
      items: rows.map((row) => ({
        teacherId: row.teacherId,
        teacherName: row.teacherName,
        userId: row.userId,
        wecomUserId: row.wecomUserId,
        loginAccount: row.loginAccount,
        grossAmount: row.grossAmount,
        commissionAmount: row.commissionAmount,
        profitSharingAmount: row.profitSharingAmount,
        deductionAmount: row.deductionAmount,
        deductionItems: row.deductionItems,
        netAmount: row.netAmount,
      })),
    },
    notifyPayload: {
      month: args.month,
      publishBatchId,
      actionLabel: "发布并通知",
      status: "preview",
      message: `企业微信可通知 ${delivered.length} 人，跳过 ${skipped.length} 人。`,
      delivered,
      skipped,
      failed: [],
      createdBy: args.syncedBy,
    },
  };
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.outDir, { recursive: true });
  const payloads = buildPayloads(args);
  writeJson(path.join(args.outDir, "summary.json"), payloads.summary);
  if (payloads.syncPayload) {
    writeJson(path.join(args.outDir, "salary-slips-sync.json"), payloads.syncPayload);
  }
  if (payloads.notifyPayload) {
    writeJson(path.join(args.outDir, "salary-notify-log.json"), payloads.notifyPayload);
  }
  console.log(JSON.stringify(payloads.summary, null, 2));
}

main();
