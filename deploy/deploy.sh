#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

USE_LOCAL_MYSQL=1

if [[ "${1:-}" == "--skip-mysql" ]]; then
  USE_LOCAL_MYSQL=0
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "已生成 .env，请先按实际域名、密码和数据库信息修改后再重新执行部署。"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "未检测到 docker 命令，请先在 Lighthouse 上安装 Docker CE 与 Docker Compose 插件。"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "当前环境缺少 docker compose 插件，请先安装后再继续部署。"
  exit 1
fi

read_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env | tail -n 1 || true)"
  if [[ -z "${line}" ]]; then
    return 1
  fi
  line="${line#*=}"
  line="${line%\"}"
  line="${line#\"}"
  line="${line%\'}"
  line="${line#\'}"
  printf '%s' "${line}"
}

MYSQL_DATA_DIR_VALUE="$(read_env_value MYSQL_DATA_DIR || true)"
UPLOADS_DIR_VALUE="$(read_env_value UPLOADS_DIR || true)"
APP_BASE_URL_VALUE="$(read_env_value APP_BASE_URL || true)"

mkdir -p "${MYSQL_DATA_DIR_VALUE:-./storage/mysql}"
mkdir -p "${UPLOADS_DIR_VALUE:-./storage/uploads}"

echo "==> Validating docker compose configuration"
docker compose config >/dev/null

echo "==> Building images"
docker compose build --pull

if [[ "${USE_LOCAL_MYSQL}" == "1" ]]; then
  echo "==> Starting nginx + app + api + mysql"
  docker compose up -d mysql api app nginx
else
  echo "==> Starting nginx + app + api (skip local mysql)"
  docker compose up -d api app nginx
fi

echo "==> Current status"
docker compose ps

echo "==> Done"
echo "访问地址: ${APP_BASE_URL_VALUE:-http://localhost}"
echo "查看日志: docker compose logs -f nginx api app"
