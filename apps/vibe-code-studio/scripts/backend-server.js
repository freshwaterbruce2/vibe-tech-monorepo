import { WebSocketServer } from 'ws';

const PORT = 5004;

try {
  const wss = new WebSocketServer({ port: PORT });

  console.log(`\n[Backend] 🚀 Local Backend Server running on port ${PORT}`);
  console.log('[Backend] Waiting for Vibe Code Studio to connect...\n');

  wss.on('connection', (ws) => {
    console.log('[Backend] ✅ Client connected');

    ws.on('message', (message) => {
      try {
        const msgStr = message.toString();
        const parsed = JSON.parse(msgStr);
        console.log(`[Backend] 📩 Received: ${parsed.type}`);

        // Simple echo/acknowledge for common message types
        // This keeps the client satisfied that the backend is "alive"

        // You can add custom responses here if needed

      } catch (e) {
        console.log('[Backend] Received raw message (not JSON)');
      }
    });

    ws.on('close', () => {
      console.log('[Backend] ❌ Client disconnected');
    });

    ws.on('error', (err) => {
        console.error('[Backend] Client connection error:', err);
    });
  });

  wss.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[Backend] ⚠️ Error: Port ${PORT} is already in use.`);
      console.error('[Backend] Is another instance or the real Nova Agent already running?');
    } else {
      console.error('[Backend] Server error:', error);
    }
  });

} catch (err) {
  console.error('[Backend] Failed to start WebSocket server. ensure "ws" module is installed.');
  console.error('Try running: pnpm add -D ws');
  console.error(err);
}
