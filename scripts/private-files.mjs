import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const securedDirs = new Set();
export function restrict(file, directory = false) {
  if (directory && securedDirs.has(file)) return;
  if (process.platform !== 'win32') { fs.chmodSync(file, directory ? 0o700 : 0o600); return; }
  const script = `$id=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=New-Object System.Security.AccessControl.${directory ? 'DirectorySecurity' : 'FileSecurity'}; $acl.SetOwner($id); $acl.SetAccessRuleProtection($true,$false); $rule=New-Object System.Security.AccessControl.FileSystemAccessRule($id,'FullControl',${directory ? "'ContainerInherit,ObjectInherit','None'," : ''}'Allow'); $acl.AddAccessRule($rule); Set-Acl -LiteralPath $env:DV_PRIVATE_PATH -AclObject $acl`;
  const p = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, DV_PRIVATE_PATH: file }, encoding: 'utf8', windowsHide: true, timeout: 20000 });
  if (p.status !== 0) {
    // Report enough diagnostic context to identify policy/syntax failures, but
    // never expose the private file path (or its contents) in public CI logs.
    const diagnostic = (p.stderr || p.error?.message || `exit ${p.status}`)
      .replaceAll(file, '<private-path>').trim().slice(0, 600);
    throw new Error(`Could not restrict private Windows ACL: ${diagnostic}`);
  }
  if (directory) securedDirs.add(file);
}
export function privateDir(dir) {
  const stat = fs.lstatSync(dir, { throwIfNoEntry: false });
  if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error('Private directory must be a real directory');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); restrict(dir, true);
}
export function privateWrite(file, text) {
  privateDir(path.dirname(file));
  const stat = fs.lstatSync(file, { throwIfNoEntry: false });
  if (stat && (!stat.isFile() || stat.isSymbolicLink())) throw new Error('Refusing non-regular private file');
  const temp = `${file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temp, text, { mode: 0o600, flag: 'wx' }); restrict(temp);
    if (process.platform !== 'win32' && (fs.statSync(temp).mode & 0o777) !== 0o600) throw new Error('Private permissions cannot be enforced');
    fs.renameSync(temp, file);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
export function readPrivateJSON(file) {
  if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Refusing symlinked private file');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
