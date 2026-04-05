import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP tool definitions for memory system
 */
export const tools: Tool[] = [
  {
    name: 'memory_search_semantic',
    description:
      'Search semantic long-term knowledge using vector similarity. Returns relevant knowledge chunks with scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_search_episodic',
    description:
      'Search episodic memories (recent events, queries, responses) by text. Returns timestamped events.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_get_recent',
    description:
      'Get recent episodic memories (last N queries/responses). Useful for session context.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceId: {
          type: 'string',
          description:
            'Filter by source ID (e.g., "claude-code", "gemini-cli"). Omit for all sources.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of recent memories (default: 10)',
          default: 10,
        },
      },
    },
  },
  {
    name: 'memory_add_semantic',
    description:
      'Store new long-term knowledge in semantic memory with vector embedding. Use for important insights, patterns, or facts.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Knowledge text to store',
        },
        category: {
          type: 'string',
          description: 'Category (e.g., "architecture", "workflow", "debugging")',
        },
        importance: {
          type: 'number',
          description: 'Importance score 1-10 (default: 5)',
          default: 5,
          minimum: 1,
          maximum: 10,
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata (JSON object)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'memory_add_episodic',
    description:
      'Record a new episodic event (query/response pair). Automatically called for most interactions.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceId: {
          type: 'string',
          description: 'Source identifier (e.g., "claude-code", "gemini-cli")',
        },
        query: {
          type: 'string',
          description: 'User query text',
        },
        response: {
          type: 'string',
          description: 'Agent response text',
        },
        sessionId: {
          type: 'string',
          description: 'Session identifier (optional)',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata (JSON object)',
        },
      },
      required: ['sourceId', 'query', 'response'],
    },
  },
  {
    name: 'memory_track_pattern',
    description:
      'Track a command/workflow pattern (procedural memory). Use to learn user habits and common workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Command or workflow pattern',
        },
        context: {
          type: 'string',
          description: 'When/why this pattern is used',
        },
        successful: {
          type: 'boolean',
          description: 'Whether the pattern was successful',
          default: true,
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata (JSON object)',
        },
      },
      required: ['pattern', 'context'],
    },
  },
  {
    name: 'memory_get_patterns',
    description:
      'Get most frequently used or most successful command patterns. Useful for suggesting workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        sortBy: {
          type: 'string',
          description: 'Sort by "frequency" or "success"',
          enum: ['frequency', 'success'],
          default: 'frequency',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of patterns (default: 10)',
          default: 10,
        },
      },
    },
  },
  {
    name: 'memory_health',
    description:
      'Get memory system health status and statistics. Returns database counts and embedding provider status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'memory_get_session',
    description:
      'Get all episodic memories for a specific session. Use to replay/review what happened in a session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Session ID to retrieve',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'memory_search_timerange',
    description:
      'Search episodic memories within a time range. Use for "what did I work on last week" type queries.',
    inputSchema: {
      type: 'object',
      properties: {
        startTime: {
          type: 'number',
          description: 'Start timestamp (Unix milliseconds)',
        },
        endTime: {
          type: 'number',
          description: 'End timestamp (Unix milliseconds)',
        },
        query: {
          type: 'string',
          description: 'Optional text filter',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 50)',
          default: 50,
        },
      },
      required: ['startTime', 'endTime'],
    },
  },
  {
    name: 'memory_suggest',
    description:
      'Get smart suggestions based on memory patterns. Returns workflow recommendations, optimization tips, and pattern insights.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum suggestions (default: 5)',
          default: 5,
        },
      },
    },
  },
  {
    name: 'memory_export',
    description:
      'Export memories to Markdown format. Generate reports, session summaries, or knowledge base dumps.',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description:
            'Export format: "full" (complete report), "session" (single session), "knowledge" (semantic only)',
          enum: ['full', 'session', 'knowledge'],
          default: 'full',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID (required if format=session)',
        },
        category: {
          type: 'string',
          description: 'Category filter for semantic memories',
        },
        startTime: {
          type: 'number',
          description: 'Start timestamp for episodic filter (Unix ms)',
        },
        endTime: {
          type: 'number',
          description: 'End timestamp for episodic filter (Unix ms)',
        },
      },
    },
  },
  {
    name: 'memory_analyze_pattern',
    description:
      'Get detailed insights about a specific command pattern. Shows frequency, success rate, and related patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Pattern name to analyze',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'memory_consolidate',
    description:
      'Consolidate similar semantic memories by merging duplicates. Reduces redundancy and improves knowledge quality.',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Similarity threshold 0-1 (default: 0.9). Higher = more strict matching.',
          default: 0.9,
          minimum: 0,
          maximum: 1,
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview changes without applying them (default: false)',
          default: false,
        },
        category: {
          type: 'string',
          description: 'Only consolidate within this category (optional)',
        },
      },
    },
  },
  {
    name: 'memory_consolidate_preview',
    description: 'Preview memory consolidation without applying changes. See what would be merged.',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: {
          type: 'number',
          description: 'Similarity threshold 0-1 (default: 0.9)',
          default: 0.9,
          minimum: 0,
          maximum: 1,
        },
        category: {
          type: 'string',
          description: 'Only check this category (optional)',
        },
      },
    },
  },
  // Crypto Trading Integration
  {
    name: 'memory_track_trade',
    description:
      'Track a trading decision (buy/sell/hold) with context, outcome, and P&L. Builds trading pattern knowledge.',
    inputSchema: {
      type: 'object',
      properties: {
        pair: {
          type: 'string',
          description: 'Trading pair (e.g., BTC/USD, ETH/USD)',
        },
        action: {
          type: 'string',
          enum: ['buy', 'sell', 'hold'],
          description: 'Trading action',
        },
        price: {
          type: 'number',
          description: 'Execution price',
        },
        amount: {
          type: 'number',
          description: 'Trade amount/volume',
        },
        reason: {
          type: 'string',
          description: 'Trading rationale',
        },
        confidence: {
          type: 'number',
          description: 'Confidence level 0-1',
          minimum: 0,
          maximum: 1,
        },
        outcome: {
          type: 'string',
          enum: ['profit', 'loss', 'pending'],
          description: 'Trade outcome (optional)',
        },
        pnl: {
          type: 'number',
          description: 'Profit/loss amount (optional)',
        },
      },
      required: ['pair', 'action', 'price', 'amount', 'reason', 'confidence'],
    },
  },
  {
    name: 'memory_get_trading_patterns',
    description: 'Get successful trading patterns and strategies based on historical performance.',
    inputSchema: {
      type: 'object',
      properties: {
        minWinRate: {
          type: 'number',
          description: 'Minimum win rate filter 0-1 (default: 0.6)',
          default: 0.6,
          minimum: 0,
          maximum: 1,
        },
      },
    },
  },
  {
    name: 'memory_trading_suggestions',
    description:
      'Get AI-powered trading suggestions based on pattern analysis and recent performance.',
    inputSchema: {
      type: 'object',
      properties: {
        pair: {
          type: 'string',
          description: 'Filter suggestions for specific trading pair (optional)',
        },
      },
    },
  },
  // Git Workflow Integration
  {
    name: 'memory_track_commit',
    description:
      'Track a git commit with metadata. Learns commit patterns and conventional commit usage.',
    inputSchema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'Commit hash',
        },
        message: {
          type: 'string',
          description: 'Commit message',
        },
        author: {
          type: 'string',
          description: 'Commit author',
        },
        branch: {
          type: 'string',
          description: 'Branch name',
        },
        filesChanged: {
          type: 'number',
          description: 'Number of files changed',
        },
        additions: {
          type: 'number',
          description: 'Lines added',
        },
        deletions: {
          type: 'number',
          description: 'Lines deleted',
        },
      },
      required: ['hash', 'message', 'author', 'branch', 'filesChanged', 'additions', 'deletions'],
    },
  },
  {
    name: 'memory_suggest_git_command',
    description: 'Suggest next git command based on workflow patterns. Learns your git habits.',
    inputSchema: {
      type: 'object',
      properties: {
        currentCommand: {
          type: 'string',
          description: 'Current git command (e.g., "git add", "git commit")',
        },
      },
      required: ['currentCommand'],
    },
  },
  {
    name: 'memory_commit_stats',
    description: 'Get git commit statistics (by type, branch, day, etc.). Analyze coding patterns.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // Nova-Agent Context Integration
  {
    name: 'memory_set_context',
    description:
      'Set current project context (active project, files, tasks). Persists across sessions.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Project name',
        },
        path: {
          type: 'string',
          description: 'Project path',
        },
        currentFile: {
          type: 'string',
          description: 'Currently active file (optional)',
        },
        currentTask: {
          type: 'string',
          description: 'Current task description (optional)',
        },
        recentFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of recently accessed files',
        },
        recentTasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of recent task IDs',
        },
      },
      required: ['name', 'path', 'recentFiles', 'recentTasks'],
    },
  },
  {
    name: 'memory_get_context',
    description: 'Get last known project context. Restores where you left off in previous session.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'memory_suggest_task',
    description: 'Suggest next task based on priority and age. Smart task management.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // Learning System Integration (C4)
  {
    name: 'memory_learning_sync',
    description:
      'Sync learning system execution data into memory. Imports recent patterns, outcomes, and agent training data from the learning database.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum records to sync (default: 100)',
          default: 100,
        },
        since: {
          type: 'number',
          description: 'Only sync records newer than this timestamp (Unix ms)',
        },
      },
    },
  },
  {
    name: 'memory_learning_agent_context',
    description:
      'Get agent training context from the learning system. Returns execution patterns, success rates, and behavioral insights.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent identifier to get context for (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum context items (default: 20)',
          default: 20,
        },
      },
    },
  },
  {
    name: 'memory_learning_health',
    description:
      'Health check for the learning system bridge. Returns connectivity status and record counts.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'memory_learning_write_pattern',
    description:
      'Write a discovered success pattern back to the learning database. Upserts by type+description.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Pattern type/category (e.g., "lint-fix", "dependency-resolution")',
        },
        description: {
          type: 'string',
          description: 'Human-readable description of the successful pattern/approach',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score 0.0-1.0 (default: 0.7)',
          default: 0.7,
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata (project, tools used, etc.)',
        },
      },
      required: ['type', 'description'],
    },
  },
  {
    name: 'memory_learning_record_execution',
    description:
      'Record an agent execution in the learning database for tracking performance over time.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent identifier (e.g., "monorepo-orchestrator", "claude-code")',
        },
        taskType: {
          type: 'string',
          description: 'Type of task performed (e.g., "lint-fix", "feature-implementation")',
        },
        projectName: {
          type: 'string',
          description: 'Project name if applicable',
        },
        toolsUsed: {
          type: 'string',
          description: 'Comma-separated list of tools used',
        },
        success: {
          type: 'boolean',
          description: 'Whether the execution succeeded',
        },
        executionTimeMs: {
          type: 'number',
          description: 'Execution time in milliseconds',
        },
        errorMessage: {
          type: 'string',
          description: 'Error message if failed',
        },
        context: {
          type: 'string',
          description: 'Brief description of what was done',
        },
      },
      required: ['agentId', 'taskType', 'success'],
    },
  },
  // RAG Pipeline Integration (WS5)
  {
    name: 'memory_rag_search',
    description:
      'Search the codebase using the RAG pipeline (hybrid vector + full-text search with reranking). Returns relevant code chunks with scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 5)',
          default: 5,
        },
        fileTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by file extensions (e.g., [".ts", ".tsx"])',
        },
        pathPrefix: {
          type: 'string',
          description: 'Filter by path prefix (e.g., "apps/nova-agent/src")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_rag_index_status',
    description:
      'Get RAG index status: total files indexed, last index time, chunk count, and storage size.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'memory_rag_invalidate',
    description:
      'Invalidate RAG cache entries for specific file paths. Use after file edits to ensure fresh search results.',
    inputSchema: {
      type: 'object',
      properties: {
        filePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'File paths to invalidate cache for',
        },
      },
      required: ['filePaths'],
    },
  },
  {
    name: 'memory_rag_trigger_index',
    description:
      'Trigger an immediate background RAG index pass. Returns immediately; check memory_rag_index_status for progress. Use when the index is empty or to force a refresh after many file changes.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // Hierarchical Summarization & Memory Decay
  {
    name: 'memory_summarize_session',
    description:
      'Run hierarchical summarization on episodic memories. Groups episodes into sessions, extracts topics, and synthesizes domain-level insights. Optionally uses LLM for higher-quality summaries.',
    inputSchema: {
      type: 'object',
      properties: {
        useLlm: {
          type: 'boolean',
          description:
            'Use LLM for summarization instead of extractive (requires LLM_API_URL env var, default: false)',
          default: false,
        },
        minSessionSize: {
          type: 'number',
          description: 'Minimum episodes per session group (default: 3)',
          default: 3,
        },
        sessionWindowMs: {
          type: 'number',
          description: 'Time window for session grouping in ms (default: 7200000 = 2 hours)',
          default: 7200000,
        },
      },
    },
  },
  {
    name: 'memory_summarize_stats',
    description:
      'Get current hierarchical summarization statistics. Shows counts of sessions, topics, and domains generated.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'memory_decay_stats',
    description:
      'Get memory decay statistics. Shows how many memories are below the archive threshold, average decay scores, and archived count.',
    inputSchema: {
      type: 'object',
      properties: {
        archiveThreshold: {
          type: 'number',
          description: 'Score threshold below which memories are considered decayed (default: 0.3)',
          default: 0.3,
          minimum: 0,
          maximum: 1,
        },
      },
    },
  },

  // Conflict Detection (Phase 3)
  {
    name: 'memory_conflict_check',
    description:
      'Check for semantic conflicts before storing a new memory. Returns similar existing memories and a recommendation: "store" (no conflict), "merge" (near-duplicate ≥0.92), or "review" (potential conflict 0.85–0.92).',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to check for conflicts against existing semantic memories',
        },
        category: {
          type: 'string',
          description: 'Optional category to filter search scope',
        },
      },
      required: ['text'],
    },
  },

  // Unified Search (Phase 3)
  {
    name: 'memory_search_unified',
    description:
      'Search across ALL memory systems (semantic, episodic, RAG codebase, learning) with a single query. Uses Reciprocal Rank Fusion to merge results from all sources. Best for broad context gathering.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
          default: 10,
        },
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['semantic', 'episodic', 'rag', 'learning'],
          },
          description: 'Which sources to search (default: all)',
        },
      },
      required: ['query'],
    },
  },
];
