#!/usr/bin/env bash
# Linux/macOS per-user setup; no system-wide Node.js/npm required.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DV_TUNNEL_CLIENT="$root/bin/tunnel-client"
export PATH="$root/bin:$PATH"
exec "$root/bin/node" "$root/scripts/setup.mjs"
