import { isDirectExecution } from './entrypoint.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { root } from './config.mjs';
import { privateDir, privateWrite, readPrivateJSON, restrict } from './private-files.mjs';

const dir = path.join(root, 'runtime');
const state = () => readPrivateJSON(path.join(dir, 'setup.json'));
const runtimeScript = path.join(root, 'scripts/runtime.mjs');
export const label = `remote-desktop-mcp-${crypto.createHash('sha256').update(root).digest('hex').slice(0, 10)}`;
export const unitName = `${label}.service`;
const unitFile = path.join(os.homedir(), '.config/systemd/user', unitName);
const plistFile = path.join(os.homedir(), 'Library/LaunchAgents', `${label}.plist`);
function call(program, args, input) { return spawnSync(program, args, { input, encoding: 'utf8', timeout: 30000, windowsHide: true, stdio: 'pipe' }); }
function systemctl(args) { return call('systemctl', ['--user', ...args]); }
export function systemdAvailable() { return process.platform === 'linux' && systemctl(['show-environment']).status === 0; }
// A macOS SSH session may have no gui/<uid> launchd domain. In that case
// use a user-owned background process rather than relying on a desktop login.
export function defaultManager(platform = process.platform) {
  if (platform === 'darwin') return process.platform !== 'darwin' || call('launchctl', ['print', `gui/${process.getuid()}`]).status === 0 ? 'launchd' : 'background';
  return platform === 'win32' ? 'scheduled-task' : systemdAvailable() ? 'systemd' : 'background';
}
export function unitQuote(value) {
  if (/[\n\r\0]/.test(value)) throw new Error('Invalid service path');
  return '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%').replaceAll('$', () => '$$') + '"';
}
export const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
// Windows startup is owned by the bundled Go client; no PowerShell or VBS.
function nativeAutostart(action) {
  const client = path.join(root, 'bin', 'remotedesktopmcp.exe');
  if (!fs.existsSync(client)) throw new Error('Bundled native Windows client is required');
  const result = call(client, ['autostart', action]);
  if (result.status !== 0) throw new Error('Native Windows startup operation failed');
  try { return JSON.parse(result.stdout).autostart_enabled; }
  catch { throw new Error('Invalid native Windows startup result'); }
}
export function windowsAutostartEnabled() {
  return process.platform !== 'win32' ? null : nativeAutostart('status');
}
export function setWindowsAutostart(enabled) {
  if (process.platform !== 'win32' || state().manager !== 'scheduled-task')
    throw new Error('Windows login startup is not configured');
  return nativeAutostart(enabled ? 'enable' : 'disable');
}
export function launchPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(runtimeScript)}</string><string>run</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict><key>StandardOutPath</key><string>${xml(path.join(dir, 'tunnel.log'))}</string><key>StandardErrorPath</key><string>${xml(path.join(dir, 'tunnel.log'))}</string></dict></plist>`;
}
async function control(action = 'status') {
  try {
    const c = readPrivateJSON(path.join(dir, 'control.json'));
    const r = await fetch(`http://127.0.0.1:${c.port}/${action}`, { method: action === 'stop' ? 'POST' : 'GET', headers: { Authorization: `Bearer ${c.token}` }, signal: AbortSignal.timeout(2000), redirect: 'error' });
    const body = await r.json();
    return r.ok && body.label === label;
  } catch { return false; }
}
// Legacy v0.2 Linux PID files: validate process identity before signalling.
export function ownedProcess() {
  try {
    const p = readPrivateJSON(path.join(dir, 'process.json'));
    const start = fs.readFileSync(`/proc/${p.pid}/stat`, 'utf8').split(') ')[1].split(' ')[19];
    const args = fs.readFileSync(`/proc/${p.pid}/cmdline`, 'utf8').split('\0');
    return p.start === start && args.includes(runtimeScript) && args.includes('run') ? p : null;
  } catch { return null; }
}
export async function health(port) {
  try { return (await fetch(`http://127.0.0.1:${port}/readyz`, { signal: AbortSignal.timeout(1500), redirect: 'error' })).ok; } catch { return false; }
}
export async function status() {
  const s = state();
  const managed = await control() || (s.manager === 'systemd' && systemctl(['is-active', '--quiet', unitName]).status === 0) || (s.manager === 'background' && Boolean(ownedProcess()));
  return { managed_process_running: Boolean(managed), tunnel_ready: Boolean(managed) && await health(s.port), manager: s.manager, autostart_enabled: s.manager === 'scheduled-task' ? windowsAutostartEnabled() : null, chatgpt_registration: 'not_verified' };
}
export async function stop() {
  const s = state();
  if (s.manager === 'systemd') {
    if (systemctl(['stop', unitName]).status !== 0) throw new Error('Could not stop managed user service');
  } else if (s.manager === 'launchd') {
    if (call('launchctl', ['bootout', `gui/${process.getuid()}/${label}`]).status !== 0 && await control()) throw new Error('Could not stop LaunchAgent');
  } else {
    await control('stop');
    const p = ownedProcess(); if (p) process.kill(p.pid, 'SIGTERM');
  }
  for (let i = 0; i < 30 && await control(); i++) await new Promise(r => setTimeout(r, 100));
}
export async function start(manager) {
  privateDir(dir);
  if (!['systemd', 'launchd', 'scheduled-task', 'background'].includes(manager)) throw new Error('Unknown process manager');
  if (state().manager !== manager) throw new Error('Cannot change the saved process manager');
  if ((await status()).managed_process_running) return;
  const logFile = path.join(dir, 'tunnel.log');
  if (fs.lstatSync(logFile, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('Refusing symlinked log');
  if (!fs.existsSync(logFile)) privateWrite(logFile, ''); else restrict(logFile);
  if (manager === 'systemd') {
    privateWrite(unitFile, `[Unit]\nDescription=Remote Desktop MCP\nAfter=network-online.target\n\n[Service]\nType=simple\nExecStart=${unitQuote(process.execPath)} ${unitQuote(runtimeScript)} run\nRestart=on-failure\nRestartSec=5\nUMask=0077\nNoNewPrivileges=true\n\n[Install]\nWantedBy=default.target\n`);
    for (const args of [['daemon-reload'], ['enable', unitName], ['start', unitName]]) if (systemctl(args).status !== 0) throw new Error('User service setup failed');
  } else if (manager === 'launchd') {
    privateWrite(plistFile, launchPlist());
    call('launchctl', ['bootout', `gui/${process.getuid()}/${label}`]);
    if (call('launchctl', ['bootstrap', `gui/${process.getuid()}`, plistFile]).status !== 0) throw new Error('LaunchAgent setup failed; use --background if no GUI login domain is available');
  } else {
    // Auto-start OFF or never configured: manual start never creates a login task.
    const fd = fs.openSync(logFile, fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0), 0o600);
    try {
      const child = spawn(process.execPath, [runtimeScript, 'run'], { detached: true, stdio: ['ignore', fd, fd], windowsHide: true });
      await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); }); child.unref();
    } finally { fs.closeSync(fd); }
  }
}
async function run() {
  const s = state(), secret = readPrivateJSON(path.join(dir, 'credentials.json'));
  const token = crypto.randomBytes(32).toString('hex');
  let child, stopping = false, connecting = s.tunnel_auto_connect !== false, retry, changing = false;
  const status = () => ({label, revision: s.revision || '', connecting});
  const start = () => {
    if (stopping || !connecting || child) return;
    const fd = fs.openSync(path.join(dir, 'tunnel.log'), fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_WRONLY, 0o600);
    try {
      child = spawn(s.tunnel, [...(s.tunnelArgs || []), 'run', '--config', path.join(dir, 'tunnel.yaml')], {
        env: {...process.env, DV_CONFIG: path.join(root, 'config.toml'), OPENAI_API_KEY: secret.apiKey},
        stdio: ['ignore', fd, fd], windowsHide: true
      });
    } finally { fs.closeSync(fd); }
    const active = child;
    const exited = () => {
      if (child !== active) return;
      child = undefined;
      if (stopping) finish();
      else if (connecting) retry = setTimeout(start, 5000);
    };
    active.once('error', exited); active.once('exit', exited);
  };
  const kill = () => {
    clearTimeout(retry);
    if (!child?.pid) { if (stopping) finish(); return; }
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {windowsHide:true, stdio:'ignore'});
    else child.kill('SIGTERM');
  };
  const terminate = () => { stopping = true; connecting = false; kill(); };
  const server = http.createServer(async (req, res) => {
    const action = req.url?.slice(1);
    const valid = req.method === 'GET' && action === 'status' || req.method === 'POST' && ['stop','connect','disconnect'].includes(action);
    if (req.headers.authorization !== `Bearer ${token}` || !valid) { res.writeHead(403); res.end(); return; }
    res.setHeader('Content-Type', 'application/json');
    if (action === 'status') { res.end(JSON.stringify(status())); return; }
    if (changing || stopping) { res.writeHead(409); res.end('{}'); return; }
    changing = true;
    try {
      if (action === 'connect') { connecting = true; start(); }
      if (action === 'disconnect') {
        connecting = false;
        const active = child;
        kill();
        if (active && child === active) {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => { cleanup(); reject(Error('Tunnel did not stop')); }, 4000);
            const done = () => { cleanup(); resolve(); };
            const cleanup = () => { clearTimeout(timer); active.off('exit', done); active.off('error', done); };
            active.once('exit', done); active.once('error', done);
          });
        }
      }
      res.end(JSON.stringify(status()));
      if (action === 'stop') terminate();
    } catch { res.writeHead(500); res.end('{}'); }
    finally { changing = false; }
  });
  const finish = () => { server.close(); server.closeAllConnections(); process.exitCode = 0; };
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  privateWrite(path.join(dir, 'control.json'), JSON.stringify({port: server.address().port, token}));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, terminate);
  start();
}
if (isDirectExecution(import.meta.url)) {
  try {
    const action = process.argv[2];
    if (action === 'run') await run();
    else if (action === 'status') console.log(JSON.stringify(await status(), null, 2));
    else if (action === 'stop') await stop();
    else if (action === 'start') { await start(state().manager); console.log(JSON.stringify(await status(), null, 2)); }
    else if (action === 'autostart' && ['enable', 'disable'].includes(process.argv[3]) && process.argv.length === 4) {
      console.log(JSON.stringify({ autostart_enabled: setWindowsAutostart(process.argv[3] === 'enable') }));
    }
    else throw new Error('Use start, stop, status, or autostart enable|disable');
  } catch { console.error('Runtime action failed; run setup to check the local configuration.'); process.exitCode = 1; }
}
