/**
 * Programmatic Nx Release Script
 *
 * Handles versioning and publishing for the Vibe-Tech monorepo
 * without Git dependency (ADR-002, ADR-006 compliant).
 *
 * Usage:
 *   npx tsx scripts/release.ts                    # Interactive version bump
 *   npx tsx scripts/release.ts --dry-run          # Preview changes only
 *   npx tsx scripts/release.ts --first-release    # First release baseline
 *   npx tsx scripts/release.ts --specifier=patch  # Non-interactive bump
 */

import { releasePublish, releaseVersion } from 'nx/release';

interface ReleaseOptions {
  dryRun: boolean;
  firstRelease: boolean;
  specifier?: string;
  verbose: boolean;
}

function parseArgs(): ReleaseOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    firstRelease: args.includes('--first-release'),
    specifier: args.find((a) => a.startsWith('--specifier='))?.split('=')[1],
    verbose: args.includes('--verbose'),
  };
}

async function main() {
  const options = parseArgs();

  console.log('\n🚀 Vibe-Tech Release Pipeline');
  console.log('─'.repeat(40));
  console.log(`  Mode:          ${options.dryRun ? '🔍 DRY RUN' : '🔥 LIVE'}`);
  console.log(`  First Release: ${options.firstRelease ? 'Yes' : 'No'}`);
  console.log(`  Specifier:     ${options.specifier ?? 'prompt (interactive)'}`);
  console.log('─'.repeat(40));
  console.log('');

  // Step 1: Version bump
  console.log('📦 Step 1/2: Versioning packages...\n');

  const versionResult = await releaseVersion({
    dryRun: options.dryRun,
    verbose: options.verbose,
    firstRelease: options.firstRelease,
    gitCommit: false,
    gitTag: false,
    specifier: options.specifier,
  });

  // Summarize version changes
  const changed = Object.entries(versionResult.projectsVersionData)
    .filter(([, data]) => data.newVersion !== null)
    .map(([name, data]) => `  ${name}: ${data.currentVersion} → ${data.newVersion}`);

  if (changed.length === 0) {
    console.log('\n✅ No version changes detected. Nothing to publish.');
    process.exit(0);
  }

  console.log('\n📋 Version Changes:');
  changed.forEach((line) => console.log(line));

  // Step 2: Publish
  console.log('\n📤 Step 2/2: Publishing packages...\n');

  const publishResult = await releasePublish({
    dryRun: options.dryRun,
    verbose: options.verbose,
  });

  console.log('\n' + '─'.repeat(40));
  if (options.dryRun) {
    console.log('🔍 DRY RUN complete — no actual changes made.');
  } else {
    console.log('✅ Release complete!');
  }
  console.log(`   Packages updated: ${changed.length}`);

  // Exit with success
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Release failed:', err.message);
  process.exit(1);
});
