#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const syncStatePath = path.join(rootDir, "docs", "deploy-sync-state.json");

const EXCLUDES = [
  ".git/",
  ".DS_Store",
  "._*",
  ".env",
  ".env.local",
  ".npm-cache/",
  ".playwright-cli/",
  "node_modules/",
  ".next/",
  "dist/",
  "coverage/",
  "backups/",
  "output/",
  "logs/",
  "storage/",
  "tmp/",
  "__pycache__/",
  "*.pyc",
  "*.log",
  "*.zip",
  "apps/api/.env",
  "apps/web/.env",
  "apps/web/tsconfig.tsbuildinfo",
];

function loadSyncState() {
  if (!existsSync(syncStatePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(syncStatePath, "utf8"));
  } catch (error) {
    throw new Error(`无法读取同步状态文件：${error instanceof Error ? error.message : String(error)}`);
  }
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `${command} 执行失败`);
  }

  return result.stdout ?? "";
}

function buildRsyncArgs(host, deployPath) {
  const args = [
    "-az",
    "--delete",
    "--dry-run",
    "--checksum",
    "--human-readable",
    "--out-format=%i %n%L",
  ];

  EXCLUDES.forEach((pattern) => {
    args.push("--exclude", pattern);
  });

  args.push(
    "-e",
    "ssh -o BatchMode=yes -o ConnectTimeout=10",
    `${rootDir}/`,
    `${host}:${deployPath}/`,
  );

  return args;
}

function parseRsyncLines(output) {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .filter(
      (line) =>
        line !== "sending incremental file list" &&
        !line.startsWith("sent ") &&
        !line.startsWith("total size is "),
    );
}

function summarizeChanges(lines) {
  const summary = {
    add: [],
    update: [],
    delete: [],
    mkdir: [],
    other: [],
  };

  lines.forEach((line) => {
    if (line.startsWith("*deleting ")) {
      summary.delete.push(line.replace("*deleting ", ""));
      return;
    }

    const match = line.match(/^(\S+)\s+(.+)$/);
    if (!match) {
      summary.other.push(line);
      return;
    }

    const indicator = match[1];
    const filePath = match[2];

    if (indicator.includes("+++++++")) {
      if (indicator[1] === "d") {
        summary.mkdir.push(filePath);
      } else {
        summary.add.push(filePath);
      }
      return;
    }

    if (indicator[1] === "d") {
      summary.mkdir.push(filePath);
      return;
    }

    summary.update.push(filePath);
  });

  return summary;
}

function printList(title, items, limit = 30) {
  if (!items.length) {
    return;
  }

  console.log(`${title}：${items.length}`);
  items.slice(0, limit).forEach((item) => {
    console.log(`- ${item}`);
  });
  if (items.length > limit) {
    console.log(`- ... 另有 ${items.length - limit} 项`);
  }
}

function main() {
  const state = loadSyncState();
  const production = state?.targets?.production ?? {};
  const host = process.env.DEPLOY_HOST || production.host || "root@49.232.57.98";
  const deployPath = process.env.DEPLOY_PATH || production.path || "/opt/huigui-crm";

  console.log("生产同步状态");
  console.log(`- 本地优先：是`);
  console.log(`- 目标服务器：${host}`);
  console.log(`- 目标目录：${deployPath}`);

  if (production.lastKnownSync) {
    const sync = production.lastKnownSync;
    console.log(
      `- 最后已知同步：${sync.date}${sync.time ? ` ${sync.time}` : ""} · ${sync.label}`,
    );
    console.log(`- 同步方式：${sync.method}`);
    if (sync.recordPath) {
      console.log(`- 记录文件：${sync.recordPath}`);
    }
  } else {
    console.log("- 最后已知同步：暂无记录");
  }

  if (production.recordsPendingSync) {
    console.log("- 记录状态：本地同步台账尚未回写到服务器");
  }

  const sshCheck = spawnSync(
    "ssh",
    ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10", host, "echo", "ssh-ok"],
    {
      cwd: rootDir,
      encoding: "utf8",
    },
  );

  if (sshCheck.status !== 0) {
    throw new Error(sshCheck.stderr?.trim() || "无法连接到目标服务器");
  }

  const output = runCommand("rsync", buildRsyncArgs(host, deployPath));
  const lines = parseRsyncLines(output);
  const summary = summarizeChanges(lines);
  const totalPending =
    summary.add.length +
    summary.update.length +
    summary.delete.length +
    summary.mkdir.length +
    summary.other.length;

  if (totalPending === 0) {
    console.log("- 当前状态：本地与服务器已对齐，没有待同步变更");
    return;
  }

  console.log(`- 当前状态：发现 ${totalPending} 项待同步变更`);
  printList("待新增文件", summary.add);
  printList("待更新文件", summary.update);
  printList("待删除文件", summary.delete);
  printList("待创建目录", summary.mkdir, 10);
  printList("其他差异", summary.other, 20);
}

try {
  main();
} catch (error) {
  console.error(
    `Error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
