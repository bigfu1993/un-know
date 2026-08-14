#!/usr/bin/env bash
set -euo pipefail

set -a
. /root/unknown-db.env
set +a

systemctl is-active postgresql
systemctl is-enabled postgresql
ss -lntp | grep ':5432' || true

PGPASSWORD="$SPRING_DATASOURCE_PASSWORD" \
psql -h 127.0.0.1 -U unknown_app -d unknown_platform -tAc \
  "select current_database() || ' ' || current_user;"
