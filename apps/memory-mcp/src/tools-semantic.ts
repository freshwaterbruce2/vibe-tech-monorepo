/**
 * Semantic + unified + learning + trading + conflict tools
 * (extracted from the original 936-line single array)
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const semanticTools: Tool[] = [
  {
    name: 'memory_search_semantic',
    description: 'Search semantic long-term knowledge using vector similarity. Returns relevant knowledge chunks with scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 5)', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_add_semantic',
    description: 'Store new long-term knowledge in semantic memory with vector embedding. Use for important insights, patterns, or facts.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Knowledge text to store' },
        category: { type: 'string', description: 'Category (e.g., \"architecture\", \"workflow\", \"debugging\")' },
        importance: { type: 'number', description: 'Importance score 1-10 (default: 5)', default: 5, minimum: 1, maximum: 10 },
        metadata: { type: 'object', description: 'Additional metadata (JSON object)' },
      },
      required: ['text'],
    },
  },
  {
    name: 'memory_consolidate',
    description: 'Consolidate similar semantic memories by merging duplicates. Reduces redundancy and improves knowledge quality.',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Similarity threshold 0-1 (default: 0.9). Higher = more strict matching.', default: 0.9, minimum: 0, maximum: 1 },
        dryRun: { type: 'boolean', description: 'Preview changes without applying them (default: false)', default: false },
        category: { type: 'string', description: 'Only consolidate within this category (optional)' },
      },
    },
  },
  {
    name: 'memory_consolidate_preview',
    description: 'Preview memory consolidation without applying changes. See what would be merged.',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Similarity threshold 0-1 (default: 0.9)', default: 0.9, minimum: 0, maximum: 1 },
        category: { type: 'string', description: 'Only check this category (optional)' },
      },
    },
  },
  {
    name: 'memory_conflict_check',
    description: 'Check for semantic conflicts before storing a new memory. Returns similar existing memories and a recommendation: \"store\" (no conflict), \"merge\" (near-duplicate ≥0.92), or \"review\" (potential conflict 0.85–0.92).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to check for conflicts against existing semantic memories' },
        category: { type: 'string', description: 'Optional category to filter search scope' },
      },
      required: ['text'],
    },
  },
  {
    name: 'memory_search_unified',
    description: 'Search across ALL memory systems (semantic, episodic, RAG codebase, learning) with a single query. Uses Reciprocal Rank Fusion to merge results from all sources. Best for broad context gathering.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 10)', default: 10 },
        sources: {
          type: 'array',
          items: { type: 'string', enum: ['semantic', 'episodic', 'procedural', 'cognitive', 'rag', 'learning'] },
          description: 'Which sources to search (default: standard semantic, episodic, procedural, rag, learning; cognitive is opt-in)',
        },
      },
      required: ['query'],
    },
  },
  // Learning System
  {
    name: 'memory_learning_sync',
    description: 'Sync learning system execution data into memory. Imports recent patterns, outcomes, and agent training data from the learning database.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum records to sync (default: 100)', default: 100 },
        since: { type: 'number', description: 'Only sync records newer than this timestamp (Unix ms)' },
      },
    },
  },
  {
    name: 'memory_learning_agent_context',
    description: 'Get agent training context from the learning system. Returns execution patterns, success rates, and behavioral insights.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent identifier to get context for (optional)' },
        limit: { type: 'number', description: 'Maximum context items (default: 20)', default: 20 },
      },
    },
  },
  {
    name: 'memory_learning_health',
    description: 'Health check for the learning system bridge. Returns connectivity status and record counts.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'memory_learning_write_pattern',
    description: 'Write a discovered success pattern back to the learning database. Upserts by type+description.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Pattern type/category (e.g., \"lint-fix\", \"dependency-resolution\")' },
        description: { type: 'string', description: 'Human-readable description of the successful pattern/approach' },
        confidence: { type: 'number', description: 'Confidence score 0.0-1.0 (default: 0.7)', default: 0.7 },
      },
      required: ['type', 'description'],
    },
  },
  {
    name: 'memory_learning_record_execution',
    description: 'Record the outcome of an agent execution for learning. Captures full task metadata and 4-factor cognitive scoring.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent identifier' },
        task: { type: 'string', description: 'Task description' },
        success: { type: 'boolean', description: 'Whether the task succeeded' },
        durationMs: { type: 'number', description: 'Execution duration in milliseconds' },
        metadata: { type: 'object', description: 'Additional metadata (JSON object)' },
      },
      required: ['agentId', 'task', 'success', 'durationMs'],
    },
  },
  {
    name: 'memory_learning_query',
    description: 'Retrieve task outcomes and anti-patterns with 4-factor cognitive scoring: semantic similarity, base-level activation/decay, success rate, and confidence.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text' },
        limit: { type: 'number', description: 'Maximum cognitive results to return (default: 5)', default: 5 },
        kind: { type: 'string', enum: ['outcome', 'anti_pattern'], description: 'Optional cognitive memory kind filter' },
        minScore: { type: 'number', description: 'Optional minimum final score 0-1', minimum: 0, maximum: 1 },
        includeSemantic: { type: 'boolean', description: 'Also return standard semantic vector results for comparison', default: false },
      },
      required: ['query'],
    },
  },
  // Trading
  {
    name: 'memory_track_trade',
    description: 'Track a trading decision (buy/sell/hold) with context, outcome, and P&L. Builds trading pattern knowledge.',
    inputSchema: {
      type: 'object',
      properties: {
        pair: { type: 'string', description: 'Trading pair (e.g., BTC/USD, ETH/USD)' },
        action: { type: 'string', enum: ['buy','sell','hold'], description: 'Trading action' },
        price: { type: 'number', description: 'Execution price' },
        amount: { type: 'number', description: 'Trade amount/volume' },
        reason: { type: 'string', description: 'Trading rationale' },
        confidence: { type: 'number', description: 'Confidence level 0-1', minimum: 0, maximum: 1 },
        outcome: { type: 'string', enum: ['profit','loss','pending'], description: 'Trade outcome (optional)' },
        pnl: { type: 'number', description: 'Profit/loss amount (optional)' },
      },
      required: ['pair','action','price','amount','reason','confidence'],
    },
  },
  {
    name: 'memory_get_trading_patterns',
    description: 'Get successful trading patterns and strategies based on historical performance.',
    inputSchema: {
      type: 'object',
      properties: {
        minWinRate: { type: 'number', description: 'Minimum win rate filter 0-1 (default: 0.6)', default: 0.6, minimum: 0, maximum: 1 },
      },
    },
  },
  {
    name: 'memory_trading_suggestions',
    description: 'Get AI-powered trading suggestions based on pattern analysis and recent performance.',
    inputSchema: {
      type: 'object',
      properties: { pair: { type: 'string', description: 'Filter suggestions for specific trading pair (optional)' } },
    },
  },
];
