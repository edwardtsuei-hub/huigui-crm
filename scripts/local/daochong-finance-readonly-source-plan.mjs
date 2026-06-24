#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REVIEW_FILES = {
  financeSchemaDraft: "docs/daochong-mobile-drafts/dcm125-dcm128/schema-extension.draft.prisma",
  financeControllerDraft: "docs/daochong-mobile-drafts/dcm125-dcm128/readonly-controller.draft.ts",
  financeServiceDraft: "docs/daochong-mobile-drafts/dcm125-dcm128/readonly-service.draft.ts",
  financeReviewMatrix: "docs/daochong-mobile-drafts/dcm129-dcm132/review-matrix.md",
  financeReadonlyContract: "docs/daochong-mobile-drafts/dcm129-dcm132/readonly-contract.draft.json",
  financePageAcceptance: "docs/daochong-mobile-drafts/dcm129-dcm132/page-acceptance.md",
  financeGoNoGo: "docs/daochong-mobile-drafts/dcm129-dcm132/go-no-go.md",
};

const FUTURE_SOURCE_TARGETS = [
  {
    path: "prisma/schema.prisma",
    changeType: "append_reviewed_models",
    guard: "Only after model names, enum values, month cutoff and permission rules are approved.",
  },
  {
    path: "prisma/migrations/<future_daochong_finance_models>/migration.sql",
    changeType: "new_reviewed_table_file",
    guard: "Create only new Daochong finance tables; no legacy table changes.",
  },
  {
    path: "apps/api/src/daochong-mobile/daochong-mobile.controller.ts",
    changeType: "add_get_only_routes",
    guard: "GET only for finance-summary, finance-evidence-exceptions and bonus-expense-items.",
  },
  {
    path: "apps/api/src/daochong-mobile/daochong-mobile.service.ts",
    changeType: "add_readonly_find_paths",
    guard: "No mutation delegates, no finance confirmation and no payroll finalization.",
  },
  {
    path: "apps/web/components/daochong/mobile/daochongMobile.readonly-fetch.ts",
    changeType: "add_get_only_fetch_paths",
    guard: "Fallback-first display remains required for empty, forbidden and failed reads.",
  },
  {
    path: "apps/web/components/daochong/mobile/daochongMobile.readonly-adapters.ts",
    changeType: "add_finance_display_adapters",
    guard: "Adapters only map display fields and gap hints.",
  },
  {
    path: "tests/daochong-mobile-readonly-adapters.test.ts",
    changeType: "add_get_only_boundary_tests",
    guard: "Tests must keep finance confirmation, payroll finalization and notification actions closed.",
  },
];

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function hasAll(source, patterns) {
  return patterns.every((pattern) => pattern.test(source));
}

function main() {
  const sources = Object.fromEntries(
    Object.entries(REVIEW_FILES).map(([key, relativePath]) => [key, readText(relativePath)]),
  );
  const missingReviewFiles = Object.entries(REVIEW_FILES)
    .filter(([, relativePath]) => !existsSync(path.join(ROOT, relativePath)))
    .map(([key, relativePath]) => ({ key, path: relativePath }));

  const reviewChecks = [
    {
      name: "finance-model-drafts",
      status: hasAll(sources.financeSchemaDraft, [
        /DaochongFinanceSummary/,
        /DaochongFinanceEvidenceException/,
        /DaochongBonusExpenseItem/,
      ])
        ? "pass"
        : "fail",
      details: "Finance draft models are present in review-only schema material.",
    },
    {
      name: "readonly-draft-routes",
      status: hasAll(sources.financeControllerDraft, [
        /@Get\("finance-summary"\)/,
        /@Get\("finance-evidence-exceptions"\)/,
        /@Get\("bonus-expense-items"\)/,
      ])
        ? "pass"
        : "fail",
      details: "Finance draft controller remains GET-only.",
    },
    {
      name: "review-matrix",
      status: hasAll(sources.financeReviewMatrix, [/summaryMonth/, /sourceCutoffAt/, /工资边界/, /权限边界/])
        ? "pass"
        : "fail",
      details: "Review matrix covers month cutoff, payroll boundary and permissions.",
    },
    {
      name: "readonly-contract",
      status: hasAll(sources.financeReadonlyContract, [
        /"method": "GET"/,
        /"financeConfirmation": false/,
        /"payrollFinalization": false/,
      ])
        ? "pass"
        : "fail",
      details: "Readonly contract keeps finance confirmation and payroll finalization closed.",
    },
    {
      name: "page-acceptance",
      status: hasAll(sources.financePageAcceptance, [/财务汇总页/, /财务凭证异常页/, /奖金报销页/])
        ? "pass"
        : "fail",
      details: "Page acceptance covers finance summary, exception and bonus/expense pages.",
    },
  ];

  const failCount = reviewChecks.filter((check) => check.status === "fail").length + missingReviewFiles.length;
  const summary = {
    status: failCount > 0 ? "finance_readonly_source_plan_blocked" : "finance_readonly_source_plan_ready",
    phase: "DCM-133-DCM-136",
    readsFilesOnly: true,
    writesFiles: false,
    touchesDatabase: false,
    deploys: false,
    registersRuntimeRoutes: false,
    missingReviewFiles,
    reviewChecks,
    futureSourceTargets: FUTURE_SOURCE_TARGETS,
    stopConditions: [
      "month cutoff rules are not approved",
      "exception owner and return target are not approved",
      "payroll preview boundary is unclear",
      "permission scope is unclear",
      "request includes finance confirmation, payroll finalization, accounting post or notification emit",
    ],
    nextAllowedStep:
      failCount > 0
        ? "Fix the review package before planning source changes."
        : "User may review this plan before any source-level finance readonly work begins.",
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main();
