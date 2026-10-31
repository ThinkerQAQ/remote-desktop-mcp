import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');

test('third-party notices track exact direct dependencies and licenses', () => {
  for (const name of Object.keys(pkg.dependencies)) {
    const resolved = lock.packages[`node_modules/${name}`];
    assert.ok(resolved?.version && resolved?.license, `missing locked license metadata: ${name}`);
    const fragment = `| ${name} ${resolved.version} | ${resolved.license} |`;
    assert.ok(notices.includes(fragment), `missing or stale third-party notice: ${fragment}`);
  }
});

test('notices explain upstream modification and redistribution', () => {
  assert.match(notices, /patch-upstream\.mjs/);
  assert.match(notices, /transitive dependency/i);
});
