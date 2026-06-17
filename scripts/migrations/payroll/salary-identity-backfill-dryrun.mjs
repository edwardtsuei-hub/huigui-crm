#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    usersTsv: "",
    salarySlipsTsv: "",
    out: "",
    markdownOut: "",
    sqlOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--users-tsv" && next) {
      args.usersTsv = next;
      index += 1;
    } else if (arg === "--salary-slips-tsv" && next) {
      args.salarySlipsTsv = next;
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
    } else if (arg === "--no-write") {
      // Compatibility flag. This script never writes database data.
    } else if (arg === "--apply") {
      throw new Error("--apply is intentionally unsupported. Generate SQL, review it, then run in staging first.");
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!args.usersTsv || !args.salarySlipsTsv) {
    throw new Error("--users-tsv and --salary-slips-tsv are required.");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/payroll/salary-identity-backfill-dryrun.mjs \\
  --users-tsv output/payroll/users.tsv \\
  --salary-slips-tsv output/payroll/salary-slips.tsv \\
  --out output/payroll/salary-identity-backfill-plan.json \\
  --markdown-out output/payroll/salary-identity-backfill-plan.md \\
  --sql-out output/payroll/salary-identity-backfill-plan.sql \\
  --no-write`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function parseTsv(filePath) {
  const [headerLine, ...lines] = readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const headers = headerLine.split("\t").map((item) => item.trim());
  return lines.map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function identityToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._-]+/g, "");
}

function text(value) {
  const trimmed = String(value || "").trim();
  return trimmed || "";
}

function userTokens(user) {
  return [
    user.id,
    user.loginAccount,
    user.wecomUserId,
  ].map(identityToken).filter(Boolean);
}

function userNameTokens(user) {
  return [
    user.name,
    user.wecomName,
  ].map(identityToken).filter(Boolean);
}

function slipStrongTokens(slip) {
  return [
    slip.teacherId,
    slip.userId,
    slip.wecomUserId,
    slip.loginAccount,
  ].map(identityToken).filter(Boolean);
}

function slipNameTokens(slip) {
  return [
    slip.teacherName,
  ].map(identityToken).filter(Boolean);
}

function hasIntersection(left, right) {
  return left.some((item) => right.includes(item));
}

function hasValue(value) {
  return text(value).length > 0;
}

function identityConflicts(slip, user) {
  const checks = [
    ["userId", "id"],
    ["wecomUserId", "wecomUserId"],
    ["loginAccount", "loginAccount"],
  ];
  return checks
    .filter(([slipKey, userKey]) => hasValue(slip[slipKey]) && hasValue(user[userKey]) && text(slip[slipKey]) !== text(user[userKey]))
    .map(([slipKey]) => slipKey);
}

function missingIdentityFields(slip) {
  return ["userId", "wecomUserId", "loginAccount"].filter((key) => !hasValue(slip[key]));
}

function classifySlip(slip, users) {
  const strongTokens = slipStrongTokens(slip);
  const nameTokens = slipNameTokens(slip);
  const strongMatches = strongTokens.length
    ? users.filter((user) => hasIntersection(strongTokens, user.tokens))
    : [];
  const nameMatches = nameTokens.length
    ? users.filter((user) => hasIntersection(nameTokens, user.nameTokens))
    : [];

  if (strongMatches.length === 1) {
    const matchedUser = strongMatches[0];
    const conflicts = identityConflicts(slip, matchedUser);
    const missingFields = missingIdentityFields(slip);
    if (conflicts.length > 0) {
      return {
        status: "identity_conflict_needs_manual",
        recommendedAction: "manual_review",
        matchedUser,
        nameMatches,
        conflicts,
        missingFields,
      };
    }
    if (missingFields.length === 0) {
      return {
        status: "already_complete",
        recommendedAction: "skip",
        matchedUser,
        nameMatches,
        conflicts: [],
        missingFields,
      };
    }
    return {
      status: "auto_update_candidate",
      recommendedAction: "generate_update_sql",
      matchedUser,
      nameMatches,
      conflicts: [],
      missingFields,
    };
  }

  if (strongMatches.length > 1) {
    return {
      status: "ambiguous_strong_match_needs_manual",
      recommendedAction: "manual_review",
      matchedUsers: strongMatches,
      nameMatches,
      conflicts: [],
      missingFields: missingIdentityFields(slip),
    };
  }

  if (nameMatches.length > 0) {
    return {
      status: "name_hint_needs_manual",
      recommendedAction: "manual_review",
      matchedUsers: nameMatches,
      nameMatches,
      conflicts: [],
      missingFields: missingIdentityFields(slip),
    };
  }

  return {
    status: "unmatched_needs_manual",
    recommendedAction: "manual_review",
    matchedUsers: [],
    nameMatches: [],
    conflicts: [],
    missingFields: missingIdentityFields(slip),
  };
}

function mysqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")}'`;
}

function renderUpdateSql(item) {
  const user = item.matchedUser;
  return [
    "UPDATE `SalarySlip`",
    "SET",
    `  \`userId\` = ${mysqlString(user.id)},`,
    `  \`wecomUserId\` = ${mysqlString(user.wecomUserId)},`,
    `  \`loginAccount\` = ${mysqlString(user.loginAccount)}`,
    `WHERE \`id\` = ${mysqlString(item.id)};`,
  ].join("\n");
}

function buildPlan(args) {
  const users = parseTsv(args.usersTsv).map((user) => ({
    id: text(user.id),
    loginAccount: text(user.loginAccount),
    name: text(user.name),
    wecomUserId: text(user.wecomUserId),
    wecomName: text(user.wecomName),
    department: text(user.department),
    roleCode: text(user.roleCode),
    tokens: userTokens(user),
    nameTokens: userNameTokens(user),
  }));
  const salarySlips = parseTsv(args.salarySlipsTsv).map((slip) => ({
    id: text(slip.id),
    month: text(slip.month),
    publishBatchId: text(slip.publishBatchId),
    teacherId: text(slip.teacherId),
    teacherName: text(slip.teacherName),
    userId: text(slip.userId),
    wecomUserId: text(slip.wecomUserId),
    loginAccount: text(slip.loginAccount),
  }));

  const items = salarySlips.map((slip) => {
    const classification = classifySlip(slip, users);
    const matchedUser = classification.matchedUser || null;
    const matchedUsers = classification.matchedUsers || (matchedUser ? [matchedUser] : []);
    return {
      ...slip,
      status: classification.status,
      recommendedAction: classification.recommendedAction,
      missingFields: classification.missingFields,
      conflicts: classification.conflicts,
      matchedUser: matchedUser
        ? publicUser(matchedUser)
        : null,
      matchedUsers: matchedUsers.map(publicUser),
      nameMatches: classification.nameMatches.map(publicUser),
    };
  });

  const byStatus = {};
  const byAction = {};
  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    byAction[item.recommendedAction] = (byAction[item.recommendedAction] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    writesDatabase: false,
    inputs: {
      usersTsv: args.usersTsv,
      salarySlipsTsv: args.salarySlipsTsv,
    },
    summary: {
      users: users.length,
      salarySlips: salarySlips.length,
      autoUpdateCandidates: items.filter((item) => item.recommendedAction === "generate_update_sql").length,
      needsManualReview: items.filter((item) => item.recommendedAction === "manual_review").length,
      skipped: items.filter((item) => item.recommendedAction === "skip").length,
      byStatus,
      byAction,
    },
    items,
  };
}

function publicUser(user) {
  return {
    id: user.id,
    loginAccount: user.loginAccount || null,
    name: user.name || null,
    wecomUserId: user.wecomUserId || null,
    wecomName: user.wecomName || null,
    department: user.department || null,
    roleCode: user.roleCode || null,
  };
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push("# Payroll salary identity backfill dry-run");
  lines.push("");
  lines.push(`Generated at: ${plan.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Users: ${plan.summary.users}`);
  lines.push(`- Salary slips: ${plan.summary.salarySlips}`);
  lines.push(`- Auto update candidates: ${plan.summary.autoUpdateCandidates}`);
  lines.push(`- Needs manual review: ${plan.summary.needsManualReview}`);
  lines.push(`- Skipped: ${plan.summary.skipped}`);
  lines.push("");
  lines.push("## Status counts");
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("| --- | ---: |");
  for (const [status, count] of Object.entries(plan.summary.byStatus).sort()) {
    lines.push(`| ${status} | ${count} |`);
  }
  lines.push("");
  lines.push("## Review items");
  lines.push("");
  lines.push("| Slip | Month | Teacher | Status | Matched user | Missing fields | Conflicts |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const item of plan.items) {
    const matched = item.matchedUser
      ? `${item.matchedUser.name || ""} / ${item.matchedUser.loginAccount || ""}`.trim()
      : item.matchedUsers.map((user) => `${user.name || ""} / ${user.loginAccount || ""}`.trim()).join("; ");
    lines.push([
      item.id,
      item.month,
      `${item.teacherName || ""} / ${item.teacherId || ""}`.trim(),
      item.status,
      matched || "-",
      item.missingFields.join(", ") || "-",
      item.conflicts.join(", ") || "-",
    ].map((cell) => ` ${String(cell).replace(/\|/g, "\\|")} `).join("|").replace(/^/, "|").replace(/$/, "|"));
  }
  lines.push("");
  lines.push("SQL output is review-only and ends with ROLLBACK by default.");
  return `${lines.join("\n")}\n`;
}

function renderSql(plan) {
  const updates = plan.items.filter((item) => item.recommendedAction === "generate_update_sql");
  const lines = [];
  lines.push("-- Payroll salary identity backfill dry-run SQL");
  lines.push("-- Review in staging first. This file ends with ROLLBACK by default.");
  lines.push("START TRANSACTION;");
  lines.push("");
  for (const item of updates) {
    lines.push(`-- ${item.id} ${item.month} ${item.teacherName || item.teacherId}`);
    lines.push(renderUpdateSql(item));
    lines.push("");
  }
  lines.push("-- Replace ROLLBACK with COMMIT only after staging verification and approval.");
  lines.push("ROLLBACK;");
  lines.push("");
  return lines.join("\n");
}

function main() {
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
}

main();
