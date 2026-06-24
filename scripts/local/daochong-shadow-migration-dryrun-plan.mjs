#!/usr/bin/env node

import { webcrypto } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILES = {
  schema: "prisma/schema.prisma",
  migration: "prisma/migrations/20260623103000_daochong_service_notes/migration.sql",
  readiness: "scripts/local/daochong-shadow-readonly-readiness.mjs",
  apiService: "apps/api/src/daochong-mobile/daochong-mobile.service.ts",
  apiController: "apps/api/src/daochong-mobile/daochong-mobile.controller.ts",
  frontendFetch: "apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts",
};
const EXPECTED_TABLES = ["DaochongServiceNote", "DaochongCustomerPreference"];

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function parseDotenv(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [
          key.trim(),
          rest
            .join("=")
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
}

function databaseTargetSummary() {
  const dotenv = parseDotenv(path.join(ROOT, ".env"));
  const rawUrl = process.env.DATABASE_URL ?? dotenv.DATABASE_URL ?? "";

  if (!rawUrl) {
    return {
      status: "warn",
      host: null,
      details: "DATABASE_URL is not set; select a local shadow target before any DB dry-run.",
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const local =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "mysql" ||
      host === "db" ||
      host === "database" ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /(^|[-.])(test|staging|stage|uat|dev|local)([-.]|$)/i.test(host);
    const forbidden = ["prod", "production", "hui-health.com", "crm.hui-health.com"].some((token) =>
      host.includes(token),
    );

    return {
      status: local && !forbidden ? "pass" : "fail",
      host,
      details: `DATABASE_URL host=${host}; ${local ? "local/test-like" : "not local/test-like"}`,
    };
  } catch {
    return {
      status: "fail",
      host: null,
      details: "DATABASE_URL is present but cannot be parsed as a URL.",
    };
  }
}

function stripSqlComments(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

async function sha256Hex(source) {
  const bytes = new TextEncoder().encode(source);
  const digest = await webcrypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function summarizeMigration(source) {
  const statements = stripSqlComments(source)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const createTables = [];
  const unexpectedStatements = [];
  const blockedStatements = [];

  for (const statement of statements) {
    const createMatch = statement.match(/^CREATE\s+TABLE\s+`?([A-Za-z0-9_]+)`?/i);
    if (createMatch) {
      const table = createMatch[1];
      createTables.push(table);
      if (!EXPECTED_TABLES.includes(table)) {
        unexpectedStatements.push(`CREATE TABLE ${table}`);
      }
      continue;
    }

    unexpectedStatements.push(statement.slice(0, 80));
  }

  for (const statement of statements) {
    if (/^\s*(DROP|TRUNCATE|INSERT|UPDATE|DELETE|ALTER|RENAME|CREATE\s+DATABASE|USE)\b/i.test(statement)) {
      blockedStatements.push(statement.slice(0, 80));
    }
  }

  const missingTables = EXPECTED_TABLES.filter((table) => !createTables.includes(table));
  const onlyExpectedCreates =
    statements.length === EXPECTED_TABLES.length &&
    missingTables.length === 0 &&
    unexpectedStatements.length === 0 &&
    blockedStatements.length === 0;

  return {
    sha256: await sha256Hex(source),
    statementCount: statements.length,
    createTables,
    missingTables,
    unexpectedStatements,
    blockedStatements,
    onlyExpectedCreates,
  };
}

function hasAll(source, patterns) {
  return patterns.every((pattern) => pattern.test(source));
}

async function main() {
  const schema = readText(FILES.schema);
  const migration = readText(FILES.migration);
  const readiness = readText(FILES.readiness);
  const apiSource = `${readText(FILES.apiController)}\n${readText(FILES.apiService)}`;
  const frontendFetch = readText(FILES.frontendFetch);
  const migrationSummary = await summarizeMigration(migration);
  const databaseTarget = databaseTargetSummary();
  const checks = [
    {
      name: "required-files",
      status: Object.values(FILES).every((relativePath) => existsSync(path.join(ROOT, relativePath))) ? "pass" : "fail",
      details: "Schema, migration, readiness, API and frontend files must exist before planning a dry-run.",
    },
    {
      name: "readiness-script",
      status: /DCM-93-DCM-96/.test(readiness) && /does not run it/.test(readiness) ? "pass" : "fail",
      details: "Previous readiness gate is present and remains non-executing.",
    },
    {
      name: "migration-scope",
      status: migrationSummary.onlyExpectedCreates ? "pass" : "fail",
      details: "Migration must only create DaochongServiceNote and DaochongCustomerPreference.",
    },
    {
      name: "schema-shadow-models",
      status: hasAll(schema, [/model DaochongServiceNote/, /model DaochongCustomerPreference/]) ? "pass" : "fail",
      details: "Schema contains the two shadow readonly models.",
    },
    {
      name: "api-still-readonly",
      status:
        hasAll(apiSource, [/@Get\("service-notes"\)/, /@Get\("customer-preferences"\)/]) &&
        !/@(Post|Put|Patch|Delete)\b|\.create\s*\(|\.update\s*\(|\.delete\s*\(/.test(apiSource)
          ? "pass"
          : "fail",
      details: "Daochong API still exposes GET-only paths with no write delegates.",
    },
    {
      name: "frontend-still-readonly",
      status:
        hasAll(frontendFetch, [/getDaochongReadonlyServiceNotesPath/, /getDaochongReadonlyCustomerPreferencesPath/]) &&
        !/method:\s*["'](POST|PUT|PATCH|DELETE)["']/.test(frontendFetch)
          ? "pass"
          : "fail",
      details: "Frontend still calls readonly paths and does not submit service-note writes.",
    },
    {
      name: "database-target",
      status: databaseTarget.status,
      details: databaseTarget.details,
    },
  ];

  const failed = checks.filter((check) => check.status === "fail");
  const warned = checks.filter((check) => check.status === "warn");
  const summary = {
    status: failed.length > 0 ? "blocked" : warned.length > 0 ? "dryrun_plan_ready_with_warnings" : "dryrun_plan_ready",
    phase: "DCM-97-DCM-100",
    executesCommands: false,
    touchesDatabase: false,
    migration: {
      path: FILES.migration,
      ...migrationSummary,
    },
    databaseTarget,
    checks,
    plannedSteps: [
      {
        id: "DCM-97",
        title: "Re-run readonly readiness",
        command: ["node", FILES.readiness],
        executesNow: false,
        databaseEffect: "none",
      },
      {
        id: "DCM-98",
        title: "Validate local Prisma schema",
        command: ["npx", "prisma", "validate", "--schema", FILES.schema],
        executesNow: false,
        databaseEffect: "none",
      },
      {
        id: "DCM-99",
        title: "Inspect migration status on selected local shadow target",
        command: ["npx", "prisma", "migrate", "status", "--schema", FILES.schema],
        executesNow: false,
        databaseEffect: "read-only status check on local target after confirmation",
      },
      {
        id: "DCM-100",
        title: "Apply only to a confirmed local shadow database",
        command: ["npx", "prisma", "migrate", "deploy", "--schema", FILES.schema],
        executesNow: false,
        databaseEffect: "would write local shadow DB only after separate user confirmation",
      },
    ],
    stopConditions: [
      "Stop if DATABASE_URL is not local/test-like.",
      "Stop if migration contains anything beyond the two expected CREATE TABLE statements.",
      "Stop if API or frontend gained POST, PATCH, PUT or DELETE behavior.",
      "Stop before applying anything to any database until the user explicitly confirms the local dry-run.",
    ],
    confirmationsRequired: [
      "User confirms the exact local shadow database target.",
      "User confirms that local DB writes are allowed for the dry-run window.",
      "User confirms production remains out of scope.",
    ],
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
