#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    input: "",
    out: "",
    markdownOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--input" && next) {
      args.input = next;
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

  if (!args.input) {
    throw new Error("Missing --input. Use a TSV file path or '-' for stdin.");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/employee-data/database-100-global-precheck-verify.mjs \\
  --input output/employee-data-migration/2026-06-16/database-100-global-precheck.tsv \\
  --out output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.json \\
  --markdown-out output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.md

The input must be tab-separated rows from database-100-global-precheck.sql:
checkName<TAB>actualValue<TAB>expectedValue

Rows with expectedValue=NULL are observations. Every other row is a hard gate.`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function readInput(inputPath) {
  if (inputPath === "-") {
    return readFileSync(0, "utf8");
  }
  return readFileSync(inputPath, "utf8");
}

function normalizeCell(value) {
  return String(value ?? "").trim();
}

function parseRows(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .filter((line) => !line.startsWith("mysql: [Warning]"))
    .map((line, lineIndex) => {
      const cells = line.split("\t");
      if (cells.length < 3) {
        return {
          line: lineIndex + 1,
          checkName: cells[0] || "",
          actualValue: cells[1] || "",
          expectedValue: "",
          malformed: true,
          raw: line,
        };
      }
      return {
        line: lineIndex + 1,
        checkName: normalizeCell(cells[0]),
        actualValue: normalizeCell(cells[1]),
        expectedValue: normalizeCell(cells[2]),
        malformed: false,
        raw: line,
      };
    });
}

function buildReport(rows, inputPath) {
  const seen = new Set();
  const duplicateCheckNames = [];
  const malformedRows = rows.filter((row) => row.malformed || !row.checkName);
  const observations = [];
  const hardGates = [];
  const mismatches = [];

  for (const row of rows) {
    if (row.checkName) {
      if (seen.has(row.checkName)) duplicateCheckNames.push(row.checkName);
      seen.add(row.checkName);
    }
    if (row.malformed || !row.checkName) continue;
    if (row.expectedValue === "NULL") {
      observations.push(row);
      continue;
    }
    hardGates.push(row);
    if (row.actualValue !== row.expectedValue) {
      mismatches.push(row);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: mismatches.length || malformedRows.length || duplicateCheckNames.length
      ? "blocked"
      : "passed",
    input: inputPath,
    safety: {
      writesDatabase: false,
      readsDatabase: false,
      parsesPrecheckOutputOnly: true,
    },
    summary: {
      totalRows: rows.length,
      hardGates: hardGates.length,
      observations: observations.length,
      mismatches: mismatches.length,
      malformedRows: malformedRows.length,
      duplicateCheckNames: duplicateCheckNames.length,
    },
    mismatches: mismatches.map((row) => ({
      checkName: row.checkName,
      actualValue: row.actualValue,
      expectedValue: row.expectedValue,
      line: row.line,
    })),
    malformedRows: malformedRows.map((row) => ({
      line: row.line,
      raw: row.raw,
    })),
    duplicateCheckNames,
    observations: observations.map((row) => ({
      checkName: row.checkName,
      actualValue: row.actualValue,
      line: row.line,
    })),
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Database 100 global precheck verify result");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Status: \`${report.status}\``);
  lines.push(`Input: \`${report.input}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | ---: |");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push("");
  if (report.mismatches.length) {
    lines.push("## Mismatches");
    lines.push("");
    lines.push("| Check | Actual | Expected |");
    lines.push("| --- | --- | --- |");
    for (const mismatch of report.mismatches) {
      lines.push(`| \`${mismatch.checkName}\` | \`${mismatch.actualValue}\` | \`${mismatch.expectedValue}\` |`);
    }
    lines.push("");
  }
  if (report.observations.length) {
    lines.push("## Observations");
    lines.push("");
    lines.push("| Check | Actual |");
    lines.push("| --- | --- |");
    for (const observation of report.observations) {
      lines.push(`| \`${observation.checkName}\` | \`${observation.actualValue}\` |`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = parseRows(readInput(args.input));
  const report = buildReport(rows, args.input);

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
