#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

DEPLOY_HOST="${DEPLOY_HOST:-root@49.232.57.98}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/huigui-crm}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/huigui-backups}"
LOCAL_BACKUP_ROOT="${LOCAL_BACKUP_ROOT:-${ROOT_DIR}/backups}"
CRM_DOMAIN="${CRM_DOMAIN:-crm.hui-health.com}"
CRM_IP="${CRM_IP:-}"
CRM_USERNAME="${CRM_USERNAME:-}"
CRM_PASSWORD="${CRM_PASSWORD:-}"
LOCAL_BUILD_CMD="${LOCAL_BUILD_CMD:-npm run build}"

START_LOCAL_MYSQL="${START_LOCAL_MYSQL:-1}"
RUN_LOCAL_BUILD="${RUN_LOCAL_BUILD:-1}"
RUN_SEED="${RUN_SEED:-1}"
RUN_HTTPS_CHECK="${RUN_HTTPS_CHECK:-1}"
RUN_REMOTE_BACKUP="${RUN_REMOTE_BACKUP:-1}"
RUN_LOCAL_BACKUP="${RUN_LOCAL_BACKUP:-1}"
DRY_RUN="${DRY_RUN:-0}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DOC_DATE="$(date +%F)"
DOC_TIME="$(date +%H:%M:%S)"
DEPLOY_LABEL="${DEPLOY_LABEL:-production-sync-${TIMESTAMP}}"
DEPLOY_PARENT="$(dirname "${DEPLOY_PATH}")"
DEPLOY_BASENAME="$(basename "${DEPLOY_PATH}")"

DEPLOY_DOC_DIR="${ROOT_DIR}/docs/deployments"
DEPLOY_LOG_FILE="${ROOT_DIR}/docs/deployment-log.md"
SYNC_STATE_FILE="${ROOT_DIR}/docs/deploy-sync-state.json"
DEPLOY_RECORD_PATH=""
REMOTE_BACKUP_PATH=""
LOCAL_BACKUP_PATH=""
CURRENT_STEP="初始化"

SSH_ARGS=(-o BatchMode=yes -o ConnectTimeout=10)
RSYNC_SSH="ssh ${SSH_ARGS[*]}"

DEPLOY_NOTES=()
if [[ -n "${DEPLOY_NOTE:-}" ]]; then
  DEPLOY_NOTES+=("${DEPLOY_NOTE}")
fi

GIT_REVISION="workspace-only"
GIT_STATUS_OUTPUT=""

usage() {
  cat <<'EOF'
用法：
  bash ./scripts/ops/deploy-local-to-production.sh [选项]

默认行为：
  1. 检查本地与远端依赖
  2. 备份本地与服务器当前源码
  3. 用 rsync 将本地当前工作区同步到生产目录
  4. 启动远端 MySQL 容器（可跳过）
  5. 构建 api / app 镜像
  6. 执行 Prisma migrate deploy
  7. 执行 seed（可跳过）
  8. 启动 api / app / nginx
  9. 运行 API 健康检查与 HTTPS 回归检查
  10. 在 docs/ 下生成部署记录

常用选项：
  --dry-run             只做检查和 rsync 预览，不执行远端变更
  --skip-local-build    跳过本地 npm run build
  --skip-mysql          不启动远端 mysql 容器
  --skip-seed           跳过 npm run db:seed
  --skip-https-check    跳过 HTTPS 回归检查
  --skip-backup         跳过远端源码备份
  --skip-local-backup   跳过本地源码备份
  --host HOST           指定远端 SSH 地址
  --path PATH           指定远端部署目录
  --domain DOMAIN       指定回归检查域名
  --ip IP               指定回归检查强制解析 IP
  --login-user USER     指定回归检查登录用户名
  --login-password PASS 指定回归检查登录密码
  --local-build-cmd CMD 指定本地构建命令
  --label LABEL         指定部署标签
  --note TEXT           追加一条部署说明，可重复传入
  --help                显示帮助

环境变量同样可用：
  DEPLOY_HOST DEPLOY_PATH BACKUP_ROOT CRM_DOMAIN CRM_IP
  CRM_USERNAME CRM_PASSWORD LOCAL_BUILD_CMD
  START_LOCAL_MYSQL RUN_LOCAL_BUILD RUN_SEED RUN_HTTPS_CHECK RUN_REMOTE_BACKUP RUN_LOCAL_BACKUP DRY_RUN
EOF
}

log() {
  printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

bool_word() {
  if [[ "$1" == "1" ]]; then
    printf '是'
  else
    printf '否'
  fi
}

ensure_arg() {
  local name="$1"
  local value="${2:-}"
  [[ -n "${value}" ]] || die "${name} 需要一个值"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令：$1"
}

remote_exec() {
  ssh "${SSH_ARGS[@]}" "${DEPLOY_HOST}" "$@"
}

capture_git_state() {
  if command -v git >/dev/null 2>&1 && git -C "${ROOT_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    GIT_REVISION="$(git -C "${ROOT_DIR}" rev-parse --short HEAD 2>/dev/null || printf 'workspace-only')"
    GIT_STATUS_OUTPUT="$(git -C "${ROOT_DIR}" status --short --untracked-files=all 2>/dev/null || true)"
  fi
}

render_notes() {
  if [[ "${#DEPLOY_NOTES[@]}" -eq 0 ]]; then
    printf -- "- 未额外填写部署说明，本次按本地当前工作区整体同步。\n"
    return
  fi

  local note
  for note in "${DEPLOY_NOTES[@]}"; do
    printf -- "- %s\n" "${note}"
  done
}

on_error() {
  local exit_code=$?
  printf '\n[ERROR] 部署失败，当前步骤：%s\n' "${CURRENT_STEP}" >&2
  printf '[ERROR] 失败命令：%s\n' "${BASH_COMMAND}" >&2

  if [[ -n "${REMOTE_BACKUP_PATH}" ]]; then
    printf '[ERROR] 远端源码备份：%s\n' "${REMOTE_BACKUP_PATH}" >&2
    printf '[ERROR] 回滚参考：ssh %s %q\n' \
      "${DEPLOY_HOST}" \
      "rm -rf '${DEPLOY_PATH}' && mkdir -p '${DEPLOY_PARENT}' && tar -xzf '${REMOTE_BACKUP_PATH}' -C '${DEPLOY_PARENT}'" >&2
  fi
  if [[ -n "${LOCAL_BACKUP_PATH}" ]]; then
    printf '[ERROR] 本地源码备份：%s\n' "${LOCAL_BACKUP_PATH}" >&2
  fi

  exit "${exit_code}"
}

trap on_error ERR

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --skip-local-build)
      RUN_LOCAL_BUILD=0
      ;;
    --skip-mysql)
      START_LOCAL_MYSQL=0
      ;;
    --skip-seed)
      RUN_SEED=0
      ;;
    --skip-https-check)
      RUN_HTTPS_CHECK=0
      ;;
    --skip-backup)
      RUN_REMOTE_BACKUP=0
      ;;
    --skip-local-backup)
      RUN_LOCAL_BACKUP=0
      ;;
    --host)
      ensure_arg "$1" "${2:-}"
      DEPLOY_HOST="$2"
      shift
      ;;
    --path)
      ensure_arg "$1" "${2:-}"
      DEPLOY_PATH="$2"
      DEPLOY_PARENT="$(dirname "${DEPLOY_PATH}")"
      DEPLOY_BASENAME="$(basename "${DEPLOY_PATH}")"
      shift
      ;;
    --domain)
      ensure_arg "$1" "${2:-}"
      CRM_DOMAIN="$2"
      shift
      ;;
    --ip)
      ensure_arg "$1" "${2:-}"
      CRM_IP="$2"
      shift
      ;;
    --login-user)
      ensure_arg "$1" "${2:-}"
      CRM_USERNAME="$2"
      shift
      ;;
    --login-password)
      ensure_arg "$1" "${2:-}"
      CRM_PASSWORD="$2"
      shift
      ;;
    --local-build-cmd)
      ensure_arg "$1" "${2:-}"
      LOCAL_BUILD_CMD="$2"
      shift
      ;;
    --label)
      ensure_arg "$1" "${2:-}"
      DEPLOY_LABEL="$2"
      shift
      ;;
    --note)
      ensure_arg "$1" "${2:-}"
      DEPLOY_NOTES+=("$2")
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage
      die "未知参数：$1"
      ;;
  esac
  shift
done

mkdir -p "${DEPLOY_DOC_DIR}"

capture_git_state

CURRENT_STEP="本地前置检查"
log "检查本地与远端依赖"
require_cmd ssh
require_cmd rsync
require_cmd tar
require_cmd node
if [[ "${RUN_LOCAL_BUILD}" == "1" && "${DRY_RUN}" == "0" ]]; then
  require_cmd npm
fi

remote_exec "echo 'ssh-ok'" >/dev/null
remote_exec "command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 && command -v tar >/dev/null 2>&1"
remote_exec "[ -d '${DEPLOY_PATH}' ]" || die "远端目录不存在：${DEPLOY_PATH}"
remote_exec "[ -f '${DEPLOY_PATH}/.env' ]" || die "远端缺少 ${DEPLOY_PATH}/.env，脚本默认不会覆盖生产环境变量。"

if [[ "${RUN_LOCAL_BUILD}" == "1" ]]; then
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "Dry run：将执行本地构建 -> ${LOCAL_BUILD_CMD}"
  else
    CURRENT_STEP="本地构建"
    log "执行本地构建：${LOCAL_BUILD_CMD}"
    bash -lc "${LOCAL_BUILD_CMD}"
  fi
fi

if [[ "${RUN_LOCAL_BACKUP}" == "1" ]]; then
  LOCAL_BACKUP_PATH="${LOCAL_BACKUP_ROOT}/huigui-crm-${DEPLOY_LABEL}.tar.gz"
  CURRENT_STEP="本地源码备份"
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "Dry run：将备份本地源码到 ${LOCAL_BACKUP_PATH}"
  else
    log "备份本地源码到 ${LOCAL_BACKUP_PATH}"
    mkdir -p "${LOCAL_BACKUP_ROOT}"
    tar \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='.next' \
      --exclude='dist' \
      --exclude='storage' \
      --exclude='logs' \
      --exclude='coverage' \
      --exclude='tmp' \
      --exclude='backups' \
      -czf "${LOCAL_BACKUP_PATH}" \
      -C "$(dirname "${ROOT_DIR}")" \
      "$(basename "${ROOT_DIR}")"
  fi
fi

if [[ "${RUN_REMOTE_BACKUP}" == "1" ]]; then
  REMOTE_BACKUP_PATH="${BACKUP_ROOT}/huigui-crm-${DEPLOY_LABEL}.tar.gz"
  CURRENT_STEP="远端源码备份"
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "Dry run：将备份远端源码到 ${REMOTE_BACKUP_PATH}"
  else
    log "备份远端源码到 ${REMOTE_BACKUP_PATH}"
    remote_exec "
      mkdir -p '${BACKUP_ROOT}' &&
      if [ -d '${DEPLOY_PATH}' ]; then
        tar \
          --exclude='.git' \
          --exclude='node_modules' \
          --exclude='.next' \
          --exclude='dist' \
          --exclude='storage' \
          --exclude='logs' \
          -czf '${REMOTE_BACKUP_PATH}' \
          -C '${DEPLOY_PARENT}' \
          '${DEPLOY_BASENAME}'
      fi
    "
  fi
fi

CURRENT_STEP="同步本地工作区"
log "同步本地工作区到 ${DEPLOY_HOST}:${DEPLOY_PATH}"
RSYNC_ARGS=(
  -az
  --delete
  --human-readable
  --itemize-changes
  --exclude
  .git/
  --exclude
  .DS_Store
  --exclude
  "._*"
  --exclude
  .env
  --exclude
  .env.local
  --exclude
  ".env.bak*"
  --exclude
  .npm-cache/
  --exclude
  .playwright-cli/
  --exclude
  node_modules/
  --exclude
  .next/
  --exclude
  dist/
  --exclude
  coverage/
  --exclude
  backups/
  --exclude
  output/
  --exclude
  logs/
  --exclude
  storage/
  --exclude
  tmp/
  --exclude
  __pycache__/
  --exclude
  "*.pyc"
  --exclude
  "*.log"
  --exclude
  "*.zip"
  --exclude
  apps/api/.env
  --exclude
  apps/web/.env
  --exclude
  apps/web/tsconfig.tsbuildinfo
)

if [[ "${DRY_RUN}" == "1" ]]; then
  RSYNC_ARGS+=(--dry-run)
fi

rsync "${RSYNC_ARGS[@]}" -e "${RSYNC_SSH}" "${ROOT_DIR}/" "${DEPLOY_HOST}:${DEPLOY_PATH}/"

if [[ "${DRY_RUN}" == "1" ]]; then
  log "Dry run 完成，未执行远端变更。"
  exit 0
fi

CURRENT_STEP="校验远端 docker compose 配置"
log "校验远端 docker compose 配置"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  docker compose config >/dev/null
"

if [[ "${START_LOCAL_MYSQL}" == "1" ]]; then
  CURRENT_STEP="启动远端 MySQL"
  log "启动远端 mysql 容器"
  remote_exec "
    cd '${DEPLOY_PATH}' &&
    docker compose up -d mysql
  "

  CURRENT_STEP="等待远端 MySQL 就绪"
  log "等待远端 mysql 健康检查通过"
  remote_exec "
    cd '${DEPLOY_PATH}' &&
    attempts=0 &&
    until [ \"\$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' huigui-mysql 2>/dev/null || true)\" = 'healthy' ]; do
      attempts=\$((attempts + 1))
      if [ \"\${attempts}\" -ge 60 ]; then
        echo 'MySQL health check timed out'
        docker compose ps mysql
        exit 1
      fi
      sleep 2
    done
  "
fi

CURRENT_STEP="构建远端 api/app 镜像"
log "构建远端 api / app 镜像"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  docker compose build api app
"

CURRENT_STEP="执行 Prisma migrate deploy"
log "执行 Prisma migrate deploy"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  docker compose run --rm api npx prisma migrate deploy
"

if [[ "${RUN_SEED}" == "1" ]]; then
  CURRENT_STEP="执行生产 seed"
  log "执行 npm run db:seed"
  remote_exec "
    cd '${DEPLOY_PATH}' &&
    docker compose run --rm api npm run db:seed
  "
fi

CURRENT_STEP="启动远端 api/app/nginx"
log "启动远端 api / app / nginx"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  docker compose up -d api app nginx
"

CURRENT_STEP="等待 API 健康检查"
log "等待 API 健康检查"
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
      docker compose ps api
      exit 1
    fi
    sleep 2
  done
"

CURRENT_STEP="重载远端 nginx upstream"
log "重载远端 nginx upstream"
remote_exec "
  cd '${DEPLOY_PATH}' &&
  docker compose restart nginx
"

if [[ "${RUN_HTTPS_CHECK}" == "1" ]]; then
  CURRENT_STEP="执行 HTTPS 回归检查"
  log "执行 HTTPS 回归检查"

  REMOTE_HTTPS_ENV="CRM_DOMAIN='${CRM_DOMAIN}'"
  if [[ -n "${CRM_IP}" ]]; then
    REMOTE_HTTPS_ENV="${REMOTE_HTTPS_ENV} CRM_IP='${CRM_IP}'"
  fi
  if [[ -n "${CRM_USERNAME}" ]]; then
    REMOTE_HTTPS_ENV="${REMOTE_HTTPS_ENV} CRM_USERNAME='${CRM_USERNAME}'"
  fi
  if [[ -n "${CRM_PASSWORD}" ]]; then
    REMOTE_HTTPS_ENV="${REMOTE_HTTPS_ENV} CRM_PASSWORD='${CRM_PASSWORD}'"
  fi

  remote_exec "
    cd '${DEPLOY_PATH}' &&
    ${REMOTE_HTTPS_ENV} ./scripts/ops/check-crm-https.sh
  "
fi

CURRENT_STEP="采集远端容器状态"
log "采集远端容器状态"
COMPOSE_STATUS="$(
  remote_exec "
    cd '${DEPLOY_PATH}' &&
    docker compose ps
  "
)"

CURRENT_STEP="写入本地部署记录"
log "写入本地部署记录"
DEPLOY_RECORD_PATH="${DEPLOY_DOC_DIR}/${DOC_DATE}-${TIMESTAMP##*-}-production-sync.md"
RECORD_LINK="./deployments/$(basename "${DEPLOY_RECORD_PATH}")"

cat > "${DEPLOY_RECORD_PATH}" <<EOF
# ${DOC_DATE} ${DOC_TIME} 生产同步记录

## 概览

- 部署标签：\`${DEPLOY_LABEL}\`
- 环境：生产 \`${CRM_DOMAIN}\`
- 目标服务器：\`${DEPLOY_HOST}\`
- 目标目录：\`${DEPLOY_PATH}\`
- 源代码来源：本地当前工作区
- Git 修订：\`${GIT_REVISION}\`

## 本次备注

$(render_notes)

## 执行参数

- 本地构建：$(bool_word "${RUN_LOCAL_BUILD}")
- 本地源码备份：$(bool_word "${RUN_LOCAL_BACKUP}")
- 启动远端 MySQL：$(bool_word "${START_LOCAL_MYSQL}")
- 执行 Prisma seed：$(bool_word "${RUN_SEED}")
- 执行 HTTPS 回归检查：$(bool_word "${RUN_HTTPS_CHECK}")
- 远端源码备份：$(bool_word "${RUN_REMOTE_BACKUP}")
- 本地构建命令：\`${LOCAL_BUILD_CMD}\`

## 工作区状态

\`\`\`text
${GIT_STATUS_OUTPUT:-工作区在脚本开始时无额外改动}
\`\`\`

## 发布后核对

- 远端 \`docker compose config\` 校验通过
- API 与前端镜像已重建完成
- 已执行 \`npx prisma migrate deploy\`
$(if [[ "${RUN_SEED}" == "1" ]]; then printf -- "- 已执行 \`npm run db:seed\`\n"; else printf -- "- 本次跳过 \`npm run db:seed\`\n"; fi)
- API 健康检查通过
$(if [[ "${RUN_HTTPS_CHECK}" == "1" ]]; then printf -- "- HTTPS 回归检查通过\n"; else printf -- "- 本次跳过 HTTPS 回归检查\n"; fi)

## 容器状态

\`\`\`text
${COMPOSE_STATUS}
\`\`\`

## 回滚线索

$(if [[ -n "${LOCAL_BACKUP_PATH}" ]]; then printf -- "- 本地源码备份：\`${LOCAL_BACKUP_PATH}\`\n"; else printf -- "- 本次未生成本地源码备份\n"; fi)
$(if [[ -n "${REMOTE_BACKUP_PATH}" ]]; then printf -- "- 远端源码备份：\`${REMOTE_BACKUP_PATH}\`\n"; else printf -- "- 本次未生成远端源码备份\n"; fi)
$(if [[ -n "${REMOTE_BACKUP_PATH}" ]]; then printf -- "- 回滚参考命令：\n\n\`\`\`bash\nssh %s \"rm -rf '%s' && mkdir -p '%s' && tar -xzf '%s' -C '%s'\"\n\`\`\`\n" "${DEPLOY_HOST}" "${DEPLOY_PATH}" "${DEPLOY_PARENT}" "${REMOTE_BACKUP_PATH}" "${DEPLOY_PARENT}"; else printf -- "- 由于本次跳过备份，请先确认服务器上是否存在可用的历史源码包。\n"; fi)
EOF

if [[ ! -f "${DEPLOY_LOG_FILE}" ]]; then
  cat > "${DEPLOY_LOG_FILE}" <<'EOF'
# 生产部署记录

用于记录每一次实际发布到服务器的时间、范围、验证结果和回滚线索。
EOF
fi

cat >> "${DEPLOY_LOG_FILE}" <<EOF

## ${DOC_DATE} ${DOC_TIME}

- 环境：生产 \`${CRM_DOMAIN}\`
- 服务器：\`${DEPLOY_HOST}\`
- 部署目录：\`${DEPLOY_PATH}\`
- 部署方式：\`scripts/ops/deploy-local-to-production.sh\`
- 部署标签：\`${DEPLOY_LABEL}\`
- 本地构建：$(bool_word "${RUN_LOCAL_BUILD}")
- 本地源码备份：$(bool_word "${RUN_LOCAL_BACKUP}")
- 执行 migrate：是
- 执行 seed：$(bool_word "${RUN_SEED}")
- 执行 HTTPS 回归检查：$(bool_word "${RUN_HTTPS_CHECK}")
$(if [[ -n "${LOCAL_BACKUP_PATH}" ]]; then printf -- "- 本地备份：\`${LOCAL_BACKUP_PATH}\`\n"; fi)
$(if [[ -n "${REMOTE_BACKUP_PATH}" ]]; then printf -- "- 回滚备份：\`${REMOTE_BACKUP_PATH}\`\n"; fi)
- 对应详细记录：
  - [${DOC_DATE} ${DOC_TIME} 生产同步记录](${RECORD_LINK})
EOF

CURRENT_STEP="写入同步状态台账"
log "写入同步状态台账"
cat > "${SYNC_STATE_FILE}" <<EOF
{
  "targets": {
    "production": {
      "workflow": "local-first-confirm-before-sync",
      "host": "${DEPLOY_HOST}",
      "path": "${DEPLOY_PATH}",
      "domain": "${CRM_DOMAIN}",
      "recordsPendingSync": false,
      "lastKnownSync": {
        "date": "${DOC_DATE}",
        "time": "${DOC_TIME}",
        "label": "${DEPLOY_LABEL}",
        "method": "scripts/ops/deploy-local-to-production.sh",
        "recordPath": "docs/deployments/$(basename "${DEPLOY_RECORD_PATH}")",
        "logPath": "docs/deployment-log.md",
        "gitRevision": "${GIT_REVISION}"
      }
    }
  }
}
EOF

CURRENT_STEP="同步部署记录与同步状态到远端"
log "同步部署记录与同步状态到远端"
rsync \
  -az \
  --relative \
  -e "${RSYNC_SSH}" \
  "./docs/deployment-log.md" \
  "./docs/deploy-sync-state.json" \
  "./docs/deployments/$(basename "${DEPLOY_RECORD_PATH}")" \
  "${DEPLOY_HOST}:${DEPLOY_PATH}/"

CURRENT_STEP="完成"
log "部署完成"
printf '部署记录：%s\n' "${DEPLOY_RECORD_PATH}"
if [[ -n "${LOCAL_BACKUP_PATH}" ]]; then
  printf '本地源码备份：%s\n' "${LOCAL_BACKUP_PATH}"
fi
if [[ -n "${REMOTE_BACKUP_PATH}" ]]; then
  printf '远端源码备份：%s\n' "${REMOTE_BACKUP_PATH}"
fi
