// Verification script for OpenRouter model mappings
// Run with: node verify-model-mappings.mjs

import { OpenRouterService } from '../src/services/ai/providers/OpenRouterService.ts';

// Create service instance
const service = new OpenRouterService();

// Test cases: [input, expected output]
const testCases = [
  // DeepSeek models
  ['deepseek-r1', 'deepseek/deepseek-r1'],
  ['deepseek-reasoner', 'deepseek/deepseek-r1'],  // Legacy alias should work
  ['deepseek-chat', 'deepseek/deepseek-v3'],
  ['deepseek-v3.2-speciale', 'deepseek/deepseek-v3.2-speciale'],
  
  // OpenAI GPT-5 models (2026)
  ['gpt-5.2-pro', 'openai/gpt-5.2-pro'],
  ['gpt-5.2-chat', 'openai/gpt-5.2-chat'],
  ['gpt-5.1-codex-max', 'openai/gpt-5.1-codex-max'],
  
  // OpenAI legacy models
  ['gpt-4o', 'openai/gpt-4o'],
  ['gpt-4o-mini', 'openai/gpt-4o-mini'],
  ['o1-mini', 'openai/o1-mini'],
  ['o1-preview', 'openai/o1-preview'],
  
  // Anthropic Claude
  ['claude-3-5-sonnet', 'anthropic/claude-3.5-sonnet'],
  ['claude-3-opus', 'anthropic/claude-3-opus'],
  ['claude-3-haiku', 'anthropic/claude-3-haiku'],
  
  // Google Gemini 3 (2026)
  ['gemini-3-flash', 'google/gemini-3-flash-preview'],
  ['gemini-3-pro', 'google/gemini-3-pro-preview'],
  ['gemini-2.5-pro', 'google/gemini-2.5-pro'],
  
  // Google Gemini legacy
  ['gemini-2.0-flash-exp', 'google/gemini-2.0-flash-exp:free'],
  ['gemini-1.5-pro', 'google/gemini-pro-1.5'],
  ['gemini-1.5-flash', 'google/gemini-flash-1.5'],
  
  // xAI Grok 4 (2026)
  ['grok-4.1-fast', 'x-ai/grok-4.1-fast'],
  ['grok-4.1', 'x-ai/grok-4.1-fast'],  // Alias
  ['grok-4', 'x-ai/grok-4'],
  ['grok', 'x-ai/grok-4.1-fast'],      // Default to latest
  ['grok-fast', 'x-ai/grok-4.1-fast'], // Legacy alias
  ['grok-beta', 'x-ai/grok-beta'],
  
  // Pass-through (already valid OpenRouter IDs)
  ['openai/gpt-4-turbo', 'openai/gpt-4-turbo'],
  ['anthropic/claude-3-opus-20240229', 'anthropic/claude-3-opus-20240229'],
  
  // Fallback (unknown models should get openai/ prefix)
  ['unknown-model', 'openai/unknown-model'],
];

console.log('====================================');
console.log('OpenRouter Model Mapping Verification');
console.log('====================================\n');

let passed = 0;
let failed = 0;

// Access private method through reflection (for testing only)
const resolveModel = service['resolveModel'].bind(service);

testCases.forEach(([input, expected]) => {
  const result = resolveModel(input);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} | Input: "${input}"`);
  console.log(`     | Expected: "${expected}"`);
  console.log(`     | Got:      "${result}"`);
  
  if (result !== expected) {
    console.log(`     | ⚠️  MISMATCH!`);
  }
  console.log('');
});

console.log('====================================');
console.log('Summary');
console.log('====================================');
console.log(`Total Tests: ${testCases.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('====================================\n');

if (failed > 0) {
  console.error('❌ Some tests failed! Please review the mappings.');
  process.exit(1);
} else {
  console.log('✅ All model mappings verified successfully!');
  process.exit(0);
}
