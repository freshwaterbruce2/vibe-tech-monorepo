import fs from 'fs';

// 1. Update OpenRouterService.ts
const orPath = 'C:/dev/apps/vibe-code-studio/src/services/ai/providers/OpenRouterService.ts';
let orCode = fs.readFileSync(orPath, 'utf-8');

// We are injecting new 2026 models into the map
// Let's add them near the top of their respective sections via simple string replacements.

orCode = orCode.replace(
  /'gpt-5\.2-codex': 'openai\/gpt-5\.2-codex',/g,
  "'gpt-5.3-codex': 'openai/gpt-5.3-codex',\n      'gpt-5.3-codex-spark': 'openai/gpt-5.3-codex-spark',\n      'gpt-5.2-codex': 'openai/gpt-5.2-codex',"
);

orCode = orCode.replace(
  /'claude-4\.5-opus': 'anthropic\/claude-opus-4\.5',/g,
  "'claude-4.6-opus': 'anthropic/claude-opus-4.6',\n      'claude-4.5-opus': 'anthropic/claude-opus-4.5',"
);

orCode = orCode.replace(
  /'claude-4\.5-sonnet': 'anthropic\/claude-sonnet-4\.5',/g,
  "'claude-4.6-sonnet': 'anthropic/claude-sonnet-4.6',\n      'claude-4.5-sonnet': 'anthropic/claude-sonnet-4.5',"
);

orCode = orCode.replace(
  /'gemini-3-flash': 'google\/gemini-3-flash-preview',/g,
  "'gemini-3.1-pro': 'google/gemini-3.1-pro',\n      'gemini-3-flash': 'google/gemini-3-flash-preview',"
);

fs.writeFileSync(orPath, orCode);
console.log("Updated OpenRouterService.ts");

// 2. Update AIProviderInterface.ts
const intPath = 'C:/dev/apps/vibe-code-studio/src/services/ai/AIProviderInterface.ts';
let intCode = fs.readFileSync(intPath, 'utf-8');

// Using regex to replace the specific objects with the requested new models.
intCode = intCode.replace(
  /\{\s*id:\s*'openai\/gpt-5\.2-codex',\s*name:\s*'GPT-5\.2 Codex'(?:.|\n)*?\},/g,
  \`{
    id: 'openai/gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: AIProvider.OPENROUTER,
    contextWindow: 200000,
    maxOutput: 32768,
    costPerMillionInput: 2.00,
    costPerMillionOutput: 8.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.CODE_COMPLETION, ModelCapability.MULTI_FILE_EDIT],
    recommended: true,
  },
  {
    id: 'openai/gpt-5.3-codex-spark',
    name: 'GPT-5.3 Codex Spark',
    provider: AIProvider.OPENROUTER,
    contextWindow: 128000,
    maxOutput: 16384,
    costPerMillionInput: 0.50,
    costPerMillionOutput: 2.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.CODE_COMPLETION, ModelCapability.MULTI_FILE_EDIT],
    recommended: true,
  },\`
);

intCode = intCode.replace(
  /\{\s*id:\s*'anthropic\/claude-sonnet-4\.5',\s*name:\s*'Claude 4\.5 Sonnet \(Best for Coding\)'(?:.|\n)*?\},/g,
  \`{
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude 4.6 Sonnet (Best for Coding)',
    provider: AIProvider.OPENROUTER,
    contextWindow: 250000,
    maxOutput: 16384,
    costPerMillionInput: 3.00,
    costPerMillionOutput: 15.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.CODE_COMPLETION, ModelCapability.MULTI_FILE_EDIT],
    recommended: true,
  },\`
);

intCode = intCode.replace(
  /\{\s*id:\s*'google\/gemini-2\.5-pro',\s*name:\s*'Gemini 2\.5 Pro'(?:.|\n)*?\},/g,
  \`{
    id: 'google/gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: AIProvider.OPENROUTER,
    contextWindow: 2000000,
    maxOutput: 8192,
    costPerMillionInput: 1.25,
    costPerMillionOutput: 5.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION, ModelCapability.EXTENDED_THINKING],
    recommended: true,
  },\`
);

intCode = intCode.replace(
  /\{\s*id:\s*'anthropic\/claude-opus-4\.5',\s*name:\s*'Claude 4\.5 Opus'(?:.|\n)*?\},/g,
  \`{
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude 4.6 Opus',
    provider: AIProvider.OPENROUTER,
    contextWindow: 250000,
    maxOutput: 8192,
    costPerMillionInput: 15.00,
    costPerMillionOutput: 75.00,
    capabilities: [ModelCapability.CHAT, ModelCapability.CODE_GENERATION, ModelCapability.VISION],
    recommended: true,
  },\`
);

fs.writeFileSync(intPath, intCode);
console.log("Updated AIProviderInterface.ts");
