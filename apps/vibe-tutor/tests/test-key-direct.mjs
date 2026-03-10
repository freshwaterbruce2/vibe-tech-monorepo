import { config } from 'dotenv';
config();

const API_KEY = process.env.DEEPSEEK_API_KEY;

console.log('🔑 Testing API key format...');
console.log(`Key starts with: ${API_KEY?.substring(0, 8)}...`);
console.log(`Key length: ${API_KEY?.length} characters`);
console.log(`Key ends with: ...${API_KEY?.substring(API_KEY.length - 4)}`);

console.log('\n📡 Testing direct API call to DeepSeek...');

try {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 10
    })
  });

  console.log(`HTTP Status: ${response.status}`);

  const data = await response.json();

  if (response.ok) {
    console.log('✅ API key is VALID!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ API key is INVALID!');
    console.log('Error:', JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('❌ Network error:', error.message);
}
