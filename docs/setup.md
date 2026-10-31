# Setup

[简体中文](setup.zh-CN.md)

## Local MCP

Run the README checks first. Use the direct Node command with an absolute path in your MCP client. `DV_CONFIG` optionally selects an absolute private TOML file; otherwise the adapter loads `config.toml`, falling back to `config.example.toml`. The configuration applies to this adapter, not Desktop Commander's own settings.

## Persistent tunnel (Linux / WSL2)

1. Install the official tunnel-client from its upstream instructions (tested: 0.0.16). Create your own tunnel using the account interface available to you. No tunnel or credentials are included here.
2. Copy `config.example.toml` to `config.toml`. Set your tunnel ID and a free loopback health port. `chmod 600 config.toml`.
3. Run `npm run tunnel-config`. This exclusively creates `runtime/tunnel.yaml` with mode 0600; JSON syntax is valid YAML 1.2. It never overwrites an existing file. To regenerate, review and remove your old generated file first. Never copy a live configuration into an issue.
4. Set `OPENAI_API_KEY` in your service environment using an environment file accessible only to your account (0600). Keep values out of shell history, command arguments and Git. If you change `api_key_env`, use the matching environment variable.
5. Start `tunnel-client run --config /absolute/project/runtime/tunnel.yaml`. The tunnel starts this project's adapter and a persistent upstream process. Do not also launch `npm run mcp` for that connection.

For systemd, adapt `systemd.service.example` with **absolute paths** to your checkout, tunnel-client, Node directory and private environment file. Install it as a user service, then run `systemctl --user daemon-reload` and `systemctl --user enable --now remote-desktop-mcp`. Enable lingering only if you want the user service to survive logout and have the necessary host permissions. WSL2 must be running for its services to be reachable.

Do not replace an existing working tunnel until the new configuration has passed acceptance. Choose a different health port for parallel testing. Credentials and registration remain local/account-specific.

## Registration and acceptance

Register the tunnel as a custom MCP connection in the ChatGPT interface supported by your account. A private plugin's skill instructions alone do not register its tools. Test separately:

1. `npm run doctor`: local prerequisite/configuration check only.
2. `npm run smoke`: real local initialize → tools/list → read-only tools/call.
3. Query the loopback tunnel `/healthz` / `/readyz` endpoint: transport health only. Do not paste raw health details into public reports.
4. In ChatGPT, verify actual tool discovery and a read-only `list_sessions` call. Do not repeat a command with side effects after a timeout until you establish whether it executed.

No new connection is needed per tool call. Retain the same process/session where possible. This cannot suppress authorization prompts required by the client platform.

## Troubleshooting

- Missing tools: distinguish local MCP failure, tunnel failure and client registration failure. Re-run smoke before changing registration.
- Exit/restart loop: check versions, environment availability and absolute paths locally. Adapter stderr deliberately omits upstream diagnostics, which can contain local data. Run upstream directly in a trusted local terminal if needed.
- No response after startup: generated config enables `stdio_send_initialized_notification`; keep it enabled for the tested tunnel-client version.
- Unexpected tool permissions: inspect upstream settings and OS account access. This transport has no tool allowlist and does not enforce a shell sandbox.
- Native Windows: local stdio is supported; run persistent tunnel deployment in WSL2 for this release. Avoid PowerShell-specific quoting in a Linux service.
