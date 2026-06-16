#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

DEPLOY_HOST="${DEPLOY_HOST:-root@49.232.57.98}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/huigui-crm}"
PRIMARY_DOMAIN="${PRIMARY_DOMAIN:-crm.hui-health.com}"
MANAGEMENT_DOMAIN="${MANAGEMENT_DOMAIN:-management.hui-health.com}"
EXPECTED_IP="${EXPECTED_IP:-49.232.57.98}"
RESOLVERS="${RESOLVERS:-1.1.1.1 8.8.8.8 223.5.5.5}"
RUN_HTTPS_CHECK="${RUN_HTTPS_CHECK:-1}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

SSH_ARGS=(-o BatchMode=yes -o ConnectTimeout=10)
REMOTE_NGINX_STOPPED=0
CURRENT_STEP="初始化"

usage() {
  cat <<'EOF'
用法：
  bash ./scripts/ops/enable-management-domain.sh

默认行为：
  1. 检查 management 域名是否已在公网解析到正式机
  2. 校验正式机 Nginx 配置已包含 management 域名
  3. 暂停 docker compose 中的 nginx 容器
  4. 用 certbot standalone 扩展现有 crm 证书，加入 management 域名
  5. 重新启动 nginx
  6. 验证证书 SAN、crm 与 management 两个域名的 HTTPS 可达性

可用环境变量：
  DEPLOY_HOST      默认 root@49.232.57.98；在正式机本机执行时可设为 local
  DEPLOY_PATH      默认 /opt/huigui-crm
  PRIMARY_DOMAIN   默认 crm.hui-health.com
  MANAGEMENT_DOMAIN 默认 management.hui-health.com
  EXPECTED_IP      默认 49.232.57.98
  RESOLVERS        默认 "1.1.1.1 8.8.8.8 223.5.5.5"
  CERTBOT_EMAIL    如需显式指定 certbot 邮箱可传入
  RUN_HTTPS_CHECK  设为 0 可跳过最后的 HTTPS 回归检查
EOF
}

log() {
  printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"
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

cleanup() {
  local exit_code="$1"
  if [[ "${REMOTE_NGINX_STOPPED}" == "1" ]]; then
    printf '\n[WARN] 检测到远端 nginx 仍处于停止状态，尝试恢复...\n' >&2
    remote_exec "cd '${DEPLOY_PATH}' && docker compose up -d nginx" || true
  fi
  exit "${exit_code}"
}

trap 'cleanup $?' EXIT

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

resolve_ipv4s() {
  local domain="$1"
  local resolver="$2"

  dig +short "${domain}" A @"${resolver}" | awk '/^[0-9.]+$/'
}

assert_public_dns() {
  local resolver
  local found_any=0

  for resolver in ${RESOLVERS}; do
    local ips=()
    local ip_line
    while IFS= read -r ip_line; do
      [[ -n "${ip_line}" ]] || continue
      ips+=("${ip_line}")
    done < <(resolve_ipv4s "${MANAGEMENT_DOMAIN}" "${resolver}")
    if [[ "${#ips[@]}" -eq 0 ]]; then
      printf '[DNS] %s -> NXDOMAIN / 无 A 记录\n' "${resolver}" >&2
      exit 1
    fi

    printf '[DNS] %s -> %s\n' "${resolver}" "${ips[*]}"
    found_any=1

    if [[ -n "${EXPECTED_IP}" ]]; then
      local matched=0
      local ip
      for ip in "${ips[@]}"; do
        if [[ "${ip}" == "${EXPECTED_IP}" ]]; then
          matched=1
          break
        fi
      done
      if [[ "${matched}" != "1" ]]; then
        printf '[DNS] %s 未解析到预期 IP %s\n' "${resolver}" "${EXPECTED_IP}" >&2
        exit 1
      fi
    fi
  done

  [[ "${found_any}" == "1" ]] || die "未获取到任何公网解析结果"
}

CURRENT_STEP="本地前置检查"
if ! is_local_host; then
  require_cmd ssh
fi
require_cmd dig
require_cmd openssl
require_cmd curl

CURRENT_STEP="公网 DNS 检查"
log "检查 ${MANAGEMENT_DOMAIN} 的公网解析"
assert_public_dns

CURRENT_STEP="远端环境检查"
log "检查正式机 certbot / docker / Nginx 配置"
remote_exec "command -v certbot >/dev/null 2>&1 && command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1"
remote_exec "test -f '${DEPLOY_PATH}/deploy/nginx.conf' && grep -q '${MANAGEMENT_DOMAIN}' '${DEPLOY_PATH}/deploy/nginx.conf'"

CURRENT_STEP="停止远端 nginx"
log "停止正式机 nginx 容器，释放 80 端口给 certbot standalone"
remote_exec "cd '${DEPLOY_PATH}' && docker compose stop nginx"
REMOTE_NGINX_STOPPED=1

CURRENT_STEP="扩展 Let's Encrypt 证书"
log "扩展 ${PRIMARY_DOMAIN} 现有证书，加入 ${MANAGEMENT_DOMAIN}"
if [[ -n "${CERTBOT_EMAIL}" ]]; then
  remote_exec "certbot certonly --standalone --non-interactive --agree-tos -m '${CERTBOT_EMAIL}' --expand --cert-name '${PRIMARY_DOMAIN}' -d '${PRIMARY_DOMAIN}' -d '${MANAGEMENT_DOMAIN}'"
else
  remote_exec "certbot certonly --standalone --non-interactive --agree-tos --register-unsafely-without-email --expand --cert-name '${PRIMARY_DOMAIN}' -d '${PRIMARY_DOMAIN}' -d '${MANAGEMENT_DOMAIN}'"
fi

CURRENT_STEP="恢复远端 nginx"
log "重新启动正式机 nginx 容器"
remote_exec "cd '${DEPLOY_PATH}' && docker compose up -d nginx"
REMOTE_NGINX_STOPPED=0

CURRENT_STEP="证书 SAN 验证"
log "检查证书是否已包含 ${MANAGEMENT_DOMAIN}"
san_output="$(
  remote_exec "openssl s_client -servername '${MANAGEMENT_DOMAIN}' -connect 127.0.0.1:443 </dev/null 2>/dev/null | openssl x509 -noout -ext subjectAltName"
)"
printf '%s\n' "${san_output}"
if [[ "${san_output}" != *"${MANAGEMENT_DOMAIN}"* ]]; then
  die "证书 SAN 中未发现 ${MANAGEMENT_DOMAIN}"
fi

if [[ "${RUN_HTTPS_CHECK}" == "1" ]]; then
  CURRENT_STEP="HTTPS 回归检查"
  log "回归检查 crm 与 management 两个域名"
  CRM_DOMAIN="${PRIMARY_DOMAIN}" CRM_IP="${EXPECTED_IP}" bash "${ROOT_DIR}/scripts/ops/check-crm-https.sh"
  CRM_DOMAIN="${MANAGEMENT_DOMAIN}" CRM_IP="${EXPECTED_IP}" bash "${ROOT_DIR}/scripts/ops/check-crm-https.sh"
fi

CURRENT_STEP="完成"
log "management 域名收尾完成"
