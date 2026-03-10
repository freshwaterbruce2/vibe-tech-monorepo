export const CONFIG = {
  model: process.env.AGENT_MODEL || 'claude-sonnet-4-5-20250929',
  workspaceRoot: process.env.WORKSPACE_ROOT || 'C:\\dev',
  maxTokens: 8192,
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Nx affected across 28 apps can easily exceed 2 min; 5 min default, overridable.
  nxTimeout: parseInt(process.env.NX_TIMEOUT_MS || '300000', 10),
  // Git operations should never need more than 30s locally.
  gitTimeout: parseInt(process.env.GIT_TIMEOUT_MS || '30000', 10),
} as const;

export function validateConfig() {
  if (!CONFIG.apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
    console.error('Set it in your environment or create a .env file from .env.example');
    process.exit(1);
  }
}
