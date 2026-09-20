#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> installing scanner deps"
(cd services/scanner && npm install)

echo "==> unit tests"
(cd services/scanner && npm test)

echo "==> starting compose stack"
docker compose up -d --build

echo "==> waiting for health"
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/healthz >/tmp/dex-health.json; then
    cat /tmp/dex-health.json
    echo
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "health check timed out"
    docker compose logs --no-color scanner | tail -n 100
    exit 1
  fi
  sleep 2
done

echo "==> fetching latest liquidity snapshot"
curl -fsS http://127.0.0.1:8080/v1/liquidity/latest | tee /tmp/dex-latest.json
echo

python3 - <<'PY'
import json
from pathlib import Path
data = json.loads(Path("/tmp/dex-latest.json").read_text())
assert data.get("count", 0) > 0, data
assert data.get("totalLiquidityUsd", 0) > 0, data
print("local stack verification passed")
PY
