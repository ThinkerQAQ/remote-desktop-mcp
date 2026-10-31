# Remote Desktop MCP (DV)

[简体中文](README_ZH.md) · [Setup](docs/setup.md) · [Security](SECURITY.md) · [Review](docs/review.md)


> **Experimental v0.2:** upstream transitive dependency advisories remain. See the [dependency review](docs/review.md#dependency-audit) before deployment.
Connect an AI assistant to your development machine through **Desktop Commander and the official OpenAI tunnel-client**, using a persistent stdio process. This project packages the integration used by DV; it is not a replacement implementation of Desktop Commander or a desktop screen-control application.

## Features

- Files, terminal sessions, search and document tools provided by Desktop Commander.
- A small stdio adapter that filters info/debug MCP log notifications and non-protocol stdout while preserving responses, errors, progress and higher-level notifications.
- Upstream process failure propagates to the supervisor; no shell pipeline or jq dependency.
- Private TOML configuration, loopback health endpoint and generated tunnel YAML with an environment reference for credentials.
- A read-only smoke check that initializes MCP, discovers tools and calls `list_sessions` without displaying local data.
- Linux/WSL2 persistent tunnel deployment; Windows local stdio support. CI checks both operating systems.

## One-command setup (Linux / WSL2)

```sh
curl -fsSL https://raw.githubusercontent.com/ThinkerQAQ/remote-desktop-mcp/v0.2.0/install.sh | bash
```

Already downloaded/cloned the repository? Run `bash setup.sh`. Windows PowerShell: `./setup.ps1` (requires initialized WSL2 Ubuntu; copies source to the Linux filesystem).

The wizard installs missing Node.js/tunnel-client from official distributions with SHA-256 verification, runs locked npm installation and a real read-only MCP smoke test, asks for your own Tunnel ID and hidden runtime API key, saves private configuration, starts a persistent process and checks tunnel readiness. Re-running reuses saved inputs; port conflicts select a free loopback port. No global Node or existing DV tunnel is replaced.

You must create your own tunnel/runtime key and register the custom MCP in ChatGPT. The wizard prints the official account links and next steps. Registration and remote tools/call remain **pending** until you complete them; local/tunnel success is not presented as full remote acceptance. No Edge debugging setup is needed for this file/terminal integration.

See [the full wizard guide](docs/wizard.md) for repeat runs, headless deployment, recovery, credentials and limitations. Source download requires curl/tar; Ubuntu/WSL can install remaining base utilities via apt (sudo may prompt). Other distributions must provide those utilities. Dependencies are installed under the checkout; upstream package install hooks may run. Upstream dependency advisories remain as disclosed above.

For development: `npm ci`, `npm run check`, `npm run smoke`. For local MCP clients, execute `node /absolute/path/scripts/proxy.mjs` directly. The official [tunnel-client](https://github.com/openai/tunnel-client) is installed separately by setup; no copy is bundled in Git.

## Scope and limits

DV and Remote Desktop Commander overlap in file and command capabilities. DV uses your own tunnel-client deployment; Remote Desktop Commander provides its own remote service and device selection. This project adds reproducible deployment and transport checks, not a new tool engine or an autonomous agent.

This adapter is **not a sandbox or an authorization layer**. It exposes upstream tools, including shell execution. Desktop Commander settings are not a substitute for OS isolation. Run under an account with only the access you intend to delegate. Requests and results sent through the tunnel can reach your AI service; “local execution” does not mean “local-only data.” Upstream telemetry/settings remain upstream behavior; this adapter does not disable them.

Persistent processes reduce reconnects; they cannot remove platform authorization requirements. Terminal execution does not activate a desktop window, but commands that launch GUI programs can affect focus. Native Windows tunnel service management and automatic updates are outside v0.2.

## Upstream and license

Integration code: Apache-2.0. [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommanderMCP): MIT, pinned to 0.3.0. [OpenAI tunnel-client](https://github.com/openai/tunnel-client): Apache-2.0, separately installed; tested with 0.0.16. See [third-party notices](THIRD_PARTY_NOTICES.md). This is an independent project, not an official OpenAI or Desktop Commander product.
