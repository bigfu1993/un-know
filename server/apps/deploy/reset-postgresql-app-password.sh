#!/usr/bin/env bash
set -euo pipefail

set -a
. /root/unknown-db.env
set +a

runuser -u postgres -- psql postgres \
  -v db_password="$SPRING_DATASOURCE_PASSWORD" \
  -v ON_ERROR_STOP=1 <<'SQL'
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
SELECT pg_reload_conf();
ALTER ROLE unknown_app WITH PASSWORD :'db_password';
SQL

systemctl reload postgresql
