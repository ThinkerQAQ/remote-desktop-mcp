# Remote Desktop MCP (DV)

[简体中文](README_ZH.md)

## Introduction

Connect an MCP client to local files, terminal sessions and search through Desktop Commander. This repository adds a persistent stdio adapter, setup wizard and optional OpenAI tunnel; it is intended for people who want an AI assistant to work on their own development machine. Desktop Commander provides the tools; no desktop screen-control engine is included.

## Quick Start

### 1. Prerequisites

Use Windows PowerShell, Linux or macOS with Node.js **22.12+**, npm and Git. Windows runs natively; WSL is optional. The first install needs access to the npm registry. No browser debugging or tunnel credentials are needed for local stdio use.

### 2. Install

```sh
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci
npm run check
```

### 3. Configure and start your MCP client

The defaults work without `config.toml`. Add this server to a client that supports local stdio MCP, replacing the absolute path with your checkout. On Windows use a path such as `C:/tools/remote-desktop-mcp/scripts/proxy.mjs`. The JSON object is a common client format; put it in your client's MCP server settings.

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

Restart/reconnect the client. It starts the server process itself; do not also run `npm run mcp` in the same client's terminal. For protocol debugging, `npm run mcp` starts the same stdio server and waits for MCP messages.

### 4. Complete one operation

Ask the client to call `list_sessions`. Success means that tool discovery includes `list_sessions` and its call returns a valid result; a fresh machine may correctly return an empty session list. This verifies the complete client → adapter → Desktop Commander chain without reading files or executing commands.

In the checkout, independently verify the same local protocol flow:

```sh
npm run smoke
```

The smoke test must exit with code 0 after initialization, tool discovery and a real `list_sessions` call. It does not verify a remote ChatGPT connection.

### 5. Troubleshooting

- **Node not found in the client:** use the full path to your Node executable in `command`; GUI clients may have a different PATH.
- **No tools or stdio failure:** rerun `npm ci`, `npm run check` and `npm run smoke`; inspect stderr, never print diagnostic text to protocol stdout.
- **Remote tunnel ready, tools missing:** reconnect the registered MCP connection and start a new chat. Confirm a real `list_sessions` call there; tunnel health alone is insufficient.
- **Service fails after moving the checkout:** rerun setup in the permanent directory to regenerate launcher paths. Do not start two runtimes for the same tunnel.

## Configuration

Optional overrides go in gitignored `config.toml` in the checkout; [config.example.toml](config.example.toml) is the maintained template. Local stdio needs no required settings.

```toml
[mcp]
filter_log_notifications = true
```

For remote use, `[tunnel].id` is your own tunnel ID, `api_key_env` defaults to `OPENAI_API_KEY`, and `health_port` defaults to `18832`. Generated tunnel YAML references the key environment variable rather than embedding its value. Setup manages private credential storage; never put keys in Git or chat.

## Optional Features

### Persistent remote access

Local stdio is the shortest path. To connect from ChatGPT on another machine, you additionally need your own OpenAI tunnel/workspace access and a runtime credential. From the checkout run:

```sh
# Linux / macOS
bash setup.sh
```

```powershell
# Native Windows PowerShell
.\setup.ps1
```

The wizard installs missing supported dependencies, asks for your tunnel ID and hidden runtime key, configures persistence, and prints the account-specific registration steps. Complete **Add custom MCP server → Tunnel** in ChatGPT when available to your account, enable the connection, start a new chat and call `list_sessions`. Remote acceptance remains pending until that call succeeds. Account authorization cannot be completed by the installer.

Linux uses user systemd when available, otherwise a background process; macOS uses a user LaunchAgent; Windows uses a user Scheduled Task. Unix bootstrap needs curl/tar; installation may need package-manager permission. These are user-session services, not a guarantee of availability while the computer is off.

From the configured checkout use `npm run status`, `npm start`, and `npm stop`. Rerunning setup reuses saved choices. Setup installs the official tunnel-client separately; it is not bundled source. Upgrades require an explicit source/package update.

## Development

Node 22/24 are covered by CI on Linux, Windows and macOS.

```sh
npm ci
npm run check
npm run smoke
npm run audit:high
```

`check` runs the upstream compatibility patch and unit tests. `smoke` exercises real local MCP. CI also validates native setup with synthetic credentials; it does not prove your account's remote authorization or a real reboot. Moderate upstream dependency advisories may remain; high/critical findings are gated. Use feature branches and PRs, Squash Merge and delete merged branches.

## License

Integration code is [Apache-2.0](LICENSE). Desktop Commander is MIT; separately installed OpenAI tunnel-client is Apache-2.0. Retain [third-party notices](THIRD_PARTY_NOTICES.md) when distributing.

This adapter exposes upstream file and shell tools; it is not an OS sandbox or authorization boundary. Run it under the account whose access you intend to delegate. Tool inputs/results can reach the connected AI service. Upstream telemetry/settings remain upstream behavior. User files and credentials are not covered by the source license. See [security policy](SECURITY.md) and [中文安全说明](SECURITY_ZH.md).
