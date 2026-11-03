# RemoteDesktopMCP

[简体中文](README_ZH.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Optional Features](#3-optional-features)
- [4. Development](#4-development)
- [5. License](#5-license)

## 1. Introduction

RemoteDesktopMCP started with a practical goal: I wanted to use ChatGPT in the browser to work directly with files and tools on my computer—for example, reading project code, editing documentation, or running terminal commands.

ChatGPT can generate code and reason through problems, but a browser conversation alone cannot access my local files or development environment. To make it useful for these tasks, it needs tools that can perform actions on the computer.

I initially considered building those tools myself, then found that [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) already provides file operations, search, and terminal commands through MCP. There was no reason to rebuild that functionality. The remaining question was **how to connect browser-based ChatGPT to tools running locally**.

RemoteDesktopMCP uses OpenAI Secure MCP Tunnel for that connection. A client on the computer establishes an outbound connection to OpenAI, allowing ChatGPT to call the local Desktop Commander tools without exposing a local MCP port to the public internet or relying on Desktop Commander's hosted remote service.

The project also provides installers, configuration, and service management for Windows, Linux, and macOS. Once installed, you configure a Tunnel, start the service, and register the plugin in ChatGPT to work with local files and terminal commands from the browser.

## 2. Quick Start

Install RemoteDesktopMCP, configure the connection, and verify it in ChatGPT. You need an internet connection and a ChatGPT account or workspace that supports custom MCP Tunnel connections. Installers are available for Windows x64, Linux x64, and Intel macOS.

### 2.1. Install

Download the installer for your system from the [latest Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest).

#### 2.1.1. Graphical Interface

##### Windows

Run `RemoteDesktopMCP-v*-windows-amd64.exe` and complete the installation wizard. Open **Configure Tunnel** from the Start Menu.

##### macOS

Open `RemoteDesktopMCP-v*-darwin-amd64.dmg` and run the installer application. On the completion screen, select **Open RemoteDesktopMCP configuration** to open the configuration UI in your browser.

##### Linux

Run `RemoteDesktopMCP-v*-linux-amd64.run` from your desktop environment. If execution is blocked, enable it in the file properties. On the completion screen, select **Open RemoteDesktopMCP configuration** to open the configuration UI in your browser.

#### 2.1.2. Command Line

##### Windows

Open a terminal in the download directory:


```powershell
$installer = (Get-ChildItem .\RemoteDesktopMCP-v*-windows-amd64.exe | Select-Object -First 1).FullName
Start-Process -FilePath $installer -ArgumentList '--accept-licenses --default-answer --confirm-command install' -Wait
```


##### macOS

Mount the DMG and run its installer:


```bash
dmg=$(find . -maxdepth 1 -name 'RemoteDesktopMCP-v*-darwin-amd64.dmg' -print -quit)
mount=$(mktemp -d)
hdiutil attach -nobrowse -readonly -mountpoint "$mount" "$dmg"
app=$(find "$mount" -maxdepth 1 -name '*.app' -print -quit)
installer=$(find "$app/Contents/MacOS" -maxdepth 1 -type f -perm -111 -print -quit)
QT_QPA_PLATFORM=offscreen "$installer" --root "$HOME/RemoteDesktopMCP" --accept-licenses --default-answer --confirm-command install
hdiutil detach "$mount"
```


##### Linux


```bash
chmod +x ./RemoteDesktopMCP-v*-linux-amd64.run
QT_QPA_PLATFORM=offscreen ./RemoteDesktopMCP-v*-linux-amd64.run --root "$HOME/RemoteDesktopMCP" --accept-licenses --default-answer --confirm-command install
```

After installation, configure the connection in the next section.

### 2.2. Configuration

Create a [Tunnel ID](https://platform.openai.com/settings/organization/tunnels) and a [Runtime API Key](https://platform.openai.com/settings/organization/api-keys).

#### 2.2.1. Graphical Interface

Enter both values in the configuration UI, save the configuration, start the service, and refresh status to confirm **Local Tunnel: Connected**.

#### 2.2.2. Command Line

From the installation directory:

```bash
./bin/remotedesktopmcp configure
./bin/remotedesktopmcp start
./bin/remotedesktopmcp status
```

On Windows, use `.\bin\remotedesktopmcp.exe` with the same subcommands. Interactive `configure` hides the Runtime API Key. For automation, use `configure --id <tunnel-id> --api-key-stdin` and pass the key through standard input. Use `stop` to stop the service.

#### 2.2.3. Start on Boot (Optional)

A normal `start` launches a user-owned background process. To run after a reboot, first configure the connection, then register an OS-managed service.

Linux / macOS user sessions:

```bash
./bin/remotedesktopmcp service --scope user install
./bin/remotedesktopmcp start
```

On SSH-only macOS or Linux servers, use a system service with an unprivileged account that can access the private configuration:

```bash
sudo ./bin/remotedesktopmcp service --scope system --user YOUR_OS_USER install
sudo ./bin/remotedesktopmcp start
```

On Windows Server Core, first configure the Tunnel under the service account. Register Windows Service from an elevated terminal (the account password is entered privately):

```powershell
.\bin\remotedesktopmcp.exe service --scope system --user "DOMAIN\restricted-user" install
.\bin\remotedesktopmcp.exe start
```

System service registration needs OS privileges. Remove old auto-start tasks before migrating to avoid duplicate instances. Unattended reboot recovery still requires separate acceptance testing.

### 2.3. Verify in ChatGPT

Open [ChatGPT Plugins](https://chatgpt.com/plugins), register a custom MCP Tunnel using the same Tunnel ID, and authorize the connection. Refer to the [OpenAI connection guide](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) for current account-specific steps.

In ChatGPT, select the plugin and call the read-only `list_sessions` tool. An empty list is a valid result.

### 2.4. Troubleshooting

If the Tunnel is not connected, verify the saved ID, key, network, and local service status. If ChatGPT cannot call the tools despite a connected Tunnel, verify that its plugin is registered and selected. Do not share credentials or local logs containing private data.

## 3. Optional Features

### 3.1. Connect a local MCP client

RemoteDesktopMCP also supports local stdio clients without a Tunnel. For source-based use, install the development dependencies in [Development](#4-development), then configure the local client with the absolute path to `scripts/proxy.mjs`:

```json
{
  "mcpServers": {
    "desktop": {
      "command": "node",
      "args": ["/absolute/path/remote-desktop-mcp/scripts/proxy.mjs"]
    }
  }
}
```

Reconnect the client and call `list_sessions` to verify.

## 4. Development

You can skip this section if you're using an installer. To work with the source, install Git, npm, and a Node.js version supported by [package.json](package.json):

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

`check` runs unit and compatibility tests; `smoke` initializes the MCP server and makes a read-only call. On Windows PowerShell, use `npm.cmd` if the execution policy blocks the npm shim.

Changes go through pull-request review and Squash Merge. See [Installer CI](.github/workflows/offline-installers.yml) and [Release CI](.github/workflows/release.yml) for the package builds.

## 5. License

Original project code is licensed under [Apache-2.0](LICENSE). Third-party licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

RemoteDesktopMCP reads, writes, and runs commands using the permissions of the operating-system account that starts it; it does not add a tool-level sandbox. Use an appropriately restricted account and review plugin permissions. MCP requests and results may be sent to the connected AI service. Keep `config.toml`, `runtime/`, keys, and logs private.

Please report security issues privately through [GitHub Security Advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories).
