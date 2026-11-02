param([switch]$SelfTest)

# Native Windows configuration GUI. No terminal/TTY is required.
# User secrets are passed to the existing setup.mjs via child process environment,
# never via command-line arguments or installer logs.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
$node = Join-Path $root 'bin\node.exe'
$tunnel = Join-Path $root 'bin\tunnel-client.exe'
$setup = Join-Path $root 'scripts\setup.mjs'

foreach ($required in @($node, $tunnel, $setup)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        $message = "Missing bundled executable or script: $required"
        [System.Windows.Forms.MessageBox]::Show($message, 'RemoteDesktopMCP', 'OK', 'Error') | Out-Null
        throw $message
    }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = 'RemoteDesktopMCP - Configure Tunnel'
$brandIconPath = Join-Path $root 'brand\remotedesktopmcp.ico'
if (Test-Path -LiteralPath $brandIconPath -PathType Leaf) {
    $form.Icon = New-Object System.Drawing.Icon($brandIconPath)
}
$form.Size = New-Object System.Drawing.Size(620, 430)
$form.MinimumSize = New-Object System.Drawing.Size(620, 430)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false

$title = New-Object System.Windows.Forms.Label
$title.Location = New-Object System.Drawing.Point(20, 16)
$title.Size = New-Object System.Drawing.Size(580, 30)
$title.Text = 'Configure a new ChatGPT connection on this Windows computer.'
$form.Controls.Add($title)

# User-facing links are opened in the default browser and not handled by a local server.
$tunnelLink = New-Object System.Windows.Forms.LinkLabel
$tunnelLink.Location = New-Object System.Drawing.Point(20, 53)
$tunnelLink.Size = New-Object System.Drawing.Size(580, 23)
$tunnelLink.Text = 'Step 1: Create / manage Tunnel ID'
$tunnelLink.Add_LinkClicked({
    [System.Diagnostics.Process]::Start('https://platform.openai.com/settings/organization/tunnels') | Out-Null
})
$form.Controls.Add($tunnelLink)

$keyLink = New-Object System.Windows.Forms.LinkLabel
$keyLink.Location = New-Object System.Drawing.Point(20, 80)
$keyLink.Size = New-Object System.Drawing.Size(580, 23)
$keyLink.Text = 'Step 2: Create runtime API key (new installations)'
$keyLink.Add_LinkClicked({
    [System.Diagnostics.Process]::Start('https://platform.openai.com/settings/organization/api-keys') | Out-Null
})
$form.Controls.Add($keyLink)

$idLabel = New-Object System.Windows.Forms.Label
$idLabel.Text = 'Tunnel ID'
$idLabel.Location = New-Object System.Drawing.Point(20, 120)
$idLabel.AutoSize = $true
$form.Controls.Add($idLabel)

$idBox = New-Object System.Windows.Forms.TextBox
$idBox.Location = New-Object System.Drawing.Point(175, 117)
$idBox.Size = New-Object System.Drawing.Size(405, 26)
$idBox.TabIndex = 0
$form.Controls.Add($idBox)

$keyLabel = New-Object System.Windows.Forms.Label
$keyLabel.Text = 'Runtime API key'
$keyLabel.Location = New-Object System.Drawing.Point(20, 160)
$keyLabel.AutoSize = $true
$form.Controls.Add($keyLabel)

$keyBox = New-Object System.Windows.Forms.TextBox
$keyBox.Location = New-Object System.Drawing.Point(175, 157)
$keyBox.Size = New-Object System.Drawing.Size(405, 26)
$keyBox.PasswordChar = '*'
$keyBox.TabIndex = 1
$form.Controls.Add($keyBox)

$help = New-Object System.Windows.Forms.Label
$help.Location = New-Object System.Drawing.Point(20, 199)
$help.Size = New-Object System.Drawing.Size(580, 45)
$help.Text = 'Step 3: Configure. The API key is required for a new connection; leave it blank only when this installation already has saved credentials. Old WSL tunnels are not changed.'
$form.Controls.Add($help)

$startButton = New-Object System.Windows.Forms.Button
$startButton.Location = New-Object System.Drawing.Point(360, 254)
$startButton.Size = New-Object System.Drawing.Size(215, 33)
$startButton.Text = 'Configure and Start'
$startButton.TabIndex = 2
$form.Controls.Add($startButton)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(20, 307)
$status.Size = New-Object System.Drawing.Size(580, 85)
$status.Text = 'Ready. Follow the links above, then configure.'
$form.Controls.Add($status)

$script:childProcess = $null
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500

$startButton.Add_Click({
    try {
        $id = $idBox.Text.Trim()
        $key = $keyBox.Text
        if ($id -notmatch '^tunnel_[A-Za-z0-9_-]+$') {
            [System.Windows.Forms.MessageBox]::Show('Enter a valid new Tunnel ID.', 'Invalid Tunnel ID', 'OK', 'Warning') | Out-Null
            return
        }
        $savedCredentials = (Test-Path -LiteralPath (Join-Path $root 'runtime\credentials.json') -PathType Leaf) -and
                            (Test-Path -LiteralPath (Join-Path $root 'runtime\setup.json') -PathType Leaf)
        if ([string]::IsNullOrWhiteSpace($key) -and -not $savedCredentials) {
            [System.Windows.Forms.MessageBox]::Show('This is a new installation. Create a runtime API key using the link above. Tunnel ID alone cannot authenticate.', 'Runtime API key required', 'OK', 'Warning') | Out-Null
            return
        }
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $node
        $psi.Arguments = '"' + $setup.Replace('"', '\"') + '" --non-interactive'
        $psi.WorkingDirectory = $root
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.EnvironmentVariables['DV_TUNNEL_ID'] = $id
        # When empty, let setup.mjs reuse this installation's private key.
        if (-not [string]::IsNullOrWhiteSpace($key)) {
            $psi.EnvironmentVariables['DV_RUNTIME_API_KEY'] = $key
        } else {
            $psi.EnvironmentVariables.Remove('DV_RUNTIME_API_KEY')
        }
        $psi.EnvironmentVariables['DV_TUNNEL_CLIENT'] = $tunnel
        $psi.EnvironmentVariables['PATH'] = (Join-Path $root 'bin') + ';' + $env:PATH
        $psi.EnvironmentVariables['PUPPETEER_SKIP_DOWNLOAD'] = 'true'
        $script:childProcess = New-Object System.Diagnostics.Process
        $script:childProcess.StartInfo = $psi
        if (-not $script:childProcess.Start()) {
            throw 'Could not launch bundled MCP configuration.'
        }
        $keyBox.Clear()
        $psi.EnvironmentVariables.Remove('DV_RUNTIME_API_KEY')
        $key = $null
        $startButton.Enabled = $false
        $status.Text = 'Validating local MCP and connecting the new Tunnel. Please keep this window open.'
        $timer.Start()
    } catch {
        $status.Text = 'Setup failed to start: ' + $_.Exception.Message
        $startButton.Enabled = $true
    }
})

$timer.Add_Tick({
    if (-not $script:childProcess) { return }
    try {
        if (-not $script:childProcess.HasExited) { return }
        $timer.Stop()
        $output = $script:childProcess.StandardOutput.ReadToEnd()
        $errors = $script:childProcess.StandardError.ReadToEnd()
        $exitCode = $script:childProcess.ExitCode
        $script:childProcess.Dispose()
        $script:childProcess = $null
        $startButton.Enabled = $true
        if ($exitCode -eq 0 -and $output -match '"tunnel_ready"\s*:\s*true') {
            $status.Text = 'Tunnel connected. Next: register the new Tunnel ID as a custom MCP plugin in ChatGPT.'
        } else {
            $message = if ($errors.Trim()) { $errors.Trim() } else { $output.Trim() }
            # The runtime error does not contain the key by design. Do not print environment variables.
            if ($message.Length -gt 450) { $message = $message.Substring(0, 450) + '...' }
            $status.Text = "Configuration failed (exit $exitCode). " + $message
        }
    } catch {
        $timer.Stop()
        $startButton.Enabled = $true
        $status.Text = 'Unable to read setup result: ' + $_.Exception.Message
    }
})

$form.Add_FormClosing({
    if ($script:childProcess -and -not $script:childProcess.HasExited) {
        $_.Cancel = $true
        [System.Windows.Forms.MessageBox]::Show('Configuration is still running. Complete the setup before closing this window.', 'RemoteDesktopMCP', 'OK', 'Information') | Out-Null
    }
})

if ($SelfTest) {
    if ($form.Controls.Count -lt 9 -or -not $startButton.Enabled -or -not $keyBox.PasswordChar -or $tunnelLink.Text -notlike '*Tunnel ID*' -or $keyLink.Text -notlike '*API key*') {
        throw 'Configuration GUI controls failed validation.'
    }
    Write-Output 'WINDOWS_CONFIG_GUI_SELFTEST_PASS'
    $form.Dispose()
    exit 0
}
[void]$form.ShowDialog()
$timer.Dispose()
$form.Dispose()
