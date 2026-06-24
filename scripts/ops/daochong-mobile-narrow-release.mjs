#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOST = process.env.DEPLOY_HOST || "root@49.232.57.98";
const DEPLOY_PATH = process.env.DEPLOY_PATH || "/opt/huigui-crm";
const BACKUP_ROOT = process.env.BACKUP_ROOT || "/opt/huigui-backups";
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const LABEL = process.env.DEPLOY_LABEL || `daochong-mobile-narrow-${timestamp}`;
const EXECUTE = process.argv.includes("--execute");
const SKIP_LOCAL_VERIFY = process.argv.includes("--skip-local-verify");
const SKIP_REMOTE_BUILD = process.argv.includes("--skip-remote-build");
const SKIP_MIGRATE = process.argv.includes("--skip-migrate");
const SKIP_RESTART = process.argv.includes("--skip-restart");
const ENABLE_PRODUCTION_WRITES = process.env.DAOCHONG_RELEASE_ENABLE_PRODUCTION_WRITES === "true";
const STAGING_ROOT = path.join(ROOT, "output", "daochong-mobile-narrow-release", LABEL);
const ORIGINAL_ROOT = path.join(STAGING_ROOT, "original");
const MERGED_ROOT = path.join(STAGING_ROOT, "merged");

const sshArgs = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"];
const mergeFiles = [
  "apps/api/src/app.module.ts",
  "apps/web/middleware.ts",
  "prisma/schema.prisma",
  "docker-compose.yml",
  "app/Dockerfile",
  "deploy/nginx.conf",
];

const syncFiles = [
  "apps/api/src/common/decorators/permissions.decorator.ts",
  "apps/api/src/common/guards/permissions.guard.ts",
  "apps/api/src/management/management.constants.ts",
];

const syncDirs = [
  "apps/api/src/daochong-mobile",
  "apps/web/app/daochong-mobile",
  "apps/web/app/daochong-mobile-gray",
  "apps/web/app/daochong-mobile-preview",
  "apps/web/components/daochong",
  "prisma/migrations/20260623103000_daochong_service_notes",
  "prisma/migrations/20260623200000_daochong_finance_readonly_models",
  "prisma/migrations/20260623210000_daochong_money_readonly_models",
  "prisma/migrations/20260624184000_daochong_limeng_review_permissions",
];

const envSwitches = {
  ENABLE_DAOCHONG_MOBILE_GRAY: "true",
  NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY: "true",
  NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE: "api-readonly",
  NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH: "true",
  DAOCHONG_MOBILE_SHADOW_READONLY: "true",
  DAOCHONG_MOBILE_HIGH_RISK_READONLY: "true",
  DAOCHONG_MOBILE_WRITE_ENABLED: ENABLE_PRODUCTION_WRITES ? "true" : "false",
};

const daochongEnumNames = [
  "DaochongServiceNoteStatus",
  "DaochongServiceNoteSourceType",
  "DaochongPreferenceSyncStatus",
  "DaochongCustomerPreferenceType",
  "DaochongPreferenceVisibility",
  "DaochongPaymentMethod",
  "DaochongRechargeStatus",
  "DaochongSettlementDraftStatus",
  "DaochongCardMode",
  "DaochongConsumptionApprovalStatus",
  "DaochongFinanceStatus",
  "DaochongPayrollPreviewStatus",
  "DaochongFinanceBusinessType",
  "DaochongFinanceExceptionStatus",
  "DaochongBonusExpenseType",
  "DaochongBonusExpenseFinanceStatus",
];

const daochongModelNames = [
  "DaochongServiceNote",
  "DaochongCustomerPreference",
  "DaochongFinanceSummary",
  "DaochongFinanceEvidenceException",
  "DaochongBonusExpenseItem",
  "DaochongCustomerRecharge",
  "DaochongServiceSettlementDraft",
  "DaochongCardConsumptionApproval",
];

function log(message) {
  console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${message}`);
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.capture ? ["pipe", "pipe", "pipe"] : "inherit",
    input: options.input,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(stderr || `${command} ${args.join(" ")} failed with ${result.status}`);
  }

  return result.stdout ?? "";
}

function ssh(command, options = {}) {
  return run("ssh", [...sshArgs, HOST, command], options);
}

function ensureParent(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeStaged(root, relativePath, content) {
  const target = path.join(root, relativePath);
  ensureParent(target);
  writeFileSync(target, content);
}

function readLocal(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readRemote(relativePath) {
  return ssh(`cd ${shellQuote(DEPLOY_PATH)} && cat ${shellQuote(relativePath)}`, { capture: true });
}

function insertAfterIfMissing(source, anchor, addition, marker, label) {
  if (source.includes(marker)) {
    return source;
  }
  if (!source.includes(anchor)) {
    throw new Error(`Missing anchor for ${label}`);
  }
  return source.replace(anchor, `${anchor}${addition}`);
}

function insertBeforeIfMissing(source, anchor, addition, marker, label) {
  if (source.includes(marker)) {
    return source;
  }
  if (!source.includes(anchor)) {
    throw new Error(`Missing anchor for ${label}`);
  }
  return source.replace(anchor, `${addition}${anchor}`);
}

function findBlockRange(source, kind, name) {
  const token = `${kind} ${name} {`;
  const start = source.indexOf(token);
  if (start === -1) {
    throw new Error(`Missing ${kind} ${name}`);
  }

  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") {
      depth += 1;
    } else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return { start, end: i + 1, block: source.slice(start, i + 1) };
      }
    }
  }

  throw new Error(`Unclosed ${kind} ${name}`);
}

function extractBlock(source, kind, name) {
  return findBlockRange(source, kind, name).block;
}

function insertAfterBlockIfMissing(source, kind, name, addition, marker) {
  if (source.includes(marker)) {
    return source;
  }
  const range = findBlockRange(source, kind, name);
  return `${source.slice(0, range.end)}\n\n${addition}${source.slice(range.end)}`;
}

function daochongRelationLines(localSchema, modelName) {
  return extractBlock(localSchema, "model", modelName)
    .split("\n")
    .filter((line) => line.includes("daochong"))
    .join("\n");
}

function insertRelationLines(source, modelName, localSchema, beforeMarker, firstFieldName) {
  const relationLines = daochongRelationLines(localSchema, modelName);
  if (!relationLines) {
    throw new Error(`No Daochong relation lines found for ${modelName}`);
  }

  const range = findBlockRange(source, "model", modelName);
  const block = range.block;
  if (new RegExp(`\\b${firstFieldName}\\b`).test(block)) {
    return source;
  }

  const markerIndex = block.indexOf(beforeMarker);
  if (markerIndex === -1) {
    throw new Error(`Missing relation anchor for ${modelName}`);
  }

  const nextBlock = `${block.slice(0, markerIndex)}${relationLines}\n${block.slice(markerIndex)}`;
  return `${source.slice(0, range.start)}${nextBlock}${source.slice(range.end)}`;
}

function patchAppModule(source) {
  let next = source;
  next = insertAfterIfMissing(
    next,
    'import { CustomersService } from "./customers/customers.service";\n',
    'import { DaochongMobileReadonlyController } from "./daochong-mobile/daochong-mobile.controller";\nimport { DaochongMobileReadonlyService } from "./daochong-mobile/daochong-mobile.service";\n',
    "DaochongMobileReadonlyController",
    "app.module imports",
  );
  next = insertAfterIfMissing(
    next,
    "    CustomerFollowupsController,\n",
    "    DaochongMobileReadonlyController,\n",
    "    DaochongMobileReadonlyController,",
    "app.module controllers",
  );
  next = insertAfterIfMissing(
    next,
    "    CustomersService,\n",
    "    DaochongMobileReadonlyService,\n",
    "    DaochongMobileReadonlyService,",
    "app.module providers",
  );
  return next;
}

function patchMiddleware(source) {
  let next = source;
  next = insertBeforeIfMissing(
    next,
    "\nfunction previewRoutesEnabled()",
    '\nconst PREVIEW_ROUTE_ALIASES: Record<string, string> = {\n  "/daochong-mobile-gray": "/daochong-mobile-preview",\n};\n\nconst DAOCHONG_MOBILE_GRAY_PATH = "/daochong-mobile";\n',
    "PREVIEW_ROUTE_ALIASES",
    "middleware aliases",
  );
  next = insertBeforeIfMissing(
    next,
    "\nfunction isPreviewRoute",
    '\nfunction daochongMobileGrayEnabled() {\n  return (\n    process.env.ENABLE_DAOCHONG_MOBILE_GRAY === "true" ||\n    process.env.NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY === "true"\n  );\n}\n',
    "function daochongMobileGrayEnabled",
    "middleware gate",
  );
  next = insertAfterIfMissing(
    next,
    "  const pathname = request.nextUrl.pathname;\n",
    '\n  if (pathname in PREVIEW_ROUTE_ALIASES) {\n    return redirectTo(request, PREVIEW_ROUTE_ALIASES[pathname]);\n  }\n\n  if (\n    process.env.NODE_ENV === "production" &&\n    pathname === DAOCHONG_MOBILE_GRAY_PATH &&\n    !daochongMobileGrayEnabled()\n  ) {\n    return redirectTo(request, "/dashboard");\n  }\n',
    "pathname in PREVIEW_ROUTE_ALIASES",
    "middleware route checks",
  );
  return next;
}

function patchDockerCompose(source) {
  let next = source;
  const buildAnchor =
    "      args:\n        NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME:-洄归生态客户管理与报价协同系统}\n        NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-/api}\n";
  const buildReplacement =
    "      args:\n        NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME:-洄归生态客户管理与报价协同系统}\n        NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-/api}\n        NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY: ${NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY:-false}\n        NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE: ${NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE:-mock}\n        NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH: ${NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH:-false}\n";
  if (!next.includes("        NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE: ${NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE:-mock}")) {
    if (!next.includes(buildAnchor)) {
      throw new Error("Missing docker-compose app build args anchor");
    }
    next = next.replace(buildAnchor, buildReplacement);
  }

  const appEnvAnchor =
    "      NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME:-洄归生态客户管理与报价协同系统}\n      NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-/api}\n";
  const appEnvReplacement =
    "      NEXT_PUBLIC_APP_NAME: ${NEXT_PUBLIC_APP_NAME:-洄归生态客户管理与报价协同系统}\n      NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-/api}\n      NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY: ${NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY:-false}\n      NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE: ${NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE:-mock}\n      NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH: ${NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH:-false}\n";
  if (!next.includes("      NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE: ${NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE:-mock}")) {
    if (!next.includes(appEnvAnchor)) {
      throw new Error("Missing docker-compose app environment anchor");
    }
    next = next.replace(appEnvAnchor, appEnvReplacement);
  }

  next = insertAfterIfMissing(
    next,
    "      WEEKLY_PERSONAL_SUMMARY_MEMBERS: ${WEEKLY_PERSONAL_SUMMARY_MEMBERS:-}\n",
    "      DAOCHONG_MOBILE_SHADOW_READONLY: ${DAOCHONG_MOBILE_SHADOW_READONLY:-false}\n      DAOCHONG_MOBILE_HIGH_RISK_READONLY: ${DAOCHONG_MOBILE_HIGH_RISK_READONLY:-false}\n",
    "DAOCHONG_MOBILE_SHADOW_READONLY",
    "docker-compose api environment",
  );
  next = insertAfterIfMissing(
    next,
    "      DAOCHONG_MOBILE_HIGH_RISK_READONLY: ${DAOCHONG_MOBILE_HIGH_RISK_READONLY:-false}\n",
    "      DAOCHONG_MOBILE_WRITE_ENABLED: ${DAOCHONG_MOBILE_WRITE_ENABLED:-false}\n      DAOCHONG_WECOM_TEST_SEND_ENABLED: ${DAOCHONG_WECOM_TEST_SEND_ENABLED:-false}\n      DAOCHONG_WECOM_TEST_ALLOWLIST: ${DAOCHONG_WECOM_TEST_ALLOWLIST:-}\n      DAOCHONG_MOBILE_NOTIFY_BASE_URL: ${DAOCHONG_MOBILE_NOTIFY_BASE_URL:-}\n",
    "DAOCHONG_MOBILE_WRITE_ENABLED",
    "docker-compose api daochong write environment",
  );
  return next;
}

function patchAppDockerfile(source) {
  let next = source;
  next = insertAfterIfMissing(
    next,
    "ARG NEXT_PUBLIC_API_BASE_URL=/api\n",
    "ARG NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY=false\nARG NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE=mock\nARG NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH=false\n",
    "ARG NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE",
    "app Dockerfile args",
  );
  next = insertAfterIfMissing(
    next,
    "ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}\n",
    "ENV NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY=${NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY}\nENV NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE=${NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE}\nENV NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH=${NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH}\n",
    "ENV NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE",
    "app Dockerfile env",
  );
  return next;
}

function patchNginx(source) {
  return insertBeforeIfMissing(
    source,
    "    location ^~ /employee-payroll/assets/ {\n",
    `    location ^~ /_next/ {
        proxy_pass http://huigui_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 90s;
    }

    location ^~ /daochong-mobile {
        proxy_pass http://huigui_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 90s;
    }

`,
    "location ^~ /daochong-mobile",
    "management nginx Daochong route",
  );
}

function patchSchema(remoteSchema, localSchema) {
  let next = remoteSchema;
  const enumBlocks = daochongEnumNames.map((name) => extractBlock(localSchema, "enum", name)).join("\n\n");
  next = insertBeforeIfMissing(
    next,
    "\nenum InspectionOrderStatus",
    `\n${enumBlocks}\n`,
    "enum DaochongServiceNoteStatus",
    "Daochong enums",
  );
  next = insertRelationLines(
    next,
    "User",
    localSchema,
    "  salesOrdersOwned",
    "daochongServiceNotesTaught",
  );
  next = insertRelationLines(
    next,
    "Customer",
    localSchema,
    "  quotations",
    "daochongServiceNotes",
  );
  next = insertRelationLines(
    next,
    "Product",
    localSchema,
    "  reviewedParseLogs",
    "daochongServiceNotes",
  );

  const modelBlocks = daochongModelNames.map((name) => extractBlock(localSchema, "model", name)).join("\n\n");
  next = insertAfterBlockIfMissing(
    next,
    "model",
    "CustomerFollowup",
    `${modelBlocks}\n`,
    "model DaochongServiceNote",
  );
  return next;
}

function buildMergedFiles() {
  log("Fetching production files for narrow merge");
  mkdirSync(ORIGINAL_ROOT, { recursive: true });
  mkdirSync(MERGED_ROOT, { recursive: true });

  const localSchema = readLocal("prisma/schema.prisma");
  const remoteFiles = Object.fromEntries(
    mergeFiles.map((relativePath) => [relativePath, readRemote(relativePath)]),
  );

  const mergedFiles = {
    "apps/api/src/app.module.ts": patchAppModule(remoteFiles["apps/api/src/app.module.ts"]),
    "apps/web/middleware.ts": patchMiddleware(remoteFiles["apps/web/middleware.ts"]),
    "prisma/schema.prisma": patchSchema(remoteFiles["prisma/schema.prisma"], localSchema),
    "docker-compose.yml": patchDockerCompose(remoteFiles["docker-compose.yml"]),
    "app/Dockerfile": patchAppDockerfile(remoteFiles["app/Dockerfile"]),
    "deploy/nginx.conf": patchNginx(remoteFiles["deploy/nginx.conf"]),
  };

  for (const relativePath of mergeFiles) {
    writeStaged(ORIGINAL_ROOT, relativePath, remoteFiles[relativePath]);
    writeStaged(MERGED_ROOT, relativePath, mergedFiles[relativePath]);
  }

  return mergedFiles;
}

function runLocalVerifications() {
  if (SKIP_LOCAL_VERIFY) {
    log("Skipping local verification by request");
    return;
  }

  log("Running local Daochong write checks");
  run("npx", ["prisma", "validate"]);
  run("npm", ["run", "verify:daochong-mobile-write"]);
  run("npm", ["run", "test:daochong-mobile-write"]);
  run("npm", ["run", "lint", "-w", "@huigui/api"]);
  run("npm", ["run", "lint", "-w", "@huigui/web"]);
}

function validateMergedSchema() {
  log("Validating merged Prisma schema");
  run("npx", ["prisma", "validate", "--schema", path.join(MERGED_ROOT, "prisma/schema.prisma")]);
}

function rsyncArgsFor(source, remoteRelativePath, dryRun = false) {
  const args = ["-az", "--itemize-changes"];
  if (dryRun) {
    args.push("--dry-run");
  }
  args.push("-e", `ssh ${sshArgs.join(" ")}`, source, `${HOST}:${DEPLOY_PATH}/${remoteRelativePath}`);
  return args;
}

function dryRunSyncPlan() {
  log("Previewing narrow file sync");
  for (const relativePath of mergeFiles) {
    run("rsync", rsyncArgsFor(path.join(MERGED_ROOT, relativePath), relativePath, true));
  }
  for (const relativePath of syncFiles) {
    run("rsync", rsyncArgsFor(path.join(ROOT, relativePath), relativePath, true));
  }
  for (const relativePath of syncDirs) {
    run("rsync", rsyncArgsFor(`${path.join(ROOT, relativePath)}/`, `${relativePath}/`, true));
  }
}

function createRemoteBackup() {
  log("Creating production narrow backup");
  const paths = [".env", ...mergeFiles, ...syncFiles, ...syncDirs].map(shellQuote).join(" ");
  const command = `
set -Eeuo pipefail
cd ${shellQuote(DEPLOY_PATH)}
mkdir -p ${shellQuote(BACKUP_ROOT)}
backup=${shellQuote(`${BACKUP_ROOT}/${LABEL}.tar.gz`)}
tmp_list="$(mktemp)"
for path in ${paths}; do
  if [ -e "$path" ]; then
    printf '%s\\n' "$path" >> "$tmp_list"
  fi
done
tar -czf "$backup" -T "$tmp_list"
rm -f "$tmp_list"
printf '%s\\n' "$backup"
`;
  const backupPath = ssh(command, { capture: true }).trim().split("\n").at(-1);
  log(`Backup created: ${backupPath}`);
}

function syncToRemote() {
  log("Syncing merged files and Daochong allowlist");
  for (const relativePath of mergeFiles) {
    run("rsync", rsyncArgsFor(path.join(MERGED_ROOT, relativePath), relativePath));
  }
  for (const relativePath of syncFiles) {
    run("rsync", rsyncArgsFor(path.join(ROOT, relativePath), relativePath));
  }
  for (const relativePath of syncDirs) {
    run("rsync", rsyncArgsFor(`${path.join(ROOT, relativePath)}/`, `${relativePath}/`));
  }
}

function setRemoteEnvSwitches() {
  log("Setting production Daochong readonly/write switches");
  const entries = Object.entries(envSwitches)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const command = `
set -Eeuo pipefail
cd ${shellQuote(DEPLOY_PATH)}
test -f .env
while IFS='=' read -r key value; do
  [ -n "$key" ] || continue
  if grep -q "^$key=" .env; then
    sed -i "s|^$key=.*|$key=$value|" .env
  else
    printf '\\n%s=%s\\n' "$key" "$value" >> .env
  fi
done <<'EOF'
${entries}
EOF
grep -E '^(ENABLE_DAOCHONG_MOBILE_GRAY|NEXT_PUBLIC_ENABLE_DAOCHONG_MOBILE_GRAY|NEXT_PUBLIC_DAOCHONG_MOBILE_DATA_SOURCE|NEXT_PUBLIC_DAOCHONG_MOBILE_READONLY_FETCH|DAOCHONG_MOBILE_SHADOW_READONLY|DAOCHONG_MOBILE_HIGH_RISK_READONLY|DAOCHONG_MOBILE_WRITE_ENABLED|DAOCHONG_WECOM_TEST_SEND_ENABLED|DAOCHONG_WECOM_TEST_ALLOWLIST|DAOCHONG_MOBILE_NOTIFY_BASE_URL)=' .env | sed 's/=.*$/=***/'
`;
  ssh(command);
}

function runRemoteDeploy() {
  log("Validating production compose and schema");
  ssh(`cd ${shellQuote(DEPLOY_PATH)} && docker compose config >/dev/null && npx prisma validate`);

  if (!SKIP_REMOTE_BUILD) {
    log("Building production api/app images");
    ssh(`cd ${shellQuote(DEPLOY_PATH)} && docker compose build api app`);
  }

  if (!SKIP_MIGRATE) {
    log("Running production Prisma migrate deploy");
    ssh(`cd ${shellQuote(DEPLOY_PATH)} && docker compose run --rm api npx prisma migrate deploy`);
  }

  if (!SKIP_RESTART) {
    log("Restarting production api/app/nginx");
    ssh(`cd ${shellQuote(DEPLOY_PATH)} && docker compose up -d api app nginx`);
  }

  log("Waiting for production API health");
  ssh(`
set -Eeuo pipefail
cd ${shellQuote(DEPLOY_PATH)}
attempts=0
until docker compose exec -T api node -e "
  const http = require('http');
  const req = http.get('http://127.0.0.1:3001/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1));
  req.on('error', () => process.exit(1));
  req.setTimeout(2000, () => { req.destroy(); process.exit(1); });
" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 60 ]; then
    docker compose ps api
    exit 1
  fi
  sleep 2
done
docker compose ps
`);
}

function curlCheck(url) {
  return run(
    "curl",
    ["-k", "-sS", "-o", "/tmp/daochong-narrow-curl.txt", "-w", "%{http_code}", "--max-time", "20", url],
    { capture: true },
  ).trim();
}

function postDeployChecks() {
  log("Running public route checks");
  const urls = [
    "https://management.hui-health.com/api/health",
    "https://management.hui-health.com/daochong-mobile",
    "https://management.hui-health.com/daochong-mobile-preview",
    "https://crm.hui-health.com/daochong-mobile",
    "https://management.hui-health.com/api/daochong/mobile/compensation-rules",
  ];

  for (const url of urls) {
    const code = curlCheck(url);
    console.log(`${url} -> ${code}`);
  }
}

function main() {
  log(`Mode: ${EXECUTE ? "execute" : "dry-run"}`);
  log(`Target: ${HOST}:${DEPLOY_PATH}`);
  log(`Label: ${LABEL}`);
  log(`Production write switch: ${ENABLE_PRODUCTION_WRITES ? "enabled" : "disabled"}`);

  for (const relativePath of [...syncFiles, ...syncDirs]) {
    if (!existsSync(path.join(ROOT, relativePath))) {
      throw new Error(`Missing local release path: ${relativePath}`);
    }
  }

  buildMergedFiles();
  validateMergedSchema();
  runLocalVerifications();
  dryRunSyncPlan();

  if (!EXECUTE) {
    log("Dry-run complete. Re-run with --execute to mutate production.");
    return;
  }

  createRemoteBackup();
  syncToRemote();
  setRemoteEnvSwitches();
  runRemoteDeploy();
  postDeployChecks();
  log("Daochong mobile narrow release complete");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
