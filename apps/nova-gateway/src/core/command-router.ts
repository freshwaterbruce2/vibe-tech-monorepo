import crypto from 'crypto';
import { ipcClient } from './ipc-client.js';
import { novaClient } from '../client/nova-client.js';
import { sessionManager, SessionState } from './session-manager.js';
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';

export interface RouteResult {
  text: string;
  imagePath?: string;
}

export class CommandRouter {
  /**
   * Main router entry point. Inspects text and routes to command handlers or NLP chat.
   */
  public async routeMessage(
    platform: string,
    platformUserId: string,
    channelId: string,
    text: string
  ): Promise<RouteResult> {
    const trimmed = text.trim();
    
    // Resolve unified client ID first
    const unifiedClientId = sessionManager.getOrCreateUnifiedClient(platform, platformUserId);
    const session = sessionManager.getSession(unifiedClientId);

    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(/\s+/);
      const command = parts[0]?.toLowerCase();
      const args = parts.slice(1);

      switch (command) {
        case '/help':
          return this.handleHelp();
        case '/status':
          return this.handleStatus();
        case '/screenshot':
          return this.handleScreenshot();
        case '/mcp':
          return this.handleMcp(args);
        case '/link':
          return this.handleLink(unifiedClientId, args);
        default:
          return { text: `❌ Unknown command: \`${command}\`. Type \`/help\` for a list of commands.` };
      }
    }

    // Natural Language chat path
    return this.handleChat(unifiedClientId, platform, channelId, trimmed, session);
  }

  private handleHelp(): RouteResult {
    const menu = `🤖 **Nova Agent Bot Help Menu**

Here are the available slash commands:
• \`/status\` - Retrieve runtime telemetry and status check.
• \`/screenshot\` - Request a desktop screen capture.
• \`/mcp <server> <tool> <args_json>\` - Execute desktop MCP tools directly.
• \`/link\` - Generate a 6-character link code to sync accounts.
• \`/link <code>\` - Enter code to pair/merge accounts.
• \`/help\` - View this help menu.

Or just send any plain text message to chat naturally with Nova Agent.`;
    return { text: menu };
  }

  private async handleStatus(): Promise<RouteResult> {
    logger.info('Handling status request...');
    const health = await novaClient.checkHealth();
    
    if (!health.ok) {
      return { 
        text: `🖥️ **Nova Agent Status Check**\n\n• **Status**: 🔴 **OFFLINE** (Unreachable)\n• **Uptime**: 0s\n\n*Please ensure Nova Agent is running on your desktop and the tunnel is active.*` 
      };
    }

    try {
      const status = await novaClient.getStatus();
      const metricsText = status.metrics 
        ? `\n• **CPU Usage**: ${status.metrics.cpuUsage}%\n• **Memory**: ${status.metrics.memoryUsage}%\n• **Queue Depth**: ${status.metrics.tasksQueued} tasks`
        : '';

      return {
        text: `🖥️ **Nova Agent Status Check**\n\n• **Status**: 🟢 **ONLINE**\n• **Version**: \`v${status.version}\`\n• **Uptime**: ${health.uptime}s\n• **Active Project**: \`${status.activeProject || 'none'}\`${metricsText}`
      };
    } catch (err) {
      return {
        text: `🖥️ **Nova Agent Status Check**\n\n• **Status**: 🟢 **ONLINE** (HTTP server responding, but status telemetry failed: ${err instanceof Error ? err.message : String(err)})`
      };
    }
  }

  private async handleScreenshot(): Promise<RouteResult> {
    logger.info('Handling screenshot request...');
    if (!ipcClient.isConnected) {
      return { text: '❌ **Screenshot Failed**: Desktop WebSocket bridge connection is currently offline.' };
    }

    const filename = `screenshot-${Date.now()}.png`;

    try {
      const result = await ipcClient.callTool('desktop-commander', 'dc_take_screenshot', {
        filename,
        directory: 'D:\\screenshots'
      }, 15000);

      if (result.success === false || !result.path) {
        return { text: `❌ **Screenshot Failed**: ${result.error || 'Unknown error'}` };
      }

      // Return path. If bot runs locally it will attach the image; if on VPS it reports path.
      return {
        text: `📸 **Screenshot Captured**\n\n• **Saved to**: \`${result.path}\` on your desktop host.`,
        imagePath: result.path
      };
    } catch (err) {
      return { text: `❌ **Screenshot Failed**: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  private async handleMcp(args: string[]): Promise<RouteResult> {
    if (args.length < 2) {
      return { text: '❌ **Usage**: \`/mcp <server> <tool> [args_json_string]\`\n\n*Example*: \`/mcp filesystem list_directory {"path":"D:\\\\databases"}\`' };
    }

    const server = args[0]!;
    const tool = args[1]!;
    const jsonString = args.slice(2).join(' ');

    let parsedArgs: Record<string, any> = {};
    if (jsonString.trim()) {
      try {
        parsedArgs = JSON.parse(jsonString);
      } catch (err) {
        return { text: `❌ **Invalid JSON Arguments**: ${err instanceof Error ? err.message : String(err)}` };
      }
    }

    if (!ipcClient.isConnected) {
      return { text: '❌ **MCP Call Failed**: Desktop WebSocket bridge connection is currently offline.' };
    }

    try {
      const result = await ipcClient.callTool(server, tool, parsedArgs, 30000);
      
      if (result.success === false) {
        return { text: `❌ **MCP Error**:\n\`\`\`\n${result.error || 'Unknown error'}\n\`\`\`` };
      }

      return {
        text: `✅ **MCP Tool Call Success**:\n\`\`\`json\n${JSON.stringify(result.data || result, null, 2)}\n\`\`\``
      };
    } catch (err) {
      return { text: `❌ **MCP Call Failed**: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  private handleLink(unifiedClientId: string, args: string[]): RouteResult {
    if (args.length === 0) {
      // 1. Generate pairing code
      const code = `NV${crypto.randomInt(100000, 999999)}`;
      
      db.prepare(`
        INSERT INTO pairing_codes (code, unified_client_id)
        VALUES (?, ?)
      `).run(code, unifiedClientId);

      logger.info(`Generated pairing code ${code} for client ${unifiedClientId}`);

      return {
        text: `🔗 **Account Synchronization Code**

• **Pairing Code**: \`${code}\`
• **Expires in**: 10 minutes

**Instructions**:
Run \`/link ${code}\` on Discord, Telegram, or other chat platforms to merge histories and preferences.`
      };
    }

    // 2. Consume pairing code to link profiles
    const code = args[0]!.toUpperCase().trim();
    
    const codeRecord = db.prepare(`
      SELECT unified_client_id, created_at FROM pairing_codes WHERE code = ?
    `).get(code) as { unified_client_id: string; created_at: string } | undefined;

    if (!codeRecord) {
      return { text: '❌ **Invalid Code**: The linking code supplied was not found.' };
    }

    // Expiry check (10 mins)
    const createdAtMs = new Date(codeRecord.created_at).getTime();
    const nowMs = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (nowMs - createdAtMs > tenMinutes) {
      db.prepare('DELETE FROM pairing_codes WHERE code = ?').run(code);
      return { text: '❌ **Expired Code**: This link code has expired. Please generate a new one.' };
    }

    try {
      const sourceClientId = codeRecord.unified_client_id;
      
      // Perform linkage merge
      sessionManager.mergeProfiles(unifiedClientId, sourceClientId);
      
      // Clean up consumed code
      db.prepare('DELETE FROM pairing_codes WHERE code = ?').run(code);

      return {
        text: '✅ **Accounts Successfully Linked!**\n\nYour chat profiles, history, and active session variables have been synchronized across platforms.'
      };
    } catch (err) {
      return { text: `❌ **Link Failure**: Merge operation failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  private async handleChat(
    unifiedClientId: string,
    platform: string,
    channelId: string,
    message: string,
    session: SessionState
  ): Promise<RouteResult> {
    try {
      // Forward request to local/remote Nova Agent Axum core
      const responseText = await novaClient.chat(message, session.activeProjectId);

      // Record request and response in SQLite history
      session.history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
      session.history.push({ role: 'assistant', content: responseText, timestamp: new Date().toISOString() });
      
      // Cap log length at 30 to limit database file size bloating
      if (session.history.length > 30) {
        session.history = session.history.slice(-30);
      }

      sessionManager.saveSession(unifiedClientId, platform, channelId, session);

      return { text: responseText };
    } catch (err) {
      // In case Nova HTTP core is offline, return friendly status to user instead of dropping connection
      return { 
        text: `⚠️ **Nova Agent is currently offline.**

Your message could not be delivered to the reasoning engine. Please ensure Nova Agent is running on your desktop and has access to the internet.` 
      };
    }
  }
}

export const commandRouter = new CommandRouter();
