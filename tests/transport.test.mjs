import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { keepMessage, tunnelConfig, shellQuote } from '../scripts/config.mjs';
import { relay } from '../scripts/proxy.mjs';

test('only low-level MCP log notifications are filtered', () => {
  for (const level of ['info', 'debug']) assert.equal(keepMessage({ method: 'notifications/message', params: { level } }), false);
  for (const level of ['warning', 'error', 'notice']) assert.equal(keepMessage({ method: 'notifications/message', params: { level } }), true);
  assert.equal(keepMessage({ id: 1, result: { level: 'info' } }), true);
  assert.equal(keepMessage({ method: 'notifications/progress', params: { level: 'info' } }), true);
  assert.equal(keepMessage({ method: 'notifications/message', params: { level: 'debug' } }, false), true);
});

test('transport carries requests, preserves errors, discards non-protocol output and propagates exit', async () => {
  const input = new PassThrough(), output = new PassThrough(), error = new PassThrough();
  let text = ''; output.on('data', b => { text += b; });
  const code = `process.stdin.once('data', b => {
    console.log('private startup noise');
    console.log(JSON.stringify({jsonrpc:'2.0',method:'notifications/message',params:{level:'info',data:'noise'}}));
    console.log(b.toString().trim());
    console.log(JSON.stringify({jsonrpc:'2.0',id:2,error:{code:-1,message:'error'}}));
    process.exitCode=7; process.stdin.resume();
  });`;
  const done = relay(process.execPath, ['-e', code], { input, output, error });
  const request = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} };
  input.end(JSON.stringify(request) + '\n');
  assert.equal(await done, 7);
  const messages = text.trim().split('\n').map(JSON.parse);
  assert.deepEqual(messages[0], request);
  assert.equal(messages[1].error.code, -1);
  assert.equal(messages.length, 2);
});

test('spawn failure returns failure', async () => {
  const input = new PassThrough(); input.end();
  assert.equal(await relay('nonexistent-dv-program-12345', [], { input, output: new PassThrough(), error: new PassThrough() }), 1);
});

test('generated config refers to environment and initialized handshake', { skip: process.platform === 'win32' }, () => {
  const config = tunnelConfig({ tunnel: { id: 'tunnel_EXAMPLE', api_key_env: 'OPENAI_API_KEY', health_port: 18832 } });
  assert.equal(config.control_plane.api_key, 'env:OPENAI_API_KEY');
  assert.equal(config.health.listen_addr, '127.0.0.1:18832');
  assert.equal(config.mcp.stdio_send_initialized_notification, true);
  assert.throws(() => tunnelConfig({ tunnel: { id: 'x' } }));
  assert.equal(shellQuote("a'b"), "'a'\"'\"'b'");
});
