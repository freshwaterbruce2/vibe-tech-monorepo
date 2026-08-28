/**
 * Episodic + pattern + git + context + health + export tools
 * Extracted from the original 936-line single array
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const episodicTools: Tool[] = [
  {
    name: 'memory_search_episodic',
    description: 'Search episodic memories (recent events, queries, responses) by text. Returns timestamped events.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 10)', default: 10 },
      },
      required: ['query'],
    },
  },
  {
    name: 'memory_get_recent',
    description: 'Get recent episodic memories (last N queries/responses). Useful for session context.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceId: { type: 'string', description: 'Filter by source ID (e.g., \"claude-code\", \"gemini-cli\"). Omit for all sources.' },
        limit: { type: 'number', description: 'Maximum number of recent memories (default: 10)', default: 10 },
      },
    },
  },
  {
    name: 'memory_add_episodic',
    description: 'Record a new episodic event (query/response pair). Automatically called for most interactions.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceId: { type: 'string', description: 'Source identifier (e.g., \"claude-code\", \"gemini-cli\")' },
        query: { type: 'string', description: 'User query text' },
        response: { type: 'string', description: 'Agent response text' },
        sessionId: { type: 'string', description: 'Session identifier (optional)' },
        metadata: { type: 'object', description: 'Additional metadata (JSON object)' },
      },
      required: ['sourceId', 'query', 'response'],
    },
  },
  {
    name: 'memory_track_pattern',
    description: 'Track a command/workflow pattern (procedural memory). Use to learn user habits and common workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Command or workflow pattern' },
        context: { type: 'string', description: 'When/why this pattern is used' },
        successful: { type: 'boolean', description: 'Whether the pattern was successful', default: true },
        metadata: { type: 'object', description: 'Additional metadata (JSON object)' },
      },
      required: ['pattern', 'context'],
    },
  },
  {
    name: 'memory_get_patterns',
    description: 'Get most frequently used or most successful command patterns. Useful for suggesting workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        sortBy: { type: 'string', description: 'Sort by \"frequency\" or \"success\"', enum: ['frequency', 'success'], default: 'frequency' },
        limit: { type: 'number', description: 'Maximum number of patterns (default: 10)', default: 10 },
      },
    },
  },
  {
    name: 'memory_health',
    description: 'Get memory system health status and statistics. Returns database counts and embedding provider status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'memory_get_session',
    description: 'Get all episodic memories for a specific session. Use to replay/review what happened in a session.',
    inputSchema: {
      type: 'object',
      properties: { sessionId: { type: 'string', description: 'Session ID to retrieve' } },
      required: ['sessionId'],
    },
  },
  {
    name: 'memory_search_timerange',
    description: 'Search episodic memories within a time range. Use for \"what did I work on last week\" type queries.',
    inputSchema: {
      type: 'object',
      properties: {
        startTime: { type: 'number', description: 'Start timestamp (Unix milliseconds)' },
        endTime: { type: 'number', description: 'End timestamp (Unix milliseconds)' },
        query: { type: 'string', description: 'Optional text filter' },
        limit: { type: 'number', description: 'Maximum results (default: 50)', default: 50 },
      },
      required: ['startTime', 'endTime'],
    },
  },
  {
    name: 'memory_suggest',
    description: 'Get smart suggestions based on memory patterns. Returns workflow recommendations, optimization tips, and pattern insights.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Maximum suggestions (default: 5)', default: 5 } },
    },
  },
  {
    name: 'memory_export',
    description: 'Export memories to Markdown format. Generate reports, session summaries, or knowledge base dumps.',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', description: 'Export format: \"full\" (complete report), \"session\" (single session), \"knowledge\" (semantic only)', enum: ['full', 'session', 'knowledge'], default: 'full' },
        sessionId: { type: 'string', description: 'Session ID (required if format=session)' },
        category: { type: 'string', description: 'Category filter for semantic memories' },
        startTime: { type: 'number', description: 'Start timestamp for episodic filter (Unix ms)' },
        endTime: { type: 'number', description: 'End timestamp for episodic filter (Unix ms)' },
      },
    },
  },
  {
    name: 'memory_analyze_pattern',
    description: 'Get detailed insights about a specific command pattern. Shows frequency, success rate, and related patterns.',
    inputSchema: {
      type: 'object',
      properties: { pattern: { type: 'string', description: 'Pattern name to analyze' } },
      required: ['pattern'],
    },
  },
  // Git Workflow
  {
    name: 'memory_track_commit',
    description: 'Track a git commit with metadata. Learns commit patterns and conventional commit usage.',
    inputSchema: {
      type: 'object',
      properties: {
        hash: { type: 'string', description: 'Commit hash' },
        message: { type: 'string', description: 'Commit message' },
        author: { type: 'string', description: 'Commit author' },
        branch: { type: 'string', description: 'Branch name' },
        filesChanged: { type: 'number', description: 'Number of files changed' },
        additions: { type: 'number', description: 'Lines added' },
        deletions: { type: 'number', description: 'Lines deleted' },
      },
      required: ['hash', 'message', 'author', 'branch', 'filesChanged', 'additions', 'deletions'],
    },
  },
  {
    name: 'memory_suggest_git_command',
    description: 'Suggest next git command based on workflow patterns. Learns your git habits.',
    inputSchema: {
      type: 'object',
      properties: { currentCommand: { type: 'string', description: 'Current git command (e.g., \"git add\", \"git commit\")' } },
      required: ['currentCommand'],
    },
  },
  {
    name: 'memory_commit_stats',
    description: 'Get git commit statistics (by type, branch, day, etc.). Analyze coding patterns.',
    inputSchema: { type: 'object', properties: {} },
  },
  // Project Context
  {
    name: 'memory_set_context',
    description: 'Set current project context (active project, files, tasks). Persists across sessions.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'Project path' },
        currentFile: { type: 'string', description: 'Currently active file (optional)' },
        currentTask: { type: 'string', description: 'Current task description (optional)' },
        recentFiles: { type: 'array', items: { type: 'string' }, description: 'List of recently accessed files' },
        recentTasks: { type: 'array', items: { type: 'string' }, description: 'List of recent task IDs' },
      },
      required: ['name', 'path', 'recentFiles', 'recentTasks'],
    },
  },
  {
    name: 'memory_get_context',
    description: 'Get last known project context. Restores where you left off in previous session.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'memory_suggest_task',
    description: 'Suggest next task based on priority and age. Smart task management.',
    inputSchema: { type: 'object', properties: {} },
  },
];
