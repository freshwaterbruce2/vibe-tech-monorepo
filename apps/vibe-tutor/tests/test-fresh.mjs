// Force fresh .env load - no caching
import { readFileSync } from 'fs';

// Read .env directly from disk
const envContent = readFileSync('.env', 'utf-8');
const apiKeyMatch = envContent.match(/DEEPSEEK_API_KEY=(.+)/);
const API_KEY = apiKeyMatch ? apiKeyMatch[1].trim() : null;

console.log('🔑 API Key Check:');
console.log(`  Starts: ${API_KEY?.substring(0, 8)}...`);
console.log(`  Length: ${API_KEY?.length} chars`);
console.log(`  Ends: ...${API_KEY?.substring(API_KEY.length - 4)}`);

console.log('\n📡 Testing DeepSeek API (2026 endpoint)...');
console.log('  Endpoint: https://api.deepseek.com/v1/chat/completions');

try {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('\n✅ SUCCESS! API key is valid!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('\n❌ FAILED! Status:', response.status);
    console.log('Error:', JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('\n❌ Network error:', error.message);
}
