#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

DEPLOY_HOST="${DEPLOY_HOST:-root@49.232.57.98}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/huigui-crm}"
CERT_NAME="${CERT_NAME:-crm.hui-health.com}"

AUTH_HOOK="${DEPLOY_PATH}/scripts/ops/certbot-dnspod-auth.sh"
CLEANUP_HOOK="${DEPLOY_PATH}/scripts/ops/certbot-dnspod-cleanup.sh"
DEPLOY_HOOK="${DEPLOY_PATH}/scripts/ops/huigui-nginx-certbot-deploy-hook.sh"
RENEWAL_CONF="/etc/letsencrypt/renewal/${CERT_NAME}.conf"

SSH_ARGS=(-o BatchMode=yes -o ConnectTimeout=10)

usage() {
  cat <<'EOF'
用法：
  bash ./scripts/ops/configure-dnspod-certbot-renewal.sh

默认行为：
  1. 检查正式机上的 certbot renewal 配置是否存在
  2. 检查 DNSPod auth / cleanup / deploy hook 是否已同步到正式机
  3. 将 renewal 配置切到 DNSPod 自动加删 TXT + Nginx reload

可用环境变量：
  DEPLOY_HOST   默认 root@49.232.57.98；在正式机本机执行时可设为 local
  DEPLOY_PATH   默认 /opt/huigui-crm
  CERT_NAME     默认 crm.hui-health.com
EOF
}

is_local_host() {
  case "${DEPLOY_HOST}" in
    local|localhost|127.0.0.1)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

remote_exec() {
  if is_local_host; then
    bash -lc "$*"
  else
    ssh "${SSH_ARGS[@]}" "${DEPLOY_HOST}" "$@"
  fi
}

log() {
  printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

log "检查正式机 hook 与 renewal 配置"
remote_exec "test -f '${RENEWAL_CONF}'"
remote_exec "test -x '${AUTH_HOOK}' && test -x '${CLEANUP_HOOK}' && test -x '${DEPLOY_HOOK}'"

log "写入 certbot renewal hook"
remote_exec "
  conf='${RENEWAL_CONF}'
  tmp=\$(mktemp)
  grep -vE '^(manual_auth_hook|manual_cleanup_hook|deploy_hook)\\s*=' \"\$conf\" >\"\$tmp\"
  cat >>\"\$tmp\" <<'EOF'
manual_auth_hook = ${AUTH_HOOK}
manual_cleanup_hook = ${CLEANUP_HOOK}
deploy_hook = ${DEPLOY_HOOK}
EOF
  mv \"\$tmp\" \"\$conf\"
  sed -n '1,120p' \"\$conf\"
"

log "renewal 配置已切换到 DNSPod hook"
