import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { root, tunnelConfig } from './config.mjs';
import { privateDir, privateWrite, readPrivateJSON } from './private-files.mjs';
import { systemdAvailable, start, status, ownedProcess } from './runtime.mjs';

export function validateInput(id, key) {
  if (!/^tunnel_[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid Tunnel ID / Tunnel ID 格式错误');
  if (!key || /[\n\r\0]/.test(key)) throw new Error('A single-line runtime API key is required / 需要运行密钥');
}
export async function freePort(preferred) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', error => error.code === 'EADDRINUSE' && preferred ? freePort(0).then(resolve, reject) : reject(error));
    server.listen(preferred, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
}
async function setup() {
  if (process.platform !== 'linux') throw new Error('Use setup.ps1 to configure this project inside WSL2');
  const flags = new Set(process.argv.slice(2));
  for (const f of flags) if (!['--non-interactive', '--configure-only', '--background'].includes(f)) throw new Error('Unknown setup option');
  const nonInteractive = flags.has('--non-interactive');
  if (!nonInteractive && !process.stdin.isTTY) throw new Error('Run in an interactive terminal, or pass --non-interactive with DV_TUNNEL_ID and DV_RUNTIME_API_KEY');
  const dir = path.join(root, 'runtime'); privateDir(dir);
  const stateFile = path.join(dir, 'setup.json'), credentials = path.join(dir, 'credentials.json');
  let saved = {};
  if (fs.existsSync(stateFile)) saved = readPrivateJSON(stateFile);
  let apiKey = process.env.DV_RUNTIME_API_KEY || (fs.existsSync(credentials) ? readPrivateJSON(credentials).apiKey : '');
  let id = process.env.DV_TUNNEL_ID || saved.id || '';
  let muted = false, rl;
  try {
    if (!nonInteractive) {
      const output = new Writable({ write(chunk, encoding, done) { if (!muted) process.stdout.write(chunk, encoding); done(); } });
      rl = createInterface({ input: process.stdin, output, terminal: true });
      const ask = q => new Promise(resolve => rl.question(q, answer => resolve(answer.trim())));
      console.log('DV setup / 一键配置\nCreate your own tunnel and runtime key / 创建自己的隧道与运行密钥：\nhttps://platform.openai.com/settings/organization/tunnels\nhttps://platform.openai.com/settings/organization/api-keys');
      id = await ask(`Tunnel ID${id ? ' [Enter: reuse saved / 保留已保存值]' : ''}: `) || id;
      process.stdout.write(`Runtime API key / 运行密钥${apiKey ? ' [Enter: keep / 保留]' : ''} (hidden / 隐藏): `);
      muted = true; const entered = await ask(''); muted = false; process.stdout.write('\n');
      apiKey = entered || apiKey;
    }
    validateInput(id, apiKey);
    const tunnel = process.env.DV_TUNNEL_CLIENT || saved.tunnel;
    if (!tunnel || !path.isAbsolute(tunnel) || spawnSync(tunnel, ['--version'], { stdio: 'ignore', timeout: 10000 }).status !== 0) throw new Error('Run bash setup.sh to install tunnel-client first');
    console.log('Checking local MCP / 验证本地 MCP…');
    const smokeEnv = { ...process.env }; delete smokeEnv.DV_RUNTIME_API_KEY; delete smokeEnv.OPENAI_API_KEY; delete smokeEnv.DV_CONFIG;
    const smoke = spawnSync(process.execPath, [path.join(root, 'scripts/smoke.mjs')], { env: smokeEnv, stdio: 'pipe', timeout: 90000 });
    if (smoke.status !== 0) throw new Error('Local MCP smoke failed; existing configuration was not changed');
    const active = saved.manager && (saved.manager === 'systemd' ? (await status()).managed_process_running : Boolean(ownedProcess()));
    const port = active ? saved.port : await freePort(saved.port || 18832);
    if (flags.has('--background') && saved.manager && saved.manager !== 'background') throw new Error('Existing setup uses systemd; keep its deployment mode');
    const manager = saved.manager || (flags.has('--background') ? 'background' : (systemdAvailable() ? 'systemd' : 'background'));
    if (active && manager === 'background' && (id !== saved.id || tunnel !== saved.tunnel || apiKey !== readPrivateJSON(credentials).apiKey)) throw new Error('Stop the managed runtime before changing its configuration: npm run stop');
    const config = { mcp: { filter_log_notifications: true }, tunnel: { id, api_key_env: 'OPENAI_API_KEY', health_port: port } };
    const toml = `[mcp]\nfilter_log_notifications = true\n\n[tunnel]\nid = ${JSON.stringify(id)}\napi_key_env = "OPENAI_API_KEY"\nhealth_port = ${port}\n`;
    const configFile = path.join(root, 'config.toml');
    if (fs.existsSync(configFile) && !saved.id) throw new Error('Existing config.toml was not created by this wizard. Move it aside or migrate it explicitly first.');
    privateWrite(configFile, toml);
    privateWrite(credentials, JSON.stringify({ apiKey }));
    privateWrite(path.join(dir, 'tunnel.yaml'), JSON.stringify(tunnelConfig(config), null, 2));
    privateWrite(stateFile, JSON.stringify({ id, tunnel, port, manager }));
    console.log('Local MCP passed; private configuration saved / 本地 MCP 通过，私有配置已保存。');
    if (flags.has('--configure-only')) {
      console.log('Runtime not started (--configure-only). ChatGPT registration: pending / 未启动隧道，MCP 注册待完成。'); return;
    }
    await start(manager);
    let ready = false;
    for (let i = 0; i < 20; i++) {
      if ((await status()).tunnel_ready) { ready = true; break; }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log(JSON.stringify({ local_mcp: 'passed', tunnel_ready: ready, manager, chatgpt_registration: 'pending_manual_registration_and_readonly_call' }));
    if (!ready) throw new Error('Tunnel is not ready. Configuration is retained. Check credentials/account access and run npm run status, then rerun setup.');
    console.log('Next / 最后一步：ChatGPT Settings → Connectors/Apps → add custom MCP → Tunnel → use your saved Tunnel ID. Verify tools/list and read-only list_sessions.\nhttps://chatgpt.com/#settings/Connectors');
    if (manager === 'background') console.log('Background mode does not restart after reboot/logout. Run bash setup.sh again to restore. / 后台模式不会在重启或注销后自动恢复，重新运行向导即可恢复。');
    else console.log('User service installed. WSL2 must stay running; logout persistence depends on systemd lingering. / 已安装用户服务；WSL2 须保持运行，注销后常驻取决于 lingering。');
  } finally { muted = false; rl?.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await setup(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
