# RemoteDesktopMCP

[简体中文](README_ZH.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Configuration](#3-configuration)
- [4. Optional Features](#4-optional-features)
- [5. Development](#5-development)
- [6. License](#6-license)

## 1. Introduction

RemoteDesktopMCP started with a practical goal: I wanted to use ChatGPT in the browser to work directly with files and tools on my computer—for example, reading project code, editing documentation, or running terminal commands.

ChatGPT can generate code and reason through problems, but a browser conversation alone cannot access my local files or development environment. To make it useful for these tasks, it needs tools that can perform actions on the computer.

I initially considered building those tools myself, then found that [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) already provides file operations, search, and terminal commands through MCP. There was no reason to rebuild that functionality. The remaining question was **how to connect browser-based ChatGPT to tools running locally**.

RemoteDesktopMCP uses OpenAI Secure MCP Tunnel for that connection. A client on the computer establishes an outbound connection to OpenAI, allowing ChatGPT to call the local Desktop Commander tools without exposing a local MCP port to the public internet or relying on Desktop Commander's hosted remote service.

The project also provides installers, configuration, and service management for Windows, Linux, and macOS. Once installed, you configure a Tunnel, start the service, and register the plugin in ChatGPT to work with local files and terminal commands from the browser.

## 2. Quick Start

We'll install RemoteDesktopMCP, connect the computer to ChatGPT, and confirm that a real tool call works. Windows uses a configuration window; Linux and macOS use a terminal wizard included with the installer.

### 2.1. Requirements

You need an internet connection and a ChatGPT account or workspace that supports custom MCP Tunnel connections. Installers are available for Windows x64, Linux x64, and Intel-based macOS; ARM64 is not currently supported.

You can create the Tunnel ID and Runtime API Key after installation. There is no configuration file to edit first.

### 2.2. Download and install

Open the [latest GitHub Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest) and download the appropriate installer from Assets:

| Platform | Installer |
| --- | --- |
| Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
| Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
| macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

On Windows, run the EXE and choose an installation directory. On macOS, open the DMG and run the installer inside. On Linux, open a terminal in the download directory:

```bash
chmod +x ./RemoteDesktopMCP-v*-linux-amd64.run
./RemoteDesktopMCP-v*-linux-amd64.run
```

On the installation completion page, select **Open RemoteDesktopMCP configuration** to open the local configuration page in your browser. You can reopen it from the Windows Start menu, the macOS application, or the Linux application menu.

### 2.3. Configure and start the Tunnel

With the application installed, we need a connection between the computer and ChatGPT.

Create a Tunnel in [OpenAI Tunnel settings](https://platform.openai.com/settings/organization/tunnels) and copy its **Tunnel ID**. Then create a **Runtime API Key** under [API Keys](https://platform.openai.com/settings/organization/api-keys). The ID identifies the connection; the key authenticates the local client.

Open **Configure Tunnel** and follow these steps:

1. Enter the Tunnel ID and Runtime API Key, then click **Save**.
2. Click **Start Service** to start the local Tunnel service.
3. Click **Refresh Status** and check for **Local Tunnel: Connected**.

A saved key appears masked when you reopen the configuration window.

### 2.4. Verify the connection in ChatGPT

The local Tunnel is connected. One more step tells ChatGPT which MCP plugin to use.

Open [ChatGPT Plugins](https://chatgpt.com/plugins), add a custom MCP server, choose **Tunnel**, and register the same Tunnel ID. Complete the authorization steps. If the interface has changed, refer to the [OpenAI connection guide](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt).

Select the plugin in a ChatGPT conversation and make a read-only `list_sessions` call. If the tool succeeds, ChatGPT can reach the local MCP. An empty session list is normal for a new installation.

Keep the computer and Tunnel service running when you need to use it.

### 2.5. Troubleshooting

**The Tunnel does not connect.** Check the Tunnel ID, key, and network connection, then refresh status. Inspect local logs if needed, but don't post credentials publicly.

**The window says Connected, but ChatGPT can't use the tools.** Check plugin registration, the Tunnel ID, and whether the plugin is selected in the current conversation. Local connectivity and ChatGPT registration are separate steps.

**A configuration change hasn't taken effect.** Save does not restart the service. Click **Stop Service → Start Service** to apply the new settings.

If the tools operate on WSL or another computer, check which device owns the registered Tunnel. Avoid running multiple instances with the same Tunnel ID. For unresolved issues, open an [Issue](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues) with sanitized reproduction details.

## 3. Configuration

The same configuration page is available on all three platforms and handles everyday service management:

| Control | Action |
| --- | --- |
| **Save** | Save the Tunnel ID and key without changing the service |
| **Start Service / Stop Service** | Start or stop the local service |
| **Refresh Status** | Read the current service state |
| **Auto-start when I sign in** | Control startup for the current Windows user without stopping an active connection |
| **Open ChatGPT Plugins** | Open the [ChatGPT plugin page](https://chatgpt.com/plugins) |

For example, to change the Tunnel ID, enter the new value and click Save. If the service is running, stop and start it once to use the new settings. Auto-start is a separate preference; turning it off won't immediately disconnect the Tunnel.

Configuration is stored in `config.toml` and `runtime/` in the installation directory, including private credentials. Stop the service and back up these files before moving or uninstalling. On Windows, open **Start Menu → RemoteDesktopMCP → Manage RemoteDesktopMCP** for maintenance and uninstallation.

## 4. Optional Features

### 4.1. Case 1: Manage the service from a terminal

You can also configure the Tunnel from a terminal in the installation directory. Run `./bin/node ./scripts/cli-config.mjs` on Linux/macOS or `.\bin\node.exe .\scripts\cli-config.mjs` in Windows PowerShell; the wizard prompts for the Tunnel ID and key.

To manage the service, use the following commands on Linux/macOS:

```bash
# Check status
./bin/node ./scripts/runtime.mjs status

# Stop the service
./bin/node ./scripts/runtime.mjs stop

# Start the service
./bin/node ./scripts/runtime.mjs start
```

On Windows, use `./bin/node.exe` instead of `./bin/node`. To manage sign-in startup, run `./bin/node ./scripts/runtime.mjs autostart enable`, replace `enable` with `disable` to turn it off, or use `status` to inspect it. The `./Configure-RemoteDesktop.sh` terminal wizard remains available on Linux/macOS.

Background services run under the current user: Windows uses a Scheduled Task for sign-in startup, macOS uses a LaunchAgent, and Linux prefers user-level systemd. Without systemd, Linux falls back to a background process that must be started manually after logout or reboot.

### 4.2. Case 2: Connect a local MCP client

RemoteDesktopMCP also supports local stdio clients. In this case, you can run `scripts/proxy.mjs` directly without configuring a Tunnel.

First install the source dependencies in [Development](#5-development), then configure your MCP client:

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

Replace the sample with the actual absolute path, reconnect the client, and call `list_sessions` to verify. Local stdio and the ChatGPT Tunnel are separate ways to connect.

## 5. Development

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

## 6. License

Original project code is licensed under [Apache-2.0](LICENSE). Third-party licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

RemoteDesktopMCP reads, writes, and runs commands using the permissions of the operating-system account that starts it; it does not add a tool-level sandbox. Use an appropriately restricted account and review plugin permissions. MCP requests and results may be sent to the connected AI service. Keep `config.toml`, `runtime/`, keys, and logs private.

Please report security issues privately through [GitHub Security Advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories).
