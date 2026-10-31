$ErrorActionPreference = 'Stop'
$dest = if ($env:DV_INSTALL_DIR) { $env:DV_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'remote-desktop-mcp' }
if (-not (Test-Path -LiteralPath (Join-Path $dest 'setup.ps1'))) {
    if (Test-Path -LiteralPath $dest) { throw 'Install directory already exists without setup.ps1; choose DV_INSTALL_DIR' }
    $temp = Join-Path ([IO.Path]::GetTempPath()) ('dv-source-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory $temp | Out-Null
    try {
        $zip = Join-Path $temp 'source.zip'
        Invoke-WebRequest -UseBasicParsing 'https://github.com/ThinkerQAQ/remote-desktop-mcp/archive/refs/tags/v0.3.0.zip' -OutFile $zip
        Expand-Archive -LiteralPath $zip -DestinationPath $temp
        New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
        Move-Item -LiteralPath (Join-Path $temp 'remote-desktop-mcp-0.3.0') -Destination $dest
    } finally { Remove-Item -LiteralPath $temp -Recurse -Force }
}
& (Join-Path $dest 'setup.ps1') @args
