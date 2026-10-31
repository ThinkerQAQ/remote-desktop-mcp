# Review and release scope

[简体中文](review.zh-CN.md)

Review date: 2026-10-31. Scope: the running DV integration, its service/tunnel command and installed Desktop Commander package metadata/stdio entry point. This is not a full security audit of Desktop Commander or tunnel-client.

| Finding | Resolution |
| --- | --- |
| DV uses upstream Desktop Commander through official tunnel-client; no independent tool engine was found in this deployment | Attribute both upstreams and publish an integration project, without copying their sources |
| Live launch command embeds an account-specific Node installation path and nested jq quoting | Use a portable Node stdio adapter; derive the executable/checkout paths locally when generating configuration |
| A shell pipeline can hide the upstream exit code behind the filter's successful exit | Adapter forwards the child exit status; a synthetic failure test covers nonzero and spawn failure |
| No independent initialize/discovery/tool-call acceptance existed alongside the deployed pipeline | Add a real read-only MCP smoke test; local health, transport health and ChatGPT registration remain separate |
| Live configuration contains private tunnel/account references | Start a fresh Git history with examples only; keep private config/runtime ignored, generated files 0600, and use an environment reference for API keys |
| Shell tools have the OS account's privileges | Document the actual boundary; do not market filtering, directory settings or NoNewPrivileges as a sandbox |
| Upstream telemetry/history may persist or transmit information | Disclose upstream behavior; no claim that all data stays local |

## Value assessment

Useful as a compact reference deployment for people who use ChatGPT with a self-managed development machine. Its distinctive contribution is the tested integration: persistent stdio, clean protocol output, failure propagation and clear registration troubleshooting. File/terminal/search capabilities already exist upstream. The project is worth maintaining at this scope; a second general-purpose desktop tool engine would duplicate substantial upstream work.

## Validation

The release process runs unit tests, native bootstrap/configuration and a real upstream read-only MCP smoke on Linux, Windows and macOS with Node 22/24. Linux tests check POSIX permissions; Windows applies user-only ACLs. Native startup uses Linux systemd user services where available, macOS LaunchAgents and Windows per-user Scheduled Tasks. The release does not migrate the already-running DV service or create a second ChatGPT connection. A local smoke result does not certify remote registration, all tools or security isolation.

## Dependency audit

On 2026-10-31, `npm run audit:high` uses the official npm registry and reports **0 high, 0 critical, 12 moderate** package-level advisories (production dependencies only). The direct Desktop Commander and MCP SDK packages are updated to 0.3.1 and 1.32.2. Vulnerable transitive Zod 3 is replaced with Zod 4.6.7 by a pinned override, plus an explicitly version-guarded compatibility patch applied during `npm ci`; schema, defaults, record conversion, PDF preprocessing and actual upstream MCP initialization/tool-call tests guard the behavior.

This compatibility patch is a deliberate maintenance risk: future upstream changes might invalidate it. CI fails closed if high/critical audit cannot run. Moderate upstream document/archive/path dependencies remain; a passing audit or smoke test is not a full security guarantee. Retest after dependency changes, isolate OS access, and track upstream fixes.

## v0.2/v0.3 setup validation

The wizard adds automatic private dependency bootstrap, hidden key collection, private configuration, independent service/process management and recovery commands. A clean temporary checkout downloaded official Node 24.21.0 and tunnel-client 0.0.16, verified checksums, installed locked npm dependencies and completed a real upstream local MCP smoke with synthetic credentials in configure-only mode. No real account tunnel was started by this test.

Eight automated tests cover transport plus setup validation, port collision, private file/symlink handling, repeat setup with retained credentials, real local MCP smoke, isolated mock-tunnel readiness and background stop. Separate local testing exercises systemd start/stop/restart with a synthetic HTTP tunnel and a checkout path containing spaces, dollar and percent characters. This does not establish actual account registration or a remote ChatGPT tool call. Windows CI validates the PowerShell wrapper syntax and local stdio; a real Windows→WSL installation has not been exercised in this environment.

## v0.3 native three-platform scope

- Linux (including WSL2): native user systemd when available; background fallback otherwise. No change to an existing live DV service or credentials.
- macOS: native Terminal bootstrap, verified Node/tunnel-client download, private configuration and a LaunchAgent per checkout (user login context required).
- Windows: native PowerShell bootstrap, verified downloads, private files protected by the current user's ACL and a Scheduled Task per checkout; WSL is optional.
- GitHub Actions exercises all three OSes on Node 22/24 using synthetic credentials and a mock local tunnel. This validates the runners, **not** every end-user machine, account registration or real ChatGPT remote MCP calls. No customer tunnel ID or API key is stored in CI.

The first-run installers pin v0.3.1; existing installations are reused instead of silently upgraded. Users still create their own Tunnel ID/runtime key and register the custom MCP manually in ChatGPT.
