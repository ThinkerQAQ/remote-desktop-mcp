import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function privateDir(dir) {
  if (fs.existsSync(dir) && (!fs.lstatSync(dir).isDirectory() || fs.lstatSync(dir).isSymbolicLink())) throw new Error('Private directory must be a real directory');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
}
export function privateWrite(file, text) {
  privateDir(path.dirname(file));
  if (fs.existsSync(file) && (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink())) throw new Error('Refusing non-regular private file');
  const temp = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temp, text, { mode: 0o600, flag: 'wx' });
    fs.chmodSync(temp, 0o600);
    if (process.platform !== 'win32' && (fs.statSync(temp).mode & 0o777) !== 0o600) throw new Error('Private permissions cannot be enforced; move checkout to a Linux filesystem');
    fs.renameSync(temp, file);
  }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
export function readPrivateJSON(file) {
  if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Refusing symlinked private file');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
