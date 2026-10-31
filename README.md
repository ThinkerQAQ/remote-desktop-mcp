# Remote Desktop MCP (DV)

[简体中文](README_ZH.md) · [Setup](docs/setup.md) · [Security](SECURITY.md) · [Review](docs/review.md)


> **Experimental v0.1:** upstream transitive dependency advisories remain. See the [dependency review](docs/review.md#dependency-audit) before deployment.
Connect an AI assistant to your development machine through **Desktop Commander and the official OpenAI tunnel-client**, using a persistent stdio process. This project packages the integration used by DV; it is not a replacement implementation of Desktop Commander or a desktop screen-control application.

## Features

- Files, terminal sessions, search and document tools provided by Desktop Commander.
- A small stdio adapter that filters info/debug MCP log notifications and non-protocol stdout while preserving responses, errors, progress and higher-level notifications.
- Upstream process failure propagates to the supervisor; no shell pipeline or jq dependency.
- Private TOML configuration, loopback health endpoint and generated tunnel YAML with an environment reference for credentials.
- A read-only smoke check that initializes MCP, discovers tools and calls `list_sessions` without displaying local data.
- Linux/WSL2 persistent tunnel deployment; Windows local stdio support. CI checks both operating systems.

## Quick start

Requires Node.js **22.12+**, npm and Git. Python is not required.

```sh
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci
npm run check
npm run doctor
npm run smoke
```

`npm run mcp` starts the stdio adapter. Configure a local MCP client to execute `node /absolute/path/to/remote-desktop-mcp/scripts/proxy.mjs` directly; npm banners must not enter a stdio protocol connection.

For remote ChatGPT access, install the official [tunnel-client](https://github.com/openai/tunnel-client), create your own tunnel, then follow [setup](docs/setup.md). Tunnel creation, account availability and ChatGPT MCP registration are separate prerequisites. A packaged skill or healthy tunnel does not prove tools have been registered or discovered.

## Scope and limits

DV and Remote Desktop Commander overlap in file and command capabilities. DV uses your own tunnel-client deployment; Remote Desktop Commander provides its own remote service and device selection. This project adds reproducible deployment and transport checks, not a new tool engine or an autonomous agent.

This adapter is **not a sandbox or an authorization layer**. It exposes upstream tools, including shell execution. Desktop Commander settings are not a substitute for OS isolation. Run under an account with only the access you intend to delegate. Requests and results sent through the tunnel can reach your AI service; “local execution” does not mean “local-only data.” Upstream telemetry/settings remain upstream behavior; this adapter does not disable them.

Persistent processes reduce reconnects; they cannot remove platform authorization requirements. Terminal execution does not activate a desktop window, but commands that launch GUI programs can affect focus. Native Windows tunnel service management and automatic updates are outside v0.1.

## Upstream and license

Integration code: Apache-2.0. [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommanderMCP): MIT, pinned to 0.3.0. [OpenAI tunnel-client](https://github.com/openai/tunnel-client): Apache-2.0, separately installed; tested with 0.0.16. See [third-party notices](THIRD_PARTY_NOTICES.md). This is an independent project, not an official OpenAI or Desktop Commander product.
