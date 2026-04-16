#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_HOST="${DEPLOY_HOST:-root@49.232.57.98}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/huigui-crm}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/huigui-backups}"
CRM_DOMAIN="${CRM_DOMAIN:-crm.hui-health.com}"
RUN_SEED="${RUN_SEED:-1}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEPLOY_LABEL="ui-sync-${TIMESTAMP}"

if ! command -v rsync >/dev/null 2>&1; then
  echo "缺少 rsync，请先安装后再执行部署。"
  exit 1
fi

remote_exec() {
  ssh "${DEPLOY_HOST}" "$@"
}

echo "==> Preparing remote backup directory"
remote_exec "mkdir -p '${BACKUP_ROOT}'"

echo "==> Backing up current remote source"
remote_exec "
  if [ -d '${DEPLOY_PATH}' ]; then
    tar \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='.next' \
      --exclude='dist' \
      --exclude='storage' \
      --exclude='logs' \
      -czf '${BACKUP_ROOT}/huigui-crm-${DEPLOY_LABEL}.tar.gz' \
      -C '$(dirname "${DEPLOY_PATH}")' \
      '$(basename "${DEPLOY_PATH}")'
  fi
"

echo "==> Syncing local workspace to ${DEPLOY_HOST}:${DEPLOY_PATH}"
rsync -az --delete \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.npm-cache/' \
  --exclude '.playwright-cli/' \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude 'dist/' \
  --exclude 'coverage/' \
  --exclude 'logs/' \
  --exclude 'storage/' \
  --exclude 'tmp/' \
  --exclude '*.log' \
  --exclude '*.zip' \
  --exclude 'apps/api/.env' \
  --exclude 'apps/web/.env' \
  "${ROOT_DIR}/" "${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "==> Rebuilding and restarting docker services"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  docker compose up -d --build api app nginx
"

echo "==> Waiting for API health check"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  attempts=0 &&
  until docker compose exec -T api node -e \"
    const http = require('http');
    const req = http.get('http://127.0.0.1:3001/api/health', (res) => {
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
    req.on('error', () => process.exit(1));
    req.setTimeout(2000, () => {
      req.destroy();
      process.exit(1);
    });
  \" >/dev/null 2>&1; do
    attempts=\$((attempts + 1))
    if [ \"\${attempts}\" -ge 60 ]; then
      echo 'API health check timed out'
      exit 1
    fi
    sleep 2
  done
"

if [ "${RUN_SEED}" = "1" ]; then
  echo "==> Running Prisma seed"
  remote_exec "
    cd '${DEPLOY_PATH}' &&
    docker compose exec -T api npm run db:seed
  "
fi

echo "==> Running HTTPS regression checks"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  CRM_DOMAIN='${CRM_DOMAIN}' ./scripts/ops/check-crm-https.sh
"

echo "==> Current container status"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  docker compose ps
"

echo "==> Deployment completed"
echo "Remote backup: ${BACKUP_ROOT}/huigui-crm-${DEPLOY_LABEL}.tar.gz"
