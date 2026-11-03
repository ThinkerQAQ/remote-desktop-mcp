import { isDirectExecution } from './entrypoint.mjs';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { root } from './config.mjs';
import { readPrivateJSON } from './private-files.mjs';
import { status, start, stop, setAutostart } from './runtime.mjs';

const assets = path.dirname(fileURLToPath(import.meta.url));
function savedSetup() {
  try {
    const key = fs.lstatSync(path.join(root, 'runtime/credentials.json'));
    if (!key.isFile() || key.isSymbolicLink()) return null;
    const setup = readPrivateJSON(path.join(root, 'runtime/setup.json'));
    return /^tunnel_[A-Za-z0-9_-]+$/.test(setup.id) ? setup : null;
  } catch { return null; }
}
async function saveConfig({ tunnelId, apiKey }) {
  if (typeof tunnelId !== 'string' || !/^tunnel_[A-Za-z0-9_-]+$/.test(tunnelId) ||
      typeof apiKey !== 'string' || apiKey.length > 2048 || /[\r\n\0]/.test(apiKey))
    throw new Error('Invalid Tunnel ID or key');
  if (!apiKey && !savedSetup()) throw new Error('A runtime API key is required');
  const tunnel = path.join(root, 'bin', process.platform === 'win32' ? 'tunnel-client.exe' : 'tunnel-client');
  const env = { ...process.env, DV_TUNNEL_ID: tunnelId, DV_TUNNEL_CLIENT: tunnel };
  delete env.DV_RUNTIME_API_KEY;
  if (apiKey) env.DV_RUNTIME_API_KEY = apiKey;
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts/setup.mjs'), '--non-interactive', '--configure-only'],
      { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    for (const stream of [child.stdout, child.stderr]) stream.resume();
    const timer = setTimeout(() => child.kill(), 120000);
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() :
      reject(new Error('Save failed. Check Tunnel settings and local runtime')); });
  });
  return { saved: true };
}
export function defaultServices() {
  return {
    async getStatus() {
      const saved = savedSetup();
      if (!saved) return { configured: false, running: false, connected: false,
        autostart: null, manager: null, tunnelId: '', keySaved: false };
      const result = await status();
      return { configured: true, running: result.managed_process_running,
        connected: result.tunnel_ready, autostart: result.autostart_enabled,
        manager: result.manager, tunnelId: saved.id, keySaved: true };
    },
    save: saveConfig,
    async service(action) {
      const saved = savedSetup();
      if (!saved) throw new Error('Save the Tunnel configuration first');
      if (action === 'start') await start(saved.manager);
      else if (action === 'stop') await stop();
      else throw new Error('Invalid service operation');
      return { updated: true };
    },
    async autostart(enabled) {
      if (!savedSetup()) throw new Error('Save the Tunnel configuration first');
      return { autostart: setAutostart(enabled) };
    }
  };
}
const publicFiles = new Map([
  ['/', ['gui.html', 'text/html; charset=utf-8']],
  ['/gui.css', ['gui.css', 'text/css; charset=utf-8']],
  ['/gui.js', ['gui.js', 'text/javascript; charset=utf-8']]
]);
function respond(res, code, data, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
  res.end(Buffer.isBuffer(data) ? data : typeof data === 'string' ? data : JSON.stringify(data));
}
async function readJSON(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new Error('Request is too large');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('Invalid JSON request'); }
}
export async function createGuiServer({ services = defaultServices(), port = 0, idleMs = 1800000 } = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  let origin = '', busy = false, last = Date.now();
  const server = http.createServer(async (req, res) => {
    try {
      const host = `127.0.0.1:${server.address().port}`;
      if (req.headers.host !== host || !req.url?.startsWith('/')) {
        respond(res, 403, { error: 'Forbidden' }); return;
      }
      const route = new URL(req.url, `http://${host}`).pathname;
      if (req.method === 'GET' && route === '/icon.png') {
        const installed = path.join(root, 'brand/remotedesktopmcp.png');
        const source = path.join(root, 'packaging/assets/remotedesktopmcp.png');
        respond(res, 200, fs.readFileSync(fs.existsSync(installed) ? installed : source), 'image/png');
        return;
      }
      if (req.method === 'GET' && publicFiles.has(route)) {
        const [file, type] = publicFiles.get(route);
        respond(res, 200, fs.readFileSync(path.join(assets, file), 'utf8'), type); return;
      }
      if (!route.startsWith('/api/')) { respond(res, 404, { error: 'Not found' }); return; }
      if (req.headers['x-session-token'] !== token ||
          (req.headers.origin && req.headers.origin !== origin) ||
          req.headers['sec-fetch-site'] === 'cross-site') {
        respond(res, 403, { error: 'Unauthorized' }); return;
      }
      if (req.method === 'POST' && (req.headers.origin !== origin ||
          !String(req.headers['content-type'] || '').startsWith('application/json'))) {
        respond(res, 403, { error: 'Invalid origin' }); return;
      }
      last = Date.now();
      if (route === '/api/status' && req.method === 'GET') {
        respond(res, 200, await services.getStatus()); return;
      }
      if (busy) { respond(res, 409, { error: 'Another operation is in progress' }); return; }
      if (req.method !== 'POST' || !['/api/save', '/api/service', '/api/autostart'].includes(route)) {
        respond(res, 404, { error: 'Not found' }); return;
      }
      busy = true;
      try {
        // Hold the lock while reading the request body as well as executing.
        const data = await readJSON(req);
        let output;
        if (route === '/api/save') output = await services.save(data);
        else if (route === '/api/service' && ['start', 'stop'].includes(data.action))
          output = await services.service(data.action);
        else if (route === '/api/autostart' && typeof data.enabled === 'boolean')
          output = await services.autostart(data.enabled);
        else throw new Error('Invalid operation');
        respond(res, 200, output);
      } finally { busy = false; }
    } catch {
      respond(res, 400, { error: 'Operation failed. Check configuration and local runtime.' });
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  const timer = setInterval(() => {
    if (!busy && Date.now() - last > idleMs) server.close();
  }, 30000);
  timer.unref();
  server.once('close', () => clearInterval(timer));
  return { server, origin, token, url: `${origin}/#${token}` };
}
function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd.exe' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/d', '/c', 'start', '""', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.once('error', () => {}); child.unref();
}
if (isDirectExecution(import.meta.url)) {
  const { server, url } = await createGuiServer();
  console.log(`RemoteDesktopMCP configuration: ${url}`);
  if (!process.argv.includes('--no-browser')) openBrowser(url);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
