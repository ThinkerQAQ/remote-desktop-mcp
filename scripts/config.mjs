import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const upstream = path.join(root, 'node_modules/@wonderwhy-er/desktop-commander/dist/index.js');
export function loadConfig() {
  const file = process.env.DV_CONFIG ? path.resolve(process.env.DV_CONFIG) : path.join(root, 'config.toml');
  const config = parse(fs.readFileSync(fs.existsSync(file) ? file : path.join(root, 'config.example.toml'), 'utf8'));
  if (process.env.DV_CONFIG && !fs.existsSync(file)) throw new Error('DV_CONFIG does not exist');
  if (config.mcp?.filter_log_notifications !== undefined && typeof config.mcp.filter_log_notifications !== 'boolean') throw new Error('mcp.filter_log_notifications must be boolean');
  return config;
}
export function keepMessage(message, filter = true) {
  return !(filter && message?.method === 'notifications/message' && ['info', 'debug'].includes(message.params?.level));
}
export function shellQuote(s) { return "'" + s.replaceAll("'", "'\"'\"'") + "'"; }
// Go tunnel-client uses shell-style tokenization on every platform. Forward slashes
// avoid backslash escapes in Windows paths; single quotes protect whitespace.
export function commandQuote(s) { return shellQuote(process.platform === 'win32' ? s.replaceAll('\\', '/') : s); }
export function tunnelConfig(config) {
  const t = config.tunnel ?? {};
  if (!/^tunnel_[A-Za-z0-9_-]+$/.test(t.id ?? '')) throw new Error('Set a valid tunnel.id in private config.toml');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(t.api_key_env ?? '')) throw new Error('Invalid tunnel.api_key_env');
  if (!Number.isInteger(t.health_port) || t.health_port < 1024 || t.health_port > 65535) throw new Error('Invalid tunnel.health_port');
  return {
    config_version: 1,
    control_plane: { base_url: 'https://api.openai.com', tunnel_id: t.id, api_key: `env:${t.api_key_env}` },
    health: { listen_addr: `127.0.0.1:${t.health_port}` },
    admin_ui: { open_browser: false },
    log: { level: 'info', format: 'json' },
    mcp: { commands: [{ channel: 'main', command: `${commandQuote(process.execPath)} ${commandQuote(path.join(root, 'scripts/proxy.mjs'))}` }], stdio_send_initialized_notification: true }
  };
}
