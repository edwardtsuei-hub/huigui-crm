#!/usr/bin/env bash

set -Eeuo pipefail

cd /opt/huigui-crm

if [[ ! -f docker-compose.yml ]]; then
  echo "docker-compose.yml not found in /opt/huigui-crm"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo ".env not found in /opt/huigui-crm"
  exit 1
fi

echo "==> Pulling latest code"
git pull origin main

echo "==> Building containers"
docker compose build

echo "==> Restarting containers"
docker compose up -d

echo "==> Current status"
docker compose ps

echo "==> Recent logs"
docker compose logs --tail=80 nginx api app mysql
