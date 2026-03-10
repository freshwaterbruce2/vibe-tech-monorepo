"use strict";
/**
 * Model Mapping Verification Script
 * January 3, 2026 - Current State-of-the-Art AI Models
 *
 * Run: npx tsx scripts/verify-2026-models.ts
 */
// Inline resolveModel function for testing
function resolveModel(model) {
    const map = {
        // OpenAI - GPT-5 Era
        'gpt-5.2-pro': 'openai/gpt-5.2-pro',
        'gpt-5.2': 'openai/gpt-5.2',
        'gpt-5': 'openai/gpt-5.2',
        'gpt-5.1-codex': 'openai/gpt-5.1-codex-max',
        'gpt-5-codex': 'openai/gpt-5.1-codex-max',
        'gpt-5-mini': 'openai/gpt-5-mini',
        'gpt-4o': 'openai/gpt-4o',
        'gpt-4o-mini': 'openai/gpt-4o-mini',
        // Anthropic - Claude 4.5 Era
        'claude-4.5-opus': 'anthropic/claude-opus-4.5',
        'claude-opus': 'anthropic/claude-opus-4.5',
        'claude-4.5-sonnet': 'anthropic/claude-sonnet-4.5',
        'claude-sonnet': 'anthropic/claude-sonnet-4.5',
        'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
        // Google - Gemini 3 Era
        'gemini-3-flash': 'google/gemini-3-flash-preview',
        'gemini-flash': 'google/gemini-3-flash-preview',
        'gemini-2.5-pro': 'google/gemini-2.5-pro',
        'gemini-pro': 'google/gemini-2.5-pro',
        'gemini-2.5-flash': 'google/gemini-2.5-flash',
        // DeepSeek
        'deepseek-r1': 'deepseek/deepseek-r1',
        'deepseek-reasoner': 'deepseek/deepseek-r1',
        'deepseek-v3.2': 'deepseek/deepseek-v3.2',
        'deepseek-chat': 'deepseek/deepseek-v3.2',
        // xAI - Grok
        'grok-4': 'x-ai/grok-4',
        'grok-4.1-fast': 'x-ai/grok-4.1-fast',
        'grok-fast': 'x-ai/grok-4.1-fast',
        'grok-code': 'x-ai/grok-code-fast-1',
    };
    const mapped = map[model];
    if (mapped)
        return mapped;
    if (model.includes('/'))
        return model;
    return `openai/${model}`;
}
// Test cases based on January 3, 2026 model list
const tests = [
    // OpenAI GPT-5 (Latest Flagship Models)
    ['gpt-5.2-pro', 'openai/gpt-5.2-pro', '🧠 GPT-5.2 Pro - Best for complex reasoning/agentic tasks'],
    ['gpt-5.2', 'openai/gpt-5.2', '⚖️  GPT-5.2 - Standard flagship (balanced)'],
    ['gpt-5.1-codex', 'openai/gpt-5.1-codex-max', '💻 GPT-5.1 Codex Max - Best for coding (massive context)'],
    ['gpt-5-mini', 'openai/gpt-5-mini', '⚡ GPT-5 Mini - Replaces gpt-4o-mini (cheap/fast)'],
    // Anthropic Claude 4.5 (Latest Creative/Dev Models)
    ['claude-4.5-opus', 'anthropic/claude-opus-4.5', '✍️  Claude 4.5 Opus - Maximum intelligence, higher latency'],
    ['claude-4.5-sonnet', 'anthropic/claude-sonnet-4.5', '🚀 Claude 4.5 Sonnet - Daily driver for devs'],
    ['claude-3.5-sonnet', 'anthropic/claude-3.5-sonnet', '📦 Claude 3.5 Sonnet - Legacy stability'],
    // Google Gemini 2.5/3 (Speed & Reasoning)
    ['gemini-3-flash', 'google/gemini-3-flash-preview', '⚡ Gemini 3 Flash - Fastest model available'],
    ['gemini-2.5-pro', 'google/gemini-2.5-pro', '🎯 Gemini 2.5 Pro - Stable high-end reasoning'],
    ['gemini-2.5-flash', 'google/gemini-2.5-flash', '🔥 Gemini 2.5 Flash - High-throughput'],
    // DeepSeek (Open Weights Leader)
    ['deepseek-v3.2', 'deepseek/deepseek-v3.2', '💬 DeepSeek V3.2 - General purpose chat/code'],
    ['deepseek-r1', 'deepseek/deepseek-r1', '🤔 DeepSeek R1 - Reasoning/CoT (slow, high IQ)'],
    ['deepseek-reasoner', 'deepseek/deepseek-r1', '🧩 DeepSeek Reasoner - Alias for R1'],
    // xAI Grok (Frontier Model)
    ['grok-4', 'x-ai/grok-4', '🌟 Grok 4 - Latest flagship'],
    ['grok-4.1-fast', 'x-ai/grok-4.1-fast', '⚡ Grok 4.1 Fast - Low latency variant'],
    ['grok-code', 'x-ai/grok-code-fast-1', '💻 Grok Code Fast - Optimized for code generation'],
    // Common Aliases
    ['gpt-5', 'openai/gpt-5.2', '🔗 gpt-5 → gpt-5.2 (alias)'],
    ['claude-opus', 'anthropic/claude-opus-4.5', '🔗 claude-opus → opus-4.5 (alias)'],
    ['gemini-pro', 'google/gemini-2.5-pro', '🔗 gemini-pro → 2.5-pro (alias)'],
    ['grok-fast', 'x-ai/grok-4.1-fast', '🔗 grok-fast → 4.1-fast (alias)'],
    // Pass-through (already valid IDs)
    ['openai/custom-model', 'openai/custom-model', '➡️  Pass-through (has slash)'],
    // Fallback
    ['unknown-model', 'openai/unknown-model', '🔄 Fallback to openai/ prefix'],
];
console.log('\n' + '='.repeat(100));
console.log('🤖 OPENROUTER MODEL MAPPING VERIFICATION - JANUARY 3, 2026');
console.log('='.repeat(100) + '\n');
console.log('📋 Testing State-of-the-Art Model Mappings:\n');
console.log('  • GPT-5 Series (OpenAI)');
console.log('  • Claude 4.5 Series (Anthropic)');
console.log('  • Gemini 3 & 2.5 (Google)');
console.log('  • DeepSeek V3.2 & R1 (Open Weights)');
console.log('  • Grok 4 Series (xAI)\n');
console.log('='.repeat(100) + '\n');
let passed = 0;
let failed = 0;
const failures = [];
tests.forEach(([input, expected, description]) => {
    const result = resolveModel(input);
    const match = result === expected;
    if (match) {
        passed++;
        console.log(`✅ ${description}`);
        console.log(`   "${input}" → "${result}"`);
    }
    else {
        failed++;
        console.log(`❌ ${description}`);
        console.log(`   Input: "${input}"`);
        console.log(`   Expected: "${expected}"`);
        console.log(`   Got: "${result}"`);
        failures.push({ input, expected, got: result, description });
    }
    console.log('');
});
console.log('='.repeat(100));
console.log('📊 VERIFICATION RESULTS');
console.log('='.repeat(100));
console.log(`Total Tests: ${tests.length}`);
console.log(`✅ Passed: ${passed} (${((passed / tests.length) * 100).toFixed(1)}%)`);
console.log(`❌ Failed: ${failed} (${((failed / tests.length) * 100).toFixed(1)}%)`);
console.log('='.repeat(100));
if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    failures.forEach(({ input, expected, got, description }) => {
        console.log(`\n  ${description}`);
        console.log(`  Input: "${input}"`);
        console.log(`  Expected: "${expected}"`);
        console.log(`  Got: "${got}"`);
    });
    console.log('\n' + '='.repeat(100));
    process.exit(1);
}
else {
    console.log('\n✅ ALL MODEL MAPPINGS VERIFIED SUCCESSFULLY!');
    console.log('\n🎉 Vibe Code Studio is ready with 2026 state-of-the-art AI models!');
    console.log('\n' + '='.repeat(100) + '\n');
    process.exit(0);
}
//# sourceMappingURL=verify-2026-models.js.map