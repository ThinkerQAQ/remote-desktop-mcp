# Remote Desktop MCP (DV)

[简体中文](README_ZH.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Configuration](#3-configuration)
- [4. Optional Features](#4-optional-features)
- [5. Development](#5-development)
- [6. License](#6-license)

## 1. Introduction

An AI assistant can help with a coding problem, but it cannot inspect the project on your computer or run a command there simply by talking about it. Remote Desktop MCP gives an MCP-compatible assistant access to the files and terminal of a computer you authorize, through [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander).

You can use it with a local MCP client, or connect from ChatGPT through a Secure MCP Tunnel when your account or workspace supports that option. The project provides the connection, setup, and persistent runtime; Desktop Commander provides the tools for reading and editing files, searching, running commands, and managing terminal sessions. **It does not provide graphical screen sharing or mouse control.**

## 2. Quick Start

Start with the local MCP connection: install the adapter, add it to your client, then make one read-only tool call. No OpenAI account, tunnel, or API key is required for this first test. To connect ChatGPT remotely afterward, follow [Case 1](#41-case-1-connect-chatgpt-through-a-tunnel).

### 2.1. Prerequisites

Use **Windows (native PowerShell), Linux, or macOS** with Node.js and npm. The Node.js version must satisfy the requirement in [package.json](package.json) (currently Node 22.12 or later). Windows does not require WSL. The first installation needs network access to the npm registry.

Verify that Node and npm are available in your terminal:

```powershell
# Windows PowerShell
node --version
npm.cmd --version
```

```bash
# Linux / macOS
node --version
npm --version
```

If Node is missing, install a supported version before continuing. The optional [remote setup wizard](#41-case-1-connect-chatgpt-through-a-tunnel) can also provision a compatible local Node runtime.

### 2.2. Download and install

1. Open the [latest Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest). Download the archive ending in `-windows.zip`, `-linux.tar.gz`, or `-macos.tar.gz` for your operating system. These are **Node.js project archives**, not precompiled executable installers. The OS suffix identifies the intended setup entry point.
2. Download `SHA256SUMS` from the same Release. Before extraction, compare the archive's SHA-256 with the entry for **that exact filename**. Windows: `Get-FileHash .\*.zip -Algorithm SHA256`; Linux: `sha256sum ./*.tar.gz`; macOS: `shasum -a 256 ./*.tar.gz`. Run the command in the download directory containing the selected archive. Stop if it does not match.
3. Extract the **entire** archive to a stable directory. Open a terminal **in the extracted folder containing `package.json` and `scripts/proxy.mjs`**. Keep the folder in place after configuring your MCP client; its configuration will reference this absolute path.
4. Install the locked dependencies and verify the MCP server:

**Windows PowerShell** (replace the directory with your own extracted location):

```powershell
Set-Location 'C:\path\to\remote-desktop-mcp'
npm.cmd ci --no-audit --no-fund
npm.cmd run smoke
```

**Linux / macOS** (replace the directory):

```bash
cd '/path/to/remote-desktop-mcp'
npm ci --no-audit --no-fund
npm run smoke
```

`npm ci` automatically applies the repository's tested compatibility patch to the installed Desktop Commander dependency. The smoke command should exit successfully and print a JSON result containing `"initialized":true` and `"readonly_tool_succeeded":true`. It makes a real read-only `list_sessions` call without printing session data.

### 2.3. Connect your local MCP client

In the **local MCP client's** server settings, add this stdio server. Replace the sample path with the **absolute path to `scripts/proxy.mjs` in the folder from Step 2.2**:

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

On Windows, an argument such as `C:/tools/remote-desktop-mcp/scripts/proxy.mjs` is valid. The JSON is a common MCP-client configuration format; the exact settings location depends on your client. If your client cannot find `node`, replace the `command` value with its absolute executable path.

Save the configuration, then **restart or reconnect the MCP client**. It will start the stdio process itself. Do not start a second copy of `npm run mcp` for that client.

### 2.4. Complete one operation

1. In the connected MCP client, list the available tools and find `list_sessions`.
2. Ask the client to call `list_sessions` with no arguments.
3. Confirm the call succeeds. An empty session list is a valid result on a fresh machine.

This confirms the client can reach the adapter and Desktop Commander. The earlier `npm run smoke` verifies the same chain independently of your client's configuration; **neither test proves a remote ChatGPT Tunnel is connected**.

### 2.5. Troubleshooting

- **`npm ci` fails:** check the Node version, npm access, and that the terminal is in the extracted folder with `package-lock.json`. Do not use `npm install` as a substitute for the locked install.
- **The MCP client cannot find Node or the server:** use absolute paths for both `command` and `args`; graphical clients may not inherit your terminal's PATH. Confirm that `npm run smoke` succeeds in the same directory.
- **Tools are missing or the client reports a stdio error:** reconnect the client and check its MCP logs. The adapter uses stdout for JSON-RPC, so do not direct unrelated diagnostic output there.
- **Files appear to come from another computer or WSL:** check which Node executable and `proxy.mjs` path the client launches. The adapter runs with the permissions and filesystem of that process.
- **After moving the installation:** update the absolute path in the MCP client. If you also configured a Tunnel, rerun the [remote setup](#41-case-1-connect-chatgpt-through-a-tunnel) from the new location.

For reproducible problems, [open an Issue](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues) with sanitized error text. Do not post credentials, file contents, or terminal history.

## 3. Configuration

Local stdio use does **not** require a `config.toml` file. The defaults in [config.example.toml](config.example.toml) are sufficient.

To change a setting, create a private `config.toml` beside `package.json`. For example:

```toml
[mcp]
filter_log_notifications = true
```

This option suppresses upstream *info/debug* MCP log notifications; it does **not** filter warning/error notifications or redact tool results. The adapter is not a data-loss-prevention or sandbox layer.

Remote setup writes its own private `config.toml` and `runtime/` files. `[tunnel].id` is the Tunnel ID created for **your** account, and `api_key_env` names the environment variable used by the tunnel process. The setup wizard stores the runtime credential privately, rather than putting its value in the generated Tunnel YAML. These local files are excluded from Git; do not copy them into issues or pull requests.

## 4. Optional Features

### 4.1. Case 1: Connect ChatGPT through a Tunnel

Use this case only if your ChatGPT account or workspace permits **custom MCP connections using a Secure MCP Tunnel**. Check the current [official connection instructions](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) first. A tunnel is needed because ChatGPT cannot directly launch your local stdio server.

1. **Create the remote credentials.** Obtain your own Tunnel ID from the [OpenAI tunnel settings](https://platform.openai.com/settings/organization/tunnels) and a runtime API key from [API keys](https://platform.openai.com/settings/organization/api-keys). These are account-specific; the installation does not create them for you. **Do not paste either value into chat or commit it to Git.**
2. **Run the setup wizard from your installed project directory.** It installs the required supported tools (including the official tunnel client when missing), checks local MCP, prompts for your Tunnel ID and hidden runtime key, and configures a user-owned background runtime.

**Windows PowerShell:**

```powershell
Set-Location 'C:\path\to\remote-desktop-mcp'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
```

**Linux / macOS:**

```bash
cd '/path/to/remote-desktop-mcp'
bash setup.sh
```

3. **Verify the local tunnel process.** The wizard reports `local_mcp: passed` and `tunnel_ready: true` when its checks succeed. In a terminal in the same directory, run:

```powershell
# Windows
npm.cmd run status
```

```bash
# Linux / macOS
npm run status
```

Confirm `"managed_process_running":true` and `"tunnel_ready":true`. These checks **do not** prove ChatGPT has registered the connection.

4. **Register the MCP connection in ChatGPT.** Where supported, open **Plugins → Add custom MCP server**, choose **Tunnel**, select or enter **your Tunnel ID**, complete the permission/security checks, and create/install the connection. Exact controls depend on the account/workspace; use the [official guide](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) if the UI differs.
5. **Accept the connection by calling a tool.** Start a new chat, select the connected plugin, and make a **read-only** `list_sessions` call. Confirm the tool returns successfully. The setup wizard cannot complete your ChatGPT authorization or this last check.

**Persistent runtime:** Windows uses a per-user Scheduled Task, macOS a user LaunchAgent, and Linux a user systemd service where available (otherwise a background process). They run on the authorized machine and are not available when it is powered off. The Linux fallback background process does not automatically resume after logout or reboot. Do not run two runtimes for the same Tunnel.

### 4.2. Case 2: Manage a configured Tunnel

In the installation directory, use `npm.cmd` on Windows or `npm` on Linux/macOS:

```bash
npm run status
npm run stop
npm start
```

`status` reports process and Tunnel readiness; `stop` ends the managed runtime; `start` starts it again with saved credentials. Use only the operation you need, not all three as an installation requirement. Rerunning `setup.ps1`/`setup.sh` can update the configuration while preserving prior choices. Move the installation only after stopping it, then rerun setup to update absolute paths.

For a customized Linux service installation, [deploy/systemd.service.example](deploy/systemd.service.example) is a template; replace the paths to your local checkout. The setup wizard is the supported default.

## 5. Development

For development from source, install Git, Node.js meeting [package.json](package.json)'s engine requirement, and npm. The release archives contain the same JavaScript project; source contributors can instead clone it:

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

In native Windows PowerShell, use `npm.cmd` in place of `npm` if script execution policy prevents invoking the npm PowerShell shim. `check` verifies the compatibility patch and unit tests; `smoke` initializes the real local MCP server, discovers tools, and makes one read-only call. CI covers Node 22/24 on Windows, Linux, and macOS and checks native setup with **synthetic credentials**. Passing CI does not establish actual Tunnel access or a real login/reboot lifecycle.

The repository keeps Desktop Commander as a separately installed dependency and applies a reviewed compatibility patch after installation. Changes should be proposed in a feature branch, reviewed in a PR, and merged with Squash Merge.

## 6. License

Original adapter and setup code is [Apache-2.0](LICENSE). Desktop Commander is MIT; the separately installed OpenAI tunnel client is Apache-2.0. See [third-party notices](THIRD_PARTY_NOTICES.md) for attribution, upstream modifications, and redistribution requirements. User files and third-party works are not covered by this source-code license.

**Security:** this adapter exposes Desktop Commander's upstream file and shell tools under **the operating-system account that runs it**. It provides no built-in tool allowlist, authorization boundary, command sandbox, or screen-control isolation. Use a dedicated, least-privilege account or an isolated machine/container. MCP requests and results may be transmitted to the connected AI service; Desktop Commander's telemetry and history settings are controlled upstream.

Keep private `config.toml`, `runtime/`, credentials, logs, and user files out of Git. Never expose the local tunnel health/admin listener to the public Internet; use the official Tunnel and account-level controls. On Unix, private files/directories receive restrictive modes; Windows installation restricts them to the current user. Review staged changes before publishing because .gitignore cannot remove secrets already committed.

Report security issues privately through [GitHub security advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories) when available, or **contact@thinkerqaq.com**. Do not include live credentials or private command output in public issues.
