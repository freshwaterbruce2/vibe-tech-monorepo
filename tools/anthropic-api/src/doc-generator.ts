import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { anthropic, MODEL } from './client.js';

function collectFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (
        entry === 'node_modules' ||
        entry === 'dist' ||
        entry === '.nx' ||
        entry === 'coverage' ||
        entry.startsWith('.')
      ) {
        continue;
      }
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...collectFiles(fullPath, extensions));
      } else if (extensions.some((ext) => entry.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return files;
}

async function generateDocs() {
  const projectPath = process.argv[2];
  if (!projectPath) {
    console.error('Usage: pnpm tsx src/doc-generator.ts <project-path>');
    console.error('Example: pnpm tsx src/doc-generator.ts apps/nova-agent');
    process.exit(1);
  }

  const fullPath = join('C:\\dev', projectPath);
  console.log(`Scanning ${fullPath} for undocumented files...\n`);

  const files = collectFiles(fullPath, ['.ts', '.tsx']).filter(
    (f) => !f.includes('.test.') && !f.includes('.spec.') && !f.includes('__tests__')
  );

  if (files.length === 0) {
    console.log('No TypeScript files found.');
    process.exit(0);
  }

  const undocumented: { path: string; content: string }[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const hasJsdoc = content.includes('/**');
    const hasExports =
      content.includes('export ') || content.includes('module.exports');
    if (hasExports && !hasJsdoc && content.length < 30000) {
      undocumented.push({ path: relative('C:\\dev', file), content });
    }
  }

  if (undocumented.length === 0) {
    console.log('All exported files have JSDoc comments.');
    process.exit(0);
  }

  console.log(
    `Found ${undocumented.length} undocumented files. Generating docs for up to 5...\n`
  );

  const batch = undocumented.slice(0, 5);
  for (const file of batch) {
    console.log(`--- ${file.path} ---`);
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Add JSDoc comments to the exported functions/classes/types in this file. Only output the JSDoc comments with the function/class signatures they belong to (not the full file). Be concise.\n\nFile: ${file.path}\n\`\`\`typescript\n${file.content}\n\`\`\``,
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => ('text' in b ? b.text : ''))
      .join('');
    console.log(text);
    console.log('');
  }

  if (undocumented.length > 5) {
    console.log(
      `\n${undocumented.length - 5} more undocumented files remaining.`
    );
  }
}

generateDocs();