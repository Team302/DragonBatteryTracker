#!/bin/sh
set -eu

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups
BACKUP_FILE="${BACKUP_DIR}/${PGDATABASE}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=${RETENTION_DAYS:-7}

echo "[$(date)] Starting backup of ${PGDATABASE}..."
pg_dump -h "$PGHOST" -U "$PGUSER" "$PGDATABASE" | gzip > "$BACKUP_FILE"
echo "[$(date)] Backup saved to $BACKUP_FILE"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"