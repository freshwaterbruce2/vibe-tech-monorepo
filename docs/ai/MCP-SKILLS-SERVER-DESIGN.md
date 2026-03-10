# MCP Skills Server Architecture

## Overview

An MCP (Model Context Protocol) server that exposes the monorepo's skill system to any MCP-compatible AI client (Claude Code, Claude Desktop, VSCode extensions, etc.).

## Benefits

| Approach | Pros | Cons |
|----------|------|------|
| **Current (MD files)** | Simple, no infrastructure | Tool-specific, manual copy |
| **MCP Server** | Universal, dynamic, live updates | Requires server running |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Skills Server                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │ Skill        │   │ Context      │   │ Project      │        │
│  │ Registry     │   │ Provider     │   │ Detector     │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│         └──────────┬───────┴──────────┬──────┘                 │
│                    │                  │                         │
│              ┌─────▼─────┐     ┌──────▼─────┐                  │
│              │ MCP Tools │     │ MCP        │                  │
│              │ Handler   │     │ Resources  │                  │
│              └───────────┘     └────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌─────▼─────┐         ┌────▼────┐
   │ Claude  │          │ Claude    │         │ VSCode  │
   │ Code    │          │ Desktop   │         │ Ext     │
   └─────────┘          └───────────┘         └─────────┘
```

## MCP Tools (Commands)

### 1. `skills/list`
List available skills with filtering.

```typescript
interface ListSkillsParams {
  category?: 'webapp' | 'desktop' | 'mobile' | 'pwa' | 'database' | 'infra';
  project?: string;  // e.g., 'nova-agent'
}

// Returns: Skill[]
```

### 2. `skills/get`
Get full skill content for a specific skill.

```typescript
interface GetSkillParams {
  skillId: string;  // e.g., 'desktop', 'typescript-expert'
}

// Returns: { name, description, content, commands, patterns }
```

### 3. `skills/recommend`
Get AI-powered skill recommendations based on context.

```typescript
interface RecommendParams {
  prompt: string;
  project?: string;
  intent?: 'bug' | 'feature' | 'refactor' | 'test';
}

// Returns: { recommended: Skill[], reason: string }
```

### 4. `context/get`
Get relevant context for current project/file.

```typescript
interface GetContextParams {
  filePath?: string;
  projectName?: string;
}

// Returns: { project, skills, patterns, commands }
```

## MCP Resources (Data)

### 1. `skill://{category}/{name}`
Access skill content as a resource.

```
skill://categories/webapp
skill://categories/desktop
skill://community/typescript-expert
skill://projects/nova-agent
```

### 2. `context://project/{name}`
Project-specific context and rules.

```
context://project/nova-agent
context://project/crypto-enhanced
```

### 3. `patterns://learned`
Access learned patterns from the learning system.

```
patterns://learned?project=nova-agent&limit=10
```

## Implementation

### Server Structure

```
backend/mcp-skills-server/
├── src/
│   ├── server.ts           # MCP server entry
│   ├── tools/
│   │   ├── skills.ts       # Skill tools
│   │   ├── context.ts      # Context tools
│   │   └── recommend.ts    # Recommendation logic
│   ├── resources/
│   │   ├── skills.ts       # Skill resources
│   │   └── patterns.ts     # Pattern resources
│   ├── registry/
│   │   ├── loader.ts       # Load skills from MD files
│   │   └── index.ts        # Skill registry
│   └── utils/
│       ├── project.ts      # Project detection
│       └── matching.ts     # Skill matching
├── package.json
└── tsconfig.json
```

### Core Implementation

```typescript
// server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'monorepo-skills',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'skills_list',
      description: 'List available skills for the monorepo',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['webapp', 'desktop', 'mobile', 'pwa', 'database', 'infra'] },
          project: { type: 'string' },
        },
      },
    },
    {
      name: 'skills_get',
      description: 'Get a specific skill content',
      inputSchema: {
        type: 'object',
        properties: {
          skillId: { type: 'string' },
        },
        required: ['skillId'],
      },
    },
    {
      name: 'skills_recommend',
      description: 'Get skill recommendations based on context',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          project: { type: 'string' },
          intent: { type: 'string', enum: ['bug', 'feature', 'refactor', 'test'] },
        },
        required: ['prompt'],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'skills_list':
      return listSkills(args);
    case 'skills_get':
      return getSkill(args.skillId);
    case 'skills_recommend':
      return recommendSkills(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Skill Loader

```typescript
// registry/loader.ts
import { readdir, readFile } from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  commands?: string[];
  patterns?: string[];
}

export async function loadSkills(): Promise<Map<string, Skill>> {
  const skills = new Map<string, Skill>();

  // Load category skills
  const categoriesDir = 'C:/dev/.claude/commands/categories';
  const categoryFiles = await readdir(categoriesDir);

  for (const file of categoryFiles) {
    if (file.endsWith('.md')) {
      const content = await readFile(path.join(categoriesDir, file), 'utf-8');
      const { data, content: body } = matter(content);

      skills.set(data.name, {
        id: data.name,
        name: data.name,
        description: data.description,
        category: data.category,
        content: body,
      });
    }
  }

  // Load community skills
  const communityDir = 'C:/dev/.claude/skills/skills';
  const communityFiles = await readdir(communityDir);

  for (const file of communityFiles) {
    if (file.endsWith('.md')) {
      const content = await readFile(path.join(communityDir, file), 'utf-8');
      const { data, content: body } = matter(content);

      skills.set(file.replace('.md', ''), {
        id: file.replace('.md', ''),
        name: data.name || file.replace('.md', ''),
        description: data.description || '',
        category: 'community',
        content: body,
      });
    }
  }

  return skills;
}
```

## Configuration

### Claude Code (`settings.json`)

```json
{
  "mcpServers": {
    "monorepo-skills": {
      "command": "node",
      "args": ["C:/dev/backend/mcp-skills-server/dist/server.js"],
      "env": {
        "SKILLS_ROOT": "C:/dev/.claude"
      }
    }
  }
}
```

### Claude Desktop

```json
{
  "mcpServers": {
    "monorepo-skills": {
      "command": "node",
      "args": ["C:/dev/backend/mcp-skills-server/dist/server.js"]
    }
  }
}
```

## Usage Examples

### In Claude Code

```
User: "I'm working on nova-agent and need to add a new IPC handler"

Claude: [Calls skills_recommend with prompt and project='nova-agent']
       → Returns: desktop skill, typescript-expert, nova-agent SKILL.md

       [Uses skills to generate IPC-compliant code]
```

### In Claude Desktop

```
User: "Help me debug why my React component isn't rendering"

Claude: [Calls skills_list with category='webapp']
       [Calls skills_get with skillId='systematic-debugging']
       → Uses debugging methodology from skill
```

## Roadmap

### Phase 1: Core Server
- [ ] Basic MCP server setup
- [ ] Skill loading from MD files
- [ ] `skills/list` and `skills/get` tools
- [ ] Claude Code integration

### Phase 2: Intelligence
- [ ] Project detection from file paths
- [ ] `skills/recommend` with keyword matching
- [ ] Context-aware skill suggestions
- [ ] Learning system integration

### Phase 3: Advanced Features
- [ ] Pattern learning from successful interactions
- [ ] Skill effectiveness tracking
- [ ] Cross-session memory
- [ ] Hot reload of skill updates

## Comparison: MCP vs Current Approach

| Feature | MD Files | MCP Server |
|---------|----------|------------|
| Setup complexity | Low | Medium |
| Cross-tool support | Manual copy | Automatic |
| Dynamic updates | Requires restart | Live reload |
| Context awareness | Static | Dynamic |
| Recommendation | Manual lookup | AI-powered |
| Learning integration | Separate | Built-in |
| Maintenance | Per-tool | Centralized |

## Recommendation

**Start with MD files** (current approach) for immediate benefit, then **build MCP server** as a Phase 2 enhancement when:
1. You need dynamic skill recommendations
2. Cross-tool consistency becomes painful
3. Learning system integration is ready
4. You want centralized skill management

The MD files we created today work everywhere NOW. The MCP server is the future-proof, scalable solution.
