#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ROOT = "apps/web/public/employee-frontend";
const PROTECTED_RELEASE = "apps/web/public/employee-frontend/releases/20260616090241";
const FRONTEND_SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"]);
const FRONTEND_SOURCE_TOKENS = ["/payroll/batch", "/finance/imports", "上传薪资表"];
const RELEASE_EVIDENCE_EXTENSIONS = new Set([".html", ".js", ".css", ".map", ".json"]);
const SOURCE_SCAN_SKIP_DIRS = new Set([
  ".git",
  ".codegraph",
  ".next",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "output",
  "storage",
]);
const SOURCE_SCAN_SKIP_PREFIXES = [
  "apps/api/",
  "apps/web/public/employee-frontend/current/",
  "apps/web/public/employee-frontend/releases/",
  "docs/",
  "prisma/",
  "scripts/",
  "tests/",
];

function parseArgs(argv) {
  const args = {
    out: "",
    markdownOut: "",
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
node scripts/migrations/payroll/salary-slip-preflight.mjs \\
  --out output/payroll/salary-slip-preflight.json \\
  --markdown-out output/payroll/salary-slip-preflight.md`);
}

function readText(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function commandExists(command) {
  try {
    execFileSync("sh", ["-lc", `command -v ${command}`], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function gitDiffLineCount(relativePath) {
  try {
    const output = execFileSync("git", ["diff", "--", relativePath], { cwd: ROOT, encoding: "utf8" });
    return output.trim() ? output.split(/\r?\n/).length : 0;
  } catch {
    return null;
  }
}

function listFilesRecursive(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!existsSync(absolutePath)) return [];
  const files = [];
  const stack = [absolutePath];
  while (stack.length > 0) {
    const current = stack.pop();
    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const item of readdirSync(current)) {
        stack.push(path.join(current, item));
      }
    } else {
      files.push(path.relative(ROOT, current));
    }
  }
  return files.sort();
}

function normalizePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function shouldSkipSourceScanPath(relativePath) {
  const normalizedPath = normalizePath(relativePath);
  if (!normalizedPath || normalizedPath === ".") return false;
  const segments = normalizedPath.split("/");
  if (segments.some((segment) => SOURCE_SCAN_SKIP_DIRS.has(segment))) {
    return true;
  }
  return SOURCE_SCAN_SKIP_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function listMaintainableFrontendSourceCandidates() {
  const candidates = [];
  const stack = [ROOT];
  while (stack.length > 0) {
    const current = stack.pop();
    const relativePath = path.relative(ROOT, current);
    if (relativePath && shouldSkipSourceScanPath(relativePath)) {
      continue;
    }

    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const item of readdirSync(current)) {
        stack.push(path.join(current, item));
      }
      continue;
    }

    const extension = path.extname(current).toLowerCase();
    if (!FRONTEND_SOURCE_EXTENSIONS.has(extension)) continue;
    if (stat.size > 2 * 1024 * 1024) continue;

    const text = readFileSync(current, "utf8");
    if (FRONTEND_SOURCE_TOKENS.some((token) => text.includes(token))) {
      candidates.push(normalizePath(relativePath));
    }
  }
  return candidates.sort();
}

function releaseFrontendEvidence(releaseFiles) {
  const routeHits = [];
  const sourceMapFiles = [];
  const sourceMappingUrlFiles = [];
  for (const file of releaseFiles) {
    const extension = path.extname(file).toLowerCase();
    if (extension === ".map") {
      sourceMapFiles.push(normalizePath(file));
    }
    if (!RELEASE_EVIDENCE_EXTENSIONS.has(extension)) continue;

    const absolutePath = path.join(ROOT, file);
    const stat = statSync(absolutePath);
    if (stat.size > 3 * 1024 * 1024) continue;

    const text = readFileSync(absolutePath, "utf8");
    const matchedTokens = FRONTEND_SOURCE_TOKENS.filter((token) => text.includes(token));
    if (matchedTokens.length > 0) {
      routeHits.push({
        file: normalizePath(file),
        matchedTokens,
        bytes: stat.size,
      });
    }
    if (text.includes("sourceMappingURL=")) {
      sourceMappingUrlFiles.push(normalizePath(file));
    }
  }
  return {
    routeHits: routeHits.sort((a, b) => a.file.localeCompare(b.file)),
    sourceMapFiles: sourceMapFiles.sort(),
    sourceMappingUrlFiles: sourceMappingUrlFiles.sort(),
  };
}

function currentRelease() {
  const releaseFile = path.join(ROOT, RELEASE_ROOT, "current.release");
  return existsSync(releaseFile) ? readFileSync(releaseFile, "utf8").trim() : "";
}

function checkContains(text, patterns) {
  return patterns.map((pattern) => ({
    pattern: String(pattern),
    ok: typeof pattern === "string" ? text.includes(pattern) : pattern.test(text),
  }));
}

function allOk(items) {
  return items.every((item) => item.ok);
}

function buildReport() {
  const schema = readText("prisma/schema.prisma");
  const migrationPath = "prisma/migrations/20260617110000_payroll_publish_batch_identity/migration.sql";
  const migration = readText(migrationPath);
  const service = readText("apps/api/src/payroll/payroll.service.ts");
  const regression = readText("tests/payroll-salary-slip-regression.test.ts");
  const release = currentRelease();
  const releaseDir = `${RELEASE_ROOT}/releases/${release}`;
  const releaseFiles = listFilesRecursive(releaseDir);
  const sourceLikeFiles = releaseFiles.filter((file) => /\.(map|ts|tsx|jsx)$/.test(file));
  const frontendSourceCandidates = listMaintainableFrontendSourceCandidates();
  const frontendReleaseEvidence = releaseFrontendEvidence(releaseFiles);

  const schemaChecks = checkContains(schema, [
    "publishBatchId      String?  @db.VarChar(160)",
    "userId              String?  @db.VarChar(120)",
    "wecomUserId         String?  @db.VarChar(128)",
    "loginAccount        String?  @db.VarChar(64)",
    "@@index([publishBatchId])",
    "@@index([userId])",
    "@@index([wecomUserId])",
    "@@index([loginAccount])",
  ]);
  const migrationChecks = checkContains(migration, [
    "ALTER TABLE `SalarySlip`",
    "ADD COLUMN `publishBatchId`",
    "ADD COLUMN `userId`",
    "ADD COLUMN `wecomUserId`",
    "ADD COLUMN `loginAccount`",
    "ALTER TABLE `SalaryNotifyLog`",
    "ALTER TABLE `PayrollDraftBatch`",
    "CREATE INDEX `SalarySlip_publishBatchId_idx`",
    "CREATE INDEX `SalaryNotifyLog_publishBatchId_idx`",
    "CREATE INDEX `PayrollDraftBatch_publishBatchId_idx`",
  ]);
  const destructiveMigrationTokens = ["DROP TABLE", "TRUNCATE", "DELETE FROM", "DROP COLUMN"].filter((token) => {
    return migration.toUpperCase().includes(token);
  });
  const serviceForbiddenTokens = [
    "PAYROLL_WRITE_PERMISSION",
    "action.management.member.update",
    "pruneSalaryNotifyLogs",
    "finance|财务|財務|finance_reviewer",
  ].filter((token) => service.includes(token));
  const regressionChecks = checkContains(regression, [
    "matching names alone do not authorize salary slip access",
    "payroll maintenance no longer allows finance-looking text or member-management permission",
    "salary notify logs keep publish batch id and do not prune history",
    "salary notify logs create distinct default ids for repeated publish batch records",
    "salary identity backfill dry-run only auto-updates explicit identity matches",
    "SalarySlips sync rejects rows without explicit employee identity before writing",
    "SalarySlips sync rejects empty and invalid amount payloads before writing",
    "SalarySlips sync warns about amount mismatches without blocking publish",
    "SalarySlips sync replaces only the current publish batch",
    "SalarySlips sync default ids are stable within a publish batch and distinct across batches",
    "UAT salary fixture blocks invalid required amounts before generating publish payloads",
    "UAT salary fixture blocks rows without explicit employee identity",
    "UAT salary fixture blocks CSV files with missing required headers before generating publish payloads",
    "UAT salary fixture parses quoted CSV amounts with thousands separators",
    "UAT salary fixture strips UTF-8 BOM from CSV headers",
    "BOM老师",
    "CSV has an unclosed quoted cell",
    "blocked_missing_required_headers",
    "blocked_invalid_amounts",
    "blocked_missing_identity",
    "salary notify logs require publish batch id and filtered queries",
    "salary notify logs infer a single publish batch id but reject ambiguous months",
    "UAT payroll API submitter requires explicit test database confirmation before execute",
    "PAYROLL_UAT_TEST_DB",
    "UAT payroll API submitter blocks inconsistent payload files before dry-run plan",
    "UAT payroll API submitter validates notify log response publish batch",
    "payload_publish_batch_mismatch_with_notify_log",
    "UAT payroll API submitter fails when read-back amounts identities or notify counts drift",
    "UAT audit package blocks failed API submit results instead of exporting misleading evidence",
    "UAT audit package blocks submit results that lack API readback evidence",
    "notify_response_publish_batch_id_mismatch",
    "salary_slips_readback_amount_mismatch",
    "notify_logs_readback_no_single_log_matches_counts",
  ]);
  const protectedReleaseDiffLines = gitDiffLineCount(PROTECTED_RELEASE);

  const blockers = [];
  if (release !== "20260616090241") {
    blockers.push(`current.release is ${release || "missing"}, expected 20260616090241 for this check.`);
  }
  if (frontendSourceCandidates.length === 0) {
    blockers.push("blocked_waiting_for_vite_source");
  }
  if (!commandExists("docker")) {
    blockers.push("blocked_waiting_for_local_docker");
  }
  if (!commandExists("mysql")) {
    blockers.push("blocked_waiting_for_local_mysql_client");
  }
  if (protectedReleaseDiffLines !== 0) {
    blockers.push("protected_employee_release_has_local_diff");
  }

  const failures = [];
  if (!allOk(schemaChecks)) failures.push("schema_checks_failed");
  if (!allOk(migrationChecks)) failures.push("migration_checks_failed");
  if (destructiveMigrationTokens.length > 0) failures.push("migration_contains_destructive_tokens");
  if (serviceForbiddenTokens.length > 0) failures.push("service_contains_forbidden_payroll_permission_tokens");
  if (!allOk(regressionChecks)) failures.push("regression_coverage_checks_failed");

  return {
    generatedAt: new Date().toISOString(),
    writesDatabase: false,
    deploys: false,
    status: failures.length > 0 ? "failed" : blockers.length > 0 ? "passed_with_blockers" : "passed",
    blockers,
    failures,
    checks: {
      codegraphPresent: existsSync(path.join(ROOT, ".codegraph")),
      currentRelease: release || null,
      releaseSourceLikeFiles: sourceLikeFiles,
      frontendReleaseEvidence,
      frontendSourceCandidates,
      protectedReleaseDiffLines,
      dockerAvailable: commandExists("docker"),
      mysqlClientAvailable: commandExists("mysql"),
      schemaChecks,
      migrationChecks,
      destructiveMigrationTokens,
      serviceForbiddenTokens,
      regressionChecks,
    },
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Payroll salary slip preflight");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Writes database: ${report.writesDatabase ? "yes" : "no"}`);
  lines.push(`Deploys: ${report.deploys ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Blockers");
  lines.push("");
  if (report.blockers.length === 0) {
    lines.push("- None");
  } else {
    report.blockers.forEach((item) => lines.push(`- \`${item}\``));
  }
  lines.push("");
  lines.push("## Failures");
  lines.push("");
  if (report.failures.length === 0) {
    lines.push("- None");
  } else {
    report.failures.forEach((item) => lines.push(`- \`${item}\``));
  }
  lines.push("");
  lines.push("## Environment");
  lines.push("");
  lines.push(`- CodeGraph present: ${report.checks.codegraphPresent ? "yes" : "no"}`);
  lines.push(`- Current release: \`${report.checks.currentRelease || "missing"}\``);
  lines.push(`- Protected release diff lines: ${report.checks.protectedReleaseDiffLines}`);
  lines.push(`- Docker available: ${report.checks.dockerAvailable ? "yes" : "no"}`);
  lines.push(`- MySQL client available: ${report.checks.mysqlClientAvailable ? "yes" : "no"}`);
  lines.push(`- Release source-like files: ${report.checks.releaseSourceLikeFiles.length}`);
  lines.push(`- Release route/token hits: ${report.checks.frontendReleaseEvidence.routeHits.length}`);
  lines.push(`- Release sourcemap files: ${report.checks.frontendReleaseEvidence.sourceMapFiles.length}`);
  lines.push(`- Release sourceMappingURL files: ${report.checks.frontendReleaseEvidence.sourceMappingUrlFiles.length}`);
  lines.push(`- Maintainable frontend source candidates: ${report.checks.frontendSourceCandidates.length}`);
  if (report.checks.frontendReleaseEvidence.routeHits.length > 0) {
    lines.push("");
    lines.push("### Release Route Evidence");
    lines.push("");
    report.checks.frontendReleaseEvidence.routeHits.forEach((hit) => {
      lines.push(`- \`${hit.file}\` (${hit.bytes} bytes): ${hit.matchedTokens.map((token) => `\`${token}\``).join(", ")}`);
    });
  }
  lines.push("");
  lines.push("## Safety Checks");
  lines.push("");
  lines.push(`- Schema checks: ${allOk(report.checks.schemaChecks) ? "pass" : "fail"}`);
  lines.push(`- Migration checks: ${allOk(report.checks.migrationChecks) ? "pass" : "fail"}`);
  lines.push(`- Destructive migration tokens: ${report.checks.destructiveMigrationTokens.length ? report.checks.destructiveMigrationTokens.join(", ") : "none"}`);
  lines.push(`- Forbidden service tokens: ${report.checks.serviceForbiddenTokens.length ? report.checks.serviceForbiddenTokens.join(", ") : "none"}`);
  lines.push(`- Regression coverage checks: ${allOk(report.checks.regressionChecks) ? "pass" : "fail"}`);
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildReport();
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
  }, null, 2));
  if (report.failures.length > 0) {
    process.exitCode = 1;
  }
}

main();
