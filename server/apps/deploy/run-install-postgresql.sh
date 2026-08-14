#!/usr/bin/env bash
set -euo pipefail

set -a
. /root/unknown-db.env
set +a

DB_NAME=unknown_platform \
DB_USER=unknown_app \
DB_PASSWORD="$SPRING_DATASOURCE_PASSWORD" \
ALLOW_REMOTE=true \
ALLOW_CIDR=64.186.238.118/32 \
bash /root/install-postgresql.sh
