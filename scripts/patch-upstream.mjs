import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function prepareUpstream() {
  const base = path.join(root, 'node_modules/@wonderwhy-er/desktop-commander');
  if (JSON.parse(fs.readFileSync(path.join(base, 'package.json'))).version !== '0.3.1') throw new Error('Review the compatibility patch before updating Desktop Commander');
  const file = path.join(base, 'dist/tools/schemas.js');
  let source = fs.readFileSync(file, 'utf8');
  source = source.replaceAll('z.record(z.any())', 'z.record(z.string(), z.any())').replaceAll('z.record(z.union(', 'z.record(z.string(), z.union(');
  if (source !== fs.readFileSync(file, 'utf8')) fs.writeFileSync(file, source);
  const server = path.join(base, 'dist/server.js');
  const original = 'import { zodToJsonSchema } from "zod-to-json-schema";';
  const replacement = 'import { zodToJsonSchema } from "./dv-zod-json-schema.mjs";';
  const shim = fs.readFileSync(path.join(root, 'scripts/zod-json-schema.mjs'), 'utf8').replace("'../node_modules/@wonderwhy-er/desktop-commander/dist/tools/schemas.js'", "'./tools/schemas.js'");
  fs.writeFileSync(path.join(base, 'dist/dv-zod-json-schema.mjs'), shim);
  source = fs.readFileSync(server, 'utf8');
  if (!source.includes(original) && !source.includes(replacement)) throw new Error('Unexpected upstream schema converter; refusing an unreviewed patch');
  source = source.replace(original, replacement); fs.writeFileSync(server, source);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) prepareUpstream();
