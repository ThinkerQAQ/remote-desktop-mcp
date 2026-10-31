#!/usr/bin/env bash
set -euo pipefail
umask 077
DEST="${DV_INSTALL_DIR:-$HOME/.local/share/remote-desktop-mcp}"
if [[ ! -f "$DEST/setup.sh" ]]; then
  if [[ -e "$DEST" ]]; then echo 'Install directory already exists without setup.sh; choose DV_INSTALL_DIR or move it aside.' >&2; exit 1; fi
  command -v curl >/dev/null && command -v tar >/dev/null || { echo 'curl and tar are required to download the source archive.' >&2; exit 1; }
  TMP="$(mktemp -d)"
  trap 'rm -rf -- "$TMP"' EXIT
  curl --fail --location --silent --show-error --retry 2 --connect-timeout 15 --max-time 180 \
    https://github.com/ThinkerQAQ/remote-desktop-mcp/archive/refs/tags/v0.3.0.tar.gz -o "$TMP/source.tar.gz"
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
