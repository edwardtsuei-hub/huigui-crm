#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const EXACT_AUTHORIZATION_PHRASE = "授权执行 weekly teamReports ROLLBACK 事务试跑";

function parseArgs(argv) {
  const args = {
    globalPrecheck: "",
    sqlGuard: "",
    writeGate: "",
    authorization: "",
    out: "",
    markdownOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--global-precheck" && next) {
      args.globalPrecheck = next;
      index += 1;
    } else if (arg === "--sql-guard" && next) {
      args.sqlGuard = next;
      index += 1;
    } else if (arg === "--write-gate" && next) {
      args.writeGate = next;
      index += 1;
    } else if (arg === "--authorization" && next) {
      args.authorization = next;
      index += 1;
    } else if (arg === "--out" && next) {
      args.out = next;
      index += 1;
    } else if (arg === "--markdown-out" && next) {
      args.markdownOut = next;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  for (const [flag, value] of Object.entries({
    "--global-precheck": args.globalPrecheck,
    "--sql-guard": args.sqlGuard,
    "--write-gate": args.writeGate,
    "--authorization": args.authorization,
  })) {
    if (!value) throw new Error(`Missing ${flag}.`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
node scripts/migrations/employee-data/weekly-teamreports-rollback-rehearsal-request.mjs \\
  --global-precheck output/employee-data-migration/2026-06-16/database-100-global-precheck-verify-result.json \\
  --sql-guard output/employee-data-migration/2026-06-16/weekly-teamreports-correction-sql-guard-result.json \\
  --write-gate output/employee-data-migration/2026-06-16/weekly-teamreports-correction-write-gate-result.json \\
  --authorization output/employee-data-migration/2026-06-16/weekly-teamreports-correction-execution-authorization.json \\
  --out output/employee-data-migration/2026-06-16/weekly-teamreports-rollback-rehearsal-request.json \\
  --markdown-out docs/weekly-teamreports-rollback-rehearsal-request-2026-06-17.md

This generator only reads existing JSON gate artifacts and writes an
authorization request packet. It does not connect to the database, execute SQL,
deploy, restart, or authorize a COMMIT.`);
}

function ensureParent(filePath) {
  if (!filePath) return;
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function makeCheck({ name, passed, actual, expected, severity = "hard", details = "" }) {
  return {
    name,
    passed: Boolean(passed),
    actual,
    expected,
    severity,
    details,
  };
}

function buildReport(args) {
  const globalPrecheck = readJson(args.globalPrecheck);
  const sqlGuard = readJson(args.sqlGuard);
  const writeGate = readJson(args.writeGate);
  const authorization = readJson(args.authorization);

  const checks = [
    makeCheck({
      name: "globalPrecheck.status",
      passed: globalPrecheck.status === "passed",
      actual: globalPrecheck.status,
      expected: "passed",
    }),
    makeCheck({
      name: "globalPrecheck.mismatches",
      passed: Number(globalPrecheck.summary?.mismatches ?? -1) === 0
        && Number(globalPrecheck.summary?.malformedRows ?? -1) === 0
        && Number(globalPrecheck.summary?.duplicateCheckNames ?? -1) === 0,
      actual: {
        mismatches: globalPrecheck.summary?.mismatches,
        malformedRows: globalPrecheck.summary?.malformedRows,
        duplicateCheckNames: globalPrecheck.summary?.duplicateCheckNames,
      },
      expected: { mismatches: 0, malformedRows: 0, duplicateCheckNames: 0 },
    }),
    makeCheck({
      name: "sqlGuard.status",
      passed: sqlGuard.status === "passed" && Number(sqlGuard.summary?.failedChecks ?? -1) === 0,
      actual: {
        status: sqlGuard.status,
        failedChecks: sqlGuard.summary?.failedChecks,
        applyStatus: sqlGuard.summary?.applyStatus,
        rollbackStatus: sqlGuard.summary?.rollbackStatus,
      },
      expected: {
        status: "passed",
        failedChecks: 0,
        applyStatus: "passed",
        rollbackStatus: "passed",
      },
    }),
    makeCheck({
      name: "writeGate.status",
      passed: writeGate.status === "ready_for_explicit_rollback_rehearsal_authorization"
        && writeGate.nextAllowedAction === "request_user_authorization_for_rollback_rehearsal"
        && writeGate.decision?.canRequestRollbackRehearsalAuthorization === true,
      actual: {
        status: writeGate.status,
        nextAllowedAction: writeGate.nextAllowedAction,
        canRequestRollbackRehearsalAuthorization: writeGate.decision?.canRequestRollbackRehearsalAuthorization,
      },
      expected: {
        status: "ready_for_explicit_rollback_rehearsal_authorization",
        nextAllowedAction: "request_user_authorization_for_rollback_rehearsal",
        canRequestRollbackRehearsalAuthorization: true,
      },
    }),
    makeCheck({
      name: "writeGate.noCommitOrDeployment",
      passed: writeGate.safety?.commitAllowed === false
        && writeGate.safety?.deploymentAllowed === false
        && writeGate.safety?.writesDatabase === false
        && writeGate.safety?.executesSql === false,
      actual: {
        commitAllowed: writeGate.safety?.commitAllowed,
        deploymentAllowed: writeGate.safety?.deploymentAllowed,
        writesDatabase: writeGate.safety?.writesDatabase,
        executesSql: writeGate.safety?.executesSql,
      },
      expected: {
        commitAllowed: false,
        deploymentAllowed: false,
        writesDatabase: false,
        executesSql: false,
      },
    }),
    makeCheck({
      name: "authorization.status",
      passed: authorization.status === "waiting_for_explicit_rollback_rehearsal_authorization",
      actual: authorization.status,
      expected: "waiting_for_explicit_rollback_rehearsal_authorization",
    }),
    makeCheck({
      name: "authorization.noExecutionYet",
      passed: authorization.safety?.writesDatabase === false
        && authorization.safety?.executedRollbackRehearsal === false
        && authorization.safety?.productionSqlExecuted === false
        && authorization.safety?.commitStatementAuthorized === false,
      actual: {
        writesDatabase: authorization.safety?.writesDatabase,
        executedRollbackRehearsal: authorization.safety?.executedRollbackRehearsal,
        productionSqlExecuted: authorization.safety?.productionSqlExecuted,
        commitStatementAuthorized: authorization.safety?.commitStatementAuthorized,
      },
      expected: {
        writesDatabase: false,
        executedRollbackRehearsal: false,
        productionSqlExecuted: false,
        commitStatementAuthorized: false,
      },
    }),
  ];

  const failedChecks = checks.filter((check) => !check.passed);
  const readyForRequest = failedChecks.filter((check) => check.severity === "hard").length === 0;
  const status = readyForRequest
    ? "ready_to_request_explicit_rollback_rehearsal_authorization"
    : "blocked_before_authorization_request";

  return {
    generatedAt: new Date().toISOString(),
    status,
    scope: "weekly teamReports rollback rehearsal authorization request",
    exactAuthorizationPhrase: EXACT_AUTHORIZATION_PHRASE,
    currentGate: {
      canRequestRollbackRehearsalAuthorization: readyForRequest,
      rollbackRehearsalAuthorizedByThisArtifact: false,
      commitAllowed: false,
      deploymentAllowed: false,
      productionWriteAllowed: false,
    },
    inputs: {
      globalPrecheck: args.globalPrecheck,
      sqlGuard: args.sqlGuard,
      writeGate: args.writeGate,
      authorization: args.authorization,
    },
    rehearsalPlan: {
      purpose: "Run the already-guarded apply draft inside a transaction that ends with ROLLBACK, then verify no production data remained changed.",
      applyDraftSql: authorization.sourceFiles?.applyDraftSql,
      fingerprintPrecheckSql: "output/employee-data-migration/2026-06-16/weekly-teamreports-correction-fingerprint-package.precheck.sql",
      globalPrecheckSql: "output/employee-data-migration/2026-06-16/database-100-global-precheck.sql",
      verifier: "scripts/migrations/employee-data/weekly-teamreports-correction-rehearsal-verify.mjs",
      sqlMustEndWith: "ROLLBACK",
      expectedAffectedRows: 10,
      expectedAfterShaMatches: 10,
      afterRollbackPrecheckRequired: true,
    },
    passCriteria: authorization.rollbackRehearsalPassCriteria,
    stopConditions: authorization.stopConditions,
    stillForbidden: authorization.stillForbidden,
    summary: {
      checks: checks.length,
      failedChecks: failedChecks.length,
      globalPrecheckStatus: globalPrecheck.status,
      globalPrecheckMismatches: globalPrecheck.summary?.mismatches,
      sqlGuardStatus: sqlGuard.status,
      sqlGuardFailedChecks: sqlGuard.summary?.failedChecks,
      writeGateStatus: writeGate.status,
      authorizationStatus: authorization.status,
    },
    failedChecks,
    checks,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Weekly teamReports ROLLBACK 事务试跑授权请求包");
  lines.push("");
  lines.push(`生成时间：${report.generatedAt}`);
  lines.push(`状态：\`${report.status}\``);
  lines.push("");
  lines.push("## 结论");
  lines.push("");
  if (report.status === "ready_to_request_explicit_rollback_rehearsal_authorization") {
    lines.push("当前门禁允许向用户请求下一步明确授权，但本文件本身不授权执行 SQL。");
  } else {
    lines.push("当前门禁不允许请求事务试跑授权，必须先修复失败检查。");
  }
  lines.push("");
  lines.push("如要进入下一步，用户需要明确说出：");
  lines.push("");
  lines.push(`\`${report.exactAuthorizationPhrase}\``);
  lines.push("");
  lines.push("这只代表允许执行保留 `ROLLBACK;` 的事务试跑，不代表允许 `COMMIT`。");
  lines.push("");
  lines.push("## 当前门禁");
  lines.push("");
  lines.push("| 项目 | 值 |");
  lines.push("| --- | --- |");
  lines.push(`| canRequestRollbackRehearsalAuthorization | \`${report.currentGate.canRequestRollbackRehearsalAuthorization}\` |`);
  lines.push(`| rollbackRehearsalAuthorizedByThisArtifact | \`${report.currentGate.rollbackRehearsalAuthorizedByThisArtifact}\` |`);
  lines.push(`| commitAllowed | \`${report.currentGate.commitAllowed}\` |`);
  lines.push(`| deploymentAllowed | \`${report.currentGate.deploymentAllowed}\` |`);
  lines.push(`| productionWriteAllowed | \`${report.currentGate.productionWriteAllowed}\` |`);
  lines.push("");
  lines.push("## 演练计划");
  lines.push("");
  lines.push("- 重新执行全局只读 precheck。");
  lines.push("- 重新执行 SQL 静态守卫。");
  lines.push("- 在事务中执行 apply draft，但必须保留最后的 `ROLLBACK;`。");
  lines.push("- 捕获试跑输出并用 rehearsal verifier 解析。");
  lines.push("- 回滚后再次执行只读 precheck，证明生产数据回到 before SHA。");
  lines.push("");
  lines.push("## 通过标准");
  lines.push("");
  lines.push(`- before SHA 全部吻合：${report.passCriteria?.beforeShaMatches}`);
  lines.push(`- 目标周报 direct payload links：${report.passCriteria?.targetPayloadLinksMustRemain}`);
  lines.push(`- apply affectedRows：${report.passCriteria?.applyAffectedRowsExpected}`);
  lines.push(`- apply postcheck after SHA：${report.passCriteria?.applyPostcheckAfterShaExpected}`);
  lines.push(`- ROLLBACK 后 before SHA 再次吻合：${report.passCriteria?.afterRollbackBeforeShaMatchesAgain}`);
  lines.push(`- shared/shared draft：${report.passCriteria?.sharedSharedDraft}`);
  lines.push(`- distinct sourceSha16：${report.passCriteria?.sharedDistinctSha16}`);
  lines.push("");
  lines.push("## 仍然禁止");
  lines.push("");
  for (const item of report.stillForbidden || []) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("## 检查摘要");
  lines.push("");
  lines.push("| 检查 | 结果 |");
  lines.push("| --- | --- |");
  for (const check of report.checks) {
    lines.push(`| ${check.name} | \`${check.passed ? "passed" : "failed"}\` |`);
  }
  lines.push("");
  lines.push("## 输入文件");
  lines.push("");
  for (const [name, filePath] of Object.entries(report.inputs)) {
    lines.push(`- ${name}: \`${filePath}\``);
  }
  lines.push("");
  lines.push("## 安全声明");
  lines.push("");
  lines.push("本文件和生成器只读取 JSON 产物并写出授权请求包，不连接数据库、不执行 SQL、不写生产库、不部署、不重启、不打 rollback tag。");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function main() {
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

  console.log(JSON.stringify({
    status: report.status,
    exactAuthorizationPhrase: report.exactAuthorizationPhrase,
    failedChecks: report.summary.failedChecks,
    commitAllowed: report.currentGate.commitAllowed,
    deploymentAllowed: report.currentGate.deploymentAllowed,
  }));

  if (report.status !== "ready_to_request_explicit_rollback_rehearsal_authorization") {
    process.exit(2);
  }
}

main();
