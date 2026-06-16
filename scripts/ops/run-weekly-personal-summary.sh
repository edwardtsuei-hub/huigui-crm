#!/usr/bin/env bash
set -euo pipefail

PERIOD_TYPE="${1:-month}"
APP_ROOT="${APP_ROOT:-/opt/huigui-crm}"

cd "$APP_ROOT"

set -a
. "$APP_ROOT/.env"
set +a

API_BASE_URL="${WEEKLY_API_BASE_URL:-https://management.hui-health.com/api}"
USER_KEY="${WEEKLY_USER_KEY_OVERRIDE:-${WEEKLY_USER_KEY:-da-ai-gui-xin.weekly-workspace.v1.shared}}"
TOKEN="${WEEKLY_SUMMARY_TOKEN:-${WEEKLY_REMINDER_TOKEN:-}}"
PERIOD_ID="${WEEKLY_PERSONAL_SUMMARY_PERIOD_ID:-}"
PERIOD_LABEL="${WEEKLY_PERSONAL_SUMMARY_PERIOD_LABEL:-}"
MEMBERS="${WEEKLY_PERSONAL_SUMMARY_MEMBERS:-}"
OPENAI_DRY_RUN="${OPENAI_WEEKLY_PERSONAL_SUMMARY_DRY_RUN:-false}"
LOG_DIR="$APP_ROOT/storage/logs"

if [ -z "$TOKEN" ]; then
  echo "WEEKLY_SUMMARY_TOKEN or WEEKLY_REMINDER_TOKEN is required" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

PAYLOAD="$(
  node -e '
    const [userKey, periodType, periodId, periodLabel, rawMembers, rawOpenaiDryRun] = process.argv.slice(1);
    const memberNames = String(rawMembers || "")
      .split(/[,\n|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const openaiDryRun = rawOpenaiDryRun === "1" || rawOpenaiDryRun === "true";
    process.stdout.write(JSON.stringify({
      userKey,
      periodType,
      ...(periodId ? { periodId } : {}),
      ...(periodLabel ? { periodLabel } : {}),
      ...(memberNames.length ? { memberNames } : {}),
      ...(openaiDryRun ? { openaiDryRun: true } : {}),
    }));
  ' "$USER_KEY" "$PERIOD_TYPE" "$PERIOD_ID" "$PERIOD_LABEL" "$MEMBERS" "$OPENAI_DRY_RUN"
)"

TMP_RESPONSE="$(mktemp)"
HTTP_STATUS="$(
  curl -sS -o "$TMP_RESPONSE" -w "%{http_code}" \
    -X POST "$API_BASE_URL/work-reports/weekly/personal-summaries/run" \
    -H "Content-Type: application/json" \
    -H "X-Weekly-Summary-Token: $TOKEN" \
    -d "$PAYLOAD"
)"

printf '%s period_type=%s status=%s response=%s\n' "$(date -Iseconds)" "$PERIOD_TYPE" "$HTTP_STATUS" "$(cat "$TMP_RESPONSE")" >> "$LOG_DIR/weekly-personal-summary.log"

if [ "$HTTP_STATUS" -lt 200 ] || [ "$HTTP_STATUS" -ge 300 ]; then
  cat "$TMP_RESPONSE"
  rm -f "$TMP_RESPONSE"
  exit 1
fi

node -e '
  const fs = require("node:fs");
  const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const data = payload.data || payload;
  if (!data.ok) {
    console.error(JSON.stringify(data, null, 2));
    process.exit(2);
  }
' "$TMP_RESPONSE"

rm -f "$TMP_RESPONSE"
