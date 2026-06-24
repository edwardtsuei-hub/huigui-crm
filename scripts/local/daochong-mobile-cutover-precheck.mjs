#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILES = {
  acceptance: "scripts/local/daochong-mobile-readonly-acceptance.mjs",
  api: "apps/web/components/daochong/mobile/daochongMobile.api.ts",
  app: "apps/web/components/daochong/mobile/DaochongMobileApp.tsx",
  controller: "apps/api/src/daochong-mobile/daochong-mobile.controller.ts",
  docsFieldMap: "docs/daochong-mobile-development-field-map-2026-06-22.md",
  docsTaskBreakdown: "docs/daochong-mobile-development-task-breakdown-2026-06-22.md",
  fetch: "apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts",
  packageJson: "package.json",
  resultDcm145: "docs/daochong-mobile-phase1-dcm145-dcm148-readonly-acceptance-result-2026-06-23.md",
  resultDcm153: "docs/daochong-mobile-phase1-dcm153-dcm156-appointment-detail-readonly-result-2026-06-23.md",
  resultDcm157: "docs/daochong-mobile-phase1-dcm157-dcm160-customer-card-balance-readonly-result-2026-06-23.md",
  resultDcm161: "docs/daochong-mobile-phase1-dcm161-dcm164-compensation-rules-readonly-result-2026-06-23.md",
  resultDcm165: "docs/daochong-mobile-phase1-dcm165-dcm168-wecom-reminder-dryrun-readonly-result-2026-06-23.md",
  resultDcm169: "docs/daochong-mobile-phase1-dcm169-dcm172-cutover-precheck-result-2026-06-23.md",
  service: "apps/api/src/daochong-mobile/daochong-mobile.service.ts",
  tests: "tests/daochong-mobile-readonly-adapters.test.ts",
};

const checks = [];
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

function usage() {
  return `Daochong mobile cutover precheck

Usage:
  node scripts/local/daochong-mobile-cutover-precheck.mjs

This precheck only reads local files. It never deploys, runs migrations, writes databases,
submits approvals, consumes cards, confirms finance, or sends WeCom messages.`;
}

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function addCheck(name, ok, details, level = "required") {
  checks.push({
    name,
    phase: "DCM-169-DCM-172",
    status: ok ? "pass" : level === "warning" ? "warn" : "fail",
    details,
  });
}

function forbiddenHits(source, patterns) {
  return patterns.filter((pattern) => pattern.test(source)).map((pattern) => pattern.source);
}

function parseArgs(argv) {
  return {
    help: argv.includes("--help"),
  };
}

function addFileChecks() {
  for (const [label, relativePath] of Object.entries(FILES)) {
    addCheck(`file:${label}`, existsSync(path.join(ROOT, relativePath)), relativePath);
  }
}

function addCutoverChecks(sources) {
  addCheck(
    "gray-current-marker",
    CURRENT_GRAY_MARKER.test(sources.app),
    "Gray route source marker must remain aligned with the current DCM-176 source boundary before any cutover discussion.",
  );

  addCheck(
    "readonly-acceptance-aligned",
    /phase: "DCM-145-DCM-168"/.test(sources.acceptance) &&
      /CURRENT_GRAY_MARKER/.test(sources.acceptance) &&
      /DCM-165 到 DCM-168/.test(sources.docsFieldMap) &&
      /DCM-19C-17/.test(sources.docsTaskBreakdown) &&
      /DAOCHONG_CURRENT_GRAY_MARKER/.test(sources.tests),
    "Readonly acceptance, docs and tests are aligned with DCM-168 historical docs and the current DCM-176 source marker.",
  );

  addCheck(
    "required-readonly-endpoints-present",
    [
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
    ].every((pattern) => pattern.test(sources.controller)),
    "Required Daochong mobile endpoints are present as GET-only routes.",
  );

  addCheck(
    "frontend-readonly-paths-present",
    /getDaochongReadonlyCompensationRulesPath/.test(sources.fetch) &&
      /getDaochongReadonlyWecomReminderDryRunsPath/.test(sources.fetch) &&
      /customer-card-balances/.test(sources.fetch) &&
      /wecomReminderDryRuns/.test(sources.api),
    "Frontend readonly paths include card balance, compensation and WeCom dry-run preview.",
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
      /DAOCHONG_WECOM_TEST_SEND_ENABLED/.test(sources.service) &&
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
    frontendForbidden.length === 0 ? "Frontend readonly fetch client still uses GET paths only." : frontendForbidden.join(", "),
  );

  addCheck(
    "result-docs-keep-boundaries",
    /未运行 migration/.test(sources.resultDcm165) &&
      /ready_for_manual_go_no_go/.test(sources.resultDcm169) &&
      /不代表可以自动切正式入口/.test(sources.resultDcm169) &&
      /不创建通知/.test(sources.resultDcm165) &&
      /未调用企业微信/.test(sources.resultDcm165) &&
      /不从薪资单反推/.test(sources.resultDcm161) &&
      /不是最终.*卡台账/.test(sources.resultDcm157),
    "Result docs keep migration, compensation, card ledger and WeCom boundaries explicit.",
  );

  addCheck(
    "package-script-present",
    /"precheck:daochong-mobile-cutover"\s*:\s*"node scripts\/local\/daochong-mobile-cutover-precheck\.mjs"/.test(sources.packageJson),
    "Root package.json exposes precheck:daochong-mobile-cutover.",
  );

  addCheck(
    "manual-confirmation-still-required",
    false,
    "Cutover still requires a separate manual Go/No-Go; this check intentionally never approves production actions.",
    "warning",
  );
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
  addCutoverChecks(sources);

  const failed = checks.filter((check) => check.status === "fail");
  const warned = checks.filter((check) => check.status === "warn");
  const summary = {
    status: failed.length > 0 ? "blocked" : "ready_for_manual_go_no_go",
    phase: "DCM-169-DCM-172",
    canCutoverWithoutManualConfirmation: false,
    executesCommands: false,
    touchesDatabase: false,
    writesFiles: false,
    deploys: false,
    sendsWeCom: false,
    checks,
    nextAllowedAction:
      failed.length > 0
        ? "Fix failed precheck items before any cutover discussion."
        : warned.length > 0
          ? "Manual Go/No-Go is still required before real migration, API switch, formal route cutover, writes or WeCom send."
          : "Manual Go/No-Go is required before real migration, API switch, formal route cutover, writes or WeCom send.",
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
