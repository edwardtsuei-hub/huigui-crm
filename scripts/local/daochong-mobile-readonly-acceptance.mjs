#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_GRAY_URL = process.env.DAOCHONG_MOBILE_ACCEPTANCE_URL ?? "";
const FILES = {
  app: "apps/web/components/daochong/mobile/DaochongMobileApp.tsx",
  controller: "apps/api/src/daochong-mobile/daochong-mobile.controller.ts",
  docsFieldMap: "docs/daochong-mobile-development-field-map-2026-06-22.md",
  docsTaskBreakdown: "docs/daochong-mobile-development-task-breakdown-2026-06-22.md",
  fetch: "apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts",
  financeMigration: "prisma/migrations/20260623200000_daochong_finance_readonly_models/migration.sql",
  moneyMigration: "prisma/migrations/20260623210000_daochong_money_readonly_models/migration.sql",
  packageJson: "package.json",
  resultDcm141: "docs/daochong-mobile-phase1-dcm141-dcm144-money-readonly-source-result-2026-06-23.md",
  resultDcm145: "docs/daochong-mobile-phase1-dcm145-dcm148-readonly-acceptance-result-2026-06-23.md",
  resultDcm149: "docs/daochong-mobile-phase1-dcm149-dcm152-gap-contract-result-2026-06-23.md",
  resultDcm153: "docs/daochong-mobile-phase1-dcm153-dcm156-appointment-detail-readonly-result-2026-06-23.md",
  resultDcm157: "docs/daochong-mobile-phase1-dcm157-dcm160-customer-card-balance-readonly-result-2026-06-23.md",
  resultDcm161: "docs/daochong-mobile-phase1-dcm161-dcm164-compensation-rules-readonly-result-2026-06-23.md",
  resultDcm165: "docs/daochong-mobile-phase1-dcm165-dcm168-wecom-reminder-dryrun-readonly-result-2026-06-23.md",
  schema: "prisma/schema.prisma",
  service: "apps/api/src/daochong-mobile/daochong-mobile.service.ts",
  tests: "tests/daochong-mobile-readonly-adapters.test.ts",
};

const CHECKS = [];
const CURRENT_GRAY_MARKER = /DCM-00 到 DCM-176/;
const ALLOWED_WRITE_DECORATORS = [
  '@Patch("recharges/:rechargeId/chengcheng-approval")',
  '@Patch("recharges/:rechargeId/chengcheng-return")',
  '@Patch("recharges/:rechargeId/limeng-return")',
  '@Patch("recharges/:rechargeId/limeng-review")',
  '@Patch("service-notes/:serviceNoteId")',
  '@Post("recharges")',
  '@Post("service-notes")',
  '@Post("wecom-reminders/send-test")',
];

function parseArgs(argv) {
  const args = {
    url: DEFAULT_GRAY_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--url" && next) {
      args.url = next;
      index += 1;
    } else if (arg.startsWith("--url=")) {
      args.url = arg.slice("--url=".length);
    } else if (arg === "--help") {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return `Daochong mobile readonly acceptance verifier

Usage:
  node scripts/local/daochong-mobile-readonly-acceptance.mjs
  node scripts/local/daochong-mobile-readonly-acceptance.mjs --url http://127.0.0.1:3030/daochong-mobile

This verifier only reads local files and optionally performs a GET request to the gray route.
It never runs migrations, writes databases, submits approvals, consumes cards, books revenue, or sends WeCom messages.`;
}

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function addCheck(name, ok, details, level = "required", phase = "DCM-145-DCM-168") {
  CHECKS.push({
    name,
    phase,
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

function addFileChecks() {
  for (const [label, relativePath] of Object.entries(FILES)) {
    addCheck(`file:${label}`, existsSync(path.join(ROOT, relativePath)), relativePath);
  }
}

function addSourceChecks(sources) {
  addCheck(
    "money-source-layer",
    hasAll(sources.schema, [
      /model DaochongCustomerRecharge/,
      /model DaochongServiceSettlementDraft/,
      /model DaochongCardConsumptionApproval/,
      /enum DaochongRechargeStatus/,
      /enum DaochongSettlementDraftStatus/,
      /enum DaochongConsumptionApprovalStatus/,
    ]) &&
      hasAll(sources.moneyMigration, [
        /CREATE TABLE `DaochongCustomerRecharge`/,
        /CREATE TABLE `DaochongServiceSettlementDraft`/,
        /CREATE TABLE `DaochongCardConsumptionApproval`/,
      ]),
    "Money trio schema and local migration file are present.",
  );

  addCheck(
    "finance-source-layer",
    hasAll(sources.schema, [
      /model DaochongFinanceSummary/,
      /model DaochongFinanceEvidenceException/,
      /model DaochongBonusExpenseItem/,
    ]) &&
      hasAll(sources.financeMigration, [
        /CREATE TABLE `DaochongFinanceSummary`/,
        /CREATE TABLE `DaochongFinanceEvidenceException`/,
        /CREATE TABLE `DaochongBonusExpenseItem`/,
      ]),
    "Finance trio schema and local migration file are present.",
  );

  addCheck(
    "api-high-risk-get-only",
    hasAll(sources.controller, [
      /@Get\("appointments\/:appointmentId"\)/,
      /@Get\("customer-card-balances"\)/,
      /@Get\("compensation-rules"\)/,
      /@Get\("wecom-reminder-dry-runs"\)/,
      /@Get\("recharges"\)/,
      /@Get\("settlement-drafts"\)/,
      /@Get\("consumption-approvals"\)/,
      /@Get\("finance-summary"\)/,
      /@Get\("finance-evidence-exceptions"\)/,
      /@Get\("bonus-expense-items"\)/,
      /@Get\("project-communications"\)/,
      /@Get\("meeting-notes"\)/,
    ]) &&
      hasAll(sources.service, [
        /task\.findFirst/,
        /getAppointmentDetail/,
        /listCustomerCardBalances/,
        /mapCustomerCardBalancePreview/,
        /compensation_rules/,
        /listWecomReminderDryRuns/,
        /mapWecomReminderDryRun/,
        /daochongCustomerRecharge\.findMany/,
        /daochongServiceSettlementDraft\.findMany/,
        /daochongCardConsumptionApproval\.findMany/,
        /daochongFinanceSummary\.findMany/,
        /daochongFinanceEvidenceException\.findMany/,
        /daochongBonusExpenseItem\.findMany/,
      ]),
    "Daochong detail, customer card balance, compensation source and high-risk endpoints are GET-only and mapped through findFirst/findMany or explicit source diagnostics.",
  );

  const apiForbidden = forbiddenHits([sources.controller, sources.service].join("\n"), [
    /\.delete\s*\(/,
  ]);
  const writeDecorators = [...sources.controller.matchAll(/@(Post|Patch|Put|Delete)\("[^"]+"\)/g)]
    .map((match) => match[0])
    .sort();
  addCheck(
    "api-readonly-and-write-gates-separated",
    apiForbidden.length === 0 &&
      JSON.stringify(writeDecorators) === JSON.stringify(ALLOWED_WRITE_DECORATORS) &&
      /DAOCHONG_MOBILE_WRITE_ENABLED/.test(sources.service) &&
      /assertWriteEnabled\(\)/.test(sources.service) &&
      /DAOCHONG_WECOM_TEST_ALLOWLIST/.test(sources.service),
    apiForbidden.length === 0
      ? "Readonly routes remain GET-only; approved write routes are present behind explicit write and WeCom gates."
      : apiForbidden.join(", "),
  );

  const frontendForbidden = forbiddenHits(sources.fetch, [
    /method:\s*["'](POST|PUT|PATCH|DELETE)["']/,
    /\.create\s*\(/,
    /\.update\s*\(/,
    /\.delete\s*\(/,
    /sendWecom/i,
    /wecom.*send/i,
  ]);
  addCheck(
    "frontend-readonly-fetch-actions-absent",
    frontendForbidden.length === 0,
    frontendForbidden.length === 0 ? "Readonly fetch client has no write methods." : frontendForbidden.join(", "),
  );

  const dangerousSql = forbiddenHits([sources.moneyMigration, sources.financeMigration].join("\n"), [
    /DROP\s+TABLE/i,
    /TRUNCATE\s+TABLE/i,
    /INSERT\s+INTO/i,
    /UPDATE\s+`/i,
    /DELETE\s+FROM/i,
  ]);
  addCheck(
    "migration-dangerous-sql-absent",
    dangerousSql.length === 0,
    dangerousSql.length === 0 ? "Local migration files contain create/index/foreign-key statements only." : dangerousSql.join(", "),
  );

  addCheck(
    "frontend-gray-marker",
    CURRENT_GRAY_MARKER.test(sources.app),
    "Gray route source marker should show DCM-00 to DCM-176.",
  );

  addCheck(
    "docs-synced",
    /DCM-19C-12/.test(sources.docsTaskBreakdown) &&
      /DCM-19C-13/.test(sources.docsTaskBreakdown) &&
      /DCM-19C-14/.test(sources.docsTaskBreakdown) &&
      /只读验收收口/.test(sources.docsTaskBreakdown) &&
      /只读验收器/.test(sources.docsFieldMap) &&
      /DCM-145 到 DCM-148/.test(sources.docsFieldMap) &&
      /DCM-149 到 DCM-152/.test(sources.docsFieldMap) &&
      /DCM-153 到 DCM-156/.test(sources.docsFieldMap) &&
      /DCM-19C-15/.test(sources.docsTaskBreakdown) &&
      /DCM-157 到 DCM-160/.test(sources.docsFieldMap) &&
      /DCM-19C-16/.test(sources.docsTaskBreakdown) &&
      /DCM-161 到 DCM-164/.test(sources.docsFieldMap) &&
      /DCM-19C-17/.test(sources.docsTaskBreakdown) &&
      /DCM-165 到 DCM-168/.test(sources.docsFieldMap),
    "Task breakdown and field map document the readonly acceptance closeout, remaining gap contracts, appointment detail source, card balance preview, compensation source and WeCom dry-run preview.",
  );

  addCheck(
    "tests-cover-acceptance",
    /DCM-145 to DCM-148/.test(sources.tests) &&
      /DCM-153 to DCM-156/.test(sources.tests) &&
      /DCM-157 to DCM-160/.test(sources.tests) &&
      /DCM-161 to DCM-164/.test(sources.tests) &&
      /DCM-165 to DCM-168/.test(sources.tests) &&
      /daochong-mobile-readonly-acceptance\.mjs/.test(sources.tests),
    "Readonly adapter tests cover the closeout verifier, appointment detail source, card balance preview, compensation source and WeCom dry-run preview.",
  );

  addCheck(
    "package-script",
    /"verify:daochong-mobile-readonly"\s*:\s*"node scripts\/local\/daochong-mobile-readonly-acceptance\.mjs"/.test(sources.packageJson),
    "Root package.json exposes verify:daochong-mobile-readonly.",
  );
}

async function addGrayUrlCheck(url) {
  if (!url) {
    addCheck(
      "gray-url-render",
      false,
      "No --url or DAOCHONG_MOBILE_ACCEPTANCE_URL provided; file-level gray marker was still checked.",
      "warning",
    );
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
      },
      method: "GET",
      signal: controller.signal,
    });
    const body = await response.text();
    const markerFound = CURRENT_GRAY_MARKER.test(body);
    addCheck(
      "gray-url-render",
      response.ok && markerFound,
      response.ok
        ? `GET ${url} returned ${response.status}; DCM-176 marker ${markerFound ? "found" : "missing"}.`
        : `GET ${url} returned ${response.status}.`,
    );
  } catch (error) {
    addCheck(
      "gray-url-render",
      false,
      error instanceof Error ? error.message : `GET ${url} failed.`,
      "warning",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const sources = Object.fromEntries(
    Object.entries(FILES).map(([label, relativePath]) => [label, readText(relativePath)]),
  );

  addFileChecks();
  addSourceChecks(sources);
  await addGrayUrlCheck(args.url);

  const failed = CHECKS.filter((check) => check.status === "fail");
  const warned = CHECKS.filter((check) => check.status === "warn");
  const summary = {
    status: failed.length > 0 ? "blocked" : warned.length > 0 ? "passed_with_warnings" : "passed",
    phase: "DCM-145-DCM-168",
    executesCommands: false,
    touchesDatabase: false,
    writesFiles: false,
    checks: CHECKS,
    nextAllowedAction:
      failed.length > 0
        ? "Fix failed readonly acceptance checks before expanding scope."
        : "Continue to the next Daochong slice; migrations, writes, approvals, card consumption, finance confirmation and WeCom sends remain out of scope until separately approved.",
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
