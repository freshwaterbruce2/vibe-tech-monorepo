import Anthropic from '@anthropic-ai/sdk';
import { CONFIG, validateConfig } from '../config.js';
import { nxAffected, nxRunTarget } from '../tools/nx-tools.js';

validateConfig();

const anthropic = new Anthropic({ apiKey: CONFIG.apiKey });

interface CheckResult {
  name: string;
  passed: boolean;
  output: string;
  duration: number;
}

function runCheck(name: string, fn: () => string): CheckResult {
  const start = Date.now();
  try {
    const output = fn();
    return { name, passed: true, output: output.slice(0, 5000), duration: Date.now() - start };
  } catch (err) {
    const error = err as { stderr?: string; stdout?: string; killed?: boolean };
    let output: string;
    if (error.killed) {
      const partial = (error.stdout || error.stderr || '').slice(0, 2000);
      output = `TIMEOUT: '${name}' exceeded ${CONFIG.nxTimeout / 1000}s limit.\n${partial ? `Partial output:\n${partial}` : 'No partial output captured.'}`;
    } else {
      output = (error.stderr || error.stdout || 'Unknown error').slice(0, 5000);
    }
    return { name, passed: false, output, duration: Date.now() - start };
  }
}

async function qualityGate() {
  const target = process.argv[2] || 'affected';
  console.log(`Quality Gate Agent - running checks (${target})\n`);

  const checks: CheckResult[] = [];

  console.log('Running lint...');
  checks.push(
    runCheck('lint', () => (target === 'affected' ? nxAffected('lint') : nxRunTarget(target, 'lint')))
  );

  console.log('Running typecheck...');
  checks.push(
    runCheck('typecheck', () =>
      target === 'affected' ? nxAffected('typecheck') : nxRunTarget(target, 'typecheck')
    )
  );

  console.log('Running build...');
  checks.push(
    runCheck('build', () =>
      target === 'affected' ? nxAffected('build') : nxRunTarget(target, 'build')
    )
  );

  const allPassed = checks.every((c) => c.passed);

  console.log('\n--- Results ---');
  for (const check of checks) {
    const icon = check.passed ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${check.name} (${check.duration}ms)`);
  }

  if (allPassed) {
    console.log('\nAll checks passed.');
    return;
  }

  console.log('\nSome checks failed. Analyzing errors...\n');

  const failedChecks = checks
    .filter((c) => !c.passed)
    .map((c) => `## ${c.name}\n\`\`\`\n${c.output}\n\`\`\``)
    .join('\n\n');

  const response = await anthropic.messages.create({
    model: CONFIG.model,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a quality gate analyst for a TypeScript/React Nx monorepo on Windows 11.

These quality checks failed. Analyze each failure and provide:
1. Root cause (1 sentence)
2. Fix (specific command or code change)
3. Priority (critical/medium/low)

${failedChecks}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  console.log(text);
}

qualityGate().catch((err) => {
  console.error('Agent error:', err);
  process.exit(1);
});
