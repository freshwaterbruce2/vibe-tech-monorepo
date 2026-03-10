import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
  console.error('Set it in your environment or create a .env file from .env.example');
  process.exit(1);
}

export const anthropic = new Anthropic({ apiKey });

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';