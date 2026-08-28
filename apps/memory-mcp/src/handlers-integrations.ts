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

function errorResponse(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

function successResponse(payload: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  };
}

function buildTrade(args: HandlerArgs): TradeDecision {
  return {
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
}

async function handleTrackTrade(
  args: HandlerArgs,
  cryptoMemory: CryptoMemory | null,
): Promise<CallToolResult> {
  if (!cryptoMemory) {
    return errorResponse('Crypto memory not available');
  }
  const trade = buildTrade(args);
  const tradeId = await cryptoMemory.trackTrade(trade);
  return successResponse({ success: true, tradeId, message: 'Trade decision tracked' });
}

function handleGetTradingPatterns(
  args: HandlerArgs,
  cryptoMemory: CryptoMemory | null,
): CallToolResult {
  if (!cryptoMemory) {
    return errorResponse('Crypto memory not available');
  }
  const { minWinRate = 0.6 } = args as { minWinRate?: number };
  const patterns = cryptoMemory.getTradingPatterns(minWinRate);
  return {
    content: [{ type: 'text', text: JSON.stringify({ patterns, count: patterns.length }, null, 2) }],
  };
}

async function handleTradingSuggestions(
  args: HandlerArgs,
  cryptoMemory: CryptoMemory | null,
): Promise<CallToolResult> {
  if (!cryptoMemory) {
    return errorResponse('Crypto memory not available');
  }
  const { pair } = args as { pair?: string };
  const suggestions = await cryptoMemory.getSuggestions(pair);
  return {
    content: [{ type: 'text', text: JSON.stringify({ suggestions, count: suggestions.length }, null, 2) }],
  };
}

function buildCommit(args: HandlerArgs): CommitInfo {
  return {
    hash: requiredString(args, 'hash'),
    message: requiredString(args, 'message'),
    author: requiredString(args, 'author'),
    branch: requiredString(args, 'branch'),
    filesChanged: requiredNumber(args, 'filesChanged'),
    additions: requiredNumber(args, 'additions'),
    deletions: requiredNumber(args, 'deletions'),
    timestamp: Date.now(),
  };
}

async function handleTrackCommit(
  args: HandlerArgs,
  gitMemory: GitMemory | null,
): Promise<CallToolResult> {
  if (!gitMemory) {
    return errorResponse('Git memory not available');
  }
  const commit = buildCommit(args);
  const commitId = await gitMemory.trackCommit(commit);
  return successResponse({ success: true, commitId, message: 'Commit tracked' });
}

async function handleSuggestGitCommand(
  args: HandlerArgs,
  gitMemory: GitMemory | null,
): Promise<CallToolResult> {
  if (!gitMemory) {
    return errorResponse('Git memory not available');
  }
  const { currentCommand } = args as { currentCommand: string };
  const suggestion = await gitMemory.suggestNextCommand(currentCommand);
  return {
    content: [{ type: 'text', text: JSON.stringify(suggestion ?? { message: 'No suggestion available' }, null, 2) }],
  };
}

async function handleCommitStats(gitMemory: GitMemory | null): Promise<CallToolResult> {
  if (!gitMemory) {
    return errorResponse('Git memory not available');
  }
  const stats = await gitMemory.getCommitStats();
  return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
}

function buildProjectContext(args: HandlerArgs): ProjectContext {
  return {
    name: requiredString(args, 'name'),
    path: requiredString(args, 'path'),
    currentFile: optionalString(args, 'currentFile'),
    currentTask: optionalString(args, 'currentTask'),
    recentFiles: optionalStringArray(args, 'recentFiles'),
    recentTasks: optionalStringArray(args, 'recentTasks'),
    lastActive: Date.now(),
  };
}

async function handleSetContext(
  args: HandlerArgs,
  novaMemory: NovaMemory | null,
): Promise<CallToolResult> {
  if (!novaMemory) {
    return errorResponse('Nova memory not available');
  }
  const context = buildProjectContext(args);
  await novaMemory.setContext(context);
  return successResponse({ success: true, message: 'Context saved' });
}

async function handleGetContext(novaMemory: NovaMemory | null): Promise<CallToolResult> {
  if (!novaMemory) {
    return errorResponse('Nova memory not available');
  }
  const context = await novaMemory.getContext();
  return {
    content: [{ type: 'text', text: JSON.stringify(context ?? { message: 'No context found' }, null, 2) }],
  };
}

async function handleSuggestTask(novaMemory: NovaMemory | null): Promise<CallToolResult> {
  if (!novaMemory) {
    return errorResponse('Nova memory not available');
  }
  const suggestion = await novaMemory.suggestNextTask();
  return {
    content: [{ type: 'text', text: JSON.stringify(suggestion ?? { message: 'No tasks pending' }, null, 2) }],
  };
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
    case 'memory_track_trade': return handleTrackTrade(args, cryptoMemory);
    case 'memory_get_trading_patterns': return handleGetTradingPatterns(args, cryptoMemory);
    case 'memory_trading_suggestions': return handleTradingSuggestions(args, cryptoMemory);
    case 'memory_track_commit': return handleTrackCommit(args, gitMemory);
    case 'memory_suggest_git_command': return handleSuggestGitCommand(args, gitMemory);
    case 'memory_commit_stats': return handleCommitStats(gitMemory);
    case 'memory_set_context': return handleSetContext(args, novaMemory);
    case 'memory_get_context': return handleGetContext(novaMemory);
    case 'memory_suggest_task': return handleSuggestTask(novaMemory);
    default: return null;
  }
}
