import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { anthropic, MODEL } from './client.js';

async function batchReview() {
  const args = process.argv.slice(2);
  const baseBranch = args[0] || 'main';

  console.log(`Collecting changed files vs ${baseBranch}...`);

  let changedFiles: string[];
  try {
    const diff = execSync(`git diff --name-only ${baseBranch}`, {
      cwd: 'C:\\dev',
      encoding: 'utf-8',
    });
    changedFiles = diff
      .trim()
      .split('\n')
      .filter((f) => f.match(/\.(ts|tsx|js|jsx|py|rs)$/));
  } catch {
    console.error('Failed to get git diff. Are you in a git repository?');
    process.exit(1);
  }

  if (changedFiles.length === 0) {
    console.log('No code files changed.');
    process.exit(0);
  }

  console.log(`Found ${changedFiles.length} changed code files.`);

  const requests = changedFiles.map((file, i) => {
    let content: string;
    try {
      content = readFileSync(`C:\\dev\\${file}`, 'utf-8');
    } catch {
      return null;
    }

    if (content.length > 50000) {
      console.log(`  Skipping ${file} (too large: ${content.length} chars)`);
      return null;
    }

    return {
      custom_id: `review-${i}-${file.replace(/[/\\]/g, '_')}`,
      params: {
        model: MODEL,
        max_tokens: 2048,
        messages: [
          {
            role: 'user' as const,
            content: `Review this code file for bugs, security issues, and improvements. Be concise - only flag real issues, not style preferences.\n\nFile: ${file}\n\`\`\`\n${content}\n\`\`\``,
          },
        ],
      },
    };
  });

  const validRequests = requests.filter(Boolean) as NonNullable<
    (typeof requests)[number]
  >[];

  if (validRequests.length === 0) {
    console.log('No files to review after filtering.');
    process.exit(0);
  }

  console.log(`Submitting ${validRequests.length} files for batch review...`);
  console.log('(Batch API runs at 50% cost, results arrive async)\n');

  try {
    const batch = await anthropic.messages.batches.create({
      requests: validRequests,
    });

    console.log(`Batch created: ${batch.id}`);
    console.log(`Status: ${batch.processing_status}`);
    console.log(`\nCheck results with:`);
    console.log(
      `  pnpm tsx src/batch-review.ts --status ${batch.id}`
    );
  } catch (error) {
    console.error('Batch creation failed:', error);
    process.exit(1);
  }
}

async function checkStatus(batchId: string) {
  const batch = await anthropic.messages.batches.retrieve(batchId);
  console.log(`Batch: ${batch.id}`);
  console.log(`Status: ${batch.processing_status}`);
  console.log(
    `Counts: ${batch.request_counts.succeeded} succeeded, ${batch.request_counts.errored} errored, ${batch.request_counts.processing} processing`
  );

  if (batch.processing_status === 'ended') {
    console.log('\nResults:');
    const results = await anthropic.messages.batches.results(batchId);
    for await (const result of results) {
      const fileId = result.custom_id.replace(/^review-\d+-/, '').replace(/_/g, '/');
      if (result.result.type === 'succeeded') {
        const text = result.result.message.content
          .filter((b: { type: string }) => b.type === 'text')
          .map((b: { type: string; text?: string }) => b.text ?? '')
          .join('');
        console.log(`\n--- ${fileId} ---`);
        console.log(text);
      } else {
        console.log(`\n--- ${fileId} --- ERROR`);
        console.log(JSON.stringify(result.result, null, 2));
      }
    }
  }
}

const statusIdx = process.argv.indexOf('--status');
if (statusIdx !== -1 && process.argv[statusIdx + 1]) {
  checkStatus(process.argv[statusIdx + 1]);
} else {
  batchReview();
}