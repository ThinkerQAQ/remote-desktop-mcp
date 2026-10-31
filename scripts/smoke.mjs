import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { root } from './config.mjs';
import path from 'node:path';

const client = new Client({ name: 'dv-readonly-smoke', version: '0.1.0' });
try {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, 'scripts/proxy.mjs')], stderr: 'ignore' }));
  const { tools } = await client.listTools();
  if (!tools.some(t => t.name === 'list_sessions')) throw new Error('Expected tool missing');
  // Read-only call; never print local process/session data.
  const result = await client.callTool({ name: 'list_sessions', arguments: {} });
  if (result.isError) throw new Error('Read-only tool returned an error');
  console.log(JSON.stringify({ initialized: true, tools_discovered: tools.length, readonly_tool_succeeded: true }));
} catch { console.error('MCP smoke failed'); process.exitCode = 1; }
finally { await client.close(); }
