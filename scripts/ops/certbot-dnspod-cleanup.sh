#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${DNSPOD_CERTBOT_ENV_FILE:-/root/.config/huigui/dnspod-certbot.env}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

exec python3 "${ROOT_DIR}/scripts/ops/dnspod_certbot_hook.py" cleanup
