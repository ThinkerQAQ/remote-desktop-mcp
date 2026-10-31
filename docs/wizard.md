# One-command configuration

[简体中文](wizard.zh-CN.md)

Run `bash setup.sh` in a checkout, or use the pinned installer command in README. Windows: run `./setup.ps1` in PowerShell after initializing WSL2 Ubuntu. The wrapper copies source only to `~/.local/share/remote-desktop-mcp` inside WSL; credentials remain there. Installing/enabling WSL itself can require administrator action and a reboot; the wrapper reports the exact prerequisite instead of claiming completion.

## What happens automatically

1. Check Linux x64/arm64, base tools and Node 22.12+. Ubuntu apt can install missing utilities; sudo may prompt. Missing Node is installed privately at version 24.21.0 with official SHA-256 verification.
2. Reuse an available tunnel-client, or privately install tested version 0.0.16 from the official GitHub release with SHA-256 verification. Existing installations are not upgraded.
3. Run `npm ci` against the lockfile, with Puppeteer browser download disabled. npm/upstream install hooks are subject to your npm policy; no runtime API key is passed to this install step by the wizard.
4. Collect your own Tunnel ID and runtime API key. Key input is hidden. Enter reuses saved values. No real credentials are shipped.
5. Run a real local MCP initialize → tools/list → read-only list_sessions, with captured results omitted from console output. The setup key is excluded from this subprocess environment.
6. Select a free loopback health port and atomically save 0600 configuration/credential files. Refuse symlinks or filesystems that cannot enforce private file permissions. An existing manually created config.toml is not overwritten on first wizard use.
7. Install/start a checkout-specific systemd user service; if no user service manager is available, start an owned background process. Service names are derived from the checkout path; existing DV services are untouched.
8. Check the managed process and `/readyz`, then print account registration steps. A failure returns a nonzero exit and keeps private configuration for recovery.

## Account steps that remain

Create your own tunnel at <https://platform.openai.com/settings/organization/tunnels> and obtain its permitted runtime key at the account's official key interface. Account availability and policy can vary. Enter those values into the wizard; never share a maintainer's tunnel or use an admin key as a convenience.

Register that tunnel in the ChatGPT custom MCP connection interface supported by your account: <https://chatgpt.com/#settings/Connectors>. Verify real tool discovery and a read-only `list_sessions` call. These account actions cannot be completed just by writing local configuration. The wizard deliberately reports registration as pending.

## Re-run, status and recovery

- Re-run `bash setup.sh` to reuse saved values and restore startup. It never creates a new platform tunnel.
- `npm run status` prints only process/readiness booleans and unverified registration status; `npm run start` restores the saved manager; `npm run stop` stops only this checkout's managed service/process.
- `bash setup.sh --configure-only` saves configuration and tests local MCP, without starting a tunnel.
- `bash setup.sh --background` explicitly selects background mode on first setup. This fallback survives the terminal, but has no automatic restart after reboot/logout. systemd auto-restarts process failures; survival after logout depends on host lingering policy. WSL itself must stay running.
- To change credentials/tunnel in active background mode, run `npm run stop` first, then rerun setup. systemd reruns restart only this checkout's unit.
- If readiness fails, check account access, key/tunnel match and local network. Config remains available for retry. Raw private `runtime/tunnel.log` may contain sensitive upstream diagnostics; do not publish it.
- The installer reuses an existing installation. It does not automatically update source, switch deployment managers, enable lingering or change OS isolation.

## Non-interactive configuration

Supply `DV_TUNNEL_ID` and `DV_RUNTIME_API_KEY` through your secret manager/process environment, then run `bash setup.sh --non-interactive`. Do not place key values in shell command arguments, history or CI logs. Omit variables on repeat runs to reuse saved values. `DV_TUNNEL_CLIENT` optionally selects an absolute installed binary path. `DV_INSTALL_DIR` chooses the installer's source directory. `DV_FORCE_MANAGED_NODE=1` / `DV_FORCE_MANAGED_TUNNEL=1` exercise private bootstrap installations without replacing system tools.

The only secret file created by the wizard is `runtime/credentials.json` (0600); the tunnel YAML uses an environment reference. config.toml and runtime/ are ignored by Git. Local execution still grants upstream tools the OS account's access and can send tool results to the AI platform. See security/review documents.
