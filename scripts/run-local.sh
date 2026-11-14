#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  wovn_node_bin="/Users/leewoojin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [ -x "$wovn_node_bin/node" ]; then export PATH="$wovn_node_bin:$PATH"; else echo "Node.js 24.22.1 이상을 설치하세요."; exit 1; fi
fi
if [ ! -d node_modules ]; then echo "먼저 pnpm install을 실행하세요."; exit 1; fi
node --import tsx scripts/local-setup.ts
node --import tsx scripts/local-db.ts &
wovn_db_pid=$!
trap 'kill "$wovn_db_pid" "${wovn_worker_pid:-}" "${wovn_app_pid:-}" 2>/dev/null || true' EXIT INT TERM
node --import tsx scripts/wait-db.ts
node --import tsx scripts/migrate.ts
node node_modules/payload/bin.js migrate
node --import tsx scripts/worker.ts &
wovn_worker_pid=$!
node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 &
wovn_app_pid=$!
wait "$wovn_app_pid"
