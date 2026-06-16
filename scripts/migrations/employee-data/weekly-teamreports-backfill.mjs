#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REAL_PARTITION_KEY = "REAL";
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const SCRIPT_STATUS = "safe_dry_run_only";

const TARGET_NAMES = new Map([
  ["lisa", "lisali"],
  ["Lisa", "lisali"],
  ["Lisa Li", "lisali"],
  ["阿蕊", "Han"],
  ["彦蕊", "Han"],
  ["申琦", "greatchef"],
  ["程程", "ChengCheng"],
]);

const TEAM_MANAGER_BY_LOGIN = new Map([
  ["Han", "lisali"],
  ["greatchef", "lisali"],
]);

const SOURCE_PRIORITY = new Map([
  ["fbfa90f2cb747790bfbd57e4af6752df.json", 3],
  ["b0a1a524b401e3b032dd1967fc750e4e.json", 2],
  ["a4d26868017c0ccffe2efe50944ef421.json", 1],
]);

function parseArgs(argv) {
  const args = {
    weeklyDir: "/opt/huigui-crm/storage/uploads/employee-launch-weekly",
    usersTsv: "",
    weeklyDbTsv: "",
    out: "",
    markdownOut: "",
    sqlOut: "",
    databaseUrl: "",
    readDb: false,
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
    } else if (arg === "--database-url" && next) {
      args.databaseUrl = next;
      index += 1;
    } else if (arg === "--read-db") {
      args.readDb = true;
    } else if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--confirm" && next) {
      args.confirm = next;
      index += 1;
    } else if (arg === "--no-write") {
      // Compatibility flag. This script never writes database data.
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (args.apply) {
    throw new Error("--apply is disabled. This script is a safe dry-run/precheck tool only.");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
node weekly-teamreports-backfill.mjs \\
  --weekly-dir /opt/huigui-crm/storage/uploads/employee-launch-weekly \\
  --users-tsv output/employee-data-migration/2026-06-16/users.tsv \\
  --weekly-db-tsv output/employee-data-migration/2026-06-16/weekly-db.tsv \\
  --out output/employee-data-migration/2026-06-16/weekly-teamreports-backfill-dryrun-v2.json \\
  --markdown-out output/employee-data-migration/2026-06-16/weekly-teamreports-backfill-dryrun-v2.md \\
  --sql-out output/employee-data-migration/2026-06-16/weekly-teamreports-backfill-dryrun-v2.precheck.sql \\
  --no-write

Optional read-only DB precheck:
node weekly-teamreports-backfill.mjs --read-db --database-url mysql://...

Apply:
disabled; this tool must not write database rows.`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const entries = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const delimiterIndex = line.indexOf("=");
    if (delimiterIndex === -1) continue;
    let value = line.slice(delimiterIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[line.slice(0, delimiterIndex).trim()] = value;
  }
  return entries;
}

function resolveDatabaseUrl(explicit) {
  if (explicit) return explicit;
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  const env = {
    ...parseEnvFile(path.resolve(process.cwd(), ".env")),
    ...parseEnvFile(path.resolve(process.cwd(), "apps/api/.env")),
  };
  return env.DATABASE_URL?.trim() ?? "";
}

function parseTsv(filePath, columns) {
  if (!filePath || !existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length >= columns.length)
    .filter((parts) => parts[0] !== columns[0])
    .map((parts) => Object.fromEntries(columns.map((column, index) => [column, parts[index] ?? ""])));
}

function loadUsersFromTsv(filePath) {
  return parseTsv(filePath, [
    "id",
    "loginAccount",
    "name",
    "wecomUserId",
    "wecomName",
    "department",
    "roleCode",
    "dataScope",
  ]);
}

function loadWeeklyReportsFromTsv(filePath) {
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

function sha16(buffer) {
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}

function deterministicId(prefix, input, size = 24) {
  return `${prefix}_${createHash("sha1").update(input).digest("hex").slice(0, size)}`;
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

function compactText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function shanghaiDateParts(date) {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function utcDateFromShanghaiParts(year, month, day, hour = 0, minute = 0, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second, 0));
}

function addShanghaiDays(parts, days) {
  const utc = utcDateFromShanghaiParts(parts.year, parts.month, parts.day + days);
  return shanghaiDateParts(utc);
}

function startOfWeekShanghai(date) {
  const parts = shanghaiDateParts(date);
  const diff = parts.weekday === 0 ? -6 : 1 - parts.weekday;
  const start = addShanghaiDays(parts, diff);
  return {
    parts: start,
    date: utcDateFromShanghaiParts(start.year, start.month, start.day),
  };
}

function endOfWeekShanghai(weekStartDate) {
  const start = shanghaiDateParts(weekStartDate);
  const end = addShanghaiDays(start, 6);
  return utcDateFromShanghaiParts(end.year, end.month, end.day);
}

function monthWeekNumber(weekStartDate) {
  const weekStart = shanghaiDateParts(weekStartDate);
  const firstDay = { year: weekStart.year, month: weekStart.month, day: 1 };
  const firstDayDate = utcDateFromShanghaiParts(firstDay.year, firstDay.month, firstDay.day);
  const firstWeek = startOfWeekShanghai(firstDayDate).date;
  return Math.floor((weekStartDate.getTime() - firstWeek.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function formatShanghaiDate(date) {
  const parts = shanghaiDateParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function formatShanghaiMinute(date) {
  const parts = shanghaiDateParts(date);
  return `${formatShanghaiDate(date)} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function normalizeWeekStartKey(value) {
  if (!value) return "";
  if (value instanceof Date) return formatShanghaiDate(value);
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : formatShanghaiDate(date);
}

function normalizeName(rawName) {
  const value = compactText(rawName);
  if (value.toLowerCase() === "lisa") return "lisa";
  return value;
}

function isSkippableText(value) {
  const text = compactText(value).toLowerCase();
  if (!text) return true;
  return [
    "submit smoke",
    "smoke restored",
    "测试测试测试",
    "server browser acceptance",
    "当前可进入主管点评",
    "当前这份",
    "当前仍需补齐",
    "备用金和采购申请流程试用",
    "分润规则试用反馈",
    "课程分润与学员退款例外",
  ].some((token) => text.includes(token.toLowerCase()));
}

function stripSummaryPrefix(text, name) {
  let result = compactText(text);
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  result = result.replace(
    new RegExp(`^${escapedName}\\s*已提交[^：:]*周报[：:]?\\s*`, "i"),
    "",
  );
  return compactText(result);
}

function sectionBetween(text, startLabel, endLabels) {
  const start = text.indexOf(startLabel);
  if (start === -1) return "";
  const from = start + startLabel.length;
  let to = text.length;
  for (const label of endLabels) {
    const index = text.indexOf(label, from);
    if (index !== -1) to = Math.min(to, index);
  }
  return compactText(text.slice(from, to));
}

function extractSubmissionFromDescription(description) {
  const text = compactText(description);
  return {
    reportScope: sectionBetween(text, "周报范围：", ["\n当前状态：", "\n本周完成："]),
    completedSummary: sectionBetween(text, "本周完成：", ["\n下周计划：", "\n需要配合："]),
    focusSummary: sectionBetween(text, "下周计划：", ["\n需要配合："]),
    supportRequest: sectionBetween(text, "需要配合：", []),
  };
}

function listText(value) {
  if (!Array.isArray(value)) return "";
  return compactText(value.map((item) => compactText(item)).filter(Boolean).join("\n"));
}

function submittedAtFromLog(log, fallback) {
  if (typeof log?.timestamp === "number" && Number.isFinite(log.timestamp)) {
    return new Date(log.timestamp);
  }
  const fallbackDate = fallback ? new Date(fallback) : new Date();
  if (Number.isNaN(fallbackDate.getTime())) return new Date();
  return fallbackDate;
}

function buildEntryFromReport(report, source, sourceFileName, sourceSha16) {
  const sourceUserKey = String(source.userKey ?? "");
  if (sourceUserKey === "shared" || /\.shared$/i.test(sourceUserKey)) {
    return null;
  }

  const name = normalizeName(report.name);
  const loginAccount = TARGET_NAMES.get(name);
  if (!loginAccount || report.status !== "已提交") return null;

  const completedSummary = stripSummaryPrefix(report.summary, name);
  if (isSkippableText(completedSummary)) return null;

  const submittedAt = submittedAtFromLog(
    { timestamp: findMatchingSubmissionLog(report)?.timestamp },
    source.savedAt,
  );
  const focusSummary = listText(report.nextPlans);
  const supportRequest = compactText(report.supportRequest || report.blockerDetail);

  return makeEntry({
    sourceFileName,
    sourceSha16,
    sourcePriority: SOURCE_PRIORITY.get(sourceFileName) ?? 0,
    name,
    loginAccount,
    reportScope: compactText(report.reportScope),
    completedSummary,
    focusSummary,
    supportRequest,
    submittedAt,
    managerReviewComment: usefulManagerComment(report),
  });
}

function findMatchingSubmissionLog(report) {
  const history = Array.isArray(report.reviewHistory) ? report.reviewHistory : [];
  const currentSummary = stripSummaryPrefix(report.summary, normalizeName(report.name));
  return history.find((log) => {
    if (log?.title !== "成员提交周报") return false;
    const parsed = extractSubmissionFromDescription(log.description ?? "");
    return compactText(parsed.completedSummary) === compactText(currentSummary);
  });
}

function usefulManagerComment(report) {
  const comment = compactText(report.lastComment || report.managerDraft);
  if (!comment || comment === "等待反馈。" || comment === "已收到周报，待反馈。") {
    return "";
  }
  return comment;
}

function buildEntryFromLog(log, report, sourceFileName, sourceSha16) {
  if (log?.title !== "成员提交周报") return null;
  const name = normalizeName(report.name);
  const loginAccount = TARGET_NAMES.get(name);
  if (!loginAccount) return null;
  const parsed = extractSubmissionFromDescription(log.description ?? "");
  const completedSummary = parsed.completedSummary;
  if (isSkippableText(completedSummary)) return null;

  return makeEntry({
    sourceFileName,
    sourceSha16,
    sourcePriority: SOURCE_PRIORITY.get(sourceFileName) ?? 0,
    name,
    loginAccount,
    reportScope: parsed.reportScope || report.reportScope,
    completedSummary,
    focusSummary: parsed.focusSummary,
    supportRequest: parsed.supportRequest,
    submittedAt: submittedAtFromLog(log),
    managerReviewComment: usefulManagerComment(report),
  });
}

function makeEntry(input) {
  const { date: weekStartDate, parts } = startOfWeekShanghai(input.submittedAt);
  const weekEndDate = endOfWeekShanghai(weekStartDate);
  const weekStartKey = formatShanghaiDate(weekStartDate);
  const fingerprint = [
    input.loginAccount,
    weekStartKey,
    input.submittedAt.toISOString(),
    input.completedSummary,
    input.focusSummary,
  ].join("|");

  return {
    id: deterministicId("wtr", fingerprint),
    name: input.name,
    loginAccount: input.loginAccount,
    sourceFileName: input.sourceFileName,
    sourceSha16: input.sourceSha16,
    sourcePriority: input.sourcePriority,
    reportScope: compactText(input.reportScope),
    completedSummary: compactText(input.completedSummary),
    focusSummary: compactText(input.focusSummary),
    supportRequest: compactText(input.supportRequest),
    managerReviewComment: compactText(input.managerReviewComment),
    submittedAt: input.submittedAt,
    submittedAtLabel: formatShanghaiMinute(input.submittedAt),
    weekStartDate,
    weekEndDate,
    weekStartKey,
    weekEndKey: formatShanghaiDate(weekEndDate),
    year: parts.year,
    month: parts.month,
    weekNumber: monthWeekNumber(weekStartDate),
    qualityScore: qualityScore(input),
  };
}

function qualityScore(input) {
  return [
    input.sourcePriority * 100,
    compactText(input.completedSummary).includes("...") ? -10 : 0,
    compactText(input.focusSummary).includes("...") ? -10 : 0,
    Math.min(compactText(input.completedSummary).length, 200),
    Math.min(compactText(input.focusSummary).length, 120),
  ].reduce((sum, item) => sum + item, 0);
}

function readSourceFiles(weeklyDir) {
  return readdirSync(weeklyDir)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => (SOURCE_PRIORITY.get(right) ?? 0) - (SOURCE_PRIORITY.get(left) ?? 0) || left.localeCompare(right))
    .map((name) => {
      const filePath = path.join(weeklyDir, name);
      const raw = readFileSync(filePath);
      return {
        filePath,
        fileName: name,
        sha16: sha16(raw),
        json: JSON.parse(raw.toString("utf8")),
      };
    });
}

function buildEntries(weeklyDir) {
  const entries = [];
  for (const source of readSourceFiles(weeklyDir)) {
    const reports = Array.isArray(source.json.teamReports) ? source.json.teamReports : [];
    for (const report of reports) {
      if (!isObject(report)) continue;
      const current = buildEntryFromReport(report, source.json, source.fileName, source.sha16);
      if (current) entries.push(current);
      const history = Array.isArray(report.reviewHistory) ? report.reviewHistory : [];
      for (const log of history) {
        const entry = buildEntryFromLog(log, report, source.fileName, source.sha16);
        if (entry) entries.push(entry);
      }
    }
  }
  return dedupeEntries(entries);
}

function dedupeEntries(entries) {
  const bySubmission = new Map();
  for (const entry of entries) {
    const key = [
      entry.loginAccount,
      entry.weekStartKey,
      entry.submittedAtLabel,
      entry.completedSummary,
    ].join("|");
    const existing = bySubmission.get(key);
    if (!existing || entry.qualityScore > existing.qualityScore) {
      bySubmission.set(key, entry);
    }
  }

  const byWeek = new Map();
  for (const entry of bySubmission.values()) {
    const key = `${entry.loginAccount}|${entry.weekStartKey}`;
    const existing = byWeek.get(key);
    if (!existing) {
      byWeek.set(key, entry);
      continue;
    }

    if (
      entry.submittedAt.getTime() > existing.submittedAt.getTime() ||
      (entry.submittedAt.getTime() === existing.submittedAt.getTime() &&
        entry.qualityScore > existing.qualityScore)
    ) {
      byWeek.set(key, mergeSuperseded(entry, existing));
    } else {
      byWeek.set(key, mergeSuperseded(existing, entry));
    }
  }

  return Array.from(byWeek.values()).sort(
    (left, right) =>
      left.weekStartDate.getTime() - right.weekStartDate.getTime() ||
      left.name.localeCompare(right.name, "zh-Hans-CN"),
  );
}

function mergeSuperseded(primary, older) {
  if (!older || older.completedSummary === primary.completedSummary) return primary;
  const note = [
    primary.completedSummary,
    "",
    `同周较早提交（${older.submittedAtLabel}）：`,
    older.completedSummary,
    older.focusSummary ? `下周计划：${older.focusSummary}` : "",
  ].filter(Boolean).join("\n");
  return {
    ...primary,
    completedSummary: compactText(note),
  };
}

function renderPrecheckSql(plan) {
  const logins = [...new Set(plan.entries.map((entry) => entry.loginAccount))];
  const weekKeys = [...new Set(plan.entries.map((entry) => entry.weekStartKey))];
  const lines = [
    "-- Weekly teamReports safe dry-run precheck only.",
    "-- This file intentionally contains no INSERT, UPDATE, DELETE, COMMIT, or transaction.",
    "-- Do not turn this into production SQL without A/D review and user approval.",
    "",
    "SELECT id, loginAccount, name, managerUserId, dataScope, status",
    "FROM `User`",
    `WHERE loginAccount IN (${logins.map(mysqlString).join(", ")});`,
    "",
    "SELECT wr.id, u.loginAccount, wr.weekStartDate, wr.partitionKey, wr.status, wr.updatedAt",
    "FROM `WeeklyReport` wr",
    "JOIN `User` u ON u.id = wr.userId",
    `WHERE u.loginAccount IN (${logins.map(mysqlString).join(", ")})`,
    `  AND DATE(DATE_ADD(wr.weekStartDate, INTERVAL 8 HOUR)) IN (${weekKeys.map(mysqlString).join(", ")})`,
    `  AND wr.partitionKey = ${mysqlString(REAL_PARTITION_KEY)}`,
    "ORDER BY wr.weekStartDate ASC, u.loginAccount ASC;",
    "",
    "-- Required stop points before any future write plan:",
    "-- 1. Existing WeeklyReport rows must use their real id for child rows.",
    "-- 2. User.managerUserId changes must be approved separately.",
    "-- 3. Child table replacement must not delete user-edited content without backup.",
  ];
  return `${lines.join("\n")}\n`;
}

function buildMarkdown(plan) {
  const lines = [
    "# Weekly teamReports safe dry-run v2",
    "",
    `Source dir: \`${plan.sourceDir}\``,
    `Generated at: ${plan.generatedAt}`,
    `Status: \`${plan.status}\``,
    "",
    "## Summary",
    "",
    `- Candidate real weekly reports: ${plan.summary.entries}`,
    `- Missing users: ${plan.summary.missingUsers}`,
    `- Existing real weekly reports: ${plan.summary.existingWeeklyReports}`,
    `- New report candidates: ${plan.summary.newReportCandidates}`,
    `- Could be historical formal candidates after review: ${plan.summary.couldBeHistoricalFormalCandidates}`,
    `- Approved for automatic import: ${plan.summary.approvedForAutomaticImport}`,
    `- Entries with legacy ellipsis: ${plan.summary.entriesWithTruncatedText}`,
    `- Entries with superseded same-week submission context: ${plan.summary.entriesWithSupersededSubmission}`,
    `- Manager relation updates requested by source mapping: ${plan.summary.managerRelationUpdates}`,
    `- Safe to apply: ${plan.safety.safeToApply}`,
    `- Production SQL generated: ${plan.safety.productionSqlGenerated}`,
    "",
    "## Risk gates",
    "",
    "| gate | severity | status | note |",
    "| --- | --- | --- | --- |",
  ];

  for (const risk of plan.risks) {
    lines.push(`| ${risk.gate} | ${risk.severity} | ${risk.status} | ${risk.note} |`);
  }

  lines.push(
    "",
    "## Entries",
    "",
    "| owner | week | submittedAt | action | candidate review | flags | existing report | proposed id | source | completed | plan |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );

  for (const entry of plan.entries) {
    const flags = [
      entry.candidateReview.hasTruncatedText ? "ellipsis" : "",
      entry.candidateReview.hasSupersededSubmission ? "superseded" : "",
    ].filter(Boolean).join(", ") || "-";
    lines.push(
      `| ${entry.name} (${entry.loginAccount}) | ${entry.weekStartKey} ~ ${entry.weekEndKey} | ${entry.submittedAtLabel} | ${entry.recommendedAction} | ${entry.candidateReview.status} | ${flags} | ${entry.existingWeeklyReport?.id ?? "-"} | ${entry.proposedReportId ?? "-"} | ${entry.sourceFileName} | ${oneLine(entry.completedSummary)} | ${oneLine(entry.focusSummary || "无")} |`,
    );
  }

  if (plan.missingUsers.length) {
    lines.push("", "## Missing users", "");
    for (const item of plan.missingUsers) {
      lines.push(`- ${item.loginAccount} (${item.name})`);
    }
  }

  if (plan.managerLinks.length) {
    lines.push("", "## Manager relation precheck", "");
    for (const item of plan.managerLinks) {
      lines.push(`- ${item.memberLogin} -> ${item.managerLogin}: ${item.shouldUpdate ? "would require separate approval" : "already aligned"}`);
    }
  }

  lines.push(
    "",
    "## Safety",
    "",
    "- This dry-run did not write to the database.",
    "- `--apply` is disabled in this script.",
    "- The optional SQL output is SELECT-only precheck text, not production SQL.",
    "- Existing real weekly reports block automatic child-row generation until the actual report id is confirmed.",
    "- `User.managerUserId` updates must be handled in a separate approved change.",
  );

  return `${lines.join("\n")}\n`;
}

function oneLine(value) {
  const text = compactText(value).replace(/\n/g, " ");
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

async function loadUsersFromDatabase(databaseUrl) {
  if (!databaseUrl) return [];
  const mysql = await import("mysql2/promise");
  let lastError = null;
  for (const candidate of databaseUrlCandidates(databaseUrl)) {
    try {
      const connection = await mysql.createConnection(candidate);
      try {
        const [rows] = await connection.query(
          "SELECT id, loginAccount, name, wecomName, department, managerUserId, dataScope FROM `User` WHERE status = 'ACTIVE'",
        );
        return rows;
      } finally {
        await connection.end();
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Unable to load users from database.");
}

async function loadWeeklyReportsFromDatabase(databaseUrl) {
  if (!databaseUrl) return [];
  const mysql = await import("mysql2/promise");
  let lastError = null;
  for (const candidate of databaseUrlCandidates(databaseUrl)) {
    try {
      const connection = await mysql.createConnection(candidate);
      try {
        const [rows] = await connection.query(
          "SELECT wr.id, wr.userId, u.loginAccount, wr.status, DATE_FORMAT(wr.weekStartDate, '%Y-%m-%d') AS weekStartDate, wr.partitionKey, wr.updatedAt FROM `WeeklyReport` wr JOIN `User` u ON u.id = wr.userId WHERE wr.partitionKey = 'REAL'",
        );
        return rows;
      } finally {
        await connection.end();
      }
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Unable to load weekly reports from database.");
}

function userByLogin(users) {
  return new Map(users.map((user) => [user.loginAccount, user]));
}

function findExistingWeeklyReport(weeklyReports, user, entry) {
  if (!user) return null;
  return weeklyReports.find(
    (report) =>
      report.userId === user.id &&
      report.partitionKey === REAL_PARTITION_KEY &&
      normalizeWeekStartKey(report.weekStartDate) === entry.weekStartKey,
  ) ?? null;
}

function recommendedActionForEntry(entry) {
  if (!entry.matchedUser) return "blocked_missing_user";
  if (entry.existingWeeklyReport) return "blocked_existing_weekly_report_review_required";
  return "dry_run_create_candidate_only";
}

function reviewCandidateContent(entry) {
  const completedSummary = compactText(entry.completedSummary);
  const focusSummary = compactText(entry.focusSummary);
  const combined = `${completedSummary}\n${focusSummary}`;
  const hasTruncatedText = combined.includes("...");
  const hasSupersededSubmission = completedSummary.includes("同周较早提交");
  return {
    status: "candidate_needs_business_review",
    couldBeHistoricalFormalCandidate: true,
    approvedForAutomaticImport: false,
    hasTruncatedText,
    hasSupersededSubmission,
    notes: [
      hasTruncatedText ? "contains ellipsis from legacy content and should be checked against source" : "",
      hasSupersededSubmission ? "contains merged earlier same-week submission context" : "",
      "candidate only; not approved for production write",
    ].filter(Boolean),
  };
}

function buildRisks(summary, managerLinks) {
  const risks = [
    {
      gate: "production_writes",
      severity: "blocker",
      status: "blocked",
      note: "This script is dry-run only; --apply is disabled.",
    },
    {
      gate: "production_sql",
      severity: "blocker",
      status: "blocked",
      note: "No INSERT/UPDATE/DELETE SQL is generated.",
    },
  ];

  if (summary.existingWeeklyReports > 0) {
    risks.push({
      gate: "existing_weekly_reports",
      severity: "high",
      status: "needs_review",
      note: "Existing REAL weekly reports must keep their real ids before any child rows are considered.",
    });
  }

  if (summary.missingUsers > 0) {
    risks.push({
      gate: "user_mapping",
      severity: "high",
      status: "blocked",
      note: "Some source names do not map to active users in the provided precheck input.",
    });
  }

  if (summary.managerRelationUpdates > 0) {
    risks.push({
      gate: "manager_relation",
      severity: "medium",
      status: "separate_approval_required",
      note: "User.managerUserId changes are organization data changes and must be approved separately.",
    });
  }

  if (summary.approvedForAutomaticImport < summary.entries) {
    risks.push({
      gate: "candidate_content",
      severity: "medium",
      status: "business_review_required",
      note: "The 8 rows are historical candidates only and are not approved for automatic import.",
    });
  }

  risks.push({
    gate: "child_rows",
    severity: "high",
    status: "needs_design",
    note: "Review and plan item replacement must not delete user-edited content without backup and id alignment.",
  });

  return risks;
}

function uniqueMissingUsers(entries) {
  const missing = new Map();
  for (const entry of entries) {
    if (entry.matchedUser) continue;
    missing.set(entry.loginAccount, {
      name: entry.name,
      loginAccount: entry.loginAccount,
    });
  }
  return [...missing.values()];
}

function buildPlan(entries, users, weeklyReports, sourceDir, inputMeta) {
  const usersByLogin = userByLogin(users);
  const managerLinks = [];
  const enrichedEntries = entries.map((entry) => {
    const matchedUser = usersByLogin.get(entry.loginAccount) ?? null;
    const existingWeeklyReport = findExistingWeeklyReport(weeklyReports, matchedUser, entry);
    const proposedReportId = matchedUser
      ? deterministicId("wr", `${matchedUser.id}|${entry.weekStartKey}|${REAL_PARTITION_KEY}`)
      : null;
    return {
      ...entry,
      matchedUser: matchedUser
        ? {
            id: matchedUser.id,
            loginAccount: matchedUser.loginAccount,
            name: matchedUser.name,
          }
        : null,
      existingWeeklyReport: existingWeeklyReport
        ? {
            id: existingWeeklyReport.id,
            status: existingWeeklyReport.status,
            weekStartDate: normalizeWeekStartKey(existingWeeklyReport.weekStartDate),
            partitionKey: existingWeeklyReport.partitionKey,
            updatedAt: existingWeeklyReport.updatedAt ?? null,
          }
        : null,
      proposedReportId,
      candidateReview: reviewCandidateContent(entry),
    };
  }).map((entry) => ({
    ...entry,
    recommendedAction: recommendedActionForEntry(entry),
    needsExistingReportIdReview: Boolean(entry.existingWeeklyReport && entry.existingWeeklyReport.id !== entry.proposedReportId),
  }));

  for (const [memberLogin, managerLogin] of TEAM_MANAGER_BY_LOGIN.entries()) {
    const member = usersByLogin.get(memberLogin);
    const manager = usersByLogin.get(managerLogin);
    if (!member || !manager) continue;
    managerLinks.push({
      memberLogin,
      memberName: member.name,
      managerLogin,
      managerName: manager.name,
      currentManagerUserId: member.managerUserId ?? null,
      shouldUpdate: member.managerUserId !== manager.id,
    });
  }

  const missingUsers = uniqueMissingUsers(enrichedEntries);
  const summary = {
    entries: enrichedEntries.length,
    matchedUsers: enrichedEntries.filter((entry) => entry.matchedUser).length,
    missingUsers: missingUsers.length,
    existingWeeklyReports: enrichedEntries.filter((entry) => entry.existingWeeklyReport).length,
    existingReportIdMismatches: enrichedEntries.filter((entry) => entry.needsExistingReportIdReview).length,
    newReportCandidates: enrichedEntries.filter((entry) => entry.recommendedAction === "dry_run_create_candidate_only").length,
    couldBeHistoricalFormalCandidates: enrichedEntries.filter((entry) => entry.candidateReview.couldBeHistoricalFormalCandidate).length,
    approvedForAutomaticImport: enrichedEntries.filter((entry) => entry.candidateReview.approvedForAutomaticImport).length,
    entriesWithTruncatedText: enrichedEntries.filter((entry) => entry.candidateReview.hasTruncatedText).length,
    entriesWithSupersededSubmission: enrichedEntries.filter((entry) => entry.candidateReview.hasSupersededSubmission).length,
    managerRelationUpdates: managerLinks.filter((item) => item.shouldUpdate).length,
    blockedEntries: enrichedEntries.filter((entry) => entry.recommendedAction.startsWith("blocked_")).length,
  };

  return {
    generatedAt: new Date().toISOString(),
    status: SCRIPT_STATUS,
    mode: "dry-run-v2",
    sourceDir,
    inputs: inputMeta,
    safety: {
      writesDatabase: false,
      safeToApply: false,
      applyDisabled: true,
      productionSqlGenerated: false,
      sqlOutIsSelectOnlyPrecheck: true,
    },
    summary,
    risks: buildRisks(summary, managerLinks),
    entries: enrichedEntries.map((entry) => ({
      ...entry,
      submittedAt: entry.submittedAt.toISOString(),
      weekStartDate: entry.weekStartDate.toISOString(),
      weekEndDate: entry.weekEndDate.toISOString(),
    })),
    missingUsers,
    managerLinks,
  };
}

function databaseUrlCandidates(databaseUrl) {
  const candidates = [databaseUrl];
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.hostname === "mysql" || parsed.hostname === "huigui-mysql") {
      parsed.hostname = "127.0.0.1";
      candidates.push(parsed.toString());
    }
  } catch {
    // Keep the original value only.
  }
  return [...new Set(candidates)];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const entries = buildEntries(args.weeklyDir);
  const databaseUrl = args.readDb ? resolveDatabaseUrl(args.databaseUrl) : "";
  if (args.readDb && !databaseUrl) {
    throw new Error("--read-db requires --database-url or DATABASE_URL.");
  }
  const users = args.readDb
    ? await loadUsersFromDatabase(databaseUrl)
    : loadUsersFromTsv(args.usersTsv);
  const weeklyReports = args.readDb
    ? await loadWeeklyReportsFromDatabase(databaseUrl)
    : loadWeeklyReportsFromTsv(args.weeklyDbTsv);
  const plan = buildPlan(entries, users, weeklyReports, args.weeklyDir, {
    usersTsv: args.usersTsv || null,
    weeklyDbTsv: args.weeklyDbTsv || null,
    readDb: args.readDb,
    databaseUrlProvided: Boolean(args.databaseUrl),
  });

  if (args.out) {
    ensureParent(args.out);
    writeFileSync(args.out, `${JSON.stringify(plan, null, 2)}\n`);
  }
  if (args.markdownOut) {
    ensureParent(args.markdownOut);
    writeFileSync(args.markdownOut, buildMarkdown(plan));
  }
  if (args.sqlOut) {
    ensureParent(args.sqlOut);
    writeFileSync(args.sqlOut, renderPrecheckSql(plan));
  }

  console.log(JSON.stringify({
    status: plan.status,
    safeToApply: plan.safety.safeToApply,
    productionSqlGenerated: plan.safety.productionSqlGenerated,
    summary: plan.summary,
    managerLinks: plan.managerLinks,
    wrote: {
      out: args.out || null,
      markdownOut: args.markdownOut || null,
      sqlOut: args.sqlOut || null,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
