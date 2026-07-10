#!/usr/bin/env bash
set -euo pipefail

HBA_CONF="$(runuser -u postgres -- psql -tAc 'SHOW hba_file' | xargs)"
cp "$HBA_CONF" "${HBA_CONF}.bak.$(date +%Y%m%d%H%M%S)"

add_hba_rule() {
  local rule="$1"
  if ! grep -Fq "$rule" "$HBA_CONF"; then
    sed -i "1i $rule" "$HBA_CONF"
  fi
}

add_hba_rule "host    unknown_platform    unknown_app    ::1/128    scram-sha-256"
add_hba_rule "host    unknown_platform    unknown_app    127.0.0.1/32    scram-sha-256"

systemctl reload postgresql
