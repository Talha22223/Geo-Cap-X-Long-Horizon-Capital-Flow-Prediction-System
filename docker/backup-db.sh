#!/usr/bin/env bash
# Automated PostgreSQL Backup Script for GeoCap-X Production

set -eo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/geocapx}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/geocapx_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting PostgreSQL database backup..."
pg_dump -h "${DB_HOST:-db}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-geocapx}" | gzip > "${BACKUP_FILE}"

echo "[$(date)] Backup successfully saved to ${BACKUP_FILE}"

# Remove backups older than RETENTION_DAYS
echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "geocapx_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Database backup pipeline completed."
