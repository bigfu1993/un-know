#!/usr/bin/env bash
set -euo pipefail

sed -i 's#^SPRING_DATASOURCE_URL=.*#SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/unknown_platform#' /root/unknown-db.env

set -a
. /root/unknown-db.env
set +a

PGPASSWORD="$SPRING_DATASOURCE_PASSWORD" \
psql -h 127.0.0.1 -U unknown_app -d unknown_platform -tAc \
  "select tablename from pg_tables where schemaname = 'public' order by tablename;"
