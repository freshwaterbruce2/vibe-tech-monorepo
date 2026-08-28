import fs from 'node:fs';
import path from 'node:path';

const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

// Regex to catch hardcoded V: drive, V:\monorepo references, or deprecated paths
const VIOLATION_REGEXES = [
  {
    pattern: /v:(\\|\/)(monorepo)?/i,
    label: 'Hardcoded V: drive path reference',
  },
  {
    pattern: /d:(\\|\/)learning(?!-system)/i,
    label: 'Deprecated D:\\learning path reference',
  },
  {
    pattern: /v:(\\|\/)monorepo(\\|\/)(data|logs|databases)/i,
    label: 'Deprecated V:\\monorepo sub-path reference',
  },
];

let hasErrors = false;

for (const file of files) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const stat = fs.statSync(file);
  if (!stat.isFile()) {
    continue;
  }

  // Skip lockfiles, images, and MCP config files
  const ext = path.extname(file).toLowerCase();
  const basename = path.basename(file).toLowerCase();
  // The canonical MCP registry intentionally contains absolute local paths
  // (V:/monorepo, D:/databases, etc.) so the sync tool can render working
  // per-tool configs. Skip it rather than flagging intentional path literals.
  // WORKSPACE.json is workspace metadata whose projectPaths (e.g.
  // "apps": "V:/monorepo/apps") and action-history prose intentionally
  // reference the workspace root — same rationale as registry.json.
  if (
    ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz'].includes(ext) ||
    basename === '.mcp.json' ||
    basename === 'check-staged-paths.js' ||
    basename === 'registry.json' ||
    basename === 'workspace.json'
  ) {
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    // Allow escaping with an ignore comment
    if (line.includes('path-segregation-ignore')) {
      return;
    }

    for (const rule of VIOLATION_REGEXES) {
      if (rule.pattern.test(line)) {
        console.error(`\x1b[31m[PathSegregationError]\x1b[0m ${file}:${index + 1}: ${rule.label}`);
        console.error(`  > ${line.trim()}`);
        hasErrors = true;
      }
    }
  });
}

if (hasErrors) {
  console.error(
    '\x1b[31mPath segregation regex validation failed. Fix references before committing.\x1b[0m',
  );
  process.exit(1);
} else {
  console.log('\x1b[32mPath segregation regex check passed.\x1b[0m');
  process.exit(0);
}
