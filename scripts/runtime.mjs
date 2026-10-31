import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { root } from './config.mjs';
import { privateDir, privateWrite, readPrivateJSON } from './private-files.mjs';

const dir = path.join(root, 'runtime');
const stateFile = path.join(dir, 'setup.json');
const pidFile = path.join(dir, 'process.json');
export const unitName = `remote-desktop-mcp-${crypto.createHash('sha256').update(root).digest('hex').slice(0, 10)}.service`;
const unitFile = path.join(os.homedir(), '.config/systemd/user', unitName);
const runtimeScript = path.join(root, 'scripts/runtime.mjs');
const state = () => readPrivateJSON(stateFile);
function systemctl(args) { return spawnSync('systemctl', ['--user', ...args], { encoding: 'utf8', timeout: 15000, stdio: 'pipe' }); }
export function systemdAvailable() { return systemctl(['show-environment']).status === 0; }
function identity(pid) {
  try { return fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[19]; } catch { return null; }
}
export function ownedProcess() {
  try {
    const p = readPrivateJSON(pidFile);
    if (identity(p.pid) !== p.start || !p.start) return null;
    const args = fs.readFileSync(`/proc/${p.pid}/cmdline`, 'utf8').split('\0');
    return args.includes(runtimeScript) && args.includes('run') ? p : null;
  } catch { return null; }
}
export async function health(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/readyz`, { signal: AbortSignal.timeout(1500), redirect: 'error' });
    return r.ok;
  } catch { return false; }
}
export async function status() {
  const s = state();
  const managed = s.manager === 'systemd' ? systemctl(['is-active', '--quiet', unitName]).status === 0 : Boolean(ownedProcess());
  return { managed_process_running: managed, tunnel_ready: managed && await health(s.port), chatgpt_registration: 'not_verified' };
}
export function unitQuote(value) {
  if (/[\n\r\0]/.test(value)) throw new Error('Invalid service path');
  return '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%').replaceAll('$', () => '$$') + '"';
}
export function stop() {
  const s = state();
  if (s.manager === 'systemd') {
    if (systemctl(['stop', unitName]).status !== 0) throw new Error('Could not stop managed user service');
  } else { const p = ownedProcess(); if (p) process.kill(p.pid, 'SIGTERM'); }
}
export async function start(manager) {
  if (process.platform !== 'linux') throw new Error('Persistent deployment requires Linux/WSL2');
  privateDir(dir);
  const s = state();
  if (s.manager && s.manager !== manager) throw new Error('Stop/remove the previous manager before changing deployment mode');
  if (manager === 'systemd') {
    const unit = `[Unit]\nDescription=Remote Desktop MCP\nWants=network-online.target\nAfter=network-online.target\n\n[Service]\nType=simple\nExecStart=${unitQuote(process.execPath)} ${unitQuote(runtimeScript)} run\nRestart=on-failure\nRestartSec=5\nUMask=0077\nNoNewPrivileges=true\n\n[Install]\nWantedBy=default.target\n`;
    privateWrite(unitFile, unit);
    for (const args of [['daemon-reload'], ['enable', unitName], ['restart', unitName]]) if (systemctl(args).status !== 0) throw new Error('User service setup failed; rerun setup after checking systemd');
  } else {
    if (ownedProcess()) return;
    const fd = fs.openSync(path.join(dir, 'tunnel.log'), fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
    fs.fchmodSync(fd, 0o600);
    try {
      const child = spawn(process.execPath, [runtimeScript, 'run'], { detached: true, stdio: ['ignore', fd, fd], windowsHide: true });
      await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
      privateWrite(pidFile, JSON.stringify({ pid: child.pid, start: identity(child.pid) }));
      child.unref();
    } finally { fs.closeSync(fd); }
  }
}
async function run() {
  const s = state(), secret = readPrivateJSON(path.join(dir, 'credentials.json'));
  const child = spawn(s.tunnel, ['run', '--config', path.join(dir, 'tunnel.yaml')], { env: { ...process.env, DV_CONFIG: path.join(root, 'config.toml'), OPENAI_API_KEY: secret.apiKey }, stdio: 'inherit', windowsHide: true });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', () => { console.error('Tunnel process could not start'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const action = process.argv[2];
    if (action === 'run') await run();
    else if (action === 'status') console.log(JSON.stringify(await status(), null, 2));
    else if (action === 'stop') stop();
    else if (action === 'start') { await start(state().manager); console.log(JSON.stringify(await status(), null, 2)); }
    else throw new Error('Use start, stop or status');
  } catch { console.error('Runtime action failed; run setup to check the local configuration.'); process.exitCode = 1; }
}
