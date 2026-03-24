import { AnthropicProvider } from '../providers/anthropic-provider.js';
import { ExecutionService } from '../services/execution-service.js';
import { gitChangedFiles, gitDiff } from '../tools/git-tools.js';
import { readTextFile } from '../tools/file-tools.js';

export async function runCodeReviewer(baseBranch = 'main'): Promise<void> {
  const changedFiles = gitChangedFiles(baseBranch).filter((file) =>
    /\.(ts|tsx|js|jsx|py|rs)$/.test(file),
  );

  if (changedFiles.length === 0) {
    console.log('No reviewable code changes found.');
    return;
  }

  const diff = gitDiff(baseBranch, changedFiles);
  const fileContents = changedFiles
    .slice(0, 10)
    .map((file) => `## ${file}\n\`\`\`\n${readTextFile(file)}\n\`\`\``)
    .join('\n\n');

  const service = new ExecutionService(new AnthropicProvider());
  const findings = await service.reviewChangedCode(diff, fileContents);

  console.log(`Review findings for ${changedFiles.length} changed file(s):\n`);
  for (const finding of findings) {
    console.log(`[${finding.severity.toUpperCase()}] ${finding.summary}`);
  }
}

if (process.argv[1]?.endsWith('code-reviewer.ts')) {
  runCodeReviewer(process.argv[2]).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
