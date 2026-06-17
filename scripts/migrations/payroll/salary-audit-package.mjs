#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SUMMARY_FILE = "summary.json";
const SYNC_FILE = "salary-slips-sync.json";
const NOTIFY_FILE = "salary-notify-log.json";

function parseArgs(argv) {
  const args = {
    payloadDir: "",
    submitResult: "",
    outDir: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--payload-dir" && next) {
      args.payloadDir = next;
      index += 1;
    } else if (arg === "--submit-result" && next) {
      args.submitResult = next;
      index += 1;
    } else if (arg === "--out-dir" && next) {
      args.outDir = next;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (!args.payloadDir || !args.outDir) {
    throw new Error("--payload-dir and --out-dir are required.");
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/payroll/salary-audit-package.mjs \\
  --payload-dir output/payroll/uat-payloads \\
  --submit-result output/payroll/uat-payloads/api-submit-result.json \\
  --out-dir output/payroll/uat-audit-package`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function responseBody(submitResult, name) {
  const response = asArray(submitResult?.responses).find((item) => item.name === name);
  return asRecord(response?.body);
}

function submitResultBlockers(submitResult, validations, readbackSlips, readbackNotifyLogs) {
  if (!submitResult) return [];
  const requiredValidationNames = [
    "syncSalarySlips",
    "recordSalaryNotifyLog",
    "listSalarySlips",
    "listSalaryNotifyLogs",
  ];
  const blockers = [];
  if (submitResult.status !== "executed") {
    blockers.push(`Submit result status is ${submitResult.status ?? "missing"}.`);
  }
  for (const name of requiredValidationNames) {
    const validation = validations.find((item) => item.name === name);
    if (!validation) {
      blockers.push(`Submit result missing validation: ${name}.`);
    }
  }
  const failedValidations = validations.filter((item) => item.ok !== true);
  if (failedValidations.length > 0) {
    blockers.push("Submit result contains failed validations.");
    failedValidations.forEach((item) => {
      const failures = item.failures.length > 0 ? `: ${item.failures.join(", ")}` : "";
      blockers.push(`Validation failed: ${item.name ?? "unknown"}${failures}`);
    });
  }
  if (readbackSlips.length === 0) {
    blockers.push("Submit result is missing salary slip read-back rows.");
  }
  if (readbackNotifyLogs.length === 0) {
    blockers.push("Submit result is missing salary notify log read-back rows.");
  }
  return blockers;
}

function csvCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `\t${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];
  writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function readRequiredJson(payloadDir, fileName) {
  const filePath = path.join(payloadDir, fileName);
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${fileName} in payload directory.`);
  }
  return {
    path: filePath,
    data: readJson(filePath),
  };
}

function buildAuditPackage(args) {
  const summaryInput = readRequiredJson(args.payloadDir, SUMMARY_FILE);
  const summary = summaryInput.data;
  if (summary.status !== "ready") {
    return {
      status: "blocked",
      blockers: [`Payload summary is ${summary.status ?? "unknown"}.`],
      summary,
      files: [],
    };
  }

  const syncInput = readRequiredJson(args.payloadDir, SYNC_FILE);
  const notifyInput = readRequiredJson(args.payloadDir, NOTIFY_FILE);
  const submitResult = args.submitResult && existsSync(args.submitResult)
    ? readJson(args.submitResult)
    : null;
  const readbackSlips = asArray(responseBody(submitResult, "listSalarySlips").data);
  const readbackNotifyLogs = asArray(responseBody(submitResult, "listSalaryNotifyLogs").data);
  const syncPayload = syncInput.data;
  const notifyPayload = notifyInput.data;
  const inputs = {
    summary: { path: summaryInput.path, sha256: sha256(summaryInput.path) },
    salarySlipsSync: { path: syncInput.path, sha256: sha256(syncInput.path) },
    salaryNotifyLog: { path: notifyInput.path, sha256: sha256(notifyInput.path) },
    submitResult: submitResult ? { path: args.submitResult, sha256: sha256(args.submitResult) } : null,
  };
  const validationSummary = submitResult ? asArray(submitResult.validations).map((item) => ({
    name: item.name,
    ok: item.ok,
    failures: Array.isArray(item.failures) ? item.failures : [],
  })) : [];
  const blockers = submitResultBlockers(submitResult, validationSummary, readbackSlips, readbackNotifyLogs);
  if (blockers.length > 0) {
    return {
      status: "blocked",
      blockers,
      summary,
      validations: validationSummary,
      inputs,
      files: [],
    };
  }
  const salaryRows = readbackSlips.length > 0 ? readbackSlips : asArray(syncPayload.items);
  const deliveredRows = asArray(notifyPayload.delivered);
  const skippedRows = asArray(notifyPayload.skipped);
  const failedRows = asArray(notifyPayload.failed);

  return {
    status: "ready",
    blockers: [],
    summary,
    sourceMode: readbackSlips.length > 0 ? "api_readback" : "payload",
    month: summary.month,
    publishBatchId: summary.publishBatchId,
    counts: {
      salarySlipRows: salaryRows.length,
      notifyDeliveredRows: deliveredRows.length,
      notifySkippedRows: skippedRows.length,
      notifyFailedRows: failedRows.length,
      readbackNotifyLogRows: readbackNotifyLogs.length,
    },
    validations: validationSummary,
    inputs,
    data: {
      salaryRows,
      deliveredRows,
      skippedRows,
      failedRows,
      readbackNotifyLogs,
    },
  };
}

function renderReadme(manifest) {
  const lines = [];
  lines.push("# Payroll Salary Slip Audit Package");
  lines.push("");
  lines.push(`Generated at: ${manifest.generatedAt}`);
  lines.push(`Status: ${manifest.status}`);
  lines.push(`Month: ${manifest.month ?? ""}`);
  lines.push(`Publish batch: ${manifest.publishBatchId ?? ""}`);
  lines.push(`Source mode: ${manifest.sourceMode ?? "blocked"}`);
  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push(`- Salary slip rows: ${manifest.counts?.salarySlipRows ?? 0}`);
  lines.push(`- Notify delivered rows: ${manifest.counts?.notifyDeliveredRows ?? 0}`);
  lines.push(`- Notify skipped rows: ${manifest.counts?.notifySkippedRows ?? 0}`);
  lines.push(`- Notify failed rows: ${manifest.counts?.notifyFailedRows ?? 0}`);
  lines.push(`- Readback notify log rows: ${manifest.counts?.readbackNotifyLogRows ?? 0}`);
  lines.push("");
  lines.push("## Files");
  lines.push("");
  manifest.files.forEach((file) => {
    lines.push(`- ${file.name}: ${file.sha256}`);
  });
  if (manifest.blockers?.length) {
    lines.push("");
    lines.push("## Blockers");
    lines.push("");
    manifest.blockers.forEach((blocker) => lines.push(`- ${blocker}`));
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.outDir, { recursive: true });
  const audit = buildAuditPackage(args);
  const generatedAt = new Date().toISOString();

  if (audit.status === "blocked") {
    const manifest = {
      generatedAt,
      writesDatabase: false,
      status: audit.status,
      blockers: audit.blockers,
      summary: audit.summary,
      validations: audit.validations ?? [],
      inputs: audit.inputs ?? null,
      files: [],
    };
    const manifestPath = path.join(args.outDir, "manifest.json");
    writeJson(manifestPath, manifest);
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  const salaryPath = path.join(args.outDir, "salary-slips.csv");
  const deliveredPath = path.join(args.outDir, "notify-delivered.csv");
  const skippedPath = path.join(args.outDir, "notify-skipped.csv");
  const failedPath = path.join(args.outDir, "notify-failed.csv");
  const notifyLogPath = path.join(args.outDir, "notify-log-readback.json");

  writeCsv(salaryPath, [
    "month",
    "publishBatchId",
    "teacherId",
    "teacherName",
    "userId",
    "wecomUserId",
    "loginAccount",
    "grossAmount",
    "commissionAmount",
    "profitSharingAmount",
    "deductionAmount",
    "netAmount",
  ], audit.data.salaryRows.map((row) => ({
    month: row.month ?? audit.month,
    publishBatchId: row.publishBatchId ?? audit.publishBatchId,
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
  })));
  writeCsv(deliveredPath, ["id", "name", "department", "role", "userid", "netAmount"], audit.data.deliveredRows);
  writeCsv(skippedPath, ["id", "name", "department", "role", "userid", "netAmount", "reason"], audit.data.skippedRows);
  writeCsv(failedPath, ["id", "name", "department", "role", "userid", "netAmount", "reason"], audit.data.failedRows);
  writeJson(notifyLogPath, audit.data.readbackNotifyLogs);

  const files = [
    { name: "salary-slips.csv", path: salaryPath, sha256: sha256(salaryPath) },
    { name: "notify-delivered.csv", path: deliveredPath, sha256: sha256(deliveredPath) },
    { name: "notify-skipped.csv", path: skippedPath, sha256: sha256(skippedPath) },
    { name: "notify-failed.csv", path: failedPath, sha256: sha256(failedPath) },
    { name: "notify-log-readback.json", path: notifyLogPath, sha256: sha256(notifyLogPath) },
  ];
  const manifest = {
    generatedAt,
    writesDatabase: false,
    status: audit.status,
    blockers: audit.blockers,
    month: audit.month,
    publishBatchId: audit.publishBatchId,
    sourceMode: audit.sourceMode,
    counts: audit.counts,
    validations: audit.validations,
    inputs: audit.inputs,
    files,
  };
  const manifestPath = path.join(args.outDir, "manifest.json");
  const readmePath = path.join(args.outDir, "README.md");
  writeJson(manifestPath, manifest);
  writeFileSync(readmePath, renderReadme({
    ...manifest,
    files: [...files, { name: "manifest.json", path: manifestPath, sha256: sha256(manifestPath) }],
  }));
  console.log(JSON.stringify({
    status: manifest.status,
    writesDatabase: manifest.writesDatabase,
    month: manifest.month,
    publishBatchId: manifest.publishBatchId,
    counts: manifest.counts,
    outDir: args.outDir,
  }, null, 2));
}

main();
