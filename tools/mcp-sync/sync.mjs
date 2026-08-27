#!/usr/bin/env node
/**
 * mcp-sync — render the canonical MCP registry into every agent tool's native
 * config (Claude Code, Gemini CLI, Antigravity, Codex, Cursor, Hermes).
 *
 * Source of truth: mcp/registry.json. Edit servers THERE, then run this.
 *
 *   pnpm mcp:sync            # dry-run: show what WOULD change (no writes)
 *   pnpm mcp:sync --apply    # write all tool configs (backs up each first)
 *   pnpm mcp:check           # exit 1 if any tool is out of sync (CI gate)
 *   node tools/mcp-sync/sync.mjs --apply --tool gemini,codex
 *
 * Secrets: the registry references env-var NAMES only; this emits each tool's
 * native env-ref syntax and NEVER writes literal key values.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const REGISTRY = resolve(REPO, 'mcp', 'registry.json');
const BACKUP_DIR = 'D:/backups/mcp-sync';

// Windows command resolution — reproduces the working .mcp.json invocation forms
// so every tool gets a command that actually launches on this machine.
const NODE_BIN =
  process.env.MCP_NODE_BIN ||
  'C:/Users/fresh_zxae3v6/AppData/Roaming/fnm/aliases/default/node.exe';
const NPX_BIN =
  process.env.MCP_NPX_BIN ||
  'C:/Users/fresh_zxae3v6/AppData/Roaming/fnm/aliases/default/npx.cmd';
const UV_BIN = process.env.MCP_UV_BIN || 'C:/Users/fresh_zxae3v6/.local/bin/uv.exe';
const UVX_BIN = process.env.MCP_UVX_BIN || 'C:/Users/fresh_zxae3v6/.local/bin/uvx.exe';
const POWERSHELL_BIN =
  process.env.MCP_POWERSHELL_BIN ||
  'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';

function resolveStdio(command, args = []) {
  switch (command) {
    case 'node':
      return { command: NODE_BIN, args };
    case 'uvx':
      return { command: UVX_BIN, args };
    case 'uv':
      return { command: UV_BIN, args };
    case 'npx':
      return { command: 'cmd', args: ['/c', NPX_BIN, ...args] };
    case 'powershell':
      return { command: POWERSHELL_BIN, args };
    default:
      return { command, args };
  }
}

function expandHome(p) {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

function loadRegistry() {
  const reg = JSON.parse(readFileSync(REGISTRY, 'utf-8'));
  return reg;
}

function serversFor(reg, toolKey) {
  const out = {};
  for (const [name, def] of Object.entries(reg.servers)) {
    const enabledFor = def.enabledFor || reg.defaultEnabledFor;
    if (enabledFor.includes(toolKey)) out[name] = def;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Emitters (one per native format). Each returns the full file CONTENT string.
// ---------------------------------------------------------------------------

function claudeServerObject(def) {
  let obj;
  if (def.transport === 'http') {
    const headers = def.secretEnv
      ? { Authorization: `Bearer \${${def.secretEnv}}` }
      : def.headers || {};
    obj = { type: 'http', url: def.url, headers };
  } else {
    const { command, args } = resolveStdio(def.command, def.args);
    obj = { type: 'stdio', command, args };
    if (def.env) obj.env = def.env;
  }
  // Claude-specific passthrough (e.g. alwaysLoad) preserved verbatim.
  if (def.claude) Object.assign(obj, def.claude);
  return obj;
}

function emitClaude(servers) {
  const mcpServers = {};
  for (const [name, def] of Object.entries(servers)) mcpServers[name] = claudeServerObject(def);
  return JSON.stringify({ mcpServers }, null, 2) + '\n';
}

function geminiServerObject(def) {
  if (def.transport === 'http') {
    const headers = def.secretEnv
      ? { Authorization: `Bearer $${def.secretEnv}` }
      : def.headers || {};
    return { httpUrl: def.url, headers };
  }
  const { command, args } = resolveStdio(def.command, def.args);
  const obj = { command, args };
  if (def.env) obj.env = def.env;
  return obj;
}

// Gemini + Antigravity: surgical merge — keep every existing setting, replace
// only the mcpServers block.
function emitGeminiJson(servers, existingText) {
  const base = existingText ? JSON.parse(existingText) : {};
  const mcpServers = {};
  for (const [name, def] of Object.entries(servers)) mcpServers[name] = geminiServerObject(def);
  base.mcpServers = mcpServers;
  return JSON.stringify(base, null, 2) + '\n';
}

function emitCursor(servers, existingText) {
  const base = existingText && existingText.trim() ? JSON.parse(existingText) : {};
  const mcpServers = {};
  for (const [name, def] of Object.entries(servers)) {
    if (def.transport === 'http') {
      mcpServers[name] = def.secretEnv
        ? { url: def.url, headers: { Authorization: `Bearer $${def.secretEnv}` } }
        : { url: def.url };
    } else {
      const { command, args } = resolveStdio(def.command, def.args);
      mcpServers[name] = def.env ? { command, args, env: def.env } : { command, args };
    }
  }
  base.mcpServers = mcpServers;
  return JSON.stringify(base, null, 2) + '\n';
}

// ---- TOML (Codex) ----------------------------------------------------------

function tomlStr(v) {
  return `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
function tomlArr(a) {
  return `[${a.map(tomlStr).join(', ')}]`;
}

function emitCodexServers(servers) {
  const lines = [];
  for (const [name, def] of Object.entries(servers)) {
    lines.push(`[mcp_servers.${name}]`);
    if (def.transport === 'http') {
      lines.push(`url = ${tomlStr(def.url)}`);
      if (def.secretEnv) lines.push(`bearer_token_env_var = ${tomlStr(def.secretEnv)}`);
    } else {
      const { command, args } = resolveStdio(def.command, def.args);
      lines.push(`command = ${tomlStr(command)}`);
      if (args.length) lines.push(`args = ${tomlArr(args)}`);
      if (def.env && Object.keys(def.env).length) {
        lines.push(`\n[mcp_servers.${name}.env]`);
        for (const [k, val] of Object.entries(def.env)) lines.push(`${k} = ${tomlStr(val)}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

// Surgical: drop existing [mcp_servers...] tables, keep all other TOML, append fresh.
function emitCodexToml(servers, existingText) {
  const kept = [];
  const lines = (existingText || '').split(/\r?\n/);
  let skipping = false;
  for (const line of lines) {
    if (/^\s*\[mcp_servers[.\]]/.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && /^\s*\[/.test(line) && !/^\s*\[mcp_servers[.\]]/.test(line)) skipping = false;
    if (!skipping) kept.push(line);
  }
  const head = kept.join('\n').replace(/\n+$/, '');
  const block = emitCodexServers(servers).replace(/\n+$/, '');
  return (head ? head + '\n\n' : '') + block + '\n';
}

// ---- YAML (Hermes) ---------------------------------------------------------

function yamlStr(v) {
  const s = String(v);
  // Quote anything with YAML-significant chars (backslashes, colons, etc.).
  if (/[:#\\{}\[\],&*?|<>=!%@`"']/.test(s) || s === '' || /^\s|\s$/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

function emitHermesServers(servers) {
  const lines = ['mcp_servers:'];
  for (const [name, def] of Object.entries(servers)) {
    lines.push(`  ${name}:`);
    lines.push(`    enabled: true`);
    if (def.transport === 'http') {
      lines.push(`    url: ${yamlStr(def.url)}`);
    } else {
      const { command, args } = resolveStdio(def.command, def.args);
      lines.push(`    command: ${yamlStr(command)}`);
      lines.push(`    args:`);
      for (const a of args) lines.push(`    - ${yamlStr(a)}`);
      if (def.env && Object.keys(def.env).length) {
        lines.push(`    env:`);
        for (const [k, val] of Object.entries(def.env)) lines.push(`      ${k}: ${yamlStr(val)}`);
      }
    }
  }
  return lines.join('\n');
}

// Surgical: the existing config has `mcp_servers:` as the LAST top-level key.
// Replace from that line to EOF; if absent, append.
function emitHermesYaml(servers, existingText) {
  const text = existingText || '';
  const idx = text.search(/^mcp_servers:/m);
  const head = idx >= 0 ? text.slice(0, idx).replace(/\n+$/, '') : text.replace(/\n+$/, '');
  return head + '\n' + emitHermesServers(servers) + '\n';
}

// ---------------------------------------------------------------------------

function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

function render(reg, toolKey, format, targetPath) {
  const servers = serversFor(reg, toolKey);
  const existing = readIfExists(targetPath);
  switch (format) {
    case 'claude-json':
      return emitClaude(servers);
    case 'gemini-json':
      return emitGeminiJson(servers, existing);
    case 'cursor-json':
      return emitCursor(servers, existing);
    case 'codex-toml':
      return emitCodexToml(servers, existing);
    case 'hermes-yaml':
      return emitHermesYaml(servers, existing);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

function backup(targetPath, stamp) {
  if (!existsSync(targetPath)) return null;
  mkdirSync(BACKUP_DIR, { recursive: true });
  const base = targetPath.replace(/[:/\\]/g, '_');
  const dest = join(BACKUP_DIR, `${base}.${stamp}.bak`);
  copyFileSync(targetPath, dest);
  return dest;
}

function parseArgs(argv) {
  const opts = { apply: false, check: false, tools: null };
  for (const a of argv) {
    if (a === '--apply') opts.apply = true;
    else if (a === '--check') opts.check = true;
    else if (a.startsWith('--out-dir')) {
      opts.outDir = a.includes('=') ? a.split('=')[1] : process.argv.slice(2)[process.argv.slice(2).indexOf(a) + 1];
    } else if (a.startsWith('--tool')) {
      const v = a.includes('=') ? a.split('=')[1] : argv[argv.indexOf(a) + 1];
      opts.tools = v ? v.split(',').map((s) => s.trim()) : null;
    }
  }
  return opts;
}

// Sync a single tool. Returns { drift, wrote } counts (0/1 each).
function syncOne(reg, toolKey, opts, stamp) {
  const { target, format } = reg.tools[toolKey];
  const targetPath = expandHome(target);
  const next = render(reg, toolKey, format, targetPath);
  const count = Object.keys(serversFor(reg, toolKey)).length;
  const label = toolKey.padEnd(12);

  if (opts.outDir) {
    mkdirSync(opts.outDir, { recursive: true });
    const ext = format.includes('toml') ? 'toml' : format.includes('yaml') ? 'yaml' : 'json';
    const p = join(opts.outDir, `${toolKey}.${ext}`);
    writeFileSync(p, next, 'utf-8');
    console.log(`  > ${label} rendered (${count} servers) -> ${p}`);
    return { drift: 0, wrote: 0 };
  }

  const current = readIfExists(targetPath);
  if (current.replace(/\r\n/g, '\n') === next.replace(/\r\n/g, '\n')) {
    console.log(`  = ${label} up to date (${count} servers)  ${targetPath}`);
    return { drift: 0, wrote: 0 };
  }
  if (opts.check) {
    console.log(`  ! ${label} OUT OF SYNC (${count} servers)  ${targetPath}`);
    return { drift: 1, wrote: 0 };
  }
  if (opts.apply) {
    const bak = backup(targetPath, stamp);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, next, 'utf-8');
    console.log(`  + ${label} WROTE (${count} servers)  ${targetPath}`);
    if (bak) console.log(`      backup: ${bak}`);
    return { drift: 1, wrote: 1 };
  }
  console.log(`  ~ ${label} would update (${count} servers)  ${targetPath}`);
  console.log(next.split('\n').map((l) => `        | ${l}`).join('\n').slice(0, 1600));
  return { drift: 1, wrote: 0 };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const reg = loadRegistry();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let drift = 0;
  let wrote = 0;

  const toolKeys = Object.keys(reg.tools).filter((k) => !opts.tools || opts.tools.includes(k));
  for (const toolKey of toolKeys) {
    const r = syncOne(reg, toolKey, opts, stamp);
    drift += r.drift;
    wrote += r.wrote;
  }

  console.log('');
  if (opts.check) {
    if (drift > 0) {
      console.log(`mcp-sync: ${drift} tool(s) out of sync. Run \`pnpm mcp:sync --apply\`.`);
      process.exit(1);
    }
    console.log('mcp-sync: all tools in sync.');
    return;
  }
  if (opts.apply) console.log(`mcp-sync: wrote ${wrote} tool config(s). Restart the tools to load.`);
  else console.log(`mcp-sync: DRY-RUN — ${drift} tool(s) would change. Re-run with --apply to write.`);
}

main();
