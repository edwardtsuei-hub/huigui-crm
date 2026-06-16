import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const delimiterIndex = line.indexOf("=");
    if (delimiterIndex === -1) {
      continue;
    }

    const key = line.slice(0, delimiterIndex).trim();
    let value = line.slice(delimiterIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  const candidateFiles = [
    resolve(process.cwd(), "apps/api/.env"),
    resolve(process.cwd(), ".env"),
  ];

  for (const filePath of candidateFiles) {
    try {
      const env = parseEnvFile(filePath);
      if (env.DATABASE_URL?.trim()) {
        return env.DATABASE_URL.trim();
      }
    } catch {
      // Ignore missing or unreadable env files and keep looking.
    }
  }

  return "";
}

function resolveCommand(command) {
  const localBin = resolve(process.cwd(), "node_modules/.bin", command);
  if (existsSync(localBin)) {
    return localBin;
  }

  return command;
}

const [, , command, ...args] = process.argv;

if (!command) {
  console.error("Usage: node scripts/with-local-db-env.mjs <command> [...args]");
  process.exit(1);
}

const databaseUrl = resolveDatabaseUrl();
const result = spawnSync(resolveCommand(command), args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
