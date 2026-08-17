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

kill_port_listener() {
  local port="$1"
  local pids

  if ! command -v lsof >/dev/null 2>&1; then
    printf '[h5] command not found: lsof, cannot stop the process on 127.0.0.1:%s automatically.\n' "${port}" >&2
    return 1
  fi

  pids="$(lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  printf '[h5] 127.0.0.1:%s is already listening (pid: %s); stopping it before restart.\n' "${port}" "${pids}"
  # shellcheck disable=SC2086
  kill ${pids} >/dev/null 2>&1 || true

  local waited=0
  while is_tcp_listening "${port}" && [[ "${waited}" -lt 10 ]]; do
    sleep 1
    waited=$((waited + 1))
  done

  if is_tcp_listening "${port}"; then
    printf '[h5] 127.0.0.1:%s still listening after SIGTERM; sending SIGKILL.\n' "${port}" >&2
    # shellcheck disable=SC2086
    kill -9 ${pids} >/dev/null 2>&1 || true
    sleep 1
  fi
}

if is_tcp_listening "${H5_PORT}"; then
  kill_port_listener "${H5_PORT}"
fi

cd "${FRONTEND_DIR}"

if [[ "$#" -gt 0 ]]; then
  exec npm run dev:h5 -- "$@"
fi

exec npm run dev:h5
