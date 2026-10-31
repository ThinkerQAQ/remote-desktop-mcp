$ErrorActionPreference = 'Stop'
$originalKey = $env:DV_RUNTIME_API_KEY
$env:DV_RUNTIME_API_KEY = $null
$root = $PSScriptRoot
$tools = Join-Path $root 'runtime/tools'
$temp = Join-Path ([IO.Path]::GetTempPath()) ('dv-bootstrap-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $tools, $temp | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Download-Verified($url, $fileName, $sumsUrl) {
    $file = Join-Path $temp $fileName
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file
    # GitHub serves SHA256SUMS.txt as application/octet-stream on Windows PowerShell 5.1.
    # Invoke-WebRequest .Content can be byte[] rather than text; always read from disk.
    $sumsFile = Join-Path $temp 'release-sha256sums.txt'
    Invoke-WebRequest -UseBasicParsing -Uri $sumsUrl -OutFile $sumsFile
    $entries = @([IO.File]::ReadAllLines($sumsFile) | Where-Object { $_.Trim() -match ('^[a-fA-F0-9]{64}\s+\*?' + [regex]::Escape($fileName) + '$') })
    if ($entries.Count -ne 1) { throw "Missing or ambiguous release checksum for $fileName" }
    $expected = ($entries[0].Trim() -split '\s+')[0]
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash -ine $expected) { throw 'Checksum mismatch; installation refused' }
    return $file
}
try {
    $arch = if ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString() -eq 'Arm64') { 'arm64' } else { 'x64' }
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    $node = if ($nodeCommand) { $nodeCommand.Source } else { $null }
    $supported = $false
    if ($node) {
        # Avoid passing JavaScript quotes through Windows PowerShell / Git Bash / cmd.exe.
        $versionText = (& $node --version).Trim()
        if ($LASTEXITCODE -eq 0 -and $versionText -match '^v([0-9]+)\.([0-9]+)\.') {
            $major = [int]$Matches[1]; $minor = [int]$Matches[2]
            $supported = $major -gt 22 -or ($major -eq 22 -and $minor -ge 12)
        }
    }
    if (-not $supported -or $env:DV_FORCE_MANAGED_NODE -eq '1') {
        $node = Join-Path $tools 'node/node.exe'
        if (-not (Test-Path -LiteralPath $node)) {
            $version = 'v24.21.0'; $name = "node-$version-win-$arch.zip"
            $file = Download-Verified "https://nodejs.org/dist/$version/$name" $name "https://nodejs.org/dist/$version/SHASUMS256.txt"
            Expand-Archive -LiteralPath $file -DestinationPath $temp
            Move-Item -LiteralPath (Join-Path $temp "node-$version-win-$arch") -Destination (Join-Path $tools 'node')
        }
    }
    $env:PATH = (Split-Path $node) + ';' + $env:PATH
    $clientCommand = Get-Command tunnel-client.exe -ErrorAction SilentlyContinue
    $client = if ($env:DV_TUNNEL_CLIENT) { $env:DV_TUNNEL_CLIENT } elseif ($clientCommand) { $clientCommand.Source } else { $null }
    if (-not $client -or $env:DV_FORCE_MANAGED_TUNNEL -eq '1') {
        $client = Join-Path $tools 'tunnel/tunnel-client.exe'
        if (-not (Test-Path -LiteralPath $client)) {
            $version = 'v0.0.16'; $cpu = if ($arch -eq 'x64') { 'amd64' } else { 'arm64' }
            $name = "tunnel-client-$version-windows-$cpu.zip"; $base = "https://github.com/openai/tunnel-client/releases/download/$version"
            $file = Download-Verified "$base/$name" $name "$base/SHA256SUMS.txt"
            $unpack = Join-Path $temp 'tunnel'; Expand-Archive -LiteralPath $file -DestinationPath $unpack
            $exe = Get-ChildItem -LiteralPath $unpack -Filter tunnel-client.exe -Recurse | Select-Object -First 1
            if (-not $exe) { throw 'Release archive has no tunnel-client.exe' }
            Move-Item -LiteralPath $unpack -Destination (Join-Path $tools 'tunnel')
            $client = Join-Path (Join-Path $tools 'tunnel') $exe.FullName.Substring($unpack.Length + 1)
        }
    }
    & $client --version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'tunnel-client is not executable' }
    $env:DV_TUNNEL_CLIENT = $client
    $env:PUPPETEER_SKIP_DOWNLOAD = 'true'
    Push-Location $root
    try { & npm.cmd ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' } } finally { Pop-Location }
    $env:DV_RUNTIME_API_KEY = $originalKey
    & $node (Join-Path $root 'scripts/setup.mjs') @args
    if ($LASTEXITCODE -ne 0) { throw 'DV configuration failed; review the message above and rerun' }
} finally {
    $env:DV_RUNTIME_API_KEY = $originalKey
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
