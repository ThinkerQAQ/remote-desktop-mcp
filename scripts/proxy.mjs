import { isDirectExecution } from './entrypoint.mjs';
import { prepareUpstream } from './patch-upstream.mjs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { keepMessage, loadConfig, upstream } from './config.mjs';

// Transport adapter only: upstream owns tools, access controls and process sessions.
export async function relay(command, args, { input = process.stdin, output = process.stdout, error = process.stderr, filter = true } = {}) {
  const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  child.stderr.resume(); // Upstream diagnostics may contain local data; never echo them remotely.
  const completion = new Promise(resolve => {
    child.once('error', () => { error.write('DV: upstream failed to start\n'); resolve(1); });
    child.once('close', code => resolve(code === null ? 1 : code));
  });
  child.stdin.on('error', () => {}); // EPIPE after an upstream exit is expected.
  input.pipe(child.stdin);
  const signals = ['SIGINT', 'SIGTERM'];
  const stop = () => { child.kill(); };
  for (const s of signals) process.on(s, stop);
  try {
    for await (const line of createInterface({ input: child.stdout, crlfDelay: Infinity })) {
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message?.jsonrpc !== '2.0' || !keepMessage(message, filter)) continue;
      if (!output.write(line + '\n')) await once(output, 'drain');
    }
    return await completion;
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    input.unpipe(child.stdin);
    input.pause();
    for (const s of signals) process.off(s, stop);
  }
}
if (isDirectExecution(import.meta.url)) {
  try { prepareUpstream(); process.exitCode = await relay(process.execPath, [upstream], { filter: loadConfig().mcp?.filter_log_notifications ?? true }); }
  catch { process.stderr.write('DV: transport failed; check local installation/configuration\n'); process.exitCode = 1; }
}
