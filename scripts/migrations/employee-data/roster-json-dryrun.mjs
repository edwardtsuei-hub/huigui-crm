#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    rosterFile: "/opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json",
    bucket: "publishedByWeek",
    out: "",
    markdownOut: "",
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
    } else if (arg === "--no-write") {
      // Compatibility flag. This script never writes database data.
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
node roster-json-dryrun.mjs \\
  --roster-file /opt/huigui-crm/storage/uploads/employee-launch-contract/roster.json \\
  --bucket publishedByWeek \\
  --out output/employee-data-migration/2026-06-16/roster-json-dryrun.json \\
  --markdown-out output/employee-data-migration/2026-06-16/roster-json-dryrun.md \\
  --no-write`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
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
    const looksLikeWeekMap = values.some((entry) => entry && typeof entry === "object" && Array.isArray(entry.rows));
    const candidates = looksLikeWeekMap ? values : [value];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object" && Array.isArray(candidate.rows)) {
        weeks.push({ teamKey, source: candidate });
      }
    }
  }
  return weeks.sort((left, right) => `${left.source.teamId}-${left.source.weekKey}`.localeCompare(`${right.source.teamId}-${right.source.weekKey}`));
}

function parseShiftTime(shiftLabel) {
  const label = String(shiftLabel || "");
  if (label === "早班") return { startTime: "10:00", endTime: "18:00" };
  if (label === "晚班") return { startTime: "12:00", endTime: "20:00" };
  if (label === "全天班") return { startTime: "09:50", endTime: "20:00" };
  if (label === "半天班") return { startTime: null, endTime: null };
  return { startTime: null, endTime: null };
}

function buildRosterWeek(rawWeek, sourceSha16) {
  return {
    teamKey: rawWeek.teamId,
    teamLabel: rawWeek.teamLabel,
    weekKey: rawWeek.weekKey,
    weekLabel: rawWeek.weekLabel || rawWeek.weekKey,
    periodMode: normalizePeriodMode(rawWeek.periodMode),
    periodLabel: rawWeek.periodLabel || null,
    status: normalizeStatus(rawWeek.status),
    source: "legacy_roster_json",
    sourceSha16,
    sourceUpdatedAt: rawWeek.updatedAt || null,
    actorName: rawWeek.actorName || null,
    actorUserId: null,
    publishedAt: rawWeek.publishedAt || null,
    rawSnapshotIncluded: true,
  };
}

function buildShifts(rawWeek) {
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
      const notes = row.notes && Array.isArray(row.notes[dayName]) ? row.notes[dayName] : [];
      shifts.push({
        personExternalId: person.id || "",
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
        notesJson: notes.length ? notes : null,
        sortOrder: rowIndex * 10 + dayIndex,
      });
    });
  });

  return shifts;
}

function buildReport(args) {
  const raw = readFileSync(args.rosterFile);
  const sourceSha = sha256(raw);
  const root = JSON.parse(raw.toString("utf8"));
  const weeks = flattenBucket(root, args.bucket).map(({ source }) => {
    const rosterWeek = buildRosterWeek(source, sourceSha.slice(0, 16));
    const shifts = buildShifts(source);
    const noteCount = shifts.reduce((total, shift) => total + (Array.isArray(shift.notesJson) ? shift.notesJson.length : 0), 0);
    return {
      rosterWeek,
      summary: {
        rowCount: Array.isArray(source.rows) ? source.rows.length : 0,
        dayCount: Array.isArray(source.days) ? source.days.length : 0,
        shiftCount: shifts.length,
        noteCount,
      },
      people: Array.from(new Set(shifts.map((shift) => `${shift.personName}(${shift.personExternalId})`))),
      shifts,
    };
  });

  const warnings = [];
  if (weeks.some((week) => week.rosterWeek.actorName && !week.rosterWeek.actorUserId)) {
    warnings.push({
      code: "ACTOR_UNMAPPED",
      message: "actorName is text only and was not mapped to User.id in this dry-run.",
    });
  }
  if (weeks.some((week) => week.shifts.some((shift) => !shift.dateLabel.includes("/")))) {
    warnings.push({
      code: "DATE_LABEL_UNEXPECTED",
      message: "At least one shift dateLabel does not look like MM/DD.",
    });
  }

  const summary = {
    rosterWeeks: weeks.length,
    rosterShifts: weeks.reduce((total, week) => total + week.summary.shiftCount, 0),
    notes: weeks.reduce((total, week) => total + week.summary.noteCount, 0),
    teams: Array.from(new Set(weeks.map((week) => week.rosterWeek.teamKey))).sort(),
  };

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    writesDatabase: false,
    sourceFile: args.rosterFile,
    sourceSha256: sourceSha,
    sourceSha16: sourceSha.slice(0, 16),
    bucket: args.bucket,
    sourceVersion: root.version || null,
    sourceUpdatedAt: root.updatedAt || null,
    summary,
    weeks,
    warnings,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Roster JSON dry-run report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Source file: \`${report.sourceFile}\``);
  lines.push(`Bucket: \`${report.bucket}\``);
  lines.push(`Source sha16: \`${report.sourceSha16}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Roster weeks | ${report.summary.rosterWeeks} |`);
  lines.push(`| Roster shifts | ${report.summary.rosterShifts} |`);
  lines.push(`| Notes | ${report.summary.notes} |`);
  lines.push("");
  lines.push("Teams:");
  report.summary.teams.forEach((team) => lines.push(`- ${team}`));
  lines.push("");
  lines.push("## Weeks");
  lines.push("");
  lines.push("| team | week | status | rows | days | shifts | notes | actor |");
  lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | --- |");
  for (const week of report.weeks) {
    lines.push(`| ${week.rosterWeek.teamKey} | ${week.rosterWeek.weekKey} | ${week.rosterWeek.status} | ${week.summary.rowCount} | ${week.summary.dayCount} | ${week.summary.shiftCount} | ${week.summary.noteCount} | ${week.rosterWeek.actorName || "-"} |`);
  }
  if (report.warnings.length) {
    lines.push("");
    lines.push("## Warnings");
    lines.push("");
    report.warnings.forEach((warning) => lines.push(`- ${warning.code}: ${warning.message}`));
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- This is a dry-run report only.");
  lines.push("- No database rows were created, updated, or deleted.");
  lines.push("- The output keeps personExternalId snapshots and does not require every person to have a User row.");
  return `${lines.join("\n")}\n`;
}

try {
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
  console.log(JSON.stringify(report.summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
