#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_MIGRATION = "20260617110000_payroll_publish_batch_identity";
const REQUIRED_COLUMNS = {
  SalarySlip: ["publishBatchId", "userId", "wecomUserId", "loginAccount"],
  SalaryNotifyLog: ["publishBatchId"],
  PayrollDraftBatch: ["publishBatchId"],
};
const REQUIRED_INDEXES = [
  "SalarySlip_publishBatchId_idx",
  "SalarySlip_userId_idx",
  "SalarySlip_wecomUserId_idx",
  "SalarySlip_loginAccount_idx",
  "SalaryNotifyLog_publishBatchId_idx",
  "PayrollDraftBatch_publishBatchId_idx",
];

function parseArgs(argv) {
  const args = {
    out: "",
    markdownOut: "",
    strict: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--out" && next) {
      args.out = next;
      index += 1;
    } else if (arg === "--markdown-out" && next) {
      args.markdownOut = next;
      index += 1;
    } else if (arg === "--strict") {
      args.strict = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/payroll/salary-slip-db-verify.mjs \\
  --out output/payroll/salary-slip-db-verify.json \\
  --markdown-out output/payroll/salary-slip-db-verify.md

Optional:
  --strict   exit non-zero when verification failures exist`);
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const entries = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const delimiterIndex = line.indexOf("=");
    if (delimiterIndex === -1) continue;
    const key = line.slice(0, delimiterIndex).trim();
    let value = line.slice(delimiterIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return true;
  for (const filePath of [path.resolve("apps/api/.env"), path.resolve(".env")]) {
    const env = parseEnvFile(filePath);
    if (env.DATABASE_URL?.trim()) {
      process.env.DATABASE_URL = env.DATABASE_URL.trim();
      return true;
    }
  }
  return false;
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function bigintToNumber(value) {
  if (typeof value === "bigint") return Number(value);
  return Number(value || 0);
}

function firstRow(rows) {
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
}

async function count(prisma, sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  return bigintToNumber(firstRow(rows).count);
}

async function buildReport() {
  if (!ensureDatabaseUrl()) {
    return {
      generatedAt: new Date().toISOString(),
      writesDatabase: false,
      status: "blocked",
      blockers: ["blocked_waiting_for_database_url"],
      failures: [],
      warnings: [],
      checks: {},
    };
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const databaseRows = await prisma.$queryRawUnsafe("SELECT DATABASE() AS databaseName");
    const databaseName = firstRow(databaseRows).databaseName || null;

    const columns = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('SalarySlip', 'SalaryNotifyLog', 'PayrollDraftBatch')
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('SalarySlip', 'SalaryNotifyLog', 'PayrollDraftBatch')
      GROUP BY TABLE_NAME, INDEX_NAME
      ORDER BY TABLE_NAME, INDEX_NAME
    `);
    const migrationRows = await prisma.$queryRawUnsafe(`
      SELECT migration_name AS migrationName, finished_at AS finishedAt, rolled_back_at AS rolledBackAt
      FROM _prisma_migrations
      WHERE migration_name = '${REQUIRED_MIGRATION}'
      LIMIT 1
    `);

    const columnSet = new Set(columns.map((item) => `${item.tableName}.${item.columnName}`));
    const indexSet = new Set(indexes.map((item) => item.indexName));
    const missingColumns = [];
    for (const [tableName, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
      for (const columnName of requiredColumns) {
        if (!columnSet.has(`${tableName}.${columnName}`)) {
          missingColumns.push(`${tableName}.${columnName}`);
        }
      }
    }
    const missingIndexes = REQUIRED_INDEXES.filter((indexName) => !indexSet.has(indexName));
    const migration = firstRow(migrationRows);
    const migrationApplied = Boolean(migration.migrationName) && !migration.rolledBackAt;

    const tableCounts = {
      salarySlips: await count(prisma, "SELECT COUNT(*) AS count FROM SalarySlip"),
      salaryNotifyLogs: await count(prisma, "SELECT COUNT(*) AS count FROM SalaryNotifyLog"),
      payrollDraftBatches: await count(prisma, "SELECT COUNT(*) AS count FROM PayrollDraftBatch"),
    };
    const identityIncomplete = await count(prisma, `
      SELECT COUNT(*) AS count
      FROM SalarySlip
      WHERE userId IS NULL OR userId = ''
         OR wecomUserId IS NULL OR wecomUserId = ''
         OR loginAccount IS NULL OR loginAccount = ''
    `);
    const publishBatchMissing = await count(prisma, `
      SELECT COUNT(*) AS count
      FROM SalarySlip
      WHERE publishBatchId IS NULL OR publishBatchId = ''
    `);
    const nameDuplicateRows = await prisma.$queryRawUnsafe(`
      SELECT teacherName, COUNT(*) AS count
      FROM SalarySlip
      GROUP BY teacherName
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, teacherName ASC
      LIMIT 20
    `);
    const recentNotifyRows = await prisma.$queryRawUnsafe(`
      SELECT month, publishBatchId, status, createdAt
      FROM SalaryNotifyLog
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    const failures = [];
    if (!migrationApplied) failures.push("required_migration_not_applied");
    if (missingColumns.length > 0) failures.push("missing_required_columns");
    if (missingIndexes.length > 0) failures.push("missing_required_indexes");

    const warnings = [];
    if (identityIncomplete > 0) warnings.push("salary_slips_with_incomplete_identity");
    if (publishBatchMissing > 0) warnings.push("salary_slips_missing_publish_batch_id");
    if (nameDuplicateRows.length > 0) warnings.push("duplicate_teacher_names_need_identity_review");

    return {
      generatedAt: new Date().toISOString(),
      writesDatabase: false,
      status: failures.length > 0 ? "failed" : warnings.length > 0 ? "passed_with_warnings" : "passed",
      blockers: [],
      failures,
      warnings,
      checks: {
        databaseName,
        migrationApplied,
        migration: migration.migrationName ? {
          migrationName: migration.migrationName,
          finishedAt: migration.finishedAt,
          rolledBackAt: migration.rolledBackAt,
        } : null,
        missingColumns,
        missingIndexes,
        tableCounts,
        identityIncomplete,
        publishBatchMissing,
        duplicateTeacherNames: nameDuplicateRows.map((item) => ({
          teacherName: item.teacherName,
          count: bigintToNumber(item.count),
        })),
        recentNotifyLogs: recentNotifyRows,
      },
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      writesDatabase: false,
      status: "blocked",
      blockers: ["blocked_waiting_for_database_connection"],
      failures: [],
      warnings: [],
      error: error instanceof Error ? error.message : String(error),
      checks: {},
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Payroll salary slip DB verification");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Writes database: ${report.writesDatabase ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Blockers");
  lines.push("");
  if (report.blockers.length === 0) lines.push("- None");
  report.blockers.forEach((item) => lines.push(`- \`${item}\``));
  lines.push("");
  lines.push("## Failures");
  lines.push("");
  if (report.failures.length === 0) lines.push("- None");
  report.failures.forEach((item) => lines.push(`- \`${item}\``));
  lines.push("");
  lines.push("## Warnings");
  lines.push("");
  if (report.warnings.length === 0) lines.push("- None");
  report.warnings.forEach((item) => lines.push(`- \`${item}\``));
  if (report.error) {
    lines.push("");
    lines.push("## Error");
    lines.push("");
    lines.push(`\`${report.error}\``);
  }
  if (report.checks?.databaseName) {
    lines.push("");
    lines.push("## Checks");
    lines.push("");
    lines.push(`- Database: \`${report.checks.databaseName}\``);
    lines.push(`- Migration applied: ${report.checks.migrationApplied ? "yes" : "no"}`);
    lines.push(`- Missing columns: ${report.checks.missingColumns.length ? report.checks.missingColumns.join(", ") : "none"}`);
    lines.push(`- Missing indexes: ${report.checks.missingIndexes.length ? report.checks.missingIndexes.join(", ") : "none"}`);
    lines.push(`- Salary slips: ${report.checks.tableCounts.salarySlips}`);
    lines.push(`- Salary notify logs: ${report.checks.tableCounts.salaryNotifyLogs}`);
    lines.push(`- Payroll draft batches: ${report.checks.tableCounts.payrollDraftBatches}`);
    lines.push(`- Incomplete salary identities: ${report.checks.identityIncomplete}`);
    lines.push(`- Missing publish batch ids: ${report.checks.publishBatchMissing}`);
    lines.push(`- Duplicate teacher names: ${report.checks.duplicateTeacherNames.length}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await buildReport();
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
    blockers: report.blockers,
    failures: report.failures,
    warnings: report.warnings,
  }, null, 2));
  if (args.strict && report.failures.length > 0) {
    process.exitCode = 1;
  }
}

void main();
