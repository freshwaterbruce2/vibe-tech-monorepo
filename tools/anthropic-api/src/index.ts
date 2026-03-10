const command = process.argv[2];

const COMMANDS: Record<string, string> = {
  'batch-review': 'Submit changed files for async batch review (50% cheaper)',
  'pr-summary': 'Generate PR title and description from current branch diff',
  'doc-generator': 'Generate JSDoc docs for undocumented files in a project',
};

if (!command || command === 'help' || command === '--help') {
  console.log('Anthropic API Tools\n');
  console.log('Usage: pnpm tsx src/<command>.ts [args]\n');
  console.log('Available commands:');
  for (const [name, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(16)} ${desc}`);
  }
  console.log('\nExamples:');
  console.log('  pnpm tsx src/batch-review.ts          # Review all changed files');
  console.log('  pnpm tsx src/pr-summary.ts main        # PR summary vs main');
  console.log('  pnpm tsx src/doc-generator.ts apps/nova-agent  # Generate docs');
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
console.error('Run with --help to see available commands.');
process.exit(1);