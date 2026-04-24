import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  CommitInfo,
  CryptoMemory,
  GitMemory,
  NovaMemory,
  ProjectContext,
  TradeDecision,
} from '@vibetech/memory';
import type { HandlerArgs } from './handler-types.js';

function requiredString(args: HandlerArgs, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing or invalid string argument: ${key}`);
  }
  return value;
}

function requiredNumber(args: HandlerArgs, key: string): number {
  const value = args[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Missing or invalid number argument: ${key}`);
  }
  return value;
}

function optionalNumber(args: HandlerArgs, key: string): number | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid number argument: ${key}`);
  }
  return value;
}

function optionalString(args: HandlerArgs, key: string): string | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Invalid string argument: ${key}`);
  }
  return value;
}

function optionalStringArray(args: HandlerArgs, key: string): string[] {
  const value = args[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Invalid string array argument: ${key}`);
  }
  return value;
}

function tradeAction(args: HandlerArgs): TradeDecision['action'] {
  const action = requiredString(args, 'action');
  if (action !== 'buy' && action !== 'sell' && action !== 'hold') {
    throw new Error("Invalid trade action: expected 'buy', 'sell', or 'hold'");
  }
  return action;
}

function tradeOutcome(args: HandlerArgs): TradeDecision['outcome'] {
  const outcome = args.outcome;
  if (outcome === undefined) return undefined;
  if (outcome !== 'profit' && outcome !== 'loss' && outcome !== 'pending') {
    throw new Error("Invalid trade outcome: expected 'profit', 'loss', or 'pending'");
  }
  return outcome;
}

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
      const trade: TradeDecision = {
        pair: requiredString(args, 'pair'),
        action: tradeAction(args),
        price: requiredNumber(args, 'price'),
        amount: requiredNumber(args, 'amount'),
        reason: requiredString(args, 'reason'),
        confidence: requiredNumber(args, 'confidence'),
        timestamp: Date.now(),
        outcome: tradeOutcome(args),
        pnl: optionalNumber(args, 'pnl'),
      };
      const tradeId = await cryptoMemory.trackTrade(trade);
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
      const commit: CommitInfo = {
        hash: requiredString(args, 'hash'),
        message: requiredString(args, 'message'),
        author: requiredString(args, 'author'),
        branch: requiredString(args, 'branch'),
        filesChanged: requiredNumber(args, 'filesChanged'),
        additions: requiredNumber(args, 'additions'),
        deletions: requiredNumber(args, 'deletions'),
        timestamp: Date.now(),
      };
      const commitId = await gitMemory.trackCommit(commit);
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
      const context: ProjectContext = {
        name: requiredString(args, 'name'),
        path: requiredString(args, 'path'),
        currentFile: optionalString(args, 'currentFile'),
        currentTask: optionalString(args, 'currentTask'),
        recentFiles: optionalStringArray(args, 'recentFiles'),
        recentTasks: optionalStringArray(args, 'recentTasks'),
        lastActive: Date.now(),
      };
      await novaMemory.setContext(context);
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
