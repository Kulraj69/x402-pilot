#!/usr/bin/env bash
# Expose the x402 pilot publicly on Base Sepolia testnet via a free Cloudflare quick tunnel.
# No account, no cost, no real money. The tunnel URL dies when this script stops.
set -euo pipefail
cd "$(dirname "$0")"
node server.mjs &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 2
if ! command -v cloudflared >/dev/null; then
  echo "cloudflared not installed. Get it from https://github.com/cloudflare/cloudflared/releases" >&2
  exit 1
fi
cloudflared tunnel --url http://localhost:4021
