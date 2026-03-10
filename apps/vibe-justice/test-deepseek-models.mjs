#!/usr/bin/env node
/**
 * Test DeepSeek models via OpenRouter proxy
 * Updated: 2026-01-14 for free model verification
 */

const PROXY_URL = 'http://localhost:3001';

// Cost-effective models from vibe-justice configuration
const FREE_MODELS = {
  DEEPSEEK_V3: 'deepseek/deepseek-chat',          // $0.0003/$0.0012 per 1M (ultra-cheap)
  DEEPSEEK_R1: 'deepseek/deepseek-r1-0528:free',  // FREE reasoning model
  DEEPSEEK_R1_ALT: 'tngtech/deepseek-r1t2-chimera:free' // FREE alternative
};

async function testProxyHealth() {
  console.log('🏥 Testing OpenRouter Proxy Health...\n');

  try {
    const response = await fetch(`${PROXY_URL}/health`);
    const data = await response.json();
    console.log('✅ Proxy is healthy');
    console.log(`   Uptime: ${data.uptime}s`);
    console.log(`   Status: ${data.status}\n`);
    return true;
  } catch (error) {
    console.error('❌ Proxy is not running!');
    console.error('   Start with: cd backend/openrouter-proxy && pnpm dev\n');
    return false;
  }
}

async function testModel(modelName, modelId) {
  console.log(`🧪 Testing ${modelName} (${modelId})...`);

  const payload = {
    model: modelId,
    messages: [
      {
        role: 'user',
        content: 'Respond with exactly: "Model working!"'
      }
    ],
    max_tokens: 20,
    temperature: 0
  };

  try {
    const response = await fetch(`${PROXY_URL}/api/openrouter/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${error}\n`);
      return false;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || 'No response';
    const usage = data.usage;

    console.log(`   ✅ Response: "${message.trim()}"`);
    if (usage) {
      console.log(`   📊 Tokens: ${usage.prompt_tokens} prompt + ${usage.completion_tokens} completion = ${usage.total_tokens} total`);
    }
    console.log('');
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('🔬 Vibe-Justice DeepSeek Model Test Suite');
  console.log('═══════════════════════════════════════════════\n');

  // Step 1: Check proxy health
  const proxyHealthy = await testProxyHealth();
  if (!proxyHealthy) {
    process.exit(1);
  }

  // Step 2: Test each free model
  console.log('📝 Testing Free Models:\n');

  let passCount = 0;
  let totalTests = 0;

  for (const [name, modelId] of Object.entries(FREE_MODELS)) {
    totalTests++;
    const passed = await testModel(name, modelId);
    if (passed) passCount++;

    // Wait between tests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log(`📊 Results: ${passCount}/${totalTests} models working`);

  if (passCount === totalTests) {
    console.log('✅ All free models are accessible!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run vibe-justice frontend: pnpm nx tauri:dev vibe-justice');
    console.log('   2. Test AI chat with free DeepSeek models');
    console.log('   3. Verify cost savings compared to Claude models');
  } else {
    console.log('⚠️  Some models failed - check API keys and model availability');
  }
  console.log('═══════════════════════════════════════════════\n');

  process.exit(passCount === totalTests ? 0 : 1);
}

main().catch(console.error);
