import path from 'node:path';
import { spawn } from 'node:child_process';
import { root } from './config.mjs';

// Uses the same setup logic as the GUI, with an interactive terminal.
const tunnel = path.join(root, 'bin', process.platform === 'win32' ? 'tunnel-client.exe' : 'tunnel-client');
const child = spawn(process.execPath, [path.join(root, 'scripts/setup.mjs'), ...process.argv.slice(2)],
  { cwd: root, env: { ...process.env, DV_TUNNEL_CLIENT: tunnel },
    stdio: 'inherit', windowsHide: false });
child.once('error', () => { console.error('Could not start CLI configuration'); process.exitCode = 1; });
child.once('exit', (code, signal) => { process.exitCode = signal ? 1 : (code ?? 1); });
