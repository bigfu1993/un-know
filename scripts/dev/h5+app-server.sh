#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${REPO_ROOT}/log/dev"
STATUS_PIPE="${LOG_DIR}/h5+app-server.status.$$"
H5_PORT="${H5_PORT:-8899}"
APP_SERVER_PORT="${APP_SERVER_PORT:-9988}"

mkdir -p "${LOG_DIR}"
mkfifo "${STATUS_PIPE}"

PIDS=()

cleanup() {
  local code=$?

  trap - INT TERM HUP EXIT

  if [[ "${#PIDS[@]}" -gt 0 ]]; then
    for pid in "${PIDS[@]}"; do
      if kill -0 "${pid}" >/dev/null 2>&1; then
        kill "${pid}" >/dev/null 2>&1 || true
      fi
    done
  fi

  wait >/dev/null 2>&1 || true
  rm -f "${STATUS_PIPE}"
  exit "${code}"
}

trap cleanup INT TERM HUP EXIT

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

run_service() {
  local name="$1"
  local log_file="$2"

  shift 2

  (
    child_pid=""

    stop_child() {
      if [[ -n "${child_pid}" ]] && kill -0 "${child_pid}" >/dev/null 2>&1; then
        kill "${child_pid}" >/dev/null 2>&1 || true
      fi
      wait "${child_pid}" >/dev/null 2>&1 || true
      exit 143
    }

    trap stop_child INT TERM HUP

    "$@" > "${log_file}" 2>&1 &
    child_pid="$!"

    set +e
    wait "${child_pid}"
    code="$?"
    set -e

    printf '%s %s\n' "${name}" "${code}" > "${STATUS_PIPE}"
    exit "${code}"
  ) &

  PIDS+=("$!")
}

if is_tcp_listening "${H5_PORT}"; then
  printf '[dev:h5+app-server] 127.0.0.1:%s is already listening; skip starting H5.\n' "${H5_PORT}"
  print_port_process "${H5_PORT}"
else
  run_service "h5" "${LOG_DIR}/h5.log" "${SCRIPT_DIR}/h5.sh"
fi

if is_tcp_listening "${APP_SERVER_PORT}"; then
  printf '[dev:h5+app-server] 127.0.0.1:%s is already listening; skip starting app server.\n' "${APP_SERVER_PORT}"
  print_port_process "${APP_SERVER_PORT}"
else
  run_service "app-server" "${LOG_DIR}/app-server.log" "${SCRIPT_DIR}/app-server.sh"
fi

if [[ "${#PIDS[@]}" -eq 0 ]]; then
  printf '[dev:h5+app-server] H5 and app server are already running; nothing to start.\n'
  exit 0
fi

printf '[dev:h5+app-server] h5 log: %s\n' "${LOG_DIR}/h5.log"
printf '[dev:h5+app-server] app-server log: %s\n' "${LOG_DIR}/app-server.log"
printf '[dev:h5+app-server] press Ctrl+C to stop both services.\n'

read -r stopped_service stopped_code < "${STATUS_PIPE}"
printf '[dev:h5+app-server] %s exited with code %s, stopping remaining service.\n' "${stopped_service}" "${stopped_code}" >&2
exit "${stopped_code}"
