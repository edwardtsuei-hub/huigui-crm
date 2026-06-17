#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const EXPECTED_PAYLOAD_GROUPS = new Map([
  ["api_db_first_bridge\tIMPORTED", "13"],
  ["legacy_weekly_workspace\tIMPORTED", "3"],
  ["legacy_weekly_workspace\tNEEDS_REVIEW", "3"],
]);

function parseArgs(argv) {
  const args = {
    input: "",
    plan: "",
    afterRollbackPrecheck: "",
    out: "",
    markdownOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--input" && next) {
      args.input = next;
      index += 1;
    } else if (arg === "--plan" && next) {
      args.plan = next;
      index += 1;
    } else if (arg === "--after-rollback-precheck" && next) {
      args.afterRollbackPrecheck = next;
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

  if (!args.input) throw new Error("Missing --input. Use a TSV file path or '-' for stdin.");
  if (!args.plan) throw new Error("Missing --plan.");
  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/employee-data/weekly-teamreports-correction-rehearsal-verify.mjs \\
  --input /tmp/weekly-teamreports-correction-apply-rehearsal.tsv \\
  --plan output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-draft.json \\
  --after-rollback-precheck /tmp/database-100-global-precheck-after-rehearsal.tsv \\
  --out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rehearsal-verify-result.json \\
  --markdown-out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rehearsal-verify-result.md

Input must be tab-separated mysql -N -B output captured from the ROLLBACK-only
apply rehearsal. This verifier only parses files. It does not connect to the
database and does not execute SQL.`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function readInput(inputPath) {
  if (inputPath === "-") return readFileSync(0, "utf8");
  return readFileSync(inputPath, "utf8");
}

function parseTsv(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .filter((line) => !line.startsWith("mysql: [Warning]"))
    .map((line, index) => ({
      line: index + 1,
      cells: line.split("\t").map((cell) => cell.trim()),
      raw: line,
    }));
}

function normalize(value) {
  return String(value ?? "").trim();
}

function findRows(rows, firstCell) {
  return rows.filter((row) => row.cells[0] === firstCell);
}

function lineRef(row) {
  return row ? row.line : null;
}

function makeCheck({ name, passed, actual, expected, line = null, details = "" }) {
  return {
    name,
    passed: Boolean(passed),
    actual: normalize(actual),
    expected: normalize(expected),
    line,
    details,
  };
}

function verifyShaRow({ rows, label, operation, expectedSha }) {
  const matches = findRows(rows, label);
  const row = matches[0];
  if (!row) {
    return makeCheck({
      name: label,
      passed: false,
      actual: "missing",
      expected: "present with matchesExpected=1",
    });
  }

  const [checkName, tableName, rowId, fieldName, currentSha256, expectedSha256, matchesExpected] = row.cells;
  const passed = matches.length === 1
    && checkName === label
    && tableName === operation.table
    && rowId === operation.id
    && fieldName === operation.field
    && currentSha256 === expectedSha
    && expectedSha256 === expectedSha
    && matchesExpected === "1";

  return makeCheck({
    name: label,
    passed,
    actual: JSON.stringify({
      rows: matches.length,
      tableName,
      rowId,
      fieldName,
      currentSha256,
      expectedSha256,
      matchesExpected,
    }),
    expected: JSON.stringify({
      rows: 1,
      tableName: operation.table,
      rowId: operation.id,
      fieldName: operation.field,
      currentSha256: expectedSha,
      expectedSha256: expectedSha,
      matchesExpected: "1",
    }),
    line: lineRef(row),
  });
}

function verifyAffectedRows({ rows, operation }) {
  const label = `apply ${operation.op} affectedRows`;
  const matches = findRows(rows, label);
  const row = matches[0];
  const affectedRows = row?.cells[1];
  return makeCheck({
    name: label,
    passed: matches.length === 1 && affectedRows === "1",
    actual: JSON.stringify({ rows: matches.length, affectedRows: affectedRows ?? "missing" }),
    expected: JSON.stringify({ rows: 1, affectedRows: "1" }),
    line: lineRef(row),
  });
}

function verifyOperations(rows, operations) {
  const checks = [];
  for (const operation of operations) {
    checks.push(verifyShaRow({
      rows,
      label: `apply precheck ${operation.op}`,
      operation,
      expectedSha: operation.beforeSha256,
    }));
    checks.push(verifyAffectedRows({ rows, operation }));
    checks.push(verifyShaRow({
      rows,
      label: `apply postcheck ${operation.op}`,
      operation,
      expectedSha: operation.afterSha256,
    }));
  }
  return checks;
}

function verifyPayloadLinks(rows, operations) {
  const reportIds = Array.from(new Set(operations.map((operation) => operation.reportId)));
  return reportIds.map((reportId) => {
    const matchingRows = rows.filter((row) => row.cells.length === 2 && row.cells[0] === reportId);
    const nonZeroRows = matchingRows.filter((row) => row.cells[1] !== "0");
    return makeCheck({
      name: `payloadLinks.${reportId}`,
      passed: matchingRows.length >= 2 && nonZeroRows.length === 0,
      actual: JSON.stringify({
        rows: matchingRows.length,
        values: matchingRows.map((row) => row.cells[1]),
      }),
      expected: "at least two gate rows, all 0",
      line: lineRef(matchingRows[0]),
    });
  });
}

function verifyPayloadGroups(rows) {
  const checks = [];
  for (const [groupKey, expectedCount] of EXPECTED_PAYLOAD_GROUPS.entries()) {
    const [source, migrationStatus] = groupKey.split("\t");
    const matches = rows.filter((row) => row.cells.length === 3
      && row.cells[0] === source
      && row.cells[1] === migrationStatus);
    const wrongRows = matches.filter((row) => row.cells[2] !== expectedCount);
    checks.push(makeCheck({
      name: `payloadGroup.${source}.${migrationStatus}`,
      passed: matches.length >= 2 && wrongRows.length === 0,
      actual: JSON.stringify({
        rows: matches.length,
        values: matches.map((row) => row.cells[2]),
      }),
      expected: `at least two gate rows, all ${expectedCount}`,
      line: lineRef(matches[0]),
    }));
  }
  return checks;
}

function verifySharedScalarGates(rows) {
  const oneColumn13Rows = rows.filter((row) => row.cells.length === 1 && row.cells[0] === "13");
  return [
    makeCheck({
      name: "sharedSharedDraftAndDistinctSha16.scalarRows",
      passed: oneColumn13Rows.length >= 4,
      actual: oneColumn13Rows.length,
      expected: "at least 4 one-column rows with value 13",
      line: lineRef(oneColumn13Rows[0]),
      details: "The apply draft emits shared/shared draft count and distinct sourceSha16 before and after draft updates.",
    }),
  ];
}

function verifyAfterRollbackPrecheck(filePath) {
  if (!filePath) {
    return {
      provided: false,
      checks: [
        makeCheck({
          name: "afterRollbackPrecheck.provided",
          passed: false,
          actual: "missing",
          expected: "provided",
          details: "Required before approving any real COMMIT window.",
        }),
      ],
      summary: {
        rows: 0,
        hardGates: 0,
        mismatches: 1,
      },
    };
  }

  const rows = parseTsv(readInput(filePath));
  const checks = [];
  let hardGates = 0;
  for (const row of rows) {
    const [checkName, actualValue, expectedValue] = row.cells;
    if (!checkName || expectedValue === "NULL") continue;
    hardGates += 1;
    checks.push(makeCheck({
      name: `afterRollbackPrecheck.${checkName}`,
      passed: actualValue === expectedValue,
      actual: actualValue,
      expected: expectedValue,
      line: row.line,
    }));
  }

  return {
    provided: true,
    input: filePath,
    checks,
    summary: {
      rows: rows.length,
      hardGates,
      mismatches: checks.filter((check) => !check.passed).length,
    },
  };
}

function buildReport(args) {
  const plan = JSON.parse(readFileSync(args.plan, "utf8"));
  const operations = plan.operations || [];
  const transcriptRows = parseTsv(readInput(args.input));
  const operationChecks = verifyOperations(transcriptRows, operations);
  const payloadLinkChecks = verifyPayloadLinks(transcriptRows, operations);
  const payloadGroupChecks = verifyPayloadGroups(transcriptRows);
  const sharedScalarChecks = verifySharedScalarGates(transcriptRows);
  const afterRollbackPrecheck = verifyAfterRollbackPrecheck(args.afterRollbackPrecheck);
  const checks = [
    ...operationChecks,
    ...payloadLinkChecks,
    ...payloadGroupChecks,
    ...sharedScalarChecks,
    ...afterRollbackPrecheck.checks,
  ];
  const failedChecks = checks.filter((check) => !check.passed);

  return {
    generatedAt: new Date().toISOString(),
    status: failedChecks.length ? "blocked" : "passed",
    scope: "weekly teamReports correction ROLLBACK rehearsal output verifier",
    inputs: {
      transcript: args.input,
      plan: args.plan,
      afterRollbackPrecheck: args.afterRollbackPrecheck || null,
    },
    safety: {
      writesDatabase: false,
      readsDatabase: false,
      executesSql: false,
      parsesCapturedOutputOnly: true,
      deploys: false,
      restarts: false,
    },
    summary: {
      transcriptRows: transcriptRows.length,
      expectedOperations: operations.length,
      operationChecks: operationChecks.length,
      payloadLinkChecks: payloadLinkChecks.length,
      payloadGroupChecks: payloadGroupChecks.length,
      sharedScalarChecks: sharedScalarChecks.length,
      afterRollbackPrecheckProvided: afterRollbackPrecheck.provided,
      afterRollbackPrecheckHardGates: afterRollbackPrecheck.summary.hardGates,
      failedChecks: failedChecks.length,
    },
    failedChecks,
    checks,
    afterRollbackPrecheck: {
      provided: afterRollbackPrecheck.provided,
      input: afterRollbackPrecheck.input || null,
      summary: afterRollbackPrecheck.summary,
    },
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Weekly teamReports correction rehearsal verify result");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("- Parses captured output only.");
  lines.push("- Does not connect to the database.");
  lines.push("- Does not execute SQL.");
  lines.push("- Does not write database data.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | ---: |");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push("");
  if (report.failedChecks.length) {
    lines.push("## Failed Checks");
    lines.push("");
    lines.push("| Check | Actual | Expected |");
    lines.push("| --- | --- | --- |");
    for (const check of report.failedChecks) {
      lines.push(`| \`${check.name}\` | \`${check.actual}\` | \`${check.expected}\` |`);
    }
    lines.push("");
  }
  lines.push("## Required Pass Criteria");
  lines.push("");
  lines.push("- 10 apply precheck rows match before SHA.");
  lines.push("- 10 affectedRows rows equal 1.");
  lines.push("- 10 apply postcheck rows match after SHA.");
  lines.push("- Target WeeklyReportPayload direct links remain 0 before and after draft updates.");
  lines.push("- WeeklyReportPayload group counts remain 13 / 3 / 3.");
  lines.push("- shared/shared draft and distinct sourceSha16 scalar gates remain 13.");
  lines.push("- After rollback, every hard gate in database-100 global precheck still matches expected.");
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

  console.log(JSON.stringify(report.summary));
  if (report.status !== "passed") {
    process.exitCode = 2;
  }
}

main();
