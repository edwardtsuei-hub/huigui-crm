#!/usr/bin/env bash
set -euo pipefail
backup_dir="/opt/huigui-backups"
mkdir -p "$backup_dir"
stamp="$(date +%Y%m%d-%H%M%S)"
out="${backup_dir}/huigui-crm-db-scheduled-${stamp}.sql.gz"
tmp="${out}.tmp"
docker exec huigui-mysql sh -lc 'mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | gzip -9 > "$tmp"
mv "$tmp" "$out"
sha256sum "$out" > "${out}.sha256"
find "$backup_dir" -maxdepth 1 -name 'huigui-crm-db-scheduled-*.sql.gz' -mtime +14 -delete
find "$backup_dir" -maxdepth 1 -name 'huigui-crm-db-scheduled-*.sql.gz.sha256' -mtime +14 -delete
printf '%s created %s\n' "$(date -Is)" "$out" >> /var/log/huigui-db-backup.log
