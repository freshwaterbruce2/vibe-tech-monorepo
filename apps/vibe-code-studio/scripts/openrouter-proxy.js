/**
 * OpenRouter Proxy Server
 *
 * A simple HTTP proxy that forwards requests to OpenRouter API.
 * This allows the frontend to make requests without exposing API keys.
 *
 * Usage:
 *   node scripts/openrouter-proxy.js
 *
 * Environment Variables:
 *   OPENROUTER_API_KEY - Your OpenRouter API key (get free at openrouter.ai)
 *   PROXY_PORT - Port to run proxy on (default: 3001)
 */

import http from 'http';

const PORT = process.env.PROXY_PORT || 3001;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

// Demo mode if no API key - returns helpful mock responses
const DEMO_MODE = !OPENROUTER_API_KEY;

if (DEMO_MODE) {
  console.log('\n========================================');
  console.log('[OpenRouter Proxy] DEMO MODE');
  console.log('========================================');
  console.log('No API key found. Running in demo mode.');
  console.log('AI responses will be simulated.\n');
  console.log('To enable real AI:');
  console.log('  1. Get a FREE API key at: https://openrouter.ai/keys');
  console.log('  2. Run: $env:OPENROUTER_API_KEY="sk-or-v1-..."');
  console.log('  3. Restart this proxy');
  console.log('========================================\n');
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', proxy: 'openrouter' }));
    return;
  }

  // OpenRouter chat endpoint
  if (req.url === '/api/openrouter/chat' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const requestBody = JSON.parse(body);

        console.log(`[Proxy] ${DEMO_MODE ? '[DEMO]' : ''} Request for model: ${requestBody.model}`);

        // Demo mode - return simulated responses
        if (DEMO_MODE) {
          const userMessage = requestBody.messages?.find(m => m.role === 'user')?.content || '';
          const demoResponse = {
            id: 'demo-' + Date.now(),
            choices: [{
              message: {
                role: 'assistant',
                content: `[DEMO MODE - No API Key]\n\nI received your message: "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}"\n\nTo get real AI responses:\n1. Get a FREE API key at https://openrouter.ai/keys\n2. Set: $env:OPENROUTER_API_KEY="your-key"\n3. Restart the proxy`
              }
            }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(demoResponse));
          return;
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://vibecodestudio.com',
            'X-Title': 'Vibe Code Studio'
          },
          body: JSON.stringify(requestBody)
        });

        const data = await response.text();

        // Handle streaming responses
        if (requestBody.stream) {
          res.writeHead(response.status, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });
          res.end(data);
        } else {
          res.writeHead(response.status, { 'Content-Type': 'application/json' });
          res.end(data);
        }

        if (response.ok) {
          console.log(`[Proxy] Success: ${requestBody.model}`);
        } else {
          console.error(`[Proxy] Error ${response.status}: ${data.slice(0, 200)}`);
        }

      } catch (error) {
        console.error('[Proxy] Request failed:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: error.message } }));
      }
    });

    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`\n[OpenRouter Proxy] Running on http://localhost:${PORT}`);
  console.log('[OpenRouter Proxy] Endpoints:');
  console.log(`  - Health: http://localhost:${PORT}/health`);
  console.log(`  - Chat:   http://localhost:${PORT}/api/openrouter/chat`);
  if (DEMO_MODE) {
    console.log('\n[OpenRouter Proxy] Mode: DEMO (simulated responses)');
  } else {
    console.log(`\n[OpenRouter Proxy] API Key: sk-or-...${OPENROUTER_API_KEY.slice(-4)}`);
  }
  console.log('[OpenRouter Proxy] Ready to accept requests from Vibe Code Studio\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[OpenRouter Proxy] Port ${PORT} is already in use.`);
  } else {
    console.error('[OpenRouter Proxy] Server error:', error);
  }
});
