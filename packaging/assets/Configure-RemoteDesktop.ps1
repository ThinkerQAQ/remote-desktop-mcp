# Windows per-user setup. The installer bundles Node, dependencies and tunnel-client.
# The runtime key is entered privately in this terminal; never put it in a command line.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:DV_TUNNEL_CLIENT = Join-Path $root 'bin\tunnel-client.exe'
$env:PATH = (Join-Path $root 'bin') + ';' + $env:PATH
& (Join-Path $root 'bin\node.exe') (Join-Path $root 'scripts\setup.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Remote Desktop MCP configuration failed. Existing settings were retained when possible.' }
