import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuiServer } from '../scripts/gui.mjs';

test('local GUI uses loopback, requires session auth, and keeps Save independent of service controls', async t => {
  const calls = [];
  let running = false, auto = false, id = '';
  const services = {
    async getStatus() {
      return { configured: Boolean(id), running, connected: running, autostart: auto,
        tunnelId: id, keySaved: Boolean(id), manager: 'systemd' };
    },
    async save(value) {
      calls.push(['save', value.tunnelId, Boolean(value.apiKey)]);
      id = value.tunnelId;
      return { saved: true };
    },
    async service(action) {
      calls.push(['service', action]);
      running = action === 'start';
      return { updated: true };
    },
    async autostart(enabled) {
      calls.push(['autostart', enabled]);
      auto = enabled;
      return { autostart: enabled };
    }
  };
  const { server, token, origin, url } = await createGuiServer({ services });
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1');
  assert.equal(new URL(url).hash, '#' + token);
  const noAuth = await fetch(origin + '/api/status');
  assert.equal(noAuth.status, 403);
  assert.equal(noAuth.headers.get('access-control-allow-origin'), null);
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  const html = await page.text();
  for (const label of ['Save', 'Start Service', 'Refresh Status', 'Auto-start when I sign in',
    'https://chatgpt.com/plugins']) assert.ok(html.includes(label), label);
  assert.ok(!html.includes(token));
  const css = await fetch(origin + '/gui.css');
  assert.equal(css.status, 200);
  const icon = await fetch(origin + '/icon.png');
  assert.equal(icon.status, 200);
  assert.equal(icon.headers.get('content-type'), 'image/png');
  assert.ok((await icon.arrayBuffer()).byteLength > 100);
  const auth = { 'X-Session-Token': token };
  const status = await fetch(origin + '/api/status', { headers: auth });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).configured, false);
  const wrongOrigin = await fetch(origin + '/api/save', {
    method: 'POST', headers: { ...auth, Origin: 'https://example.com', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tunnelId: 'tunnel_synthetic', apiKey: 'not-real' })
  });
  assert.equal(wrongOrigin.status, 403);
  const post = async (endpoint, data) => fetch(origin + '/api/' + endpoint, {
    method: 'POST', headers: { ...auth, Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const save = await post('save', { tunnelId: 'tunnel_synthetic', apiKey: 'synthetic-only' });
  assert.equal(save.status, 200);
  assert.deepEqual(calls, [['save', 'tunnel_synthetic', true]]);
  assert.equal(running, false, 'Save must not start service');
  assert.equal(auto, false, 'Save must not change startup');
  const start = await post('service', { action: 'start' });
  assert.equal(start.status, 200);
  assert.equal(running, true);
  const changeStartup = await post('autostart', { enabled: true });
  assert.equal(changeStartup.status, 200);
  assert.equal(auto, true);
  assert.equal(running, true, 'Changing startup must not stop the service');
  const stop = await post('service', { action: 'stop' });
  assert.equal(stop.status, 200);
  assert.equal(running, false);
  assert.deepEqual(calls.map(x => x[0]), ['save', 'service', 'autostart', 'service']);
  const refused = await post('service', { action: 'delete' });
  assert.equal(refused.status, 400);
  const state = await fetch(origin + '/api/status', { headers: auth });
  assert.equal((await state.json()).autostart, true);
});
