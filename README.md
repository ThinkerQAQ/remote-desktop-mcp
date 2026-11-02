# RemoteDesktopMCP

[简体中文](README_ZH.md)

- [1. Overview](#1-overview)
- [2. Quick Start: ChatGPT](#2-quick-start-chatgpt)
- [3. Manage the Connection](#3-manage-the-connection)
- [4. Other MCP Clients](#4-other-mcp-clients)
- [5. Development](#5-development)
- [6. License and Security](#6-license-and-security)

## 1. Overview

RemoteDesktopMCP connects an authorized computer to ChatGPT through an OpenAI Secure MCP Tunnel. It exposes [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) tools for files, search, and terminal commands. It **does not** provide screen sharing or mouse/keyboard control.

Installers for Windows, Linux, and macOS bundle Node.js, project dependencies, and the Tunnel Client. **Users installing a Release do not need to install Node.js, npm, or WSL separately.**

## 2. Quick Start: ChatGPT

The supported flow is **install → configure → start → register → verify**. A custom MCP Tunnel connection must be available to your ChatGPT account or workspace.

### 2.1. Download and install

1. Open the [latest Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest) and download the **native installer**, not a source archive:

   | System | Installer |
   | --- | --- |
   | Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
   | Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
   | macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

   These packages target **x64/Intel**, not ARM64. Other architectures are not covered by these installers.

2. Run the installer and choose a persistent installation directory. On Linux, first make the downloaded file executable (`chmod +x ./RemoteDesktopMCP-v*-linux-amd64.run`), then run it. On macOS, open the downloaded DMG and launch the installer. On Windows, run the EXE directly.

3. Complete the installation. On Windows, leave **Open RemoteDesktopMCP configuration** checked to open the configuration window. You can reopen it later from **Start → RemoteDesktopMCP → Configure Tunnel**.

No source checkout or `npm ci` is required for this installation path.

### 2.2. Configure the Tunnel

1. Create or select **your own** [Tunnel ID](https://platform.openai.com/settings/organization/tunnels) and obtain a [runtime API key](https://platform.openai.com/settings/organization/api-keys). The Tunnel ID identifies the connection; the key authenticates the local Tunnel Client. Never publish the key.
2. **Windows:** In **Configure Tunnel**, enter the Tunnel ID and runtime API key, then click **Save**. The key is masked; on later visits, the mask means a key is already stored and can be reused. **Save does not start, stop, or restart the service.**
3. Click **Start Service**. Use **Refresh Status** and confirm **Local Tunnel: Connected**. If the service is running, this button becomes **Stop Service**.
4. **Linux/macOS:** Open a terminal in the installed directory and run the included `Configure-RemoteDesktop.sh` (on macOS, the installed `Configure-RemoteDesktop.command` opens it in Terminal). Enter the Tunnel ID and key when prompted. This terminal wizard saves the configuration and starts the user-level runtime. The Windows three-button configuration window is **not** present on these platforms.

A successful local Tunnel status does **not** mean the ChatGPT plugin has been registered.

### 2.3. Register and verify the ChatGPT plugin

1. Open [ChatGPT Plugins](https://chatgpt.com/plugins). Where your account supports custom MCP, add a **custom MCP server → Tunnel**, then choose or enter your saved Tunnel ID and complete the permission prompts. The exact interface can vary; see the [official connection guide](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt).
2. In ChatGPT, select the newly registered plugin and make one **read-only** `list_sessions` tool call.
3. If the call succeeds (including an empty result), ChatGPT can reach the MCP server on your computer.

**Done:** local Tunnel connected **and** ChatGPT read-only tool call succeeds. The computer and its service must remain running for future remote requests.

## 3. Manage the Connection

### 3.1. Windows configuration window

Open **Start → RemoteDesktopMCP → Configure Tunnel**, or run `bin/RemoteDesktopMCP-Configure.exe` from the installation directory.

| Control | Behavior |
| --- | --- |
| **Save** | Validate and save the Tunnel ID/key; does not change the running service |
| **Start Service / Stop Service** | Start or stop the saved Tunnel runtime |
| **Refresh Status** | Read the current connection state without changing it |
| **Auto-start at Windows sign-in** | Enable or disable the current user's logon task; changing it does not stop the current connection |
| **Open ChatGPT Plugins** | Open `https://chatgpt.com/plugins` |

After changing a configuration that is already in use, click **Stop Service** and then **Start Service** to apply the saved settings. Do not run two services using the same Tunnel ID.

To change settings or uninstall the Windows application, use **Start → RemoteDesktopMCP → Manage RemoteDesktopMCP**. Stop the Tunnel and back up private configuration before uninstalling or moving the installation directory.

### 3.2. Linux and macOS commands

Run these commands **from the installation directory**; they use the Node.js runtime bundled in the installer:

```bash
./bin/node ./scripts/runtime.mjs status
./bin/node ./scripts/runtime.mjs stop
./bin/node ./scripts/runtime.mjs start
```

Run only the operation you need. To update the Tunnel ID/key, rerun `./Configure-RemoteDesktop.sh` (macOS can use `./Configure-RemoteDesktop.command`). Unlike the Windows Save button, the terminal wizard also starts the service.

Windows uses a **per-user Scheduled Task** if sign-in auto-start is enabled; macOS uses a **LaunchAgent**; Linux uses a **user systemd service** when available, otherwise a background process. Linux fallback mode is not automatically resumed after logout/reboot. These are not privileged system services.

### 3.3. Troubleshooting

- **Connected locally, but the plugin is unavailable:** confirm you registered the same Tunnel ID in [ChatGPT Plugins](https://chatgpt.com/plugins), completed account permissions, and selected the plugin in the conversation. A green local status alone is insufficient.
- **Saved new settings, but the old connection remains:** Stop Service, then Start Service. Saving intentionally does not interrupt a running process.
- **Tunnel not connected:** check the Tunnel ID/key, internet access, and **Refresh Status**. Inspect the private `runtime/tunnel.log` locally if needed; never share its raw contents.
- **The service does not start after sign-in:** on Windows, verify **Auto-start at Windows sign-in** is enabled. On Linux/macOS, inspect the current user's service manager.
- **Another computer/WSL is being controlled:** verify which installed service and operating-system user the ChatGPT Tunnel reaches. Windows native installation does not require WSL.

If a reproducible issue remains, [open an Issue](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues) with sanitized details, never credentials or private command output.

## 4. Other MCP Clients

The installer is not required when developing from source. A **local stdio MCP client** can launch the project directly without a Tunnel ID or runtime API key. Install development dependencies as in [Section 5](#5-development), then configure your client's MCP server with the absolute path to `scripts/proxy.mjs`:

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

Client configuration locations vary. Reconnect the client and make a read-only `list_sessions` call. This local stdio check **does not** establish a ChatGPT Tunnel connection.

## 5. Development

Development from source requires Git and a Node.js version meeting [package.json](package.json); these requirements **do not apply to the bundled installers**.

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

On Windows PowerShell use `npm.cmd` instead of `npm` if required by execution policy. `check` runs compatibility and unit tests; `smoke` initializes MCP, enumerates tools, and calls a read-only tool. Propose changes via a pull request and Squash Merge. Platform installers are built by [.github/workflows/offline-installers.yml](.github/workflows/offline-installers.yml), and tagged releases by [.github/workflows/release.yml](.github/workflows/release.yml).

## 6. License and Security

Original project code is [Apache-2.0](LICENSE). Third-party dependencies and licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

This service can read/write files and execute commands **with the permissions of the operating-system user running it**. It is not an authorization sandbox or a tool-level allowlist. Use least-privilege accounts and review the plugin's permissions. MCP requests and results may be sent to the connected AI service. Keep `config.toml`, `runtime/`, API keys, logs, and personal data private; never commit them or post them in a public issue.

Report vulnerabilities privately through [GitHub security advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories).
