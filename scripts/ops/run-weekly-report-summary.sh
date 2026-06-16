#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-scheduled}"
APP_ROOT="${APP_ROOT:-/opt/huigui-crm}"

cd "$APP_ROOT"

set -a
. "$APP_ROOT/.env"
set +a

API_BASE_URL="${WEEKLY_API_BASE_URL:-https://management.hui-health.com/api}"
USER_KEY="${WEEKLY_USER_KEY_OVERRIDE:-${WEEKLY_USER_KEY:-da-ai-gui-xin.weekly-workspace.v1.shared}}"
SUMMARY_URL="${WEEKLY_SUMMARY_URL_OVERRIDE:-${WEEKLY_SUMMARY_URL:-${WEEKLY_REPORT_URL:-https://management.hui-health.com/work-management/weekly-reports?view=team&workspace=shared&summary=core&from=wecom-summary}}}"
TOKEN="${WEEKLY_SUMMARY_TOKEN:-${WEEKLY_REMINDER_TOKEN:-}}"
RECIPIENT_MAP="${WEEKLY_REPORT_WECOM_USERID_MAP:-{}}"
GROUP_IDS="${WEEKLY_SUMMARY_GROUP_IDS:-core,light_home,all_leaders}"
NOTIFICATION_DRY_RUN="${WEEKLY_SUMMARY_NOTIFICATION_DRY_RUN:-false}"
LOG_DIR="$APP_ROOT/storage/logs"

if [ -z "$TOKEN" ]; then
  echo "WEEKLY_SUMMARY_TOKEN or WEEKLY_REMINDER_TOKEN is required" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

PAYLOAD="$(
  node -e '
    const [userKey, mode, url, rawRecipientMap, rawGroupIds, rawNotificationDryRun] = process.argv.slice(1);
    let recipientMap = {};
    try {
      recipientMap = JSON.parse(rawRecipientMap || "{}");
    } catch {
      recipientMap = {};
    }
    const groupIds = String(rawGroupIds || "")
      .split(/[,\s|]+/)
      .map((item) => item.trim())
      .filter((item) => item === "core" || item === "light_home" || item === "all_leaders");
    const notificationDryRun = rawNotificationDryRun === "1" || rawNotificationDryRun === "true";
    process.stdout.write(JSON.stringify({ userKey, mode, url, recipientMap, groupIds, ...(notificationDryRun ? { notificationDryRun: true } : {}) }));
  ' "$USER_KEY" "$MODE" "$SUMMARY_URL" "$RECIPIENT_MAP" "$GROUP_IDS" "$NOTIFICATION_DRY_RUN"
)"

TMP_RESPONSE="$(mktemp)"
HTTP_STATUS="$(
  curl -sS -o "$TMP_RESPONSE" -w "%{http_code}" \
    -X POST "$API_BASE_URL/work-reports/weekly/summaries/run" \
    -H "Content-Type: application/json" \
    -H "X-Weekly-Summary-Token: $TOKEN" \
    -d "$PAYLOAD"
)"

printf '%s mode=%s status=%s response=%s\n' "$(date -Iseconds)" "$MODE" "$HTTP_STATUS" "$(cat "$TMP_RESPONSE")" >> "$LOG_DIR/weekly-summary.log"

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
