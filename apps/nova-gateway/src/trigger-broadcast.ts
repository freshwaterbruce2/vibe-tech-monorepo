/* eslint-disable */
import WebSocket from 'ws';
import fs from 'fs';

const logFile = 'D:\\logs\\nova-gateway-websocket.log';
const broadcastUrl = 'http://localhost:5005/broadcast';
const wsUrl = 'ws://localhost:5005/ws/logs';

const announcement = `🚀 **Calling All Testers! Help Us Shape Vibe Tutor for Android!** 📱

We are thrilled to open the **Vibe Tutor Android App** for internal beta testing! 🎓✨
Vibe Tutor is our state-of-the-art AI-powered educational tutor system built to provide neurodivergent-friendly learning tools, voice-guided AI chats, focus tracking, and personalized homework assistance.

We need your help to test the core flows:
1️⃣ Adding & organizing homework tasks.
2️⃣ Chatting naturally with our AI tutor (powered by Gemini & OpenRouter).
3️⃣ Running background audio playback & lessons.

Ready to get started? Opt-in directly on the Google Play Store here:
🔗 **Join the Beta Test:** https://play.google.com/apps/testing/com.vibetech.tutor

Your feedback is invaluable to make learning accessible and engaging. Thank you for being a part of our developer community! 🙌`;

async function main() {
  console.log('Ensure D:\\logs exists...');
  fs.mkdirSync('D:\\logs', { recursive: true });

  // Clean the target WebSocket log file if it already exists
  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }

  console.log(`Connecting to WebSocket log stream at ${wsUrl}...`);
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    console.log('WebSocket log stream connected.');
    // Trigger broadcast after 1 second to make sure connection is fully active
    setTimeout(async () => {
      console.log('Sending POST request to broadcast announcement...');
      try {
        const response = await fetch(broadcastUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: announcement }),
        });

        const result = await response.json();
        console.log('Broadcast API Response:', JSON.stringify(result, null, 2));

        // Wait another 5 seconds for all logs to stream and save, then close and exit
        setTimeout(() => {
          console.log('Closing WebSocket connection...');
          ws.close();
        }, 5000);

      } catch (err: any) {
        console.error('Failed to trigger broadcast:', err);
        ws.close();
      }
    }, 1000);
  });

  ws.on('message', (data) => {
    const logLine = data.toString();
    console.log(`[WS LOG]: ${logLine}`);
    fs.appendFileSync(logFile, logLine + '\n');
  });

  ws.on('close', () => {
    console.log('WebSocket closed. Exiting script.');
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error('WebSocket Error:', err);
  });
}

main().catch((err) => {
  console.error('Main error:', err);
  process.exit(1);
});
