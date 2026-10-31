#!/usr/bin/env bash
set -euo pipefail
umask 077
SETUP_KEY="${DV_RUNTIME_API_KEY:-}"
unset DV_RUNTIME_API_KEY
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
case "$(uname -s)" in Linux) ;; *) echo 'Use Linux/WSL2. Windows: powershell -File setup.ps1' >&2; exit 1;; esac
case "$(uname -m)" in x86_64) ARCH=x64; TARCH=amd64;; aarch64|arm64) ARCH=arm64; TARCH=arm64;; *) echo 'Unsupported CPU architecture' >&2; exit 1;; esac

missing=()
for tool in curl tar sha256sum unzip xz; do command -v "$tool" >/dev/null || missing+=("$tool"); done
if ((${#missing[@]})); then
  echo 'Installing prerequisite utilities / 正在安装基础工具'
  if command -v apt-get >/dev/null; then
    if ((EUID == 0)); then apt-get update; apt-get install -y curl ca-certificates tar coreutils unzip xz-utils
    else sudo apt-get update; sudo apt-get install -y curl ca-certificates tar coreutils unzip xz-utils; fi
  else echo 'Install curl, tar, sha256sum, unzip and xz using your package manager, then rerun.' >&2; exit 1; fi
fi
TOOLS="$ROOT/runtime/tools"
mkdir -p "$TOOLS"
TMP="$(mktemp -d)"
trap 'rm -rf -- "$TMP"' EXIT
download() { curl --fail --location --silent --show-error --retry 2 --connect-timeout 15 --max-time 300 "$1" -o "$2"; }
verify() {
  local archive="$1" sums="$2" expected
  expected="$(awk -v file="$(basename "$archive")" '$2 == file || $2 == "*"file {print $1}' "$sums")"
  [[ "$expected" =~ ^[a-fA-F0-9]{64}$ ]] || { echo 'Missing/ambiguous checksum' >&2; exit 1; }
  printf '%s  %s\n' "$expected" "$archive" | sha256sum --check --status || { echo 'Checksum mismatch; refusing to install' >&2; exit 1; }
}

NODE="$(command -v node || true)"
if [[ "${DV_FORCE_MANAGED_NODE:-0}" == 1 ]] || [[ -z "$NODE" ]] || ! "$NODE" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)' 2>/dev/null; then
  NODE="$TOOLS/node/bin/node"
  if [[ ! -x "$NODE" ]]; then
    VERSION=v24.21.0
    FILE="node-$VERSION-linux-$ARCH.tar.xz"
    echo "Installing verified Node.js $VERSION / 安装 Node.js"
    download "https://nodejs.org/dist/$VERSION/$FILE" "$TMP/$FILE"
    download "https://nodejs.org/dist/$VERSION/SHASUMS256.txt" "$TMP/node-sums"
    verify "$TMP/$FILE" "$TMP/node-sums"
    tar -xJf "$TMP/$FILE" -C "$TMP"
    mv "$TMP/node-$VERSION-linux-$ARCH" "$TOOLS/node"
  fi
fi
export PATH="$(dirname "$NODE"):$PATH"
command -v npm >/dev/null || { echo 'npm is required with Node.js' >&2; exit 1; }

TUNNEL="${DV_TUNNEL_CLIENT:-$(command -v tunnel-client || true)}"
if [[ -z "$TUNNEL" && -x "$HOME/.local/bin/tunnel-client" ]]; then TUNNEL="$HOME/.local/bin/tunnel-client"; fi
if [[ "${DV_FORCE_MANAGED_TUNNEL:-0}" == 1 || -z "$TUNNEL" ]]; then
  TUNNEL="$TOOLS/tunnel/tunnel-client"
  if [[ ! -x "$TUNNEL" ]]; then
    VERSION=v0.0.16
    FILE="tunnel-client-$VERSION-linux-$TARCH.zip"
    BASE="https://github.com/openai/tunnel-client/releases/download/$VERSION"
    echo "Installing verified tunnel-client $VERSION / 安装 tunnel-client"
    download "$BASE/$FILE" "$TMP/$FILE"
    download "$BASE/SHA256SUMS.txt" "$TMP/tunnel-sums"
    verify "$TMP/$FILE" "$TMP/tunnel-sums"
    mkdir "$TMP/tunnel"
    unzip -q "$TMP/$FILE" -d "$TMP/tunnel"
    BINARY="$(find "$TMP/tunnel" -type f -name tunnel-client -print -quit)"
    [[ -n "$BINARY" ]] || { echo 'Archive does not contain tunnel-client' >&2; exit 1; }
    chmod 700 "$BINARY"
    mv "$TMP/tunnel" "$TOOLS/tunnel"
    # Retain upstream licenses and other release files alongside the executable.
    if [[ ! -x "$TUNNEL" ]]; then
      RELATIVE="${BINARY#"$TMP/tunnel/"}"
      ln -s "$RELATIVE" "$TUNNEL"
    fi
  fi
fi
export DV_TUNNEL_CLIENT="$TUNNEL"
"$TUNNEL" --version >/dev/null
cd "$ROOT"
echo 'Installing locked dependencies / 安装锁定版本依赖'
PUPPETEER_SKIP_DOWNLOAD=true npm ci --no-fund --no-audit
rm -rf -- "$TMP"
trap - EXIT
export DV_RUNTIME_API_KEY="$SETUP_KEY"
exec "$NODE" "$ROOT/scripts/setup.mjs" "$@"
