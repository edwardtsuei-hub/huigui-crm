#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-auto}"
APP_ROOT="${APP_ROOT:-/opt/huigui-crm}"

cd "$APP_ROOT"

set -a
. "$APP_ROOT/.env"
set +a

API_BASE_URL="${WEEKLY_API_BASE_URL:-https://management.hui-health.com/api}"
USER_KEY="${WEEKLY_USER_KEY_OVERRIDE:-${WEEKLY_USER_KEY:-da-ai-gui-xin.weekly-workspace.v1.shared}}"
REPORT_URL="${WEEKLY_REPORT_URL_OVERRIDE:-${WEEKLY_REPORT_URL:-https://management.hui-health.com/work-management/weekly-reports}}"
TOKEN="${WEEKLY_REMINDER_TOKEN:?WEEKLY_REMINDER_TOKEN is required}"
RECIPIENT_MAP="${WEEKLY_REPORT_WECOM_USERID_MAP:-{}}"
LOG_DIR="$APP_ROOT/storage/logs"

mkdir -p "$LOG_DIR"

PAYLOAD="$(
  node -e '
    const [userKey, mode, url, rawRecipientMap] = process.argv.slice(1);
    let recipientMap = {};
    try {
      recipientMap = JSON.parse(rawRecipientMap || "{}");
    } catch {
      recipientMap = {};
    }
    process.stdout.write(JSON.stringify({ userKey, mode, url, recipientMap }));
  ' "$USER_KEY" "$MODE" "$REPORT_URL" "$RECIPIENT_MAP"
)"

TMP_RESPONSE="$(mktemp)"
HTTP_STATUS="$(
  curl -sS -o "$TMP_RESPONSE" -w "%{http_code}" \
    -X POST "$API_BASE_URL/work-reports/weekly/reminders/run" \
    -H "Content-Type: application/json" \
    -H "X-Weekly-Reminder-Token: $TOKEN" \
    -d "$PAYLOAD"
)"

printf '%s mode=%s status=%s response=%s\n' "$(date -Iseconds)" "$MODE" "$HTTP_STATUS" "$(cat "$TMP_RESPONSE")" >> "$LOG_DIR/weekly-reminders.log"

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
