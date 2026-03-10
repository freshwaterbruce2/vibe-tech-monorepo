#!/usr/bin/env node
/**
 * Check available DeepSeek models on OpenRouter
 */

const PROXY_URL = 'http://localhost:3001';

async function checkModels() {
  console.log('🔍 Checking available DeepSeek models...\n');

  try {
    const response = await fetch(`${PROXY_URL}/api/openrouter/models`);
    const data = await response.json();

    // Find DeepSeek models
    const deepseekModels = data.data.filter(model =>
      model.id.toLowerCase().includes('deepseek')
    );

    console.log(`Found ${deepseekModels.length} DeepSeek models:\n`);

    deepseekModels.forEach(model => {
      const isFree = model.pricing?.prompt === '0' || model.pricing?.prompt === 0;
      const freeLabel = isFree ? '🆓 FREE' : '💰 PAID';

      console.log(`${freeLabel} ${model.id}`);
      console.log(`   Name: ${model.name}`);
      console.log(`   Context: ${model.context_length} tokens`);
      if (model.pricing) {
        console.log(`   Pricing: $${model.pricing.prompt}/M prompt, $${model.pricing.completion}/M completion`);
      }
      console.log('');
    });

    // Check for reasoning-specific models
    const reasoningModels = deepseekModels.filter(model =>
      model.id.includes('r1') ||
      model.id.includes('reason') ||
      model.name.toLowerCase().includes('reason')
    );

    if (reasoningModels.length > 0) {
      console.log('\n🧠 Reasoning Models Found:');
      reasoningModels.forEach(model => {
        console.log(`   - ${model.id}`);
      });
    }

  } catch (error) {
    console.error('❌ Error fetching models:', error.message);
  }
}

checkModels();
