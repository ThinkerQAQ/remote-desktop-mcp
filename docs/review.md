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

The release process runs unit tests and a real upstream read-only MCP smoke on Linux/Windows with Node 22/24. Configuration generation and POSIX file permissions are Linux/WSL-specific. The release does not migrate the already-running DV service or create a second ChatGPT connection. A local smoke result does not certify remote registration, all tools or security isolation.

## Dependency audit

`npm audit --omit=dev --registry=https://registry.npmjs.org` on 2026-10-31 reports **13 package-level findings: 2 high, 11 moderate, 0 critical**, after updating smol-toml to 1.9.1 and glob to the compatible 10.5.0. Counts include propagation to parent packages; they are not 13 independently demonstrated exploits.

The remaining high finding originates in upstream's Zod 3 dependency ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)); npm also marks Desktop Commander high through that dependency. A forced override to Zod 4 would cross its declared API major, so it is not applied. Moderate findings remain in upstream document/archive/path dependencies (glob/minimatch/uuid and parents). No full reachability analysis or exploit test has been performed. The adapter's unit/smoke tests do not demonstrate these dependencies are safe. Track upstream fixes and re-audit before broader deployment; use only trusted requests in an isolated account/environment.
