#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILES = {
  apiSpecs: "apps/web/components/daochong/mobile/daochongMobile.api.ts",
  contract: "docs/daochong-mobile-drafts/dcm149-dcm152/readonly-contract.draft.json",
  fieldMap: "docs/daochong-mobile-development-field-map-2026-06-22.md",
  gapMatrix: "docs/daochong-mobile-drafts/dcm149-dcm152/gap-matrix.md",
  goNoGo: "docs/daochong-mobile-drafts/dcm149-dcm152/go-no-go.md",
  mock: "apps/web/components/daochong/mobile/daochongMobile.mock.ts",
  schema: "prisma/schema.prisma",
  taskBreakdown: "docs/daochong-mobile-development-task-breakdown-2026-06-22.md",
  tests: "tests/daochong-mobile-readonly-adapters.test.ts",
};

const REQUIRED_CONTRACTS = [
  {
    id: "DCM-149",
    key: "appointmentDetail",
    currentRisk: "Task is only an appointment candidate source.",
    mustKeepMockFallback: true,
  },
  {
    id: "DCM-150",
    key: "customerCardBalance",
    currentRisk: "Customer detail does not expose a formal Daochong card balance.",
    mustKeepMockFallback: true,
  },
  {
    id: "DCM-151",
    key: "compensationRules",
    currentRisk: "SalarySlip is a payroll result, not compensation configuration.",
    mustKeepMockFallback: true,
  },
  {
    id: "DCM-152",
    key: "wecomReminderDryRun",
    currentRisk: "WeCom services exist, but Daochong 12-hour service-note reminder sending is not wired.",
    mustKeepMockFallback: true,
  },
];

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(relativePath) {
  const text = readText(relativePath);
  return text ? JSON.parse(text) : null;
}

function modelNames(schema) {
  return Array.from(schema.matchAll(/^model\s+([A-Za-z0-9_]+)/gm)).map((match) => match[1]);
}

function endpointSpecPresent(apiSpecs, key) {
  return new RegExp(`key:\\s*"${key}"`).test(apiSpecs);
}

function contractFor(contract, key) {
  return contract?.contracts?.find((item) => item.key === key) ?? null;
}

function forbiddenHits(source) {
  return [
    /from\s+["']node:child_process["']/i,
    /\bspawn(?:Sync)?\s*\(/i,
    /\bexec(?:File|Sync)?\s*\(/i,
    /\bwriteFile(?:Sync)?\s*\(/i,
    /prisma\s+migrate/i,
    /\.create\s*\(/i,
    /\.update\s*\(/i,
    /\.delete\s*\(/i,
    /sendWecom\s*\(/i,
    /wecom\.[A-Za-z0-9_]*send\s*\(/i,
  ]
    .filter((pattern) => pattern.test(source))
    .map((pattern) => pattern.source);
}

function main() {
  const schema = readText(FILES.schema);
  const apiSpecs = readText(FILES.apiSpecs);
  const contract = readJson(FILES.contract);
  const gapMatrix = readText(FILES.gapMatrix);
  const goNoGo = readText(FILES.goNoGo);
  const taskBreakdown = readText(FILES.taskBreakdown);
  const fieldMap = readText(FILES.fieldMap);
  const mock = readText(FILES.mock);
  const tests = readText(FILES.tests);
  const thisSource = readText("scripts/local/daochong-remaining-gap-contract-plan.mjs");
  const models = modelNames(schema);

  const files = Object.fromEntries(
    Object.entries(FILES).map(([key, relativePath]) => [
      key,
      {
        path: relativePath,
        exists: existsSync(path.join(ROOT, relativePath)),
      },
    ]),
  );

  const contracts = REQUIRED_CONTRACTS.map((item) => {
    const draft = contractFor(contract, item.key);
    return {
      ...item,
      contractReady: Boolean(draft?.targetPath && draft.requiredFields?.length >= 8 && draft.blockedActions?.length >= 4),
      endpointSpecPresent: endpointSpecPresent(apiSpecs, item.key) || ["appointmentDetail", "customerCardBalance", "wecomReminderDryRun"].includes(item.key) === false,
      requiredFieldCount: draft?.requiredFields?.length ?? 0,
      blockedActionCount: draft?.blockedActions?.length ?? 0,
      targetPath: draft?.targetPath ?? null,
      writesAllowed: false,
    };
  });

  const checks = [
    {
      name: "draft-files-present",
      status: Object.values(files).every((item) => item.exists) ? "pass" : "fail",
      details: files,
    },
    {
      name: "contract-json-review-only",
      status:
        contract?.status === "review_only_remaining_gap_contract" &&
        contract?.phase === "DCM-149-DCM-152" &&
        contract?.writesAllowed === false &&
        contract?.runsMigration === false &&
        contract?.sendsWecom === false
          ? "pass"
          : "fail",
      details: "Contract JSON must explicitly forbid writes, migrations and WeCom sending.",
    },
    {
      name: "contracts-complete",
      status: contracts.every((item) => item.contractReady) ? "pass" : "fail",
      details: contracts,
    },
    {
      name: "known-source-boundaries",
      status:
        models.includes("DaochongServiceNote") &&
        models.includes("DaochongCustomerPreference") &&
        models.includes("DaochongCustomerRecharge") &&
        models.includes("DaochongCardConsumptionApproval") &&
        !models.includes("DaochongCustomerCardBalance") &&
        !models.includes("DaochongCompensationRule")
          ? "pass"
          : "fail",
      details: {
        presentModels: models.filter((model) => model.startsWith("Daochong")),
        missingByDesignBeforeApproval: ["DaochongCustomerCardBalance", "DaochongCompensationRule"],
      },
    },
    {
      name: "docs-and-gray-plan-synced",
      status:
        /DCM-19C-13/.test(taskBreakdown) &&
        /剩余真实口径缺口契约/.test(taskBreakdown) &&
        /DCM-149 到 DCM-152/.test(fieldMap) &&
        /DCM-152/.test(mock)
          ? "pass"
          : "fail",
      details: "Task breakdown, field map and gray API plan must reference DCM-149 to DCM-152.",
    },
    {
      name: "tests-cover-plan",
      status: /DCM-149 to DCM-152/.test(tests) ? "pass" : "fail",
      details: "Readonly adapter tests should cover the remaining gap contract plan.",
    },
    {
      name: "script-non-executing",
      status: forbiddenHits(thisSource).length === 0 ? "pass" : "fail",
      details: forbiddenHits(thisSource),
    },
    {
      name: "human-docs-review-only",
      status:
        /不创建 Prisma migration/.test(gapMatrix) &&
        /不发送企业微信/.test(gapMatrix) &&
        /No-Go/.test(goNoGo) &&
        /试图运行 migration/.test(goNoGo)
          ? "pass"
          : "fail",
      details: "Gap matrix and Go/No-Go must keep the work review-only.",
    },
  ];

  const failed = checks.filter((check) => check.status === "fail");
  const summary = {
    status: failed.length > 0 ? "blocked" : "ready_for_review",
    phase: "DCM-149-DCM-152",
    executesCommands: false,
    touchesDatabase: false,
    writesFiles: false,
    sendsWecom: false,
    checks,
    nextAllowedAction:
      failed.length > 0
        ? "Fix the remaining gap contract package before moving toward source."
        : "Review the four contracts before implementing any additional Daochong source layer.",
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
