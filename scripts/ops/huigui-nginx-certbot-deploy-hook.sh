#!/usr/bin/env bash
set -Eeuo pipefail

CONTAINER_NAME="${HUIGUI_NGINX_CONTAINER:-huigui-nginx}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[certbot-deploy-hook] docker 不存在，跳过 nginx reload" >&2
  exit 0
fi

if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "[certbot-deploy-hook] 容器 ${CONTAINER_NAME} 未运行，跳过 nginx reload" >&2
  exit 0
fi

docker exec "${CONTAINER_NAME}" nginx -s reload
