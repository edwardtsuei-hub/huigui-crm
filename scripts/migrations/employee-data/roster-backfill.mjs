#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const APPLY_CONFIRM = "production-roster-publishedByWeek-20260616";

function parseArgs(argv) {
  const args = {
    rosterFile: "/opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json",
    bucket: "publishedByWeek",
    out: "",
    markdownOut: "",
    sqlOut: "",
    apply: false,
    confirm: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--roster-file" && next) {
      args.rosterFile = next;
      index += 1;
    } else if (arg === "--bucket" && next) {
      args.bucket = next;
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
node roster-backfill.mjs \\
  --roster-file /opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json \\
  --bucket publishedByWeek \\
  --out output/employee-data-migration/2026-06-16/roster-backfill-plan.json \\
  --markdown-out output/employee-data-migration/2026-06-16/roster-backfill-plan.md \\
  --sql-out output/employee-data-migration/2026-06-16/roster-backfill-plan.sql \\
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

function mysqlBoolean(value) {
  return value ? "true" : "false";
}

function normalizeStatus(value) {
  const normalized = String(value || "draft").trim().toUpperCase();
  if (normalized === "PUBLISHED") return "PUBLISHED";
  if (normalized === "ARCHIVED") return "ARCHIVED";
  return "DRAFT";
}

function normalizePeriodMode(value) {
  return String(value || "week").trim().toLowerCase() === "month" ? "MONTH" : "WEEK";
}

function flattenBucket(root, bucketName) {
  const bucket = root[bucketName] || {};
  const weeks = [];
  for (const [teamKey, value] of Object.entries(bucket)) {
    const values = Object.values(value || {});
    const looksWeekMap = values.some((entry) => entry && typeof entry === "object" && Array.isArray(entry.rows));
    const candidates = looksWeekMap ? values : [value];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object" && Array.isArray(candidate.rows)) {
        weeks.push({ teamKey, rawWeek: candidate });
      }
    }
  }
  return weeks.sort((left, right) => `${left.rawWeek.teamId}-${left.rawWeek.weekKey}`.localeCompare(`${right.rawWeek.teamId}-${right.rawWeek.weekKey}`));
}

function parseShiftTime(shiftLabel) {
  const label = String(shiftLabel || "");
  if (label === "早班") return { startTime: "10:00", endTime: "18:00" };
  if (label === "晚班") return { startTime: "12:00", endTime: "20:00" };
  if (label === "全天班") return { startTime: "09:50", endTime: "20:00" };
  return { startTime: null, endTime: null };
}

function buildShifts(rawWeek, rosterWeekId) {
  const days = Array.isArray(rawWeek.days) ? rawWeek.days : [];
  const shifts = [];
  (rawWeek.rows || []).forEach((row, rowIndex) => {
    const person = row.person || {};
    const shiftMap = row.shifts || {};
    days.forEach((day, dayIndex) => {
      const dayName = day.day || "";
      if (!Object.prototype.hasOwnProperty.call(shiftMap, dayName)) return;
      const shiftLabel = String(shiftMap[dayName] || "").trim();
      const times = parseShiftTime(shiftLabel);
      const notes = row.notes && Array.isArray(row.notes[dayName]) ? row.notes[dayName] : null;
      const personExternalId = person.id || `${rawWeek.teamId}-${person.name || "unknown"}`;
      shifts.push({
        id: deterministicId("rsh", `${rosterWeekId}:${personExternalId}:${dayName}`),
        rosterWeekId,
        personExternalId,
        personUserId: null,
        personName: person.name || "",
        role: person.role || null,
        department: person.department || null,
        teamKey: person.teamId || rawWeek.teamId,
        dayName,
        dateLabel: day.label || "",
        shiftLabel,
        startTime: times.startTime,
        endTime: times.endTime,
        isRest: shiftLabel === "休" || shiftLabel === "休息",
        notesJson: notes && notes.length ? notes : null,
        sortOrder: rowIndex * 10 + dayIndex,
      });
    });
  });
  return shifts;
}

function buildPlan(args) {
  const raw = readFileSync(args.rosterFile);
  const root = JSON.parse(raw.toString("utf8"));
  const sourceSha = sha256(raw);
  const sourceSha16 = sourceSha.slice(0, 16);
  const weeks = flattenBucket(root, args.bucket).map(({ rawWeek }) => {
    const status = normalizeStatus(rawWeek.status);
    const rosterWeekId = deterministicId("rwk", `${rawWeek.teamId}:${rawWeek.weekKey}:${status}:REAL`);
    const shifts = buildShifts(rawWeek, rosterWeekId);
    return {
      id: rosterWeekId,
      teamKey: rawWeek.teamId,
      teamLabel: rawWeek.teamLabel,
      weekKey: rawWeek.weekKey,
      weekLabel: rawWeek.weekLabel || rawWeek.weekKey,
      periodMode: normalizePeriodMode(rawWeek.periodMode),
      periodLabel: rawWeek.periodLabel || null,
      status,
      source: "legacy_roster_json",
      sourceSha16,
      sourceUpdatedAt: rawWeek.updatedAt || null,
      actorName: rawWeek.actorName || null,
      actorUserId: null,
      publishedAt: rawWeek.publishedAt || null,
      version: root.version || 1,
      rawSnapshot: rawWeek,
      shifts,
      summary: {
        rowCount: Array.isArray(rawWeek.rows) ? rawWeek.rows.length : 0,
        shiftCount: shifts.length,
        noteCount: shifts.reduce((total, shift) => total + (Array.isArray(shift.notesJson) ? shift.notesJson.length : 0), 0),
      },
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    writesDatabase: false,
    applyConfirm: APPLY_CONFIRM,
    sourceFile: args.rosterFile,
    sourceSha256: sourceSha,
    sourceSha16,
    bucket: args.bucket,
    summary: {
      rosterWeeks: weeks.length,
      rosterShifts: weeks.reduce((total, week) => total + week.shifts.length, 0),
      notes: weeks.reduce((total, week) => total + week.summary.noteCount, 0),
      teams: Array.from(new Set(weeks.map((week) => week.teamKey))).sort(),
    },
    weeks,
    warnings: weeks.some((week) => week.actorName && !week.actorUserId)
      ? [{ code: "ACTOR_UNMAPPED", message: "actorName is preserved as text only." }]
      : [],
  };
}

function renderSql(plan) {
  const lines = [];
  lines.push("-- Roster backfill SQL draft.");
  lines.push("-- Review in staging before production use.");
  lines.push("-- This file was generated by roster-backfill.mjs in dry-run mode.");
  lines.push("START TRANSACTION;");
  for (const week of plan.weeks) {
    lines.push(`INSERT INTO \`RosterWeek\` (` +
      "`id`, `teamKey`, `teamLabel`, `weekKey`, `weekLabel`, `periodMode`, `periodLabel`, `status`, `source`, `sourceSha16`, `sourceUpdatedAt`, `actorName`, `actorUserId`, `publishedAt`, `version`, `rawSnapshot`, `dataScope`, `partitionKey`, `testBatchId`, `createdAt`, `updatedAt`" +
      `) VALUES (` +
      [
        mysqlString(week.id),
        mysqlString(week.teamKey),
        mysqlString(week.teamLabel),
        mysqlString(week.weekKey),
        mysqlString(week.weekLabel),
        mysqlString(week.periodMode),
        mysqlString(week.periodLabel),
        mysqlString(week.status),
        mysqlString(week.source),
        mysqlString(week.sourceSha16),
        mysqlDate(week.sourceUpdatedAt),
        mysqlString(week.actorName),
        mysqlString(week.actorUserId),
        mysqlDate(week.publishedAt),
        String(week.version),
        mysqlString(JSON.stringify(week.rawSnapshot)),
        mysqlString("REAL"),
        mysqlString("REAL"),
        "NULL",
        "CURRENT_TIMESTAMP(3)",
        "CURRENT_TIMESTAMP(3)",
      ].join(", ") +
      `) ON DUPLICATE KEY UPDATE ` +
      "`teamLabel` = VALUES(`teamLabel`), " +
      "`weekLabel` = VALUES(`weekLabel`), " +
      "`periodMode` = VALUES(`periodMode`), " +
      "`periodLabel` = VALUES(`periodLabel`), " +
      "`sourceSha16` = VALUES(`sourceSha16`), " +
      "`sourceUpdatedAt` = VALUES(`sourceUpdatedAt`), " +
      "`actorName` = VALUES(`actorName`), " +
      "`publishedAt` = VALUES(`publishedAt`), " +
      "`rawSnapshot` = VALUES(`rawSnapshot`), " +
      "`updatedAt` = CURRENT_TIMESTAMP(3);");

    for (const shift of week.shifts) {
      lines.push(`INSERT INTO \`RosterShift\` (` +
        "`id`, `rosterWeekId`, `personExternalId`, `personUserId`, `personName`, `role`, `department`, `teamKey`, `dayName`, `dateLabel`, `shiftLabel`, `startTime`, `endTime`, `isRest`, `notesJson`, `sortOrder`, `createdAt`, `updatedAt`" +
        `) VALUES (` +
        [
          mysqlString(shift.id),
          mysqlString(shift.rosterWeekId),
          mysqlString(shift.personExternalId),
          mysqlString(shift.personUserId),
          mysqlString(shift.personName),
          mysqlString(shift.role),
          mysqlString(shift.department),
          mysqlString(shift.teamKey),
          mysqlString(shift.dayName),
          mysqlString(shift.dateLabel),
          mysqlString(shift.shiftLabel),
          mysqlString(shift.startTime),
          mysqlString(shift.endTime),
          mysqlBoolean(shift.isRest),
          mysqlString(shift.notesJson ? JSON.stringify(shift.notesJson) : null),
          String(shift.sortOrder),
          "CURRENT_TIMESTAMP(3)",
          "CURRENT_TIMESTAMP(3)",
        ].join(", ") +
        `) ON DUPLICATE KEY UPDATE ` +
        "`personUserId` = VALUES(`personUserId`), " +
        "`personName` = VALUES(`personName`), " +
        "`role` = VALUES(`role`), " +
        "`department` = VALUES(`department`), " +
        "`teamKey` = VALUES(`teamKey`), " +
        "`dateLabel` = VALUES(`dateLabel`), " +
        "`shiftLabel` = VALUES(`shiftLabel`), " +
        "`startTime` = VALUES(`startTime`), " +
        "`endTime` = VALUES(`endTime`), " +
        "`isRest` = VALUES(`isRest`), " +
        "`notesJson` = VALUES(`notesJson`), " +
        "`sortOrder` = VALUES(`sortOrder`), " +
        "`updatedAt` = CURRENT_TIMESTAMP(3);");
    }
  }
  lines.push("-- COMMIT; -- Uncomment only after staging validation.");
  lines.push("ROLLBACK;");
  return `${lines.join("\n")}\n`;
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push("# Roster backfill plan");
  lines.push("");
  lines.push(`Generated at: ${plan.generatedAt}`);
  lines.push(`Source file: \`${plan.sourceFile}\``);
  lines.push(`Bucket: \`${plan.bucket}\``);
  lines.push(`Source sha16: \`${plan.sourceSha16}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Roster weeks | ${plan.summary.rosterWeeks} |`);
  lines.push(`| Roster shifts | ${plan.summary.rosterShifts} |`);
  lines.push(`| Notes | ${plan.summary.notes} |`);
  lines.push("");
  lines.push("## Weeks");
  lines.push("");
  lines.push("| team | week | status | shifts | notes | actor | id |");
  lines.push("| --- | --- | --- | ---: | ---: | --- | --- |");
  for (const week of plan.weeks) {
    lines.push(`| ${week.teamKey} | ${week.weekKey} | ${week.status} | ${week.summary.shiftCount} | ${week.summary.noteCount} | ${week.actorName || "-"} | \`${week.id}\` |`);
  }
  if (plan.warnings.length) {
    lines.push("");
    lines.push("## Warnings");
    plan.warnings.forEach((warning) => lines.push(`- ${warning.code}: ${warning.message}`));
  }
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("- This plan did not write to the database.");
  lines.push("- The generated SQL ends with ROLLBACK by default.");
  lines.push("- Person records are kept as snapshots and are not required to map to User rows.");
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
