#!/usr/bin/env bash
set -euo pipefail
umask 077
DEST="${DV_INSTALL_DIR:-$HOME/.local/share/remote-desktop-mcp}"
if [[ ! -f "$DEST/setup.sh" ]]; then
  if [[ -e "$DEST" ]]; then echo 'Install directory already exists without setup.sh; choose DV_INSTALL_DIR or move it aside.' >&2; exit 1; fi
  command -v curl >/dev/null && command -v tar >/dev/null || { echo 'curl and tar are required to download the source archive.' >&2; exit 1; }
  TMP="$(mktemp -d)"
  trap 'rm -rf -- "$TMP"' EXIT
  case "$(uname -s)" in Linux) PLATFORM=linux;; Darwin) PLATFORM=macos;; *) echo 'Use install.ps1 for Windows.' >&2; exit 2;; esac
  ASSET="remote-desktop-mcp-v0.3.1-$PLATFORM.tar.gz"
  URL="https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/download/v0.3.1"
  curl --fail --location --silent --show-error --retry 2 --connect-timeout 15 --max-time 180 "$URL/$ASSET" -o "$TMP/source.tar.gz"
  curl --fail --location --silent --show-error --retry 2 --connect-timeout 15 --max-time 60 "$URL/SHA256SUMS" -o "$TMP/SHA256SUMS"
  EXPECTED=$(awk -v n="$ASSET" '$2 == n {print $1; exit}' "$TMP/SHA256SUMS")
  [[ "$EXPECTED" =~ ^[0-9a-fA-F]{64}$ ]] || { echo 'Invalid release checksum' >&2; exit 2; }
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL=$(sha256sum "$TMP/source.tar.gz" | awk '{print $1}')
  elif command -v shasum >/dev/null 2>&1; then
    ACTUAL=$(shasum -a 256 "$TMP/source.tar.gz" | awk '{print $1}')
  else echo 'SHA-256 checker (sha256sum or shasum) required.' >&2; exit 2; fi
  [[ "$ACTUAL" == "$EXPECTED" ]] || { echo 'Release checksum mismatch' >&2; exit 2; }
  mkdir "$TMP/source"
  tar -xzf "$TMP/source.tar.gz" --strip-components=1 -C "$TMP/source"
  mkdir -p "$(dirname "$DEST")"
  mv "$TMP/source" "$DEST"
  rm -rf -- "$TMP"
  trap - EXIT
fi
if [[ -t 0 ]]; then exec bash "$DEST/setup.sh" "$@"
elif ( : </dev/tty ) 2>/dev/null; then exec bash "$DEST/setup.sh" "$@" </dev/tty
else exec bash "$DEST/setup.sh" "$@"; fi
