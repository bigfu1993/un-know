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

kill_port_listener() {
  local name="$1"
  local port="$2"
  local pids

  if ! command -v lsof >/dev/null 2>&1; then
    printf '[dev:h5+app-server] command not found: lsof, cannot stop %s on 127.0.0.1:%s automatically.\n' "${name}" "${port}" >&2
    return 1
  fi

  pids="$(lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  printf '[dev:h5+app-server] 127.0.0.1:%s is already listening (pid: %s); stopping %s before restart.\n' "${port}" "${pids}" "${name}"
  # shellcheck disable=SC2086
  kill ${pids} >/dev/null 2>&1 || true

  local waited=0
  while is_tcp_listening "${port}" && [[ "${waited}" -lt 20 ]]; do
    sleep 1
    waited=$((waited + 1))
  done

  if is_tcp_listening "${port}"; then
    printf '[dev:h5+app-server] 127.0.0.1:%s still listening after SIGTERM; sending SIGKILL.\n' "${port}" >&2
    # shellcheck disable=SC2086
    kill -9 ${pids} >/dev/null 2>&1 || true
    sleep 1
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
  kill_port_listener "h5" "${H5_PORT}"
fi
run_service "h5" "${LOG_DIR}/h5.log" "${SCRIPT_DIR}/h5.sh"

if is_tcp_listening "${APP_SERVER_PORT}"; then
  kill_port_listener "app-server" "${APP_SERVER_PORT}"
fi
run_service "app-server" "${LOG_DIR}/app-server.log" "${SCRIPT_DIR}/app-server.sh"

printf '[dev:h5+app-server] h5 log: %s\n' "${LOG_DIR}/h5.log"
printf '[dev:h5+app-server] app-server log: %s\n' "${LOG_DIR}/app-server.log"
printf '[dev:h5+app-server] press Ctrl+C to stop both services.\n'

read -r stopped_service stopped_code < "${STATUS_PIPE}"
printf '[dev:h5+app-server] %s exited with code %s, stopping remaining service.\n' "${stopped_service}" "${stopped_code}" >&2
exit "${stopped_code}"
