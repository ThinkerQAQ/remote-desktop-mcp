import fs from 'node:fs';
import path from 'node:path';
import { root, upstream, loadConfig, tunnelConfig } from './config.mjs';

try {
  const config = loadConfig();
  if (process.argv[2] === 'doctor') {
    const major = Number(process.versions.node.split('.')[0]);
    const supported = major > 22 || (major === 22 && Number(process.versions.node.split('.')[1]) >= 12);
    const ok = supported && fs.existsSync(upstream);
    console.log(JSON.stringify({ node_supported: supported, upstream_installed: fs.existsSync(upstream), log_filter_enabled: config.mcp?.filter_log_notifications ?? true, tunnel_configured: Boolean(config.tunnel?.id), scope: 'local prerequisites only; does not prove tunnel or MCP discovery' }, null, 2));
    if (!ok) process.exitCode = 1;
  } else if (process.argv[2] === 'tunnel-config') {
    const content = JSON.stringify(tunnelConfig(config), null, 2) + '\n'; // JSON is valid YAML 1.2.
    const dir = path.join(root, 'runtime');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, 'tunnel.yaml');
    fs.writeFileSync(file, content, { mode: 0o600, flag: 'wx' });
    console.log('Created runtime/tunnel.yaml (0600). Existing files are never overwritten.');
  } else throw new Error('Use doctor or tunnel-config');
} catch (error) { console.error(error.message); process.exitCode = 1; }
