#!/usr/bin/env node
/**
 * MCP Skills Server
 *
 * Exposes agent skills from the monorepo and community repositories
 * as MCP tools and resources for system-wide LLM access.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getSkill, invalidateCache, listSkills, searchSkills } from './store.js';

// Helper to format tool responses
function asTextContent(value: unknown) {
  const text =
    typeof value === 'string' ? value : (JSON.stringify(value, null, 2) ?? String(value));
  return { content: [{ type: 'text' as const, text }] };
}

// Create MCP server
const server = new Server(
  { name: 'mcp-skills-server', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } },
);

// ─────────────────────────────────────────────────────────────────────────────
// TOOLS
// ─────────────────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'skills_list',
      description:
        `List all available agent skills from the monorepo and community repositories.

Returns: Array of skills with:
- id: Folder name (e.g., "docker-expert", "react-patterns")
- name: Human-readable name
- description: First 200 chars of skill description
- source: "monorepo" or "community"

Filter by source: Pass source="monorepo" or source="community" to filter results.

Example: source="all" (default) → Returns all ~400 skills`,
      inputSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            enum: ['all', 'monorepo', 'community'],
            description: 'Filter by skill source (default: all)',
            default: 'all',
          },
        },
      },
    },
    {
      name: 'skills_search',
      description:
        `Search skills by keyword. Matches against skill names and descriptions. Returns results ranked by relevance score.

Use when: You need a skill for a specific task but don't know the exact ID.

Examples:
- query: "docker" → docker-expert, deployment-procedures
- query: "database design" → database-design, sql-patterns
- limit: 10 (default, max 50)

Returns: Array of {id, name, description, source, score, matchedIn}`,
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (keywords to match against skill names and descriptions)',
            minLength: 1,
          },
          limit: {
            type: 'number',
            description: 'Max results to return (1-50, default: 10)',
            minimum: 1,
            maximum: 50,
            default: 10,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'skills_get',
      description:
        `Get the full content of a skill by its ID. Returns the complete SKILL.md markdown including instructions, workflows, and examples.

Use when: You found a skill via search and need its full implementation details.

Parameters:
- id: Skill folder name (exact match required)

Examples:
- id: "docker-expert" → Full Docker expertise skill
- id: "react-patterns" → React development patterns and best practices

Returns: {id, name, description, source, content}

Error: Skill not found → Use 'skills_search' to find available skills`,
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: "Skill ID (folder name, e.g., 'docker-expert', 'react-patterns')",
            minLength: 1,
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'skills_refresh',
      description:
        `Refresh the skill cache by rescanning .claude/skills directories.

Use when:
- You just added a new skill to .claude/skills/
- You modified an existing SKILL.md file
- Search results seem outdated

Returns: Summary of skills loaded (total count, breakdown by source)

Note: Cache auto-refreshes on server restart, so only needed when modifying skills during an active session.`,
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  switch (name) {
    case 'skills_list': {
      const skills = await listSkills();
      const source = String(a.source ?? 'all');

      const filtered = source === 'all' ? skills : skills.filter((s) => s.source === source);

      return asTextContent({
        total: filtered.length,
        skills: filtered.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description.slice(0, 200),
          source: s.source,
        })),
      });
    }

    case 'skills_search': {
      const query = String(a.query ?? '');
      const limit = Math.min(50, Math.max(1, Number(a.limit ?? 10)));

      if (!query.trim()) {
        throw new Error(
          'Query is required and cannot be empty. Provide keywords to search for skills. ' +
          'Example: query="docker" or query="database design"'
        );
      }

      const results = await searchSkills(query, limit);

      return asTextContent({
        query,
        total: results.length,
        results: results.map((r) => ({
          id: r.skill.id,
          name: r.skill.name,
          description: r.skill.description.slice(0, 200),
          source: r.skill.source,
          score: r.score,
          matchedIn: r.matchedIn,
        })),
      });
    }

    case 'skills_get': {
      const id = String(a.id ?? '');

      if (!id.trim()) {
        throw new Error(
          'Skill ID is required. Provide the exact skill folder name. ' +
          'Use "skills_list" to browse all skills or "skills_search" to find by keyword.'
        );
      }

      const skill = await getSkill(id);

      if (!skill) {
        throw new Error(
          `Skill '${id}' not found. Use 'skills_search' with keywords to find available skills, ` +
          `or 'skills_list' to browse all skills. Check spelling and try a similar ID.`
        );
      }

      return asTextContent({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        source: skill.source,
        content: skill.content,
      });
    }

    case 'skills_refresh': {
      invalidateCache();
      const skills = await listSkills();
      return asTextContent({
        message: 'Skill cache refreshed',
        total: skills.length,
        sources: {
          monorepo: skills.filter((s) => s.source === 'monorepo').length,
          community: skills.filter((s) => s.source === 'community').length,
        },
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCES
// ─────────────────────────────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const skills = await listSkills();

  return {
    resources: skills.map((s) => ({
      uri: `skill://${s.id}`,
      name: s.name,
      description: s.description.slice(0, 100),
      mimeType: 'text/markdown',
    })),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  const match = uri.match(/^skill:\/\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid skill URI: ${uri}`);
  }

  const id = match[1];
  if (!id) {
    throw new Error(`Invalid skill URI: ${uri}`);
  }

  const skill = await getSkill(id);

  if (!skill) {
    throw new Error(`Skill not found: ${id}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'text/markdown',
        text: `# ${skill.name}\n\n${skill.content}`,
      },
    ],
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────

await server.connect(new StdioServerTransport());
