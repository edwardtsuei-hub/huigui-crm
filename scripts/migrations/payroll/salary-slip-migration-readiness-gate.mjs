#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_MIGRATION = "20260617110000_payroll_publish_batch_identity";
const REQUIRED_MIGRATION_SNIPPETS = [
  "ALTER TABLE `SalarySlip`",
  "ADD COLUMN `publishBatchId`",
  "ADD COLUMN `userId`",
  "ADD COLUMN `wecomUserId`",
  "ADD COLUMN `loginAccount`",
  "ALTER TABLE `SalaryNotifyLog`",
  "ADD COLUMN `publishBatchId` VARCHAR(160) NULL",
  "ALTER TABLE `PayrollDraftBatch`",
  "CREATE INDEX `SalarySlip_publishBatchId_idx`",
  "CREATE INDEX `SalarySlip_userId_idx`",
  "CREATE INDEX `SalarySlip_wecomUserId_idx`",
  "CREATE INDEX `SalarySlip_loginAccount_idx`",
  "CREATE INDEX `SalaryNotifyLog_publishBatchId_idx`",
  "CREATE INDEX `PayrollDraftBatch_publishBatchId_idx`",
];
const FORBIDDEN_MIGRATION_KEYWORDS = [
  "CALL",
  "COMMIT",
  "DELETE",
  "DROP",
  "INSERT",
  "REPLACE",
  "ROLLBACK",
  "START TRANSACTION",
  "TRUNCATE",
  "UPDATE",
];

function parseArgs(argv) {
  const args = {
    preflight: "",
    globalPrecheckVerify: "",
    productionPrecheck: "",
    migrationSql: "prisma/migrations/20260617110000_payroll_publish_batch_identity/migration.sql",
    out: "",
    markdownOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--preflight" && next) {
      args.preflight = next;
      index += 1;
    } else if (arg === "--global-precheck-verify" && next) {
      args.globalPrecheckVerify = next;
      index += 1;
    } else if (arg === "--production-precheck" && next) {
      args.productionPrecheck = next;
      index += 1;
    } else if (arg === "--migration-sql" && next) {
      args.migrationSql = next;
      index += 1;
    } else if (arg === "--out" && next) {
      args.out = next;
      index += 1;
    } else if (arg === "--markdown-out" && next) {
      args.markdownOut = next;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  for (const [flag, value] of Object.entries({
    "--preflight": args.preflight,
    "--global-precheck-verify": args.globalPrecheckVerify,
    "--production-precheck": args.productionPrecheck,
  })) {
    if (!value) throw new Error(`Missing ${flag}.`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/payroll/salary-slip-migration-readiness-gate.mjs \\
  --preflight output/payroll/salary-slip-preflight-current.json \\
  --global-precheck-verify output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.json \\
  --production-precheck output/payroll/salary-slip-production-readiness-precheck.tsv \\
  --out output/payroll/salary-slip-migration-readiness-gate.json \\
  --markdown-out docs/payroll-salary-slip-migration-readiness-gate-2026-06-17.md

This gate is read-only. It parses local artifacts and production SELECT output.
It does not connect to the database, execute migration SQL, deploy, restart, or
authorize production migration.`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function parseTsv(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .filter((line) => !line.startsWith("mysql: [Warning]"))
    .map((line, index) => {
      const [checkName = "", actualValue = "", expectedValue = ""] = line.split("\t");
      return {
        line: index + 1,
        checkName: checkName.trim(),
        actualValue: actualValue.trim(),
        expectedValue: expectedValue.trim(),
        raw: line,
      };
    });
}

function stripComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

function migrationStaticChecks(migrationSql) {
  const uncommented = stripComments(migrationSql);
  const upper = uncommented.toUpperCase();
  const missingSnippets = REQUIRED_MIGRATION_SNIPPETS.filter((snippet) => !migrationSql.includes(snippet));
  const forbiddenKeywords = FORBIDDEN_MIGRATION_KEYWORDS.filter((keyword) => {
    return new RegExp(`(^|[^A-Z_])${keyword.replace(/\s+/g, "\\s+")}([^A-Z_]|$)`, "i").test(uncommented);
  });
  const statements = uncommented.split(";").map((statement) => statement.trim()).filter(Boolean);
  const alterStatements = statements.filter((statement) => /^ALTER\s+TABLE\b/i.test(statement)).length;
  const createIndexStatements = statements.filter((statement) => /^CREATE\s+INDEX\b/i.test(statement)).length;

  return {
    requiredMigration: REQUIRED_MIGRATION,
    statementCount: statements.length,
    alterStatements,
    createIndexStatements,
    missingSnippets,
    forbiddenKeywords,
    containsDestructiveDdl: /\bDROP\b|\bTRUNCATE\b/i.test(upper),
    passed: missingSnippets.length === 0
      && forbiddenKeywords.length === 0
      && alterStatements === 3
      && createIndexStatements === 6,
  };
}

function productionPrecheckSummary(rows) {
  const hardRows = rows.filter((row) => row.expectedValue !== "NULL");
  const mismatches = hardRows.filter((row) => row.actualValue !== row.expectedValue);
  const observations = rows.filter((row) => row.expectedValue === "NULL");
  const migrationAppliedRow = rows.find((row) => row.checkName === "migration.applied");
  const columnRows = rows.filter((row) => row.checkName.startsWith("column."));
  const indexRows = rows.filter((row) => row.checkName.startsWith("index."));
  const tableCounts = Object.fromEntries(observations.map((row) => [row.checkName, Number(row.actualValue)]));

  return {
    rows: rows.length,
    hardRows: hardRows.length,
    observations: observations.length,
    mismatches: mismatches.map((row) => ({
      checkName: row.checkName,
      actualValue: row.actualValue,
      expectedValue: row.expectedValue,
      line: row.line,
    })),
    migrationApplied: migrationAppliedRow?.actualValue === "1",
    migrationAppliedActual: migrationAppliedRow?.actualValue ?? null,
    missingPreMigrationColumns: columnRows.filter((row) => row.actualValue === "0").length,
    existingPreMigrationColumns: columnRows.filter((row) => row.actualValue !== "0").map((row) => row.checkName),
    missingPreMigrationIndexes: indexRows.filter((row) => row.actualValue === "0").length,
    existingPreMigrationIndexes: indexRows.filter((row) => row.actualValue !== "0").map((row) => row.checkName),
    tableCounts,
  };
}

function buildReport(args) {
  const preflight = readJson(args.preflight);
  const globalPrecheckVerify = readJson(args.globalPrecheckVerify);
  const migrationSql = readText(args.migrationSql);
  const productionRows = parseTsv(readText(args.productionPrecheck));
  const migrationStatic = migrationStaticChecks(migrationSql);
  const production = productionPrecheckSummary(productionRows);

  const hardFailures = [];
  if (preflight.failures?.length) hardFailures.push("payroll_preflight_has_failures");
  if (globalPrecheckVerify.status !== "passed") hardFailures.push("database_100_global_precheck_not_passed");
  if (!migrationStatic.passed) hardFailures.push("payroll_migration_static_guard_failed");
  if (production.mismatches.length > 0) hardFailures.push("production_pre_migration_state_not_clean");

  const softBlockers = [];
  if (preflight.blockers?.includes("blocked_waiting_for_vite_source")) {
    softBlockers.push("frontend_vite_source_missing_blocks_full_ui_release_not_test_db_migration");
  }
  if (preflight.blockers?.includes("blocked_waiting_for_local_docker")) {
    softBlockers.push("local_docker_missing_blocks_local_db_rehearsal");
  }
  if (preflight.blockers?.includes("blocked_waiting_for_local_mysql_client")) {
    softBlockers.push("local_mysql_client_missing_blocks_local_db_rehearsal");
  }

  let status = "blocked";
  let nextAllowedAction = "fix_failed_gate";
  if (hardFailures.length === 0 && !production.migrationApplied) {
    status = "ready_for_test_db_migration_authorization";
    nextAllowedAction = "request_test_db_migration_authorization";
  }
  if (hardFailures.length === 0 && production.migrationApplied) {
    status = "already_migrated_run_post_migration_verify";
    nextAllowedAction = "run_payroll_db_verify_and_uat_readback";
  }

  return {
    generatedAt: new Date().toISOString(),
    status,
    nextAllowedAction,
    scope: "payroll salary slip migration readiness gate",
    inputs: {
      preflight: args.preflight,
      globalPrecheckVerify: args.globalPrecheckVerify,
      productionPrecheck: args.productionPrecheck,
      migrationSql: args.migrationSql,
    },
    safety: {
      writesDatabase: false,
      readsProductionFromCapturedSelectOutput: true,
      executesMigration: false,
      productionMigrationAllowed: false,
      deploys: false,
      restarts: false,
      rollbackTagCreated: false,
    },
    decision: {
      canRequestTestDbMigrationAuthorization: status === "ready_for_test_db_migration_authorization",
      canRequestProductionMigrationAuthorization: false,
      productionMigrationAllowed: false,
      reason: hardFailures.length > 0
        ? "One or more hard readiness checks failed."
        : "Safe to request test DB migration authorization; production migration still needs a separate window after test DB and UAT evidence.",
    },
    summary: {
      hardFailures: hardFailures.length,
      softBlockers: softBlockers.length,
      preflightStatus: preflight.status,
      globalPrecheckStatus: globalPrecheckVerify.status,
      globalPrecheckMismatches: globalPrecheckVerify.summary?.mismatches,
      migrationStaticPassed: migrationStatic.passed,
      productionPrecheckMismatches: production.mismatches.length,
      productionMigrationApplied: production.migrationApplied,
    },
    hardFailures,
    softBlockers,
    migrationStatic,
    production,
    requiredBeforeProduction: [
      "Run the migration in a test or staging database first.",
      "Run salary-slip-db-verify against that migrated test database.",
      "Run payroll UAT API execute mode only against an explicitly confirmed test database.",
      "Generate and review payroll audit package from API readback evidence.",
      "Take a production database backup.",
      "Get a separate explicit production migration authorization.",
      "Run production migration in a controlled window, then run salary-slip-db-verify and database-100 global precheck.",
    ],
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Payroll salary slip migration readiness gate");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Next allowed action: \`${report.nextAllowedAction}\``);
  lines.push("");
  lines.push("## Decision");
  lines.push("");
  lines.push("| Gate | Value |");
  lines.push("| --- | --- |");
  lines.push(`| canRequestTestDbMigrationAuthorization | \`${report.decision.canRequestTestDbMigrationAuthorization}\` |`);
  lines.push(`| canRequestProductionMigrationAuthorization | \`${report.decision.canRequestProductionMigrationAuthorization}\` |`);
  lines.push(`| productionMigrationAllowed | \`${report.decision.productionMigrationAllowed}\` |`);
  lines.push(`| reason | ${report.decision.reason} |`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | --- |");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`| ${key} | \`${value}\` |`);
  }
  lines.push("");
  lines.push("## Hard Failures");
  lines.push("");
  if (report.hardFailures.length === 0) lines.push("- None");
  report.hardFailures.forEach((item) => lines.push(`- \`${item}\``));
  lines.push("");
  lines.push("## Soft Blockers");
  lines.push("");
  if (report.softBlockers.length === 0) lines.push("- None");
  report.softBlockers.forEach((item) => lines.push(`- \`${item}\``));
  lines.push("");
  lines.push("## Migration Static Guard");
  lines.push("");
  lines.push(`- Passed: \`${report.migrationStatic.passed}\``);
  lines.push(`- Statements: ${report.migrationStatic.statementCount}`);
  lines.push(`- ALTER TABLE statements: ${report.migrationStatic.alterStatements}`);
  lines.push(`- CREATE INDEX statements: ${report.migrationStatic.createIndexStatements}`);
  lines.push(`- Missing snippets: ${report.migrationStatic.missingSnippets.length ? report.migrationStatic.missingSnippets.join(", ") : "none"}`);
  lines.push(`- Forbidden keywords: ${report.migrationStatic.forbiddenKeywords.length ? report.migrationStatic.forbiddenKeywords.join(", ") : "none"}`);
  lines.push("");
  lines.push("## Production Pre-Migration Snapshot");
  lines.push("");
  lines.push(`- Migration applied: \`${report.production.migrationApplied}\``);
  lines.push(`- Hard mismatches: ${report.production.mismatches.length}`);
  lines.push(`- Required columns still absent: ${report.production.missingPreMigrationColumns}`);
  lines.push(`- Required indexes still absent: ${report.production.missingPreMigrationIndexes}`);
  for (const [name, count] of Object.entries(report.production.tableCounts)) {
    lines.push(`- ${name}: ${count}`);
  }
  lines.push("");
  lines.push("## Required Before Production");
  lines.push("");
  report.requiredBeforeProduction.forEach((item) => lines.push(`- ${item}`));
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("- This gate does not connect to the database.");
  lines.push("- This gate does not execute migration SQL.");
  lines.push("- This gate does not deploy or restart services.");
  lines.push("- Production migration remains forbidden until a separate explicit production authorization.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildReport(args);

  if (args.out) {
    ensureParent(args.out);
    writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (args.markdownOut) {
    ensureParent(args.markdownOut);
    writeFileSync(args.markdownOut, renderMarkdown(report));
  }

  console.log(JSON.stringify({
    status: report.status,
    nextAllowedAction: report.nextAllowedAction,
    hardFailures: report.summary.hardFailures,
    productionMigrationAllowed: report.decision.productionMigrationAllowed,
  }));

  if (report.status === "blocked") {
    process.exitCode = 2;
  }
}

main();
