#!/usr/bin/env sh

set -eu

# Local file permission reminder:
# chmod +x api/start.sh

DB_HOST_VALUE="${DB_HOST:-mysql}"
DB_PORT_VALUE="${DB_PORT:-3306}"
DB_WAIT_TIMEOUT_VALUE="${DB_WAIT_TIMEOUT:-180}"
LOCAL_UPLOAD_DIR_VALUE="${LOCAL_UPLOAD_DIR:-/app/storage/uploads}"

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@${DB_HOST_VALUE}:${DB_PORT_VALUE}/${MYSQL_DATABASE}"
fi

mkdir -p "${LOCAL_UPLOAD_DIR_VALUE}"

echo "Waiting for MySQL at ${DB_HOST_VALUE}:${DB_PORT_VALUE}..."
WAITED_SECONDS=0
until nc -z "${DB_HOST_VALUE}" "${DB_PORT_VALUE}"; do
  WAITED_SECONDS=$((WAITED_SECONDS + 2))
  if [ "${WAITED_SECONDS}" -ge "${DB_WAIT_TIMEOUT_VALUE}" ]; then
    echo "Timed out after ${DB_WAIT_TIMEOUT_VALUE}s while waiting for ${DB_HOST_VALUE}:${DB_PORT_VALUE}"
    exit 1
  fi
  sleep 2
done

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Starting NestJS API..."
exec node apps/api/dist/main.js
