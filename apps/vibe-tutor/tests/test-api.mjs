// Test DeepSeek API key via backend server
import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('🔍 Testing Vibe-Tutor API...\n');

    // Step 1: Initialize session
    console.log('Step 1: Initializing session...');
    const sessionResponse = await fetch('http://localhost:3001/api/session/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!sessionResponse.ok) {
      throw new Error(`Session init failed: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    console.log('✅ Session initialized:', `${sessionData.token.substring(0, 16)  }...`);
    console.log(`   Expires in: ${sessionData.expiresIn / 60} minutes\n`);

    // Step 2: Test chat completion with DeepSeek
    console.log('Step 2: Testing DeepSeek API key...');
    const chatResponse = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.token}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Say "API key working" if you can read this.'
          }
        ],
        options: {
          model: 'deepseek-v3.2',
          temperature: 0.7,
          max_tokens: 50
        }
      })
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      throw new Error(`Chat failed (${chatResponse.status}): ${error}`);
    }

    const chatData = await chatResponse.json();
    console.log('✅ DeepSeek API response received:');
    console.log(`   Model: ${chatData.model}`);
    console.log(`   Response: "${chatData.choices[0].message.content}"`);
    console.log(`   Tokens used: ${chatData.usage.total_tokens}\n`);

    console.log('🎉 SUCCESS! DeepSeek API key is valid and working.\n');
    console.log('📊 API Details:');
    console.log(`   - Model: deepseek-v3.2`);
    console.log(`   - Context: 128K tokens`);
    console.log(`   - Rate limit: 20 requests/minute`);
    console.log(`   - Daily limit: 100 requests/session`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check .env file has DEEPSEEK_API_KEY');
    console.error('   2. Verify API key is valid at https://platform.deepseek.com');
    console.error('   3. Ensure server is running (node server.mjs)');
    process.exit(1);
  }
}

testAPI();
