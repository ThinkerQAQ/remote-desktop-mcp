$ErrorActionPreference = 'Stop'
if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
    throw 'Install and initialize WSL2 Ubuntu first: wsl --install -d Ubuntu. Restart Windows if requested, finish Ubuntu account creation, then rerun this command.'
}
$linuxRoot = & wsl.exe --exec wslpath -u $PSScriptRoot
if ($LASTEXITCODE -ne 0) { throw 'Start and initialize your WSL2 distribution, then rerun setup.ps1.' }
$bootstrap = @'
set -eu
source_dir="$1"
shift
dest="$HOME/.local/share/remote-desktop-mcp"
mkdir -p "$dest"
# Copy source only. Credentials must be on the WSL Linux filesystem, not /mnt/c.
tar --exclude=.git --exclude=node_modules --exclude=runtime --exclude=config.toml -C "$source_dir" -cf - . | tar -C "$dest" -xf -
exec bash "$dest/setup.sh" "$@"
'@
& wsl.exe --exec bash -c $bootstrap dv-setup "$linuxRoot" @args
if ($LASTEXITCODE -ne 0) { throw "DV setup failed (exit $LASTEXITCODE). Rerun after resolving the displayed issue." }
