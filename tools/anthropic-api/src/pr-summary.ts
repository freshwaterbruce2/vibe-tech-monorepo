import { execSync } from 'child_process';
import { anthropic, MODEL } from './client.js';

async function generatePRSummary() {
  const args = process.argv.slice(2);
  const baseBranch = args[0] || 'main';

  console.log(`Generating PR summary for changes vs ${baseBranch}...\n`);

  let diff: string;
  let log: string;
  try {
    diff = execSync(`git diff ${baseBranch}...HEAD`, {
      cwd: 'C:\\dev',
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 10,
    });
    log = execSync(`git log ${baseBranch}..HEAD --oneline`, {
      cwd: 'C:\\dev',
      encoding: 'utf-8',
    });
  } catch {
    console.error('Failed to get git diff/log.');
    process.exit(1);
  }

  if (!diff.trim()) {
    console.log('No changes found.');
    process.exit(0);
  }

  const truncatedDiff =
    diff.length > 100000 ? diff.slice(0, 100000) + '\n...(truncated)' : diff;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Generate a pull request title and description for these changes.

## Commits
${log}

## Diff
\`\`\`diff
${truncatedDiff}
\`\`\`

Output format:
## Title
<short title under 70 chars>

## Summary
<2-4 bullet points explaining what changed and why>

## Test plan
<bullet list of what to test>`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  console.log(text);
  console.log(`\n---\nTokens used: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out`);
}

generatePRSummary();