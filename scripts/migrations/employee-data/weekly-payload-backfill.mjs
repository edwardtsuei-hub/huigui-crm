#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const APPLY_CONFIRM = "production-weekly-payload-20260616";

function parseArgs(argv) {
  const args = {
    weeklyDir: "/opt/huigui-crm/storage/uploads/employee-launch-weekly",
    usersTsv: "",
    weeklyDbTsv: "",
    out: "",
    markdownOut: "",
    sqlOut: "",
    apply: false,
    confirm: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--weekly-dir" && next) {
      args.weeklyDir = next;
      index += 1;
    } else if (arg === "--users-tsv" && next) {
      args.usersTsv = next;
      index += 1;
    } else if (arg === "--weekly-db-tsv" && next) {
      args.weeklyDbTsv = next;
      index += 1;
    } else if (arg === "--out" && next) {
      args.out = next;
      index += 1;
    } else if (arg === "--markdown-out" && next) {
      args.markdownOut = next;
      index += 1;
    } else if (arg === "--sql-out" && next) {
      args.sqlOut = next;
      index += 1;
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--confirm" && next) {
      args.confirm = next;
      index += 1;
    } else if (arg === "--no-write") {
      // Compatibility flag. This draft never writes to the database directly.
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (args.apply && args.confirm !== APPLY_CONFIRM) {
    throw new Error(`Refusing --apply without --confirm ${APPLY_CONFIRM}`);
  }

  if (args.apply) {
    throw new Error("--apply is intentionally disabled in this draft. Review the generated SQL in staging first.");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
node weekly-payload-backfill.mjs \\
  --weekly-dir /opt/huigui-crm/storage/uploads/employee-launch-weekly \\
  --users-tsv output/employee-data-migration/2026-06-16/users.tsv \\
  --weekly-db-tsv output/employee-data-migration/2026-06-16/weekly-db.tsv \\
  --out output/employee-data-migration/2026-06-16/weekly-payload-backfill-plan.json \\
  --markdown-out output/employee-data-migration/2026-06-16/weekly-payload-backfill-plan.md \\
  --sql-out output/employee-data-migration/2026-06-16/weekly-payload-backfill-plan.sql \\
  --no-write`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function deterministicId(prefix, input, size = 24) {
  return `${prefix}_${createHash("sha1").update(input).digest("hex").slice(0, size)}`;
}

function canonicalUserKey(value) {
  return String(value || "")
    .replace(/^da-ai-gui-xin\.weekly-workspace\.v\d+\./i, "")
    .trim();
}

function identityToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._-]+/g, "");
}

function parseTsv(filePath, columns) {
  if (!filePath || !existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length >= columns.length)
    .map((parts) => Object.fromEntries(columns.map((column, index) => [column, parts[index] ?? ""])));
}

function loadUsers(filePath) {
  return parseTsv(filePath, [
    "id",
    "loginAccount",
    "name",
    "wecomUserId",
    "wecomName",
    "department",
    "roleCode",
    "dataScope",
  ]).map((user) => ({
    ...user,
    tokens: [user.id, user.loginAccount, user.name, user.wecomUserId, user.wecomName]
      .map(identityToken)
      .filter(Boolean),
  }));
}

function loadWeeklyReports(filePath) {
  return parseTsv(filePath, [
    "id",
    "userId",
    "loginAccount",
    "status",
    "weekStartDate",
    "partitionKey",
    "updatedAt",
  ]);
}

function mysqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")}'`;
}

function mysqlDate(value) {
  if (!value) return "NULL";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "NULL";
  return mysqlString(date.toISOString().slice(0, 19).replace("T", " "));
}

function classify(sourceUserKey, canonicalKey, matchedUsers) {
  const raw = `${sourceUserKey || ""} ${canonicalKey || ""}`;
  if (/smoke|weekly-summary-smoke|employee-launch-weekly-smoke/i.test(raw) || /\.test$/i.test(canonicalKey)) {
    return "test-or-smoke";
  }
  if (canonicalKey === "shared") return "shared-workspace";
  if (matchedUsers.length === 1) return "auto-match-candidate";
  if (matchedUsers.length > 1) return "ambiguous-match";
  return "needs-manual";
}

function recommendedAction(bucket, existingReports, matchedUsers) {
  if (bucket === "test-or-smoke") return "skip_test_data";
  if (bucket === "shared-workspace") return "needs_manual_shared_split";
  if (bucket === "ambiguous-match") return "needs_manual_user_confirm";
  if (!matchedUsers.length) return "needs_manual_user_confirm";
  if (existingReports.length) return "attach_payload_only";
  return "create_weekly_report_candidate";
}

function migrationStatus(action) {
  if (action === "needs_manual_shared_split" || action === "needs_manual_user_confirm" || action === "create_weekly_report_candidate") {
    return "NEEDS_REVIEW";
  }
  if (action === "skip_test_data") return "SKIPPED";
  return "IMPORTED";
}

function buildPlan(args) {
  const users = loadUsers(args.usersTsv);
  const weeklyReports = loadWeeklyReports(args.weeklyDbTsv);
  const files = readdirSync(args.weeklyDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(args.weeklyDir, name));

  const items = files.map((filePath) => {
    const raw = readFileSync(filePath);
    const json = JSON.parse(raw.toString("utf8"));
    const sourceSha = sha256(raw);
    const sourceFileName = path.basename(filePath);
    const sourceUserKey = json.userKey || "";
    const canonicalKey = canonicalUserKey(sourceUserKey);
    const token = identityToken(canonicalKey);
    const matchedUsers = token ? users.filter((user) => user.tokens.includes(token)) : [];
    const bucket = classify(sourceUserKey, canonicalKey, matchedUsers);
    const existingReports = matchedUsers.length === 1
      ? weeklyReports.filter((report) => report.userId === matchedUsers[0].id)
      : [];
    const action = recommendedAction(bucket, existingReports, matchedUsers);
    const status = migrationStatus(action);
    const shouldInsertPayload = action !== "skip_test_data";
    const matchedUser = matchedUsers.length === 1 ? matchedUsers[0] : null;
    const matchedReport = existingReports[0] || null;

    return {
      id: deterministicId("wrp", `${sourceFileName}:${sourceSha.slice(0, 16)}`),
      sourceFileName,
      sourcePath: filePath,
      sourceSha256: sourceSha,
      sourceSha16: sourceSha.slice(0, 16),
      sourceUserKey,
      canonicalUserKey: canonicalKey || null,
      reportState: json.reportState || null,
      savedAt: json.savedAt || json.meta?.lastSyncedAt || null,
      bucket,
      recommendedAction: action,
      migrationStatus: status,
      shouldInsertPayload,
      matchedUser: matchedUser
        ? {
            id: matchedUser.id,
            loginAccount: matchedUser.loginAccount,
            name: matchedUser.name,
          }
        : null,
      matchedWeeklyReport: matchedReport
        ? {
            id: matchedReport.id,
            status: matchedReport.status,
            weekStartDate: matchedReport.weekStartDate,
          }
        : null,
      payloadJson: json,
    };
  });

  const summary = {
    sourceFiles: items.length,
    payloadInserts: items.filter((item) => item.shouldInsertPayload).length,
    skipped: items.filter((item) => !item.shouldInsertPayload).length,
    needsReview: items.filter((item) => item.migrationStatus === "NEEDS_REVIEW").length,
    attachOnly: items.filter((item) => item.recommendedAction === "attach_payload_only").length,
  };

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    writesDatabase: false,
    applyConfirm: APPLY_CONFIRM,
    sourceDir: args.weeklyDir,
    summary,
    items,
  };
}

function renderSql(plan) {
  const lines = [];
  lines.push("-- WeeklyReportPayload backfill SQL draft.");
  lines.push("-- Review in staging before production use.");
  lines.push("-- This file was generated by weekly-payload-backfill.mjs in dry-run mode.");
  lines.push("START TRANSACTION;");
  for (const item of plan.items) {
    if (!item.shouldInsertPayload) {
      lines.push(`-- skipped ${item.sourceFileName}: ${item.recommendedAction}`);
      continue;
    }
    const payload = JSON.stringify(item.payloadJson);
    lines.push(`INSERT INTO \`WeeklyReportPayload\` (` +
      "`id`, `weeklyReportId`, `userId`, `source`, `sourceUserKey`, `canonicalUserKey`, `sourceFileName`, `sourceSha16`, `reportState`, `savedAt`, `payloadJson`, `migrationStatus`, `migrationNote`, `createdAt`, `updatedAt`" +
      `) VALUES (` +
      [
        mysqlString(item.id),
        mysqlString(item.matchedWeeklyReport?.id || null),
        mysqlString(item.matchedUser?.id || null),
        mysqlString("legacy_weekly_workspace"),
        mysqlString(item.sourceUserKey),
        mysqlString(item.canonicalUserKey),
        mysqlString(item.sourceFileName),
        mysqlString(item.sourceSha16),
        mysqlString(item.reportState),
        mysqlDate(item.savedAt),
        mysqlString(payload),
        mysqlString(item.migrationStatus),
        mysqlString(item.recommendedAction),
        "CURRENT_TIMESTAMP(3)",
        "CURRENT_TIMESTAMP(3)",
      ].join(", ") +
      `) ON DUPLICATE KEY UPDATE ` +
      "`weeklyReportId` = VALUES(`weeklyReportId`), " +
      "`userId` = VALUES(`userId`), " +
      "`canonicalUserKey` = VALUES(`canonicalUserKey`), " +
      "`reportState` = VALUES(`reportState`), " +
      "`savedAt` = VALUES(`savedAt`), " +
      "`payloadJson` = VALUES(`payloadJson`), " +
      "`migrationStatus` = VALUES(`migrationStatus`), " +
      "`migrationNote` = VALUES(`migrationNote`), " +
      "`updatedAt` = CURRENT_TIMESTAMP(3);");
  }
  lines.push("-- COMMIT; -- Uncomment only after staging validation.");
  lines.push("ROLLBACK;");
  return `${lines.join("\n")}\n`;
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push("# Weekly payload backfill plan");
  lines.push("");
  lines.push(`Generated at: ${plan.generatedAt}`);
  lines.push(`Source dir: \`${plan.sourceDir}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | ---: |");
  Object.entries(plan.summary).forEach(([key, value]) => lines.push(`| ${key} | ${value} |`));
  lines.push("");
  lines.push("## Items");
  lines.push("");
  lines.push("| file | action | status | user | weekly report | sha16 |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const item of plan.items) {
    const user = item.matchedUser?.loginAccount || "-";
    const report = item.matchedWeeklyReport?.id || "-";
    lines.push(`| \`${item.sourceFileName}\` | ${item.recommendedAction} | ${item.migrationStatus} | ${user} | ${report} | \`${item.sourceSha16}\` |`);
  }
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("- This plan did not write to the database.");
  lines.push("- The generated SQL ends with ROLLBACK by default.");
  lines.push("- Shared workspace rows are marked NEEDS_REVIEW.");
  return `${lines.join("\n")}\n`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const plan = buildPlan(args);
  if (args.out) {
    ensureParent(args.out);
    writeFileSync(args.out, `${JSON.stringify(plan, null, 2)}\n`);
  }
  if (args.markdownOut) {
    ensureParent(args.markdownOut);
    writeFileSync(args.markdownOut, renderMarkdown(plan));
  }
  if (args.sqlOut) {
    ensureParent(args.sqlOut);
    writeFileSync(args.sqlOut, renderSql(plan));
  }
  console.log(JSON.stringify(plan.summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
