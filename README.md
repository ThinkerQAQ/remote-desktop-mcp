# Remote Desktop MCP (DV)

[简体中文](README_ZH.md) · [Setup](docs/setup.md) · [Security](SECURITY.md) · [Review](docs/review.md)


> **Experimental v0.3:** High/critical npm audit findings are resolved; moderate upstream findings remain. See [dependency review](docs/review.md#dependency-audit).
Connect an AI assistant to your development machine through **Desktop Commander and the official OpenAI tunnel-client**, using a persistent stdio process. This project packages the integration used by DV; it is not a replacement implementation of Desktop Commander or a desktop screen-control application.

## Features

- Files, terminal sessions, search and document tools provided by Desktop Commander.
- A small stdio adapter that filters info/debug MCP log notifications and non-protocol stdout while preserving responses, errors, progress and higher-level notifications.
- Upstream process failure propagates to the supervisor; no shell pipeline or jq dependency.
- Private TOML configuration, loopback health endpoint and generated tunnel YAML with an environment reference for credentials.
- A read-only smoke check that initializes MCP, discovers tools and calls `list_sessions` without displaying local data.
- Native persistent tunnel setup for Linux, macOS and Windows, using user-scoped service managers. CI exercises all three OSes on Node 22/24.

## One-command setup (Linux / macOS / Windows)

Linux, WSL2 or macOS terminal:

```sh
curl -fsSL https://raw.githubusercontent.com/ThinkerQAQ/remote-desktop-mcp/v0.3.1/install.sh | bash
```

Windows **PowerShell** (native; WSL2 is optional, not required):

```powershell
irm https://raw.githubusercontent.com/ThinkerQAQ/remote-desktop-mcp/v0.3.1/install.ps1 | iex
```

Download [versioned Windows/Linux/macOS packages](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/tag/v0.3.1) and verify the SHA-256 in `SHA256SUMS`. The bootstrap below also verifies the release asset before extraction.

Already cloned the repository? Run `bash setup.sh` on Linux/macOS or `./setup.ps1` in Windows PowerShell. Installers use the pinned v0.3.1 source archive on first run and reuse existing local installations.

The wizard installs missing Node.js/tunnel-client from official distributions with SHA-256 verification, runs locked npm installation and a real read-only MCP smoke test, asks for your own Tunnel ID and hidden runtime API key, saves private configuration, starts a persistent process and checks tunnel readiness. Re-running reuses saved inputs; port conflicts select a free loopback port. No global Node or existing DV tunnel is replaced.

You must create your own tunnel/runtime key and register the custom MCP in ChatGPT. The wizard prints the official account links and next steps. Registration and remote tools/call remain **pending** until you complete them; local/tunnel success is not presented as full remote acceptance. No Edge debugging setup is needed for this file/terminal integration.

See [the full wizard guide](docs/wizard.md) for repeat runs, headless deployment, recovery, credentials and limitations. On Linux/macOS the source installer requires curl/tar; Ubuntu/WSL can install missing base utilities via apt (sudo may prompt). Other distributions/macOS must provide those utilities. Windows uses built-in PowerShell and a per-user Scheduled Task; macOS uses a per-user LaunchAgent; Linux uses user systemd when available, otherwise background mode. Dependencies are installed under the checkout; upstream package install hooks may run. Moderate upstream dependency advisories remain as disclosed above.

For development: `npm ci`, `npm run check`, `npm run smoke`. For local MCP clients, execute `node /absolute/path/scripts/proxy.mjs` directly. The official [tunnel-client](https://github.com/openai/tunnel-client) is installed separately by setup; no copy is bundled in Git.

## Scope and limits

DV and Remote Desktop Commander overlap in file and command capabilities. DV uses your own tunnel-client deployment; Remote Desktop Commander provides its own remote service and device selection. This project adds reproducible deployment and transport checks, not a new tool engine or an autonomous agent.

This adapter is **not a sandbox or an authorization layer**. It exposes upstream tools, including shell execution. Desktop Commander settings are not a substitute for OS isolation. Run under an account with only the access you intend to delegate. Requests and results sent through the tunnel can reach your AI service; “local execution” does not mean “local-only data.” Upstream telemetry/settings remain upstream behavior; this adapter does not disable them.

Persistent processes reduce reconnects; they cannot remove platform authorization requirements. Terminal execution does not activate a desktop window, but commands that launch GUI programs can affect focus. Native Windows scheduled-task management and macOS LaunchAgent management are included. Automatic source upgrades are not.

## Upstream and license

Integration code: Apache-2.0. [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommanderMCP): MIT, pinned to 0.3.1. [OpenAI tunnel-client](https://github.com/openai/tunnel-client): Apache-2.0, separately installed; tested with 0.0.16. See [third-party notices](THIRD_PARTY_NOTICES.md). This is an independent project, not an official OpenAI or Desktop Commander product.
