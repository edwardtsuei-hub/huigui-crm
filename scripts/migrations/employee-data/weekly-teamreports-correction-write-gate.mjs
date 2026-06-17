#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    globalPrecheck: "",
    sqlGuard: "",
    rehearsalVerify: "",
    authorization: "",
    out: "",
    markdownOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--global-precheck" && next) {
      args.globalPrecheck = next;
      index += 1;
    } else if (arg === "--sql-guard" && next) {
      args.sqlGuard = next;
      index += 1;
    } else if (arg === "--rehearsal-verify" && next) {
      args.rehearsalVerify = next;
      index += 1;
    } else if (arg === "--authorization" && next) {
      args.authorization = next;
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
    "--global-precheck": args.globalPrecheck,
    "--sql-guard": args.sqlGuard,
    "--authorization": args.authorization,
  })) {
    if (!value) throw new Error(`Missing ${flag}.`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/employee-data/weekly-teamreports-correction-write-gate.mjs \\
  --global-precheck output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.json \\
  --sql-guard output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.json \\
  --rehearsal-verify output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rehearsal-verify-result.json \\
  --authorization output/employee-data-migration/2026-06-16/weekly-teamreports-correction-execution-authorization.json \\
  --out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.json \\
  --markdown-out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.md

This gate only reads existing JSON artifacts. It does not connect to the
database, execute SQL, deploy, or write database data.`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function makeCheck({ name, passed, actual, expected, severity = "hard", details = "" }) {
  return {
    name,
    passed: Boolean(passed),
    actual: String(actual ?? ""),
    expected: String(expected ?? ""),
    severity,
    details,
  };
}

function isRealRehearsal(rehearsal) {
  if (!rehearsal) return false;
  const transcript = rehearsal.inputs?.transcript;
  if (!transcript || transcript === "-") return false;
  if (transcript.includes("synthetic")) return false;
  return true;
}

function buildReport(args) {
  const globalPrecheck = readJson(args.globalPrecheck);
  const sqlGuard = readJson(args.sqlGuard);
  const authorization = readJson(args.authorization);
  const rehearsal = args.rehearsalVerify ? readJson(args.rehearsalVerify) : null;
  const realRehearsal = isRealRehearsal(rehearsal);

  const checks = [
    makeCheck({
      name: "globalPrecheck.status",
      passed: globalPrecheck.status === "passed",
      actual: globalPrecheck.status,
      expected: "passed",
    }),
    makeCheck({
      name: "globalPrecheck.hardGateMismatches",
      passed: Number(globalPrecheck.summary?.mismatches ?? -1) === 0
        && Number(globalPrecheck.summary?.malformedRows ?? -1) === 0
        && Number(globalPrecheck.summary?.duplicateCheckNames ?? -1) === 0,
      actual: JSON.stringify({
        mismatches: globalPrecheck.summary?.mismatches,
        malformedRows: globalPrecheck.summary?.malformedRows,
        duplicateCheckNames: globalPrecheck.summary?.duplicateCheckNames,
      }),
      expected: JSON.stringify({ mismatches: 0, malformedRows: 0, duplicateCheckNames: 0 }),
    }),
    makeCheck({
      name: "sqlGuard.status",
      passed: sqlGuard.status === "passed",
      actual: sqlGuard.status,
      expected: "passed",
    }),
    makeCheck({
      name: "sqlGuard.failedChecks",
      passed: Number(sqlGuard.summary?.failedChecks ?? -1) === 0
        && sqlGuard.summary?.applyStatus === "passed"
        && sqlGuard.summary?.rollbackStatus === "passed",
      actual: JSON.stringify(sqlGuard.summary ?? {}),
      expected: JSON.stringify({ failedChecks: 0, applyStatus: "passed", rollbackStatus: "passed" }),
    }),
    makeCheck({
      name: "authorization.status",
      passed: authorization.status === "waiting_for_explicit_rollback_rehearsal_authorization",
      actual: authorization.status,
      expected: "waiting_for_explicit_rollback_rehearsal_authorization",
    }),
    makeCheck({
      name: "authorization.noWritesYet",
      passed: authorization.safety?.writesDatabase === false
        && authorization.safety?.executedRollbackRehearsal === false
        && authorization.safety?.productionSqlExecuted === false
        && authorization.safety?.commitStatementAuthorized === false,
      actual: JSON.stringify({
        writesDatabase: authorization.safety?.writesDatabase,
        executedRollbackRehearsal: authorization.safety?.executedRollbackRehearsal,
        productionSqlExecuted: authorization.safety?.productionSqlExecuted,
        commitStatementAuthorized: authorization.safety?.commitStatementAuthorized,
      }),
      expected: JSON.stringify({
        writesDatabase: false,
        executedRollbackRehearsal: false,
        productionSqlExecuted: false,
        commitStatementAuthorized: false,
      }),
    }),
    makeCheck({
      name: "rehearsal.realProductionTranscript",
      passed: !rehearsal || realRehearsal,
      actual: rehearsal ? JSON.stringify({ transcript: rehearsal.inputs?.transcript, realRehearsal }) : "not provided",
      expected: "not provided before authorization, or real captured transcript path after authorization",
      severity: rehearsal && !realRehearsal ? "soft_block_commit_only" : "observation",
      details: "Synthetic verifier validation must not be treated as a real production rehearsal.",
    }),
  ];

  if (rehearsal && realRehearsal) {
    checks.push(makeCheck({
      name: "rehearsal.status",
      passed: rehearsal.status === "passed",
      actual: rehearsal.status,
      expected: "passed",
    }));
    checks.push(makeCheck({
      name: "rehearsal.failedChecks",
      passed: Number(rehearsal.summary?.failedChecks ?? -1) === 0
        && rehearsal.summary?.afterRollbackPrecheckProvided === true,
      actual: JSON.stringify(rehearsal.summary ?? {}),
      expected: JSON.stringify({ failedChecks: 0, afterRollbackPrecheckProvided: true }),
    }));
  }

  const hardFailedChecks = checks.filter((check) => !check.passed && check.severity === "hard");
  const commitBlocks = checks.filter((check) => !check.passed
    && (check.severity === "hard" || check.severity === "soft_block_commit_only"));
  const canRequestRollbackRehearsalAuthorization = hardFailedChecks.length === 0
    && authorization.status === "waiting_for_explicit_rollback_rehearsal_authorization";
  const rollbackRehearsalVerified = Boolean(rehearsal && realRehearsal && rehearsal.status === "passed"
    && Number(rehearsal.summary?.failedChecks ?? -1) === 0);

  let status = "blocked";
  let nextAllowedAction = "fix_blocked_gate";
  if (hardFailedChecks.length === 0 && !rollbackRehearsalVerified) {
    status = "ready_for_explicit_rollback_rehearsal_authorization";
    nextAllowedAction = "request_user_authorization_for_rollback_rehearsal";
  }
  if (hardFailedChecks.length === 0 && rollbackRehearsalVerified) {
    status = "ready_for_commit_authorization_review";
    nextAllowedAction = "request_second_explicit_commit_authorization_after_review";
  }

  return {
    generatedAt: new Date().toISOString(),
    status,
    nextAllowedAction,
    scope: "weekly teamReports correction write gate aggregation",
    inputs: {
      globalPrecheck: args.globalPrecheck,
      sqlGuard: args.sqlGuard,
      rehearsalVerify: args.rehearsalVerify || null,
      authorization: args.authorization,
    },
    safety: {
      writesDatabase: false,
      readsDatabase: false,
      executesSql: false,
      parsesJsonArtifactsOnly: true,
      deploys: false,
      restarts: false,
      rollbackTagCreated: false,
      deploymentAllowed: false,
      commitAllowed: false,
    },
    decision: {
      canRequestRollbackRehearsalAuthorization,
      rollbackRehearsalVerified,
      canRequestCommitAuthorization: rollbackRehearsalVerified && commitBlocks.length === 0,
      commitAllowed: false,
      deploymentAllowed: false,
      reason: status === "blocked"
        ? "One or more hard gates are blocked."
        : "Safe to ask user for the next explicit authorization; no database write is authorized by this artifact.",
    },
    summary: {
      checks: checks.length,
      hardFailedChecks: hardFailedChecks.length,
      commitBlocks: commitBlocks.length,
      globalPrecheckStatus: globalPrecheck.status,
      sqlGuardStatus: sqlGuard.status,
      authorizationStatus: authorization.status,
      rehearsalStatus: rehearsal?.status ?? "not_provided",
      realRehearsal,
    },
    failedChecks: checks.filter((check) => !check.passed),
    checks,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Weekly teamReports correction write gate result");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Next allowed action: \`${report.nextAllowedAction}\``);
  lines.push("");
  lines.push("## Decision");
  lines.push("");
  lines.push("| Gate | Value |");
  lines.push("| --- | --- |");
  for (const [key, value] of Object.entries(report.decision)) {
    lines.push(`| ${key} | \`${value}\` |`);
  }
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | --- |");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`| ${key} | \`${value}\` |`);
  }
  lines.push("");
  if (report.failedChecks.length) {
    lines.push("## Failed Or Blocking Checks");
    lines.push("");
    lines.push("| Check | Severity | Actual | Expected |");
    lines.push("| --- | --- | --- | --- |");
    for (const check of report.failedChecks) {
      lines.push(`| \`${check.name}\` | \`${check.severity}\` | \`${check.actual}\` | \`${check.expected}\` |`);
    }
    lines.push("");
  }
  lines.push("## Safety");
  lines.push("");
  lines.push("- Reads JSON artifacts only.");
  lines.push("- Does not connect to the database.");
  lines.push("- Does not execute SQL.");
  lines.push("- Does not write database data.");
  lines.push("- Does not authorize COMMIT.");
  lines.push("- Keeps `deploymentAllowed=false`.");
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
    hardFailedChecks: report.summary.hardFailedChecks,
    commitAllowed: report.decision.commitAllowed,
    deploymentAllowed: report.decision.deploymentAllowed,
  }));
  if (report.status === "blocked") {
    process.exitCode = 2;
  }
}

main();
