import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareUpstream } from '../scripts/patch-upstream.mjs';
import { defaultManager, xml, psQuote, launchPlist, taskScript } from '../scripts/runtime.mjs';
prepareUpstream();
const s = await import('../node_modules/@wonderwhy-er/desktop-commander/dist/tools/schemas.js');
const { zodToJsonSchema } = await import('../scripts/zod-json-schema.mjs');

test('Zod 4 preserves schemas, defaults, records, refinements and PDF preprocessing', () => {
  for (const [name, schema] of Object.entries(s)) if (name.endsWith('Schema')) {
    const json = zodToJsonSchema(schema); assert.equal(typeof json, 'object', name);
  }
  assert.equal(s.ReadFileArgsSchema.parse({ path: '/synthetic' }).length, 1000);
  assert.equal(s.ReadFileArgsSchema.parse({ path: '/synthetic', options: { nested: [1] } }).options.nested[0], 1);
  assert.equal(s.ReadMultipleFilesArgsSchema.safeParse({ paths: [42] }).success, false);
  assert.equal(s.KillProcessArgsSchema.safeParse({ pid: 0 }).success, false);
  assert.equal(s.KillProcessArgsSchema.safeParse({ pid: -1 }).success, false);
  assert.equal(s.WritePdfArgsSchema.parse({ path: 'synthetic.pdf', content: '[{"type":"delete","pageIndexes":[0]}]' }).content[0].type, 'delete');
  assert.equal(zodToJsonSchema(s.ReadFileArgsSchema).properties.path.type, 'string');
  assert.deepEqual(zodToJsonSchema(s.WritePdfArgsSchema).properties.content.anyOf.map(v => v.type), ['string', 'array']);
});

test('native manager definitions escape paths and never embed credentials', () => {
  assert.equal(defaultManager('darwin'), 'launchd'); assert.equal(defaultManager('win32'), 'scheduled-task');
  assert.equal(xml('a&<"'), 'a&amp;&lt;&quot;'); assert.equal(psQuote("a'b"), "'a''b'");
  assert.ok(launchPlist().includes('<key>ProgramArguments</key>'));
  assert.ok(taskScript('start').includes('-RunLevel Limited'));
  for (const text of [launchPlist(), taskScript('start')]) assert.ok(!text.includes('OPENAI_API_KEY'));
});
