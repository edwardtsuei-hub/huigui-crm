#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_EXPECTED = {
  apply: {
    label: "apply",
    shaField: "beforeSha256",
    expectedUpdatesKey: "applyUpdateStatements",
  },
  rollback: {
    label: "rollback",
    shaField: "afterSha256",
    expectedUpdatesKey: "rollbackUpdateStatements",
  },
};

const ALLOWED_UPDATE_TABLES = new Set([
  "WeeklyReport",
  "WeeklyReportPlanItem",
  "WeeklyReportReviewItem",
]);

const FORBIDDEN_EXECUTABLE_KEYWORDS = [
  "ALTER",
  "CALL",
  "COMMIT",
  "CREATE",
  "DELETE",
  "DROP",
  "GRANT",
  "INSERT",
  "LOAD",
  "REPLACE",
  "REVOKE",
  "TRUNCATE",
];

function parseArgs(argv) {
  const args = {
    applySql: "",
    rollbackSql: "",
    plan: "",
    out: "",
    markdownOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--apply-sql" && next) {
      args.applySql = next;
      index += 1;
    } else if (arg === "--rollback-sql" && next) {
      args.rollbackSql = next;
      index += 1;
    } else if (arg === "--plan" && next) {
      args.plan = next;
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

  for (const [key, value] of Object.entries({
    "--apply-sql": args.applySql,
    "--rollback-sql": args.rollbackSql,
    "--plan": args.plan,
  })) {
    if (!value) throw new Error(`Missing ${key}.`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/employee-data/weekly-teamreports-correction-sql-guard.mjs \\
  --apply-sql output/employee-data-migration/2026-06-16/weekly-teamreports-correction-apply-draft.sql \\
  --rollback-sql output/employee-data-migration/2026-06-16/weekly-teamreports-correction-rollback-draft.sql \\
  --plan output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-draft.json \\
  --out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.json \\
  --markdown-out output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.md

This is a static guard only. It reads local SQL drafts and the machine-readable
plan, but it does not connect to the database or execute SQL.`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function stripLineComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

function getExecutableStatements(sql) {
  return stripLineComments(sql)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function countRegex(text, pattern) {
  return Array.from(text.matchAll(pattern)).length;
}

function findForbiddenStatements(statements) {
  const forbidden = [];
  for (const statement of statements) {
    const firstKeyword = statement.match(/^\s*([a-z]+)/i)?.[1]?.toUpperCase();
    if (firstKeyword && FORBIDDEN_EXECUTABLE_KEYWORDS.includes(firstKeyword)) {
      forbidden.push(firstKeyword);
    }
  }
  return forbidden;
}

function unique(values) {
  return Array.from(new Set(values));
}

function getUpdateTables(statements) {
  return statements
    .map((statement) => statement.match(/^\s*UPDATE\s+`([^`]+)`/i)?.[1])
    .filter(Boolean);
}

function getOperationBlock(sql, mode, op) {
  const startMarker = `-- ${mode} ${op}:`;
  const endMarker = `SELECT '${mode} ${op} affectedRows'`;
  const start = sql.indexOf(startMarker);
  const end = sql.indexOf(endMarker, start);
  if (start === -1 || end === -1) return "";
  return sql.slice(start, end);
}

function includesAll(text, snippets) {
  return snippets.every((snippet) => text.includes(snippet));
}

function analyzeOperation({ sql, mode, operation, shaField }) {
  const block = getOperationBlock(sql, mode, operation.op);
  const requiredSnippets = [
    `UPDATE \`${operation.table}\``,
    `SET \`${operation.field}\``,
    `WHERE id = '${operation.id}'`,
    `SHA2(COALESCE(\`${operation.field}\`, ''), 256) = '${operation[shaField]}'`,
    `NOT EXISTS (SELECT 1 FROM \`WeeklyReportPayload\` p WHERE p.weeklyReportId = '${operation.reportId}')`,
  ];

  if (operation.table !== "WeeklyReport") {
    requiredSnippets.push(`AND reportId = '${operation.reportId}'`);
  }

  return {
    op: operation.op,
    table: operation.table,
    id: operation.id,
    reportId: operation.reportId,
    field: operation.field,
    expectedShaField: shaField,
    blockFound: Boolean(block),
    guardComplete: Boolean(block) && includesAll(block, requiredSnippets),
    missingSnippets: requiredSnippets.filter((snippet) => !block.includes(snippet)),
  };
}

function analyzeDraft({ mode, sqlPath, sql, plan }) {
  const config = DEFAULT_EXPECTED[mode];
  const statements = getExecutableStatements(sql);
  const updateTables = getUpdateTables(statements);
  const forbiddenStatements = findForbiddenStatements(statements);
  const disallowedUpdateTables = unique(updateTables.filter((table) => !ALLOWED_UPDATE_TABLES.has(table)));
  const operations = plan.operations || [];
  const operationChecks = operations.map((operation) => analyzeOperation({
    sql,
    mode: config.label,
    operation,
    shaField: config.shaField,
  }));

  const finalStatement = statements.at(-1)?.replace(/\s+/g, " ").toUpperCase() || "";
  const counts = {
    statements: statements.length,
    startTransaction: countRegex(stripLineComments(sql), /\bSTART\s+TRANSACTION\b/gi),
    rollback: countRegex(stripLineComments(sql), /^\s*ROLLBACK\b/gim),
    commit: countRegex(stripLineComments(sql), /^\s*COMMIT\b/gim),
    update: updateTables.length,
    rowCountSelects: countRegex(sql, new RegExp(`SELECT '${config.label} op\\d{2} affectedRows'`, "g")),
    precheckSelects: countRegex(sql, new RegExp(`'${config.label} precheck op\\d{2}'`, "g")),
    postcheckSelects: countRegex(sql, new RegExp(`'${config.label} postcheck op\\d{2}'`, "g")),
    payloadLinkGuards: countRegex(sql, /NOT EXISTS \(SELECT 1 FROM `WeeklyReportPayload` p WHERE p\.weeklyReportId = '/g),
    shaGuards: countRegex(sql, /SHA2\(COALESCE\(`[^`]+`, ''\), 256\) = '[0-9a-f]{64}'/g),
    childReportIdGuards: countRegex(sql, /^\s+AND reportId = '/gm),
  };

  const expectedUpdates = plan.summary?.[config.expectedUpdatesKey] ?? operations.length;
  const childOperationCount = operations.filter((operation) => operation.table !== "WeeklyReport").length;
  const checks = [
    {
      name: "final_statement_is_rollback",
      passed: finalStatement === "ROLLBACK",
      actual: finalStatement,
      expected: "ROLLBACK",
    },
    {
      name: "single_transaction_start",
      passed: counts.startTransaction === 1,
      actual: counts.startTransaction,
      expected: 1,
    },
    {
      name: "single_rollback_statement",
      passed: counts.rollback === 1,
      actual: counts.rollback,
      expected: 1,
    },
    {
      name: "no_commit_statement",
      passed: counts.commit === 0 && !forbiddenStatements.includes("COMMIT"),
      actual: counts.commit,
      expected: 0,
    },
    {
      name: "only_expected_update_count",
      passed: counts.update === expectedUpdates,
      actual: counts.update,
      expected: expectedUpdates,
    },
    {
      name: "only_allowed_update_tables",
      passed: disallowedUpdateTables.length === 0,
      actual: disallowedUpdateTables.join(",") || "none",
      expected: Array.from(ALLOWED_UPDATE_TABLES).join(","),
    },
    {
      name: "no_forbidden_executable_statements",
      passed: forbiddenStatements.length === 0,
      actual: forbiddenStatements.join(",") || "none",
      expected: "none",
    },
    {
      name: "row_count_select_for_each_update",
      passed: counts.rowCountSelects === expectedUpdates,
      actual: counts.rowCountSelects,
      expected: expectedUpdates,
    },
    {
      name: "precheck_select_for_each_update",
      passed: counts.precheckSelects === expectedUpdates,
      actual: counts.precheckSelects,
      expected: expectedUpdates,
    },
    {
      name: "postcheck_select_for_each_update",
      passed: counts.postcheckSelects === expectedUpdates,
      actual: counts.postcheckSelects,
      expected: expectedUpdates,
    },
    {
      name: "payload_link_guard_for_each_update",
      passed: counts.payloadLinkGuards === expectedUpdates,
      actual: counts.payloadLinkGuards,
      expected: expectedUpdates,
    },
    {
      name: "sha_guard_and_prepost_count",
      passed: counts.shaGuards === expectedUpdates * 3,
      actual: counts.shaGuards,
      expected: expectedUpdates * 3,
    },
    {
      name: "child_report_id_guard_count",
      passed: counts.childReportIdGuards === childOperationCount,
      actual: counts.childReportIdGuards,
      expected: childOperationCount,
    },
    {
      name: "all_operation_guards_complete",
      passed: operationChecks.every((check) => check.guardComplete),
      actual: operationChecks.filter((check) => !check.guardComplete).map((check) => check.op).join(",") || "all_complete",
      expected: "all_complete",
    },
  ];

  return {
    mode,
    sqlPath,
    status: checks.every((check) => check.passed) ? "passed" : "blocked",
    counts,
    forbiddenStatements,
    disallowedUpdateTables,
    checks,
    operationChecks,
  };
}

function buildReport(args) {
  const plan = JSON.parse(readFileSync(args.plan, "utf8"));
  const applySql = readFileSync(args.applySql, "utf8");
  const rollbackSql = readFileSync(args.rollbackSql, "utf8");
  const drafts = [
    analyzeDraft({ mode: "apply", sqlPath: args.applySql, sql: applySql, plan }),
    analyzeDraft({ mode: "rollback", sqlPath: args.rollbackSql, sql: rollbackSql, plan }),
  ];
  const failedChecks = drafts.flatMap((draft) => draft.checks
    .filter((check) => !check.passed)
    .map((check) => ({
      mode: draft.mode,
      ...check,
    })));

  return {
    generatedAt: new Date().toISOString(),
    status: failedChecks.length ? "blocked" : "passed",
    scope: "weekly teamReports correction SQL static guard",
    inputs: {
      applySql: args.applySql,
      rollbackSql: args.rollbackSql,
      plan: args.plan,
    },
    safety: {
      writesDatabase: false,
      readsDatabase: false,
      executesSql: false,
      parsesLocalSqlDraftsOnly: true,
      deploys: false,
      restarts: false,
    },
    summary: {
      draftsChecked: drafts.length,
      failedChecks: failedChecks.length,
      applyStatus: drafts.find((draft) => draft.mode === "apply")?.status,
      rollbackStatus: drafts.find((draft) => draft.mode === "rollback")?.status,
    },
    failedChecks,
    drafts,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Weekly teamReports correction SQL guard result");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("- Static local file analysis only.");
  lines.push("- Does not connect to the database.");
  lines.push("- Does not execute SQL.");
  lines.push("- Does not write database data.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | --- |");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`| ${key} | \`${value}\` |`);
  }
  lines.push("");
  for (const draft of report.drafts) {
    lines.push(`## ${draft.mode} draft`);
    lines.push("");
    lines.push(`SQL: \`${draft.sqlPath}\``);
    lines.push(`Status: \`${draft.status}\``);
    lines.push("");
    lines.push("| Check | Actual | Expected | Status |");
    lines.push("| --- | --- | --- | --- |");
    for (const check of draft.checks) {
      lines.push(`| \`${check.name}\` | \`${check.actual}\` | \`${check.expected}\` | \`${check.passed ? "passed" : "blocked"}\` |`);
    }
    lines.push("");
  }
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
