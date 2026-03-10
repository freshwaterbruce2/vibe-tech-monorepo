// Runs before every test file in every fork.
// Sets the env vars that config.ts reads at module evaluation time,
// so validateConfig() never reaches process.exit(1) during tests.
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.WORKSPACE_ROOT = 'C:\\dev';
process.env.NX_TIMEOUT_MS = '300000';
process.env.GIT_TIMEOUT_MS = '30000';
