import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  CryptoMemory,
  GitMemory,
  NovaMemory,
} from '@vibetech/memory';
import type { HandlerArgs } from './handler-types.js';

/**
 * Integration handlers: crypto trading, git workflow, nova-agent context
 */
export async function handleIntegrations(
  name: string,
  args: HandlerArgs,
  cryptoMemory: CryptoMemory | null,
  gitMemory: GitMemory | null,
  novaMemory: NovaMemory | null,
): Promise<CallToolResult | null> {
  switch (name) {
    // ── Crypto Trading ──────────────
    case 'memory_track_trade': {
      if (!cryptoMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Crypto memory not available' }) }], isError: true };
      }
      const { pair, action, price, amount, reason, confidence, outcome, pnl } = args as any;
      const tradeId = await cryptoMemory.trackTrade({
        pair, action, price, amount, reason, confidence,
        timestamp: Date.now(), outcome, pnl,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, tradeId, message: 'Trade decision tracked' }) }],
      };
    }

    case 'memory_get_trading_patterns': {
      if (!cryptoMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Crypto memory not available' }) }], isError: true };
      }
      const { minWinRate = 0.6 } = args as { minWinRate?: number };
      const patterns = cryptoMemory.getTradingPatterns(minWinRate);
      return {
        content: [{ type: 'text', text: JSON.stringify({ patterns, count: patterns.length }, null, 2) }],
      };
    }

    case 'memory_trading_suggestions': {
      if (!cryptoMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Crypto memory not available' }) }], isError: true };
      }
      const { pair } = args as { pair?: string };
      const suggestions = await cryptoMemory.getSuggestions(pair);
      return {
        content: [{ type: 'text', text: JSON.stringify({ suggestions, count: suggestions.length }, null, 2) }],
      };
    }

    // ── Git Workflow ──────────────
    case 'memory_track_commit': {
      if (!gitMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Git memory not available' }) }], isError: true };
      }
      const { hash, message, author, branch, filesChanged, additions, deletions } = args as any;
      const commitId = await gitMemory.trackCommit({
        hash, message, author, branch, filesChanged,
        additions, deletions, timestamp: Date.now(),
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, commitId, message: 'Commit tracked' }) }],
      };
    }

    case 'memory_suggest_git_command': {
      if (!gitMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Git memory not available' }) }], isError: true };
      }
      const { currentCommand } = args as { currentCommand: string };
      const suggestion = await gitMemory.suggestNextCommand(currentCommand);
      return {
        content: [{ type: 'text', text: JSON.stringify(suggestion || { message: 'No suggestion available' }, null, 2) }],
      };
    }

    case 'memory_commit_stats': {
      if (!gitMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Git memory not available' }) }], isError: true };
      }
      const stats = await gitMemory.getCommitStats();
      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }

    // ── Nova-Agent Context ──────────────
    case 'memory_set_context': {
      if (!novaMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Nova memory not available' }) }], isError: true };
      }
      const { name: ctxName, path, currentFile, currentTask, recentFiles, recentTasks } = args as any;
      await novaMemory.setContext({
        name: ctxName, path, currentFile, currentTask,
        recentFiles, recentTasks, lastActive: Date.now(),
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Context saved' }) }],
      };
    }

    case 'memory_get_context': {
      if (!novaMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Nova memory not available' }) }], isError: true };
      }
      const context = await novaMemory.getContext();
      return {
        content: [{ type: 'text', text: JSON.stringify(context || { message: 'No context found' }, null, 2) }],
      };
    }

    case 'memory_suggest_task': {
      if (!novaMemory) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: 'Nova memory not available' }) }], isError: true };
      }
      const suggestion = await novaMemory.suggestNextTask();
      return {
        content: [{ type: 'text', text: JSON.stringify(suggestion || { message: 'No tasks pending' }, null, 2) }],
      };
    }

    default:
      return null;
  }
}
