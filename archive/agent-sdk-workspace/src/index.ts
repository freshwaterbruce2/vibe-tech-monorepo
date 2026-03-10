const agent = process.argv[2];

const AGENTS: Record<string, string> = {
  'code-reviewer': 'Autonomous code review across changed files',
  'quality-gate': 'Run lint+typecheck+build and analyze failures',
};

if (!agent || agent === 'help' || agent === '--help') {
  console.log('Agent SDK Workspace\n');
  console.log('Usage: pnpm tsx src/agents/<agent>.ts [args]\n');
  console.log('Available agents:');
  for (const [name, desc] of Object.entries(AGENTS)) {
    console.log(`  ${name.padEnd(18)} ${desc}`);
  }
  console.log('\nExamples:');
  console.log('  pnpm tsx src/agents/code-reviewer.ts main');
  console.log('  pnpm tsx src/agents/quality-gate.ts affected');
  console.log('  pnpm tsx src/agents/quality-gate.ts vibe-tutor');
  process.exit(0);
}

console.error(`Unknown agent: ${agent}`);
console.error('Run with --help to see available agents.');
process.exit(1);
