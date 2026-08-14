#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-unknown_platform}"
DB_USER="${DB_USER:-unknown_app}"
DB_PASSWORD="${DB_PASSWORD:-}"
ALLOW_REMOTE="${ALLOW_REMOTE:-false}"
ALLOW_CIDR="${ALLOW_CIDR:-}"

if [[ -z "$DB_PASSWORD" ]]; then
  echo "DB_PASSWORD is required." >&2
  exit 1
fi

if [[ ! "$DB_NAME" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "DB_NAME must contain only letters, numbers, and underscores." >&2
  exit 1
fi

if [[ ! "$DB_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "DB_USER must contain only letters, numbers, and underscores." >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y postgresql postgresql-contrib
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y postgresql-server postgresql-contrib
  if [[ ! -f /var/lib/pgsql/data/PG_VERSION ]]; then
    postgresql-setup --initdb
  fi
elif command -v yum >/dev/null 2>&1; then
  yum install -y postgresql-server postgresql-contrib
  if [[ ! -f /var/lib/pgsql/data/PG_VERSION ]]; then
    postgresql-setup --initdb
  fi
else
  echo "Unsupported Linux distribution: apt-get, dnf, or yum is required." >&2
  exit 1
fi

systemctl enable --now postgresql

SQL_PASSWORD="${DB_PASSWORD//\'/\'\'}"

runuser -u postgres -- psql postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${SQL_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${SQL_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

if [[ "$ALLOW_REMOTE" == "true" ]]; then
  if [[ -z "$ALLOW_CIDR" ]]; then
    echo "ALLOW_CIDR is required when ALLOW_REMOTE=true." >&2
    exit 1
  fi

  PG_CONF="$(runuser -u postgres -- psql -tAc 'SHOW config_file' | xargs)"
  HBA_CONF="$(runuser -u postgres -- psql -tAc 'SHOW hba_file' | xargs)"

  sed -i "s/^#\?listen_addresses\s*=.*/listen_addresses = '*'/" "$PG_CONF"

  HBA_LINE="host    ${DB_NAME}    ${DB_USER}    ${ALLOW_CIDR}    scram-sha-256"
  if ! grep -Fq "$HBA_LINE" "$HBA_CONF"; then
    echo "$HBA_LINE" >> "$HBA_CONF"
  fi

  systemctl restart postgresql
fi

echo "PostgreSQL is ready."
echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"
