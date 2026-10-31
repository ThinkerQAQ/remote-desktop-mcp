$ErrorActionPreference = 'Stop'
$dest = if ($env:DV_INSTALL_DIR) { $env:DV_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'remote-desktop-mcp' }
if (-not (Test-Path -LiteralPath (Join-Path $dest 'setup.ps1'))) {
    if (Test-Path -LiteralPath $dest) { throw 'Install directory already exists without setup.ps1; choose DV_INSTALL_DIR' }
    $temp = Join-Path ([IO.Path]::GetTempPath()) ('dv-source-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory $temp | Out-Null
    try {
        $asset = 'remote-desktop-mcp-v0.3.1-windows.zip'
        $baseUrl = 'https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/download/v0.3.1'
        $zip = Join-Path $temp $asset
        $sumfile = Join-Path $temp 'SHA256SUMS'
        Invoke-WebRequest -UseBasicParsing "$baseUrl/$asset" -OutFile $zip
        Invoke-WebRequest -UseBasicParsing "$baseUrl/SHA256SUMS" -OutFile $sumfile
        $expected = $null
        foreach ($line in (Get-Content -LiteralPath $sumfile)) {
            $parts = $line.Trim() -split '\s+', 2
            if ($parts.Count -eq 2 -and $parts[1].TrimStart('*') -eq $asset) { $expected = $parts[0]; break }
        }
        if (!$expected -or $expected -notmatch '^[a-fA-F0-9]{64}$') { throw 'Invalid release checksum.' }
        if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ine $expected) { throw 'Release checksum mismatch.' }
        Expand-Archive -LiteralPath $zip -DestinationPath $temp
        $source = Join-Path $temp 'remote-desktop-mcp-v0.3.1'
        if (!(Test-Path -LiteralPath (Join-Path $source 'setup.ps1'))) { throw 'Invalid release archive.' }
        New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
        Move-Item -LiteralPath $source -Destination $dest
    } finally { Remove-Item -LiteralPath $temp -Recurse -Force }
}
& (Join-Path $dest 'setup.ps1') @args
