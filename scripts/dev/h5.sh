#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/frontend/apps"
H5_PORT="${H5_PORT:-8899}"

is_tcp_listening() {
  local port="$1"

  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "${port}" >/dev/null 2>&1
    return
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi

  return 1
}

print_port_process() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN || true
  fi
}

if is_tcp_listening "${H5_PORT}"; then
  printf '[h5] 127.0.0.1:%s is already listening; skip starting H5.\n' "${H5_PORT}"
  print_port_process "${H5_PORT}"
  exit 0
fi

cd "${FRONTEND_DIR}"

if [[ "$#" -gt 0 ]]; then
  exec npm run dev:h5 -- "$@"
fi

exec npm run dev:h5
