import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { root } from '../scripts/config.mjs';
import { validateInput, freePort } from '../scripts/setup.mjs';
import { privateWrite } from '../scripts/private-files.mjs';
import { unitQuote } from '../scripts/runtime.mjs';
import { isDirectExecution } from '../scripts/entrypoint.mjs';
import { pathToFileURL } from 'node:url';

test('entrypoint recognizes real path and symlink aliases (macOS /var and /private/var)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-entrypoint-'));
  try {
    const source = path.join(root, 'scripts/setup.mjs');
    const alias = path.join(dir, 'entrypoint-alias.mjs');
    fs.symlinkSync(source, alias);
    assert.equal(isDirectExecution(pathToFileURL(source).href, alias), true);
    assert.equal(isDirectExecution(pathToFileURL(source).href, source), true);
    assert.equal(isDirectExecution(pathToFileURL(source).href, path.join(root, 'scripts/runtime.mjs')), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('reject missing/multiline credentials and malformed tunnel identity', () => {
  assert.throws(() => validateInput('bad', 'key'));
  assert.throws(() => validateInput('tunnel_EXAMPLE', ''));
  assert.throws(() => validateInput('tunnel_EXAMPLE', 'key\nsecond'));
  validateInput('tunnel_EXAMPLE', 'synthetic-key');
  assert.equal(unitQuote('/path/a%$"\\b'), '"/path/a%%$$\\"\\\\b"');
  assert.throws(() => unitQuote('/path\nnew'));
});

test('occupied preferred port chooses another loopback port', async () => {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { assert.notEqual(await freePort(server.address().port), server.address().port); }
  finally { server.close(); }
});

test('private writes enforce permissions and refuse symlinks', { skip: process.platform === 'win32' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-private-'));
  try {
    const target = path.join(dir, 'target'); privateWrite(target, 'original');
    assert.equal(fs.statSync(target).mode & 0o777, 0o600);
    const link = path.join(dir, 'link'); fs.symlinkSync(target, link);
    assert.throws(() => privateWrite(link, 'changed'));
    assert.equal(fs.readFileSync(target, 'utf8'), 'original');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { output += b; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Test subprocess timed out')); }, 100000);
    child.on('error', reject); child.on('close', code => { clearTimeout(timer); resolve({ code, output }); });
  });
}
for (const native of [false, true]) test(`wizard lifecycle with ${native ? 'native user startup' : 'background'} manager`, { timeout: 300000, skip: native && process.platform === 'linux' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-wizard-'));
  let started = false;
  const env = { ...process.env, DV_TUNNEL_ID: 'tunnel_EXAMPLE', DV_RUNTIME_API_KEY: 'synthetic-secret-do-not-print' };
  delete env.DV_CONFIG;
  try {
    fs.cpSync(path.join(root, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
    fs.copyFileSync(path.join(root, 'config.example.toml'), path.join(dir, 'config.example.toml'));
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}');
    const mock = path.join(dir, 'mock-tunnel.mjs');
    fs.writeFileSync(mock, `#!${process.execPath}\nimport fs from 'node:fs';import http from 'node:http';\nif(process.argv.includes('--version')) console.log('mock');else {const c=JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--config')+1]));const p=Number(c.health.listen_addr.split(':').at(-1));http.createServer((q,r)=>{r.end('ok');}).listen(p,'127.0.0.1');}\n`, { mode: 0o700 });
    env.DV_TUNNEL_CLIENT = process.execPath;
    env.DV_TUNNEL_ARGS_JSON = JSON.stringify([mock]);
    const args = [path.join(dir, 'scripts/setup.mjs'), '--non-interactive', ...(native ? [] : ['--background'])];
    let result = await run(process.execPath, [...args, '--configure-only'], env);
    assert.equal(result.code, 0, result.output);
    assert.ok(!result.output.includes(env.DV_RUNTIME_API_KEY));
    assert.match(result.output, /not started/i);
    const credentials = path.join(dir, 'runtime/credentials.json');
    if (process.platform !== 'win32') assert.equal(fs.statSync(credentials).mode & 0o777, 0o600);
    assert.equal(JSON.parse(fs.readFileSync(credentials)).apiKey, env.DV_RUNTIME_API_KEY);
    const reused = { ...env }; delete reused.DV_RUNTIME_API_KEY; delete reused.DV_TUNNEL_ID;
    result = await run(process.execPath, args, reused); started = true;
    assert.equal(result.code, 0, result.output);
    assert.ok(result.output.includes('"tunnel_ready":true'));
    assert.ok(result.output.includes('pending_manual_registration'));
    assert.ok(!result.output.includes(env.DV_RUNTIME_API_KEY));
    const status = await run(process.execPath, [path.join(dir, 'scripts/runtime.mjs'), 'status'], reused);
    assert.equal(JSON.parse(status.output).tunnel_ready, true);
    result = await run(process.execPath, [...args, '--configure-only'], reused);
    assert.equal(result.code, 0, result.output);
  } finally {
    if (started) await run(process.execPath, [path.join(dir, 'scripts/runtime.mjs'), 'stop'], env);
    if (native && process.platform === 'win32') {
      const { createHash } = await import('node:crypto');
      const name = 'remote-desktop-mcp-' + createHash('sha256').update(dir).digest('hex').slice(0, 10);
      await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Unregister-ScheduledTask -TaskName '${name}' -Confirm:$false -ErrorAction SilentlyContinue`], env);
    }
    if (native && process.platform === 'darwin') {
      const { createHash } = await import('node:crypto');
      fs.rmSync(path.join(os.homedir(), 'Library/LaunchAgents', 'remote-desktop-mcp-' + createHash('sha256').update(dir).digest('hex').slice(0, 10) + '.plist'), { force: true });
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
