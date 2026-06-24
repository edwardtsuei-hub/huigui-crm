#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CHECKS = [];
const FILES = {
  schema: "prisma/schema.prisma",
  migration: "prisma/migrations/20260623103000_daochong_service_notes/migration.sql",
  controller: "apps/api/src/daochong-mobile/daochong-mobile.controller.ts",
  service: "apps/api/src/daochong-mobile/daochong-mobile.service.ts",
  frontendFetch: "apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts",
  frontendAdapters: "apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts",
  test: "tests/daochong-mobile-readonly-adapters.test.ts",
};

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

function addCheck(name, ok, details, level = "required") {
  CHECKS.push({
    name,
    status: ok ? "pass" : level === "warning" ? "warn" : "fail",
    details,
  });
}

function hasAll(source, patterns) {
  return patterns.every((pattern) => pattern.test(source));
}

function forbiddenHits(source, patterns) {
  return patterns
    .filter((pattern) => pattern.test(source))
    .map((pattern) => pattern.source);
}

function databaseTargetSummary() {
  const dotenv = parseDotenv(path.join(ROOT, ".env"));
  const rawUrl = process.env.DATABASE_URL ?? dotenv.DATABASE_URL ?? "";

  if (!rawUrl) {
    return {
      ok: true,
      details: "DATABASE_URL is not set; migration dry-run target still needs to be selected.",
      level: "warning",
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const local =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "mysql" ||
      hostname === "db" ||
      hostname === "database" ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
      /(^|[-.])(test|staging|stage|uat|dev|local)([-.]|$)/i.test(hostname);
    const forbidden = ["prod", "production", "hui-health.com", "crm.hui-health.com"].some((token) =>
      hostname.includes(token),
    );

    return {
      ok: local && !forbidden,
      details: `DATABASE_URL host=${hostname}; ${local ? "local/test-like" : "not local/test-like"}`,
      level: "required",
    };
  } catch {
    return {
      ok: false,
      details: "DATABASE_URL is present but cannot be parsed as a URL.",
      level: "required",
    };
  }
}

function main() {
  const schema = readText(FILES.schema);
  const migration = readText(FILES.migration);
  const controller = readText(FILES.controller);
  const service = readText(FILES.service);
  const frontendFetch = readText(FILES.frontendFetch);
  const frontendAdapters = readText(FILES.frontendAdapters);
  const test = readText(FILES.test);
  const apiSource = [controller, service].join("\n");
  const frontendSource = [frontendFetch, frontendAdapters].join("\n");

  for (const [label, relativePath] of Object.entries(FILES)) {
    addCheck(`file:${label}`, existsSync(path.join(ROOT, relativePath)), relativePath);
  }

  addCheck(
    "schema-models",
    hasAll(schema, [
      /model DaochongServiceNote/,
      /model DaochongCustomerPreference/,
      /enum DaochongServiceNoteStatus/,
      /enum DaochongCustomerPreferenceType/,
    ]),
    "Daochong service note and customer preference models/enums are present.",
  );

  addCheck(
    "migration-file-ready",
    hasAll(migration, [/CREATE TABLE `DaochongServiceNote`/, /CREATE TABLE `DaochongCustomerPreference`/]),
    "Local migration file exists for review; this script does not run it.",
  );

  addCheck(
    "api-get-only",
    hasAll(controller, [/@Get\("service-notes"\)/, /@Get\("customer-preferences"\)/]) &&
      forbiddenHits(apiSource, [/@Post/, /@Put/, /@Patch/, /@Delete/, /\.create\s*\(/, /\.update\s*\(/, /\.delete\s*\(/]).length === 0,
    "Daochong API source exposes only GET paths and has no write delegates.",
  );

  addCheck(
    "server-shadow-gate",
    /DAOCHONG_MOBILE_SHADOW_READONLY/.test(service) && /disabledResponse/.test(service),
    "Server readonly gate is present and defaults to disabled response when not enabled.",
  );

  addCheck(
    "frontend-readonly-fetch",
    hasAll(frontendFetch, [
      /getDaochongReadonlyServiceNotesPath/,
      /getDaochongReadonlyCustomerPreferencesPath/,
      /method:\s*"GET"/,
    ]) &&
      forbiddenHits(frontendSource, [/method:\s*["'](POST|PUT|PATCH|DELETE)["']/, /sendWecom/i]).length === 0,
    "Frontend fetch uses GET paths and keeps fallback-first rendering.",
  );

  addCheck(
    "test-coverage",
    hasAll(test, [/DCM-89 to DCM-92/, /formal service notes and preferences/, /fallback-first/]),
    "Readonly adapter tests cover formal data override and fallback behavior.",
  );

  const dbTarget = databaseTargetSummary();
  addCheck("database-target", dbTarget.ok, dbTarget.details, dbTarget.level);

  const failed = CHECKS.filter((check) => check.status === "fail");
  const warned = CHECKS.filter((check) => check.status === "warn");
  const summary = {
    status: failed.length > 0 ? "blocked" : warned.length > 0 ? "ready_with_warnings" : "ready",
    phase: "DCM-93-DCM-96",
    checks: CHECKS,
    nextAllowedAction:
      failed.length > 0
        ? "Fix failed checks before dry-run."
        : "User may decide whether to run a local migration dry-run; production remains out of scope.",
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
