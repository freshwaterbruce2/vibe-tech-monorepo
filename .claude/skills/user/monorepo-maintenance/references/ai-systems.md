# AI Systems

Patterns and maintenance guidance for agents, MCP servers, plugins, and skills.

## Categories

1. **Agents**: Autonomous AI systems (nova-agent)
2. **MCP Servers**: Model Context Protocol servers
3. **Plugins**: Extensions for Claude/other AI tools
4. **Skills**: Modular capability packages

## LLM Providers

### In-App (what the apps use at runtime)

| Provider      | API Endpoint           | Used By                                                | Notes                                       |
| ------------- | ---------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Moonshot AI   | `platform.moonshot.ai` | Primary for all AI features                            | OpenAI-compatible API format                |
| Primary model | Kimi K2.5              | nova-agent, vibe-code-studio, vibe-justice, vibe-tutor | 1T MoE, 32B active, multimodal, Agent Swarm |

**Previous provider (may still exist in some configs):** OpenRouter with DeepSeek R1. Migrate remaining references to Moonshot/Kimi K2.5.

**Kimi K2.5 API notes:**

- OpenAI-compatible SDK (`openai` package works directly)
- Supports Thinking mode (temp 1.0) and Instant mode (temp 0.6)
- Recommended top_p: 0.95
- For Instant mode: pass `{'chat_template_kwargs': {"thinking": False}}` in extra_body
- Pricing: $0.60/M input tokens, $2.50/M output tokens

### Development Assistants (what assists Bruce)

| Tool                 | Model           | Role                                        |
| -------------------- | --------------- | ------------------------------------------- |
| Claude.ai (Projects) | Claude Opus 4.6 | Senior Architect, deep logic, case strategy |
| Gemini               | Gemini 2.5 Pro  | Rapid UI, PowerShell, documentation         |
| Claude Code          | Claude Opus 4.6 | Agentic coding, monorepo orchestration      |

These are SEPARATE contexts. Never confuse "what model the app calls" with "what model assists development."

## MCP Servers

### Standard Structure

```
mcp-server-name/
├── src/
│   ├── index.ts          # Entry point, server setup
│   ├── tools/            # Tool definitions
│   ├── resources/        # Resource handlers
│   └── prompts/          # Prompt templates
├── package.json
└── tsconfig.json
```

### Active MCP Servers

| Server               | Location                    | Status     | Purpose            |
| -------------------- | --------------------------- | ---------- | ------------------ |
| desktop-commander-v3 | `apps/desktop-commander-v3` | Active     | Desktop automation |
| mcp-codeberg         | `apps/mcp-codeberg`         | Active     | GitHub integration |
| mcp-gateway          | `apps/mcp-gateway`          | Active     | Gateway/router     |
| memory-mcp           | `apps/memory-mcp`           | Active     | Memory system      |
| nova-sqlite-mcp      | `backend/nova-sqlite-mcp`   | Active     | SQLite access      |
| mcp-skills-server    | `apps/mcp-skills-server`    | DEPRECATED | Skills (replaced)  |

### Dependencies to Track

| Package                   | Purpose           | Notes                 |
| ------------------------- | ----------------- | --------------------- |
| @modelcontextprotocol/sdk | MCP SDK           | Core dependency       |
| zod                       | Schema validation | Tool input validation |

### Config Patterns

```json
// package.json
{
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "mcp-server-name": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Tool Definition Pattern

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'tool_name',
      description: 'What it does',
      inputSchema: {
        type: 'object',
        properties: {
          param: { type: 'string', description: '...' },
        },
        required: ['param'],
      },
    },
  ],
}));
```

## Agents (nova-agent)

### Components

- **Orchestrator**: Agent coordination
- **RAG Pipeline**: Document retrieval
- **Tool Registry**: Available capabilities
- **Memory**: Conversation/context persistence

### Dependencies to Track

| Package           | Purpose             | Notes                                             |
| ----------------- | ------------------- | ------------------------------------------------- |
| openai (SDK)      | Moonshot API access | OpenAI-compatible, points to platform.moonshot.ai |
| @anthropic-ai/sdk | Anthropic API       | Direct access if needed                           |
| chromadb          | Local vector DB     | RAG storage                                       |

### RAG Maintenance

- Embedding model versions
- Chunk size/overlap settings
- Index refresh schedules
- Document source updates

## Skills

### Standard Structure

```
skill-name/
├── SKILL.md              # Metadata + instructions
├── references/           # Loaded as needed
├── scripts/              # Executable code
└── assets/               # Output resources
```

### Maintenance Checklist

- [ ] Frontmatter complete (name, description)
- [ ] Description triggers correctly
- [ ] Scripts tested and working
- [ ] References up to date
- [ ] No outdated framework patterns

## Common Issues

1. **MCP SDK breaking changes**: Check changelog before update
2. **API key rotation**: Ensure env vars updated (esp. Moonshot API key)
3. **Model deprecation**: Watch for model sunset notices
4. **Rate limits**: Verify limits haven't changed
5. **Context window sizes**: Kimi K2.5 supports 256K tokens
6. **Provider migration**: Grep for remaining OpenRouter/DeepSeek R1 references and migrate to Moonshot
