# RemoteDesktopMCP

[简体中文](README_ZH.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Configuration](#3-configuration)
- [4. Optional Features](#4-optional-features)
- [5. Development](#5-development)
- [6. License](#6-license)

## 1. Introduction

Suppose you want ChatGPT to inspect a log on your computer, edit a file, or run a terminal command. Without a local connection, you would normally have to upload the file or copy commands and results back and forth. RemoteDesktopMCP provides that connection: it makes [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) tools available to ChatGPT through an OpenAI Secure MCP Tunnel.

The tools cover file search, file editing, and terminal commands. This is not a screen-sharing application or a graphical mouse-and-keyboard controller. Commands run with the permissions of the operating-system account that starts the service.

The Windows, Linux, and macOS installers already include Node.js, the required dependencies, and the Tunnel Client. You do not need to install a separate runtime or set up WSL for a normal Windows installation.

## 2. Quick Start

This walkthrough starts with a computer that has not been connected to ChatGPT before. We will install the application, start its Tunnel, register it in ChatGPT, and test one read-only tool call.

Windows uses a configuration window. Linux and macOS use a terminal setup wizard included in the installer.

### 2.1. Requirements

The available installers target Windows x64, Linux x64, and Intel-based macOS. They do not run on ARM64 systems.

You also need internet access and a ChatGPT account or workspace that supports custom MCP Tunnel connections. You can create the Tunnel ID and runtime API key after installing the application; there is no configuration file to edit beforehand.

### 2.2. Download and install

Start with the [latest GitHub Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest). Download the installer for your system from **Assets**:

| System | Installer |
| --- | --- |
| Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
| Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
| macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

Use the installer rather than a source-code archive.

On **Windows**, run the EXE, choose an installation directory, and complete the setup. The final page offers **Open RemoteDesktopMCP configuration**; leave it selected to open the configuration window immediately. Later, the same window is available under **Start Menu → RemoteDesktopMCP → Configure Tunnel**.

On **macOS**, open the DMG and run the installer inside it. On **Linux**, open a terminal in the download directory and run:

```bash
chmod +x RemoteDesktopMCP-v*-linux-amd64.run
./RemoteDesktopMCP-v*-linux-amd64.run
```

These commands assume the directory contains only one matching installer version. Keep track of the installation directory; you will use it in the next step.

### 2.3. Configure and start the Tunnel

The local Tunnel Client needs two things: which Tunnel to connect to and the key it should use for authentication.

Open [OpenAI Tunnel settings](https://platform.openai.com/settings/organization/tunnels), create a Tunnel, and copy its **Tunnel ID**. Then create a **Runtime API Key** from [API Keys](https://platform.openai.com/settings/organization/api-keys).

On **Windows**, open the **Configure Tunnel** window you installed in the previous step:

1. Enter the Tunnel ID and Runtime API Key, then click **Save**. This saves the settings; it does not start the service.
2. Click **Start Service**. Once the service is running, the button changes to **Stop Service**.
3. Click **Refresh Status** and check for **Local Tunnel: Connected**.

The local Tunnel is now running. If you reopen the window later, the saved API key appears as a password mask, so you do not need to paste it every time.

On **Linux or macOS**, open a terminal in the installation directory and run:

```bash
./Configure-RemoteDesktop.sh
```

On macOS, you can also open `Configure-RemoteDesktop.command` to start the wizard in Terminal. Enter the Tunnel ID and key when prompted; the wizard saves the settings and starts the user-level service.

### 2.4. Verify the connection in ChatGPT

The local Tunnel is connected, but ChatGPT still needs to know which MCP service to use.

Open [ChatGPT Plugins](https://chatgpt.com/plugins), add a custom MCP server, choose **Tunnel** as the connection type, and select or enter the Tunnel ID you just created. Complete the authorization steps. The interface may change over time; see the [OpenAI connection guide](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) if the labels differ.

Then open a ChatGPT conversation, select the plugin, and try a read-only request:

> Call RemoteDesktopMCP's `list_sessions` tool. Only read the current sessions; do not modify any files.

If the tool returns successfully, ChatGPT can reach your computer through the Tunnel. An empty session list is normal on a fresh installation: what matters is that the tool call worked.

That completes the setup. Keep your computer and the local service running whenever you want ChatGPT to use the tools.

### 2.5. Troubleshooting

**The local Tunnel does not connect.** Check the Tunnel ID, Runtime API Key, and network connection, then use **Refresh Status**. If it still fails, inspect the local log without posting credentials or private log contents to a public issue.

**The window says Connected, but ChatGPT cannot call the tools.** These are two separate stages. Connected tells you the local Tunnel is ready; check whether ChatGPT has registered the same Tunnel ID, completed authorization, and selected the plugin for the conversation.

**I saved a new configuration, but the previous connection is still active.** This is expected. **Save** does not interrupt a running service. Use **Stop Service**, then **Start Service** to apply the saved settings.

**The tools are acting on WSL or another computer.** Check which Tunnel ID the plugin is using and which computer is running the service. Native Windows installation does not need WSL. Avoid running two services with the same Tunnel ID.

If you still cannot connect, [open an Issue](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues) with reproduction steps and sanitized errors.

## 3. Configuration

After installing on Windows, you can manage the connection from **Configure Tunnel**, available in the Start menu or at `bin/RemoteDesktopMCP-Configure.exe` in the installation directory.

The controls have separate responsibilities:

| Control | What it does |
| --- | --- |
| **Save** | Validate and save the Tunnel ID and runtime key without changing the running service |
| **Start Service / Stop Service** | Start the service with saved settings, or stop it |
| **Refresh Status** | Read the current state without changing anything |
| **Auto-start at Windows sign-in** | Enable or disable starting the service when this Windows user signs in; it does not stop an active connection |
| **Open ChatGPT Plugins** | Open the [ChatGPT plugin page](https://chatgpt.com/plugins) |

In everyday use, clicking **Save** is enough to store new settings. When the service is already running, those settings take effect on the next start. To apply them immediately, use **Save → Stop Service → Start Service**.

The application keeps `config.toml` and `runtime/` in the installation directory. These include private configuration and credentials, so back them up before moving or uninstalling the application.

On Windows, **Start Menu → RemoteDesktopMCP → Manage RemoteDesktopMCP** opens the maintenance entry point for configuration changes and uninstallation.

## 4. Optional Features

### 4.1. Case 1: Manage the service from the terminal

Linux and macOS do not use the Windows three-button configuration window. If you only need to check or control the current service, run the appropriate command from the installation directory:

```bash
# Check the service
./bin/node ./scripts/runtime.mjs status

# Stop the service
./bin/node ./scripts/runtime.mjs stop

# Start the service
./bin/node ./scripts/runtime.mjs start
```

Run the command you need; these are not three steps to execute in sequence. To change the Tunnel ID or key, rerun `./Configure-RemoteDesktop.sh` (or `./Configure-RemoteDesktop.command` on macOS). Unlike Windows **Save**, this terminal wizard also starts the service after saving.

The background process is managed differently on each system: Windows uses a per-user Scheduled Task when sign-in auto-start is enabled; macOS uses a LaunchAgent; Linux prefers user-level systemd and falls back to a regular background process. The Linux fallback does not guarantee automatic recovery after logout or reboot.

### 4.2. Case 2: Connect a local MCP client

If your MCP client runs on the same computer, you can use the stdio transport without creating a Tunnel or obtaining a Runtime API Key.

Install the source dependencies as described in [Development](#5-development). Then point your client's MCP configuration to the absolute path of `scripts/proxy.mjs`:

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

Replace the sample path with the actual source path on your computer. Reconnect the client and make a read-only `list_sessions` call.

This local stdio connection is separate from the ChatGPT Tunnel described in Quick Start. A successful stdio call does not verify that the remote Tunnel is connected.

## 5. Development

The installers already contain the runtime. To edit the source or run tests, you will instead need Git, npm, and a Node.js version supported by [package.json](package.json).

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

`check` runs compatibility and unit tests. `smoke` initializes the MCP server, discovers its tools, and makes a read-only call. On Windows PowerShell, use `npm.cmd` if the shell blocks the `npm` script.

Changes are reviewed through pull requests and merged using Squash Merge. The native installers are built by [installer CI](.github/workflows/offline-installers.yml), and tagged releases use [Release CI](.github/workflows/release.yml).

## 6. License

Original project code is licensed under [Apache-2.0](LICENSE). Third-party dependencies and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

RemoteDesktopMCP reads, writes, and runs commands with the permissions of the operating-system account that starts it. There is no additional tool-level sandbox or allowlist. Check the account's permissions and the ChatGPT plugin's authorization scope before connecting; avoid running the service as an administrator. MCP requests and results may also be sent to the connected AI service.

Keep `config.toml`, `runtime/`, API keys, and logs private; do not commit them to GitHub. Security issues can be reported privately through [GitHub Security Advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories).
