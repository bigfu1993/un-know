#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
APP_DIR="${REPO_ROOT}/server/apps"
ENV_FILE="${APP_DIR}/.env.prod.local"
MAVEN_CMD="${MAVEN_CMD:-mvn}"
APP_SERVER_PORT="${APP_SERVER_PORT:-9988}"

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
    printf '[app-server] command not found: lsof, cannot stop the process on 127.0.0.1:%s automatically.\n' "${port}" >&2
    return 1
  fi

  pids="$(lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  printf '[app-server] 127.0.0.1:%s is already listening (pid: %s); stopping it before restart.\n' "${port}" "${pids}"
  # shellcheck disable=SC2086
  kill ${pids} >/dev/null 2>&1 || true

  local waited=0
  while is_tcp_listening "${port}" && [[ "${waited}" -lt 20 ]]; do
    sleep 1
    waited=$((waited + 1))
  done

  if is_tcp_listening "${port}"; then
    printf '[app-server] 127.0.0.1:%s still listening after SIGTERM; sending SIGKILL.\n' "${port}" >&2
    # shellcheck disable=SC2086
    kill -9 ${pids} >/dev/null 2>&1 || true
    sleep 1
  fi
}

if [[ "$#" -eq 0 ]] && is_tcp_listening "${APP_SERVER_PORT}"; then
  kill_port_listener "${APP_SERVER_PORT}"
fi

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
else
  printf '[app-server] env file not found: %s, using current environment.\n' "${ENV_FILE}" >&2
fi

cd "${APP_DIR}"

if [[ "$#" -gt 0 ]]; then
  exec "${MAVEN_CMD}" "$@"
fi

APP_SERVER_TUNNEL_ENABLED="${APP_SERVER_TUNNEL_ENABLED:-1}"
APP_SERVER_TUNNEL_HOST="${APP_SERVER_TUNNEL_HOST:-root@8.153.110.192}"
APP_SERVER_TUNNEL_KEY="${APP_SERVER_TUNNEL_KEY:-${HOME}/.ssh/unknow/bigfu.m2pro.mac.home.pem}"
APP_SERVER_TUNNEL_PORT="${APP_SERVER_TUNNEL_PORT:-15432}"
APP_SERVER_TUNNEL_TARGET="${APP_SERVER_TUNNEL_TARGET:-127.0.0.1:5432}"

if [[ "${APP_SERVER_TUNNEL_ENABLED}" != "0" && -z "${SPRING_DATASOURCE_URL:-}" ]]; then
  export SPRING_DATASOURCE_URL="jdbc:postgresql://127.0.0.1:${APP_SERVER_TUNNEL_PORT}/unknown_platform"
fi

is_tunnel_ready() {
  nc -z 127.0.0.1 "${APP_SERVER_TUNNEL_PORT}" >/dev/null 2>&1
}

ensure_db_tunnel() {
  if [[ "${APP_SERVER_TUNNEL_ENABLED}" == "0" ]]; then
    printf '[app-server] db tunnel check skipped.\n'
    return
  fi

  if ! command -v nc >/dev/null 2>&1; then
    printf '[app-server] command not found: nc. Please install netcat or set APP_SERVER_TUNNEL_ENABLED=0.\n' >&2
    exit 1
  fi

  if is_tunnel_ready; then
    printf '[app-server] db tunnel ready: 127.0.0.1:%s\n' "${APP_SERVER_TUNNEL_PORT}"
    return
  fi

  if ! command -v ssh >/dev/null 2>&1; then
    printf '[app-server] command not found: ssh. Please create the database tunnel manually.\n' >&2
    exit 1
  fi

  if [[ ! -f "${APP_SERVER_TUNNEL_KEY}" ]]; then
    printf '[app-server] db tunnel not ready and ssh key not found: %s\n' "${APP_SERVER_TUNNEL_KEY}" >&2
    printf '[app-server] set APP_SERVER_TUNNEL_KEY, create the tunnel manually, or set APP_SERVER_TUNNEL_ENABLED=0.\n' >&2
    exit 1
  fi

  printf '[app-server] starting db tunnel: 127.0.0.1:%s -> %s\n' "${APP_SERVER_TUNNEL_PORT}" "${APP_SERVER_TUNNEL_TARGET}"
  ssh -f \
    -i "${APP_SERVER_TUNNEL_KEY}" \
    -o ExitOnForwardFailure=yes \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -N \
    -L "${APP_SERVER_TUNNEL_PORT}:${APP_SERVER_TUNNEL_TARGET}" \
    "${APP_SERVER_TUNNEL_HOST}"

  if ! is_tunnel_ready; then
    printf '[app-server] db tunnel start command completed, but 127.0.0.1:%s is still unavailable.\n' "${APP_SERVER_TUNNEL_PORT}" >&2
    exit 1
  fi
}

ensure_db_tunnel

exec "${MAVEN_CMD}" spring-boot:run
