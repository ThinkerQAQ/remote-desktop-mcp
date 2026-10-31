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
export function defaultManager(platform = process.platform) { return platform === 'darwin' ? 'launchd' : platform === 'win32' ? 'scheduled-task' : systemdAvailable() ? 'systemd' : 'background'; }
export function unitQuote(value) {
  if (/[\n\r\0]/.test(value)) throw new Error('Invalid service path');
  return '"' + value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%').replaceAll('$', () => '$$') + '"';
}
export const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
export const psQuote = value => "'" + value.replaceAll("'", "''") + "'";
export function launchPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(runtimeScript)}</string><string>run</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict><key>StandardOutPath</key><string>${xml(path.join(dir, 'tunnel.log'))}</string><key>StandardErrorPath</key><string>${xml(path.join(dir, 'tunnel.log'))}</string></dict></plist>`;
}
export function taskScript(action) {
  if (action === 'stop') return `Stop-ScheduledTask -TaskName ${psQuote(label)} -ErrorAction Stop`;
  // No credentials appear in task definitions or command arguments.
  return `$ErrorActionPreference='Stop'; $user=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name; $a=New-ScheduledTaskAction -Execute ${psQuote(process.execPath)} -Argument ${psQuote('"' + runtimeScript + '" run')}; $t=New-ScheduledTaskTrigger -AtLogOn -User $user; $p=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited; $s=New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries; Register-ScheduledTask -TaskName ${psQuote(label)} -Action $a -Trigger $t -Principal $p -Settings $s -Force | Out-Null; Start-ScheduledTask -TaskName ${psQuote(label)}`;
}
function powershell(script) {
  // Windows PowerShell 5.1 must resolve its own built-in modules. GitHub Actions
  // and shells launched by pwsh 7 may inject an incompatible PSModulePath.
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'psmodulepath') delete env[key];
  return spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { env, encoding: 'utf8', timeout: 30000, windowsHide: true, stdio: 'pipe' });
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
  return { managed_process_running: Boolean(managed), tunnel_ready: Boolean(managed) && await health(s.port), chatgpt_registration: 'not_verified' };
}
export async function stop() {
  const s = state();
  if (s.manager === 'systemd') {
    if (systemctl(['stop', unitName]).status !== 0) throw new Error('Could not stop managed user service');
  } else if (s.manager === 'launchd') {
    if (call('launchctl', ['bootout', `gui/${process.getuid()}/${label}`]).status !== 0 && await control()) throw new Error('Could not stop LaunchAgent');
  } else {
    await control('stop');
    if (s.manager === 'scheduled-task') powershell(taskScript('stop'));
    else { const p = ownedProcess(); if (p) process.kill(p.pid, 'SIGTERM'); }
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
  } else if (manager === 'scheduled-task') {
    if (powershell(taskScript('start')).status !== 0) throw new Error('Scheduled task setup failed; account policy may require --background');
  } else {
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
  let child, stopping = false;
  const terminate = () => {
    stopping = true;
    if (!child?.pid) return;
    if (process.platform === 'win32') call('taskkill.exe', ['/PID', String(child.pid), '/T', '/F']); else child.kill('SIGTERM');
  };
  const server = http.createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${token}` || !((req.url === '/status' && req.method === 'GET') || (req.url === '/stop' && req.method === 'POST'))) { res.writeHead(403); res.end(); return; }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ label }));
    if (req.url === '/stop') terminate();
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  privateWrite(path.join(dir, 'control.json'), JSON.stringify({ port: server.address().port, token }));
  const args = ['run', '--config', path.join(dir, 'tunnel.yaml')];
  child = spawn(s.tunnel, [...(s.tunnelArgs || []), ...args], { env: { ...process.env, DV_CONFIG: path.join(root, 'config.toml'), OPENAI_API_KEY: secret.apiKey }, stdio: 'inherit', windowsHide: true });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, terminate);
  const finish = code => { server.close(); server.closeAllConnections(); process.exitCode = stopping ? 0 : (code ?? 1); };
  child.once('error', () => finish(1)); child.once('exit', finish);
}
if (isDirectExecution(import.meta.url)) {
  try {
    const action = process.argv[2];
    if (action === 'run') await run();
    else if (action === 'status') console.log(JSON.stringify(await status(), null, 2));
    else if (action === 'stop') await stop();
    else if (action === 'start') { await start(state().manager); console.log(JSON.stringify(await status(), null, 2)); }
    else throw new Error('Use start, stop or status');
  } catch { console.error('Runtime action failed; run setup to check the local configuration.'); process.exitCode = 1; }
}
