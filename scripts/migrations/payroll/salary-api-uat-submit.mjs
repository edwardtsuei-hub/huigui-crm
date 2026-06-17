#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_SYNC_FILE = "salary-slips-sync.json";
const DEFAULT_NOTIFY_FILE = "salary-notify-log.json";
const DEFAULT_SUMMARY_FILE = "summary.json";
const EXECUTE_CONFIRMATION = "PAYROLL_UAT_TEST_DB";
const FORBIDDEN_HOST_TOKENS = [
  "management.hui-health.com",
  "hui-health.com",
  "production",
  "prod",
];

function parseArgs(argv) {
  const args = {
    payloadDir: "",
    apiBaseUrl: "",
    token: "",
    tokenEnv: "",
    out: "",
    execute: false,
    allowNonLocal: false,
    skipNotifyLog: false,
    confirmTestDb: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--payload-dir" && next) {
      args.payloadDir = next;
      index += 1;
    } else if (arg === "--api-base-url" && next) {
      args.apiBaseUrl = next;
      index += 1;
    } else if (arg === "--token" && next) {
      args.token = next;
      index += 1;
    } else if (arg === "--token-env" && next) {
      args.tokenEnv = next;
      index += 1;
    } else if (arg === "--out" && next) {
      args.out = next;
      index += 1;
    } else if (arg === "--execute") {
      args.execute = true;
    } else if (arg === "--confirm-test-db" && next) {
      args.confirmTestDb = next;
      index += 1;
    } else if (arg === "--allow-non-local") {
      args.allowNonLocal = true;
    } else if (arg === "--skip-notify-log") {
      args.skipNotifyLog = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (!args.payloadDir || !args.apiBaseUrl) {
    throw new Error("--payload-dir and --api-base-url are required.");
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/payroll/salary-api-uat-submit.mjs \\
  --payload-dir output/payroll/uat-resolved-2026-06 \\
  --api-base-url http://127.0.0.1:4000/api \\
  --token-env PAYROLL_UAT_TOKEN \\
  --confirm-test-db ${EXECUTE_CONFIRMATION}

Dry-run is the default. Add --execute and --confirm-test-db ${EXECUTE_CONFIRMATION} to POST to a non-production API.`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function redactToken(token) {
  if (!token) return "";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function isPrivateOrLocalHost(hostname) {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  const match172 = /^172\.(\d+)\./.exec(hostname);
  if (match172) {
    const second = Number(match172[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

function looksLikeNonProductionTestHost(hostname) {
  return /(^|[-.])(test|staging|stage|uat|dev|local)([-.]|$)/i.test(hostname);
}

function normalizeApiBaseUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  return {
    href: parsed.href.replace(/\/+$/, ""),
    hostname: parsed.hostname.toLowerCase(),
    protocol: parsed.protocol,
  };
}

function validateExecutionTarget(args) {
  const apiBase = normalizeApiBaseUrl(args.apiBaseUrl);
  if (!/^https?:$/.test(apiBase.protocol)) {
    throw new Error("Only http/https API URLs are supported.");
  }
  const forbiddenToken = FORBIDDEN_HOST_TOKENS.find((token) => apiBase.hostname.includes(token));
  if (forbiddenToken) {
    throw new Error(`Refusing to execute against production-like host: ${forbiddenToken}`);
  }
  if (!isPrivateOrLocalHost(apiBase.hostname) && !looksLikeNonProductionTestHost(apiBase.hostname) && !args.allowNonLocal) {
    throw new Error("Non-local API targets require --allow-non-local and must not look production-like.");
  }
  return apiBase;
}

function validateExecuteConfirmation(args) {
  if (!args.execute) return;
  if (args.confirmTestDb !== EXECUTE_CONFIRMATION) {
    throw new Error(`--execute requires --confirm-test-db ${EXECUTE_CONFIRMATION}.`);
  }
}

function endpoint(apiBaseUrl, route) {
  const base = apiBaseUrl.replace(/\/+$/, "");
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  return `${base}${normalizedRoute}`;
}

function endpointWithQuery(apiBaseUrl, route, query) {
  const url = new URL(endpoint(apiBaseUrl, route));
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function payloadText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function payloadNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validatePayloadConsistency(summary, syncPayload, notifyPayload) {
  const blockers = [];
  const summaryMonth = payloadText(summary.month);
  const summaryPublishBatchId = payloadText(summary.publishBatchId);
  const syncMonth = payloadText(syncPayload.month);
  const syncPublishBatchId = payloadText(syncPayload.publishBatchId);
  const syncItems = Array.isArray(syncPayload.items) ? syncPayload.items : [];
  const summaryRowCount = payloadNumber(summary.rowCount);

  if (!summaryMonth || !syncMonth || summaryMonth !== syncMonth) {
    blockers.push("payload_month_mismatch_between_summary_and_sync");
  }
  if (!summaryPublishBatchId || !syncPublishBatchId || summaryPublishBatchId !== syncPublishBatchId) {
    blockers.push("payload_publish_batch_mismatch_between_summary_and_sync");
  }
  if (!Array.isArray(syncPayload.items) || syncItems.length === 0) {
    blockers.push("payload_sync_items_missing");
  }
  if (summaryRowCount !== null && syncItems.length !== summaryRowCount) {
    blockers.push("payload_row_count_mismatch_between_summary_and_sync");
  }

  if (notifyPayload) {
    const notifyMonth = payloadText(notifyPayload.month);
    const notifyPublishBatchId = payloadText(notifyPayload.publishBatchId);
    const deliveredCount = arrayCount(notifyPayload.delivered);
    const skippedCount = arrayCount(notifyPayload.skipped);
    const summaryNotifyableCount = payloadNumber(summary.notifyableCount);
    const summarySkippedCount = payloadNumber(summary.skippedCount);

    if (!notifyMonth || notifyMonth !== summaryMonth || notifyMonth !== syncMonth) {
      blockers.push("payload_month_mismatch_with_notify_log");
    }
    if (!notifyPublishBatchId || notifyPublishBatchId !== summaryPublishBatchId || notifyPublishBatchId !== syncPublishBatchId) {
      blockers.push("payload_publish_batch_mismatch_with_notify_log");
    }
    if (summaryNotifyableCount !== null && deliveredCount !== summaryNotifyableCount) {
      blockers.push("payload_notify_delivered_count_mismatch");
    }
    if (summarySkippedCount !== null && skippedCount !== summarySkippedCount) {
      blockers.push("payload_notify_skipped_count_mismatch");
    }
  }

  return blockers;
}

function loadPayloads(payloadDir, skipNotifyLog) {
  const summaryPath = path.join(payloadDir, DEFAULT_SUMMARY_FILE);
  const syncPath = path.join(payloadDir, DEFAULT_SYNC_FILE);
  const notifyPath = path.join(payloadDir, DEFAULT_NOTIFY_FILE);
  if (!existsSync(summaryPath)) {
    throw new Error(`Missing ${DEFAULT_SUMMARY_FILE} in payload directory.`);
  }
  const summary = readJson(summaryPath);
  if (summary.status !== "ready") {
    return {
      summary,
      syncPayload: null,
      notifyPayload: null,
      blockedReason: `Payload summary is ${summary.status ?? "unknown"}.`,
    };
  }
  if (!existsSync(syncPath)) {
    throw new Error(`Missing ${DEFAULT_SYNC_FILE} in ready payload directory.`);
  }
  if (!skipNotifyLog && !existsSync(notifyPath)) {
    throw new Error(`Missing ${DEFAULT_NOTIFY_FILE} in ready payload directory.`);
  }
  const syncPayload = readJson(syncPath);
  const notifyPayload = skipNotifyLog ? null : readJson(notifyPath);
  const consistencyBlockers = validatePayloadConsistency(summary, syncPayload, notifyPayload);
  return {
    summary,
    syncPayload,
    notifyPayload,
    blockedReason: consistencyBlockers.length > 0
      ? `Payload files are inconsistent: ${consistencyBlockers.join(", ")}.`
      : "",
  };
}

function resolveToken(args) {
  if (args.token) return args.token;
  if (args.tokenEnv) return process.env[args.tokenEnv] ?? "";
  return "";
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function comparableText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function comparableAmount(value) {
  const parsed = Number(comparableText(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function sameAmount(left, right) {
  const leftAmount = comparableAmount(left);
  const rightAmount = comparableAmount(right);
  if (leftAmount === null || rightAmount === null) return false;
  return Math.abs(leftAmount - rightAmount) < 0.005;
}

function arrayCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function validateSyncResponse(syncPayload, responseBody) {
  const body = asRecord(responseBody);
  const expectedPublishBatchId = syncPayload.publishBatchId;
  const expectedTeacherIds = new Set((syncPayload.items ?? []).map((item) => item.teacherId).filter(Boolean));
  const teacherIds = Array.isArray(body.teacherIds) ? body.teacherIds.filter((item) => typeof item === "string") : [];
  const returnedTeacherIds = new Set(teacherIds);
  const missingTeacherIds = Array.from(expectedTeacherIds).filter((teacherId) => !returnedTeacherIds.has(teacherId));
  const createdCount = Number(body.createdCount ?? 0);
  const updatedCount = Number(body.updatedCount ?? 0);
  const skippedCount = Number(body.skippedCount ?? 0);
  const writtenCount = createdCount + updatedCount;
  const expectedItemCount = expectedTeacherIds.size;
  const failures = [];

  if (body.ok !== true) {
    failures.push("sync_response_ok_not_true");
  }
  if (body.publishBatchId !== expectedPublishBatchId) {
    failures.push("sync_response_publish_batch_id_mismatch");
  }
  if (missingTeacherIds.length > 0) {
    failures.push("sync_response_missing_teacher_ids");
  }
  if (writtenCount < expectedItemCount) {
    failures.push("sync_response_written_count_less_than_expected");
  }
  if (skippedCount > 0) {
    failures.push("sync_response_skipped_count_nonzero");
  }

  return {
    ok: failures.length === 0,
    failures,
    expectedPublishBatchId,
    returnedPublishBatchId: typeof body.publishBatchId === "string" ? body.publishBatchId : null,
    expectedItemCount,
    createdCount,
    updatedCount,
    skippedCount,
    missingTeacherIds,
  };
}

function validateNotifyResponse(notifyPayload, responseBody) {
  const body = asRecord(responseBody);
  const failures = [];
  const returnedPublishBatchId = typeof body.publishBatchId === "string" ? body.publishBatchId : null;

  if (body.ok !== true) {
    failures.push("notify_response_ok_not_true");
  }
  if (returnedPublishBatchId && returnedPublishBatchId !== notifyPayload.publishBatchId) {
    failures.push("notify_response_publish_batch_id_mismatch");
  }

  return {
    ok: failures.length === 0,
    failures,
    expectedPublishBatchId: notifyPayload.publishBatchId,
    returnedPublishBatchId,
  };
}

function validateSalarySlipReadback(syncPayload, responseBody) {
  const body = asRecord(responseBody);
  const data = Array.isArray(body.data) ? body.data.map(asRecord) : [];
  const expectedItems = syncPayload.items ?? [];
  const expectedTeacherIds = new Set(expectedItems.map((item) => item.teacherId).filter(Boolean));
  const returnedTeacherIds = new Set(data.map((item) => item.teacherId).filter(Boolean));
  const returnedByTeacherId = new Map(data
    .filter((item) => item.teacherId)
    .map((item) => [String(item.teacherId), item]));
  const missingTeacherIds = Array.from(expectedTeacherIds).filter((teacherId) => !returnedTeacherIds.has(teacherId));
  const wrongBatchItems = data.filter((item) => item.publishBatchId !== syncPayload.publishBatchId);
  const identityMissingItems = data.filter((item) => {
    return !item.teacherId && !item.userId && !item.wecomUserId && !item.loginAccount;
  });
  const amountFields = ["grossAmount", "commissionAmount", "profitSharingAmount", "deductionAmount", "netAmount"];
  const identityFields = ["userId", "wecomUserId", "loginAccount"];
  const amountMismatches = [];
  const identityMismatches = [];

  for (const expectedItem of expectedItems) {
    const teacherId = comparableText(expectedItem.teacherId);
    if (!teacherId) continue;
    const returnedItem = returnedByTeacherId.get(teacherId);
    if (!returnedItem) continue;

    for (const field of amountFields) {
      if (!sameAmount(expectedItem[field], returnedItem[field])) {
        amountMismatches.push({
          teacherId,
          field,
          expected: expectedItem[field] ?? null,
          returned: returnedItem[field] ?? null,
        });
      }
    }
    for (const field of identityFields) {
      const expectedValue = comparableText(expectedItem[field]);
      if (!expectedValue) continue;
      const returnedValue = comparableText(returnedItem[field]);
      if (returnedValue !== expectedValue) {
        identityMismatches.push({
          teacherId,
          field,
          expected: expectedValue,
          returned: returnedValue,
        });
      }
    }
  }

  const failures = [];

  if (data.length < expectedTeacherIds.size) {
    failures.push("salary_slips_readback_count_less_than_expected");
  }
  if (missingTeacherIds.length > 0) {
    failures.push("salary_slips_readback_missing_teacher_ids");
  }
  if (wrongBatchItems.length > 0) {
    failures.push("salary_slips_readback_publish_batch_id_mismatch");
  }
  if (identityMissingItems.length > 0) {
    failures.push("salary_slips_readback_identity_missing");
  }
  if (amountMismatches.length > 0) {
    failures.push("salary_slips_readback_amount_mismatch");
  }
  if (identityMismatches.length > 0) {
    failures.push("salary_slips_readback_identity_mismatch");
  }

  return {
    ok: failures.length === 0,
    failures,
    expectedCount: expectedTeacherIds.size,
    returnedCount: data.length,
    missingTeacherIds,
    wrongBatchCount: wrongBatchItems.length,
    identityMissingCount: identityMissingItems.length,
    amountMismatchCount: amountMismatches.length,
    identityMismatchCount: identityMismatches.length,
    amountMismatches: amountMismatches.slice(0, 20),
    identityMismatches: identityMismatches.slice(0, 20),
  };
}

function validateNotifyLogReadback(notifyPayload, responseBody) {
  if (!notifyPayload) {
    return {
      ok: true,
      failures: [],
      skipped: true,
    };
  }
  const body = asRecord(responseBody);
  const data = Array.isArray(body.data) ? body.data.map(asRecord) : [];
  const matchingLogs = data.filter((item) => item.publishBatchId === notifyPayload.publishBatchId);
  const expectedDeliveredCount = arrayCount(notifyPayload.delivered);
  const expectedSkippedCount = arrayCount(notifyPayload.skipped);
  const expectedFailedCount = arrayCount(notifyPayload.failed);
  const returnedCounts = matchingLogs.map((item) => ({
    id: item.id ?? null,
    deliveredCount: arrayCount(item.delivered),
    skippedCount: arrayCount(item.skipped),
    failedCount: arrayCount(item.failed),
  }));
  const hasExactCountMatch = returnedCounts.some((item) => {
    return item.deliveredCount === expectedDeliveredCount
      && item.skippedCount === expectedSkippedCount
      && item.failedCount === expectedFailedCount;
  });
  const failures = [];

  if (matchingLogs.length === 0) {
    failures.push("notify_logs_readback_missing_publish_batch");
  }
  if (matchingLogs.length > 0 && !hasExactCountMatch) {
    failures.push("notify_logs_readback_no_single_log_matches_counts");
    if (!returnedCounts.some((item) => item.deliveredCount === expectedDeliveredCount)) {
      failures.push("notify_logs_readback_delivered_count_mismatch");
    }
    if (!returnedCounts.some((item) => item.skippedCount === expectedSkippedCount)) {
      failures.push("notify_logs_readback_skipped_count_mismatch");
    }
    if (!returnedCounts.some((item) => item.failedCount === expectedFailedCount)) {
      failures.push("notify_logs_readback_failed_count_mismatch");
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    expectedPublishBatchId: notifyPayload.publishBatchId,
    returnedCount: data.length,
    matchingCount: matchingLogs.length,
    expectedDeliveredCount,
    expectedSkippedCount,
    expectedFailedCount,
    returnedCounts: returnedCounts.slice(0, 20),
  };
}

async function postJson(url, token, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: payload,
  };
}

async function getJson(url, token) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: payload,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiBase = validateExecutionTarget(args);
  const payloads = loadPayloads(args.payloadDir, args.skipNotifyLog);
  const token = resolveToken(args);
  const plan = {
    generatedAt: new Date().toISOString(),
    writesDatabase: args.execute,
    status: "dry_run_ready",
    apiBaseUrl: apiBase.href,
    tokenPreview: redactToken(token),
    payloadDir: args.payloadDir,
    summary: payloads.summary,
    endpoints: {
      syncSalarySlips: endpoint(apiBase.href, "/salary-slips/sync"),
      recordSalaryNotifyLog: endpoint(apiBase.href, "/salary-notify-logs"),
      listSalarySlips: endpointWithQuery(apiBase.href, "/salary-slips", {
        month: payloads.summary.month,
        publishBatchId: payloads.summary.publishBatchId,
        limit: payloads.summary.rowCount ?? 500,
      }),
      listSalaryNotifyLogs: endpointWithQuery(apiBase.href, "/salary-notify-logs", {
        month: payloads.summary.month,
        publishBatchId: payloads.summary.publishBatchId,
        limit: 240,
      }),
    },
    requests: [],
    responses: [],
    validations: [],
    blockers: [],
  };

  if (payloads.blockedReason) {
    plan.status = "blocked";
    plan.blockers.push(payloads.blockedReason);
    writeJson(args.out, plan);
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  plan.requests.push({
    name: "syncSalarySlips",
    endpoint: plan.endpoints.syncSalarySlips,
    itemCount: payloads.syncPayload.items?.length ?? 0,
    publishBatchId: payloads.syncPayload.publishBatchId,
  });
  if (payloads.notifyPayload) {
    plan.requests.push({
      name: "recordSalaryNotifyLog",
      endpoint: plan.endpoints.recordSalaryNotifyLog,
      deliveredCount: payloads.notifyPayload.delivered?.length ?? 0,
      skippedCount: payloads.notifyPayload.skipped?.length ?? 0,
      publishBatchId: payloads.notifyPayload.publishBatchId,
    });
  }
  plan.requests.push({
    name: "listSalarySlips",
    endpoint: plan.endpoints.listSalarySlips,
    expectedCount: payloads.syncPayload.items?.length ?? 0,
    publishBatchId: payloads.syncPayload.publishBatchId,
  });
  if (payloads.notifyPayload) {
    plan.requests.push({
      name: "listSalaryNotifyLogs",
      endpoint: plan.endpoints.listSalaryNotifyLogs,
      publishBatchId: payloads.notifyPayload.publishBatchId,
    });
  }

  if (!args.execute) {
    writeJson(args.out, plan);
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  validateExecuteConfirmation(args);

  if (!token) {
    throw new Error("--execute requires --token or --token-env.");
  }

  plan.status = "executed";
  const syncResponse = await postJson(plan.endpoints.syncSalarySlips, token, payloads.syncPayload);
  plan.responses.push({ name: "syncSalarySlips", ...syncResponse });
  if (!syncResponse.ok) {
    plan.status = "failed";
  }
  const syncValidation = syncResponse.ok
    ? validateSyncResponse(payloads.syncPayload, syncResponse.body)
    : {
      ok: false,
      failures: ["sync_request_failed"],
    };
  plan.validations.push({ name: "syncSalarySlips", ...syncValidation });
  if (!syncValidation.ok) {
    plan.status = "failed";
  }
  if (payloads.notifyPayload && syncResponse.ok && syncValidation.ok) {
    const notifyResponse = await postJson(plan.endpoints.recordSalaryNotifyLog, token, payloads.notifyPayload);
    plan.responses.push({ name: "recordSalaryNotifyLog", ...notifyResponse });
    if (!notifyResponse.ok) {
      plan.status = "failed";
    }
    const notifyValidation = notifyResponse.ok
      ? validateNotifyResponse(payloads.notifyPayload, notifyResponse.body)
      : {
        ok: false,
        failures: ["notify_request_failed"],
      };
    plan.validations.push({ name: "recordSalaryNotifyLog", ...notifyValidation });
    if (!notifyValidation.ok) {
      plan.status = "failed";
    }
  } else if (payloads.notifyPayload && syncResponse.ok && !syncValidation.ok) {
    plan.blockers.push("salary_notify_log_skipped_because_sync_response_validation_failed");
  }
  if (syncResponse.ok && syncValidation.ok) {
    const salarySlipReadback = await getJson(plan.endpoints.listSalarySlips, token);
    plan.responses.push({ name: "listSalarySlips", ...salarySlipReadback });
    const salarySlipReadbackValidation = salarySlipReadback.ok
      ? validateSalarySlipReadback(payloads.syncPayload, salarySlipReadback.body)
      : {
        ok: false,
        failures: ["salary_slips_readback_request_failed"],
      };
    plan.validations.push({ name: "listSalarySlips", ...salarySlipReadbackValidation });
    if (!salarySlipReadbackValidation.ok) {
      plan.status = "failed";
    }
  }
  if (payloads.notifyPayload && syncResponse.ok && syncValidation.ok) {
    const notifyReadback = await getJson(plan.endpoints.listSalaryNotifyLogs, token);
    plan.responses.push({ name: "listSalaryNotifyLogs", ...notifyReadback });
    const notifyReadbackValidation = notifyReadback.ok
      ? validateNotifyLogReadback(payloads.notifyPayload, notifyReadback.body)
      : {
        ok: false,
        failures: ["notify_logs_readback_request_failed"],
      };
    plan.validations.push({ name: "listSalaryNotifyLogs", ...notifyReadbackValidation });
    if (!notifyReadbackValidation.ok) {
      plan.status = "failed";
    }
  }

  writeJson(args.out, plan);
  console.log(JSON.stringify(plan, null, 2));
  if (plan.status === "failed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
