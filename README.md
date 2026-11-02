# RemoteDesktopMCP

[简体中文](README_ZH.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Configuration](#3-configuration)
- [4. Optional Features](#4-optional-features)
- [5. Development](#5-development)
- [6. License](#6-license)

## 1. Introduction

RemoteDesktopMCP lets ChatGPT use file-search, file-editing, and terminal tools on a computer you authorize. It connects ChatGPT through an OpenAI Secure MCP Tunnel and provides tools from [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander).

Windows, Linux, and macOS installers bundle Node.js, project dependencies, and the Tunnel Client. **You do not need to install Node.js, npm, or WSL to use an installer.** This is not a screen-sharing or graphical remote-control application.

## 2. Quick Start

Connect ChatGPT to your computer and verify the connection with one read-only tool call.

### 2.1. Requirements

- Windows x64, Linux x64, or macOS Intel (x64). These installer assets do not support ARM64.
- An internet connection and a ChatGPT account/workspace that supports custom MCP connections via Tunnel.
- A Tunnel ID and runtime API key from OpenAI. Create them during [Step 2.3](#23-configure-and-start-the-tunnel).

### 2.2. Download and install

1. Open [Latest Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest). In **Assets**, download the installer matching your computer:

   | Platform | Release filename |
   | --- | --- |
   | Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
   | Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
   | macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

2. Run the installer and select a permanent directory:
   - **Windows:** open the downloaded `.exe`.
   - **macOS:** open the `.dmg` and run the installer inside.
   - **Linux:** in the download directory, rename the downloaded file to `RemoteDesktopMCP-Setup.run`, then run:

   ```bash
   chmod +x RemoteDesktopMCP-Setup.run
   ./RemoteDesktopMCP-Setup.run
   ```

3. Finish the installer. On Windows, leave **Open RemoteDesktopMCP configuration** checked. To open it again later, use **Start Menu → RemoteDesktopMCP → Configure Tunnel**.

The installer includes the runtime and its dependencies. **Do not download a source archive or run `npm ci` for normal installation.**

### 2.3. Configure and start the Tunnel

1. Open [OpenAI Tunnel settings](https://platform.openai.com/settings/organization/tunnels) and create or select **your Tunnel ID**. Create a **runtime API key** at [OpenAI API keys](https://platform.openai.com/settings/organization/api-keys). The key is required for a new connection and must remain private.
2. **Windows:** In **Configure Tunnel**, enter both values and click **Save**. This validates and saves the configuration without starting the service. A saved key is shown as a password mask when you reopen the window.
3. Click **Start Service**, then **Refresh Status**. Confirm the window shows **Local Tunnel: Connected**.
4. **Linux/macOS:** From the installed directory, run `./Configure-RemoteDesktop.sh`. On macOS you can instead open `Configure-RemoteDesktop.command` to launch Terminal. Follow the prompts for Tunnel ID and key. The terminal wizard both configures and starts the user-level runtime.

**Local Tunnel: Connected** confirms the local Tunnel only; it does not prove the ChatGPT plugin is registered.

### 2.4. Connect ChatGPT and verify

1. Open [ChatGPT Plugins](https://chatgpt.com/plugins). Add a **custom MCP server → Tunnel**, select or enter the **same Tunnel ID**, and complete authorization. UI availability and naming may vary; follow the [official connection guide](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt).
2. In a ChatGPT conversation, select the new plugin and call the **read-only** `list_sessions` tool with no arguments.
3. **Expected result:** the tool call succeeds. An empty session list is valid on a fresh computer.

You are connected when **both** the local Tunnel reports `Connected` **and** the ChatGPT tool call succeeds. Keep the computer and service running for future remote requests.

### 2.5. Troubleshooting

- **The Tunnel is not connected:** confirm the ID and key, check network access, and refresh status. Check local logs without uploading credentials.
- **ChatGPT cannot see the plugin:** verify that the registered Tunnel ID matches, that account permissions were completed, and that you selected the plugin in the conversation.
- **Save did not apply the new configuration:** Save does not interrupt a running service. Click **Stop Service** and then **Start Service** to apply new settings.
- **Another machine or WSL responds:** check which Tunnel is registered and which operating-system process is running. Windows installation uses Windows processes; WSL is not required.

If the issue persists, [open an Issue](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues) with sanitized error details, not keys or private output.

## 3. Configuration

Windows configuration is managed in **Start Menu → RemoteDesktopMCP → Configure Tunnel** (or `bin/RemoteDesktopMCP-Configure.exe` inside the installation directory).

| Control | Action |
| --- | --- |
| **Save** | Validate and save the Tunnel ID and key; do not start or stop the service |
| **Start Service / Stop Service** | Start or stop the local service using the saved configuration |
| **Refresh Status** | Read the current state without making changes |
| **Auto-start at Windows sign-in** | Enable/disable the current user's sign-in task; toggling does not stop an active connection |
| **Open ChatGPT Plugins** | Open the [ChatGPT plugin page](https://chatgpt.com/plugins) |

To apply changes to a running connection: **Save → Stop Service → Start Service**. Do not run multiple instances with the same Tunnel ID.

The application stores private `config.toml` and `runtime/` data in the installation directory. Do not publish or commit them. To change settings or remove the installation on Windows, open **Start Menu → RemoteDesktopMCP → Manage RemoteDesktopMCP**. Back up your settings and stop the service before uninstalling or moving the folder.

## 4. Optional Features

### 4.1. Case 1: Manage the service from the terminal

From the **installed directory** on Linux/macOS, use the bundled Node.js:

```bash
./bin/node ./scripts/runtime.mjs status
./bin/node ./scripts/runtime.mjs stop
./bin/node ./scripts/runtime.mjs start
```

Run only the command needed; these are not sequential installation steps. To reconfigure, rerun `./Configure-RemoteDesktop.sh` (macOS: `./Configure-RemoteDesktop.command`). Unlike the Windows **Save** button, the terminal wizard also starts the service.

Windows sign-in auto-start uses a **per-user Scheduled Task** when enabled; macOS uses a user LaunchAgent; Linux uses user systemd when available, otherwise a background process. The Linux fallback does not automatically restart after logout/reboot.

### 4.2. Case 2: Connect a local MCP client without a Tunnel

For local stdio clients, a Tunnel ID and runtime API key are unnecessary. Use a source checkout and the dependencies installed in [Section 5](#5-development). In your client's MCP settings, configure the absolute path to `scripts/proxy.mjs`:

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

Restart or reconnect the client and call the read-only `list_sessions` tool. The exact client settings location varies. This local test is separate from a remote ChatGPT Tunnel.

## 5. Development

Source development requires Git, npm, and Node.js satisfying [package.json](package.json). Normal installer users do **not** need these dependencies.

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

On Windows PowerShell, use `npm.cmd` if the PowerShell shim is blocked by execution policy. `check` runs compatibility and unit tests; `smoke` discovers MCP tools and completes a read-only call. Changes follow pull-request review and Squash Merge. [Installer CI](.github/workflows/offline-installers.yml) and [Release CI](.github/workflows/release.yml) build the native packages.

## 6. License

Original project code is [Apache-2.0](LICENSE); third-party notices and licenses are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

**Security:** RemoteDesktopMCP exposes file and terminal operations with the permissions of the operating-system account running it. It does not provide an additional sandbox or tool allowlist. Use a least-privilege account, review ChatGPT plugin permissions, and keep the Tunnel credentials, `runtime/`, `config.toml`, and logs private. MCP requests and results may be transmitted to the connected AI service.

Report vulnerabilities privately through [GitHub security advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories).
