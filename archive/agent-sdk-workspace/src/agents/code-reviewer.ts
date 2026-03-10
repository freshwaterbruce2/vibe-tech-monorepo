import Anthropic from '@anthropic-ai/sdk';
import { CONFIG, validateConfig } from '../config.js';
import { gitChangedFiles, gitDiff } from '../tools/git-tools.js';
import { readFile } from '../tools/file-tools.js';

validateConfig();

const anthropic = new Anthropic({ apiKey: CONFIG.apiKey });

async function reviewCode() {
  const baseBranch = process.argv[2] || 'main';
  console.log(`Code Reviewer Agent - reviewing changes vs ${baseBranch}\n`);

  const changedFiles = gitChangedFiles(baseBranch).filter((f) =>
    f.match(/\.(ts|tsx|js|jsx|py|rs)$/)
  );

  if (changedFiles.length === 0) {
    console.log('No code files changed.');
    return;
  }

  console.log(`Changed files (${changedFiles.length}):`);
  changedFiles.forEach((f) => console.log(`  ${f}`));
  console.log('');

  const fileContents = changedFiles
    .slice(0, 10)
    .map((f) => {
      try {
        const content = readFile(f);
        if (content.length > 30000) return `## ${f}\n(file too large, ${content.length} chars)\n`;
        return `## ${f}\n\`\`\`\n${content}\n\`\`\`\n`;
      } catch {
        return `## ${f}\n(could not read)\n`;
      }
    })
    .join('\n');

  // Scope the diff to only the files we're reviewing. This prevents binary
  // blobs and generated dist output from consuming the budget before the real
  // changes appear. changedFiles is already filtered to code extensions.
  const diff = gitDiff(baseBranch, changedFiles);
  const truncatedDiff =
    diff.length > 50000
      ? diff.slice(0, 50000) + `\n...(truncated — ${diff.length - 50000} chars omitted)`
      : diff;

  const response = await anthropic.messages.create({
    model: CONFIG.model,
    max_tokens: CONFIG.maxTokens,
    messages: [
      {
        role: 'user',
        content: `You are an expert code reviewer for a TypeScript/React Nx monorepo (Windows 11, pnpm).

Review these changed files. Focus on:
1. Bugs and logic errors
2. Security vulnerabilities (OWASP top 10)
3. TypeScript type safety issues
4. React anti-patterns (if applicable)
5. Missing error handling

Be concise. Only flag real issues, not style preferences. Group by severity (critical/warning/info).

## Diff
\`\`\`diff
${truncatedDiff}
\`\`\`

## File Contents
${fileContents}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  console.log('Review Results:\n');
  console.log(text);
  console.log(`\nTokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);
}

reviewCode().catch((err) => {
  console.error('Agent error:', err);
  process.exit(1);
});
