#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    weeklyDir: "/opt/huigui-crm/storage/uploads/employee-launch-weekly",
    usersTsv: "",
    weeklyDbTsv: "",
    out: "",
    markdownOut: "",
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
node weekly-userkey-dryrun.mjs \\
  --weekly-dir /opt/huigui-crm/storage/uploads/employee-launch-weekly \\
  --users-tsv output/users.tsv \\
  --weekly-db-tsv output/weekly-db.tsv \\
  --out output/weekly-userkey-dryrun.json \\
  --markdown-out output/weekly-userkey-dryrun.md \\
  --no-write`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function canonicalUserKey(value) {
  return String(value || "")
    .replace(/^da-ai-gui-xin\.weekly-workspace\.v\d+\./i, "")
    .trim();
}

function identityToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._-]+/g, "");
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

function loadUsers(filePath) {
  return parseTsv(filePath, [
    "id",
    "loginAccount",
    "name",
    "wecomUserId",
    "wecomName",
    "department",
    "roleCode",
    "dataScope",
  ]).map((user) => ({
    ...user,
    tokens: [
      user.id,
      user.loginAccount,
      user.name,
      user.wecomUserId,
      user.wecomName,
    ]
      .map(identityToken)
      .filter(Boolean),
  }));
}

function loadWeeklyReports(filePath) {
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

function listWeeklyFiles(weeklyDir) {
  return readdirSync(weeklyDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(weeklyDir, name));
}

function countDraftItems(draft) {
  const record = draft && typeof draft === "object" ? draft : {};
  return {
    carry: Array.isArray(record.carryItems) ? record.carryItems.length : 0,
    focus: Array.isArray(record.focusItems) ? record.focusItems.length : 0,
    blockers: Array.isArray(record.blockerItems) ? record.blockerItems.length : 0,
    plans: Array.isArray(record.planItems) ? record.planItems.length : 0,
  };
}

function classify(sourceUserKey, canonicalKey, matchedUsers) {
  const raw = `${sourceUserKey || ""} ${canonicalKey || ""}`;
  if (/smoke|weekly-summary-smoke|employee-launch-weekly-smoke/i.test(raw) || /\.test$/i.test(canonicalKey)) {
    return "test-or-smoke";
  }
  if (canonicalKey === "shared") {
    return "shared-workspace";
  }
  if (matchedUsers.length === 1) {
    return "auto-match-candidate";
  }
  if (matchedUsers.length > 1) {
    return "ambiguous-match";
  }
  return "needs-manual";
}

function recommendedAction(bucket, existingReports, matchedUsers) {
  if (bucket === "test-or-smoke") return "skip_test_data";
  if (bucket === "shared-workspace") return "needs_manual_shared_split";
  if (bucket === "ambiguous-match") return "needs_manual_user_confirm";
  if (!matchedUsers.length) return "needs_manual_user_confirm";
  if (existingReports.length) return "attach_payload_only";
  return "create_weekly_report_candidate";
}

function buildReport(args) {
  const users = loadUsers(args.usersTsv);
  const weeklyReports = loadWeeklyReports(args.weeklyDbTsv);
  const files = listWeeklyFiles(args.weeklyDir);

  const items = files.map((filePath) => {
    const raw = readFileSync(filePath);
    const json = readJson(filePath);
    const sourceUserKey = json.userKey || "";
    const canonicalKey = canonicalUserKey(sourceUserKey);
    const keyToken = identityToken(canonicalKey);
    const matchedUsers = keyToken
      ? users.filter((user) => user.tokens.includes(keyToken))
      : [];
    const bucket = classify(sourceUserKey, canonicalKey, matchedUsers);
    const existingReports = matchedUsers.length === 1
      ? weeklyReports.filter((report) => report.userId === matchedUsers[0].id)
      : [];
    const action = recommendedAction(bucket, existingReports, matchedUsers);
    return {
      sourceFileName: path.basename(filePath),
      sourcePath: filePath,
      sourceSha256: sha256(raw),
      sourceSha16: sha256(raw).slice(0, 16),
      sourceUserKey,
      canonicalUserKey: canonicalKey,
      bucket,
      reportState: json.reportState || null,
      savedAt: json.savedAt || json.meta?.lastSyncedAt || null,
      lastSavedAt: json.lastSavedAt || null,
      counts: {
        ...countDraftItems(json.reportDraft),
        teamReports: Array.isArray(json.teamReports) ? json.teamReports.length : 0,
      },
      matchedUsers: matchedUsers.map((user) => ({
        id: user.id,
        loginAccount: user.loginAccount,
        name: user.name,
        wecomUserId: user.wecomUserId,
        roleCode: user.roleCode,
        dataScope: user.dataScope,
      })),
      existingWeeklyReports: existingReports.map((report) => ({
        id: report.id,
        status: report.status,
        weekStartDate: report.weekStartDate,
        partitionKey: report.partitionKey,
        updatedAt: report.updatedAt,
      })),
      recommendedAction: action,
    };
  });

  const byAction = {};
  const byBucket = {};
  for (const item of items) {
    byAction[item.recommendedAction] = (byAction[item.recommendedAction] || 0) + 1;
    byBucket[item.bucket] = (byBucket[item.bucket] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    writesDatabase: false,
    sourceDir: args.weeklyDir,
    inputs: {
      usersTsv: args.usersTsv || null,
      weeklyDbTsv: args.weeklyDbTsv || null,
    },
    summary: {
      fileCount: items.length,
      byBucket,
      byAction,
    },
    items,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Weekly userKey dry-run report");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Source dir: \`${report.sourceDir}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Files | ${report.summary.fileCount} |`);
  for (const [bucket, count] of Object.entries(report.summary.byBucket)) {
    lines.push(`| Bucket: ${bucket} | ${count} |`);
  }
  for (const [action, count] of Object.entries(report.summary.byAction)) {
    lines.push(`| Action: ${action} | ${count} |`);
  }
  lines.push("");
  lines.push("## Items");
  lines.push("");
  lines.push("| file | userKey | canonical | bucket | action | matched user | reports | sha16 |");
  lines.push("| --- | --- | --- | --- | --- | --- | ---: | --- |");
  for (const item of report.items) {
    const matched = item.matchedUsers.map((user) => user.loginAccount || user.wecomUserId || user.name).join(", ") || "-";
    lines.push(`| \`${item.sourceFileName}\` | \`${item.sourceUserKey}\` | \`${item.canonicalUserKey}\` | ${item.bucket} | ${item.recommendedAction} | ${matched} | ${item.existingWeeklyReports.length} | \`${item.sourceSha16}\` |`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- This is a dry-run report only.");
  lines.push("- No database rows were created, updated, or deleted.");
  lines.push("- Shared workspace items must not be assigned to one person without manual review.");
  lines.push("- Test and smoke items should stay out of REAL production weekly reports.");
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
