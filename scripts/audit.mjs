import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--omit=dev', '--json', '--registry=https://registry.npmjs.org'], { encoding: 'utf8', timeout: 120000 });
try {
  const data = JSON.parse(result.stdout);
  if (!data.metadata?.vulnerabilities || data.error) throw new Error();
  const counts = data.metadata.vulnerabilities;
  console.log(JSON.stringify(counts));
  if (counts.high || counts.critical) process.exitCode = 1;
} catch { console.error('Dependency audit unavailable; refusing to report a clean result'); process.exitCode = 1; }
