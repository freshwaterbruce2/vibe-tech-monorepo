# MCP Skills Server

Exposes agent skills from the monorepo and community repositories as MCP tools and resources for system-wide LLM access.

## Features

- **260+ Skills** from two repositories:
  - `c:\dev\.agent\skills` (48 monorepo skills)
  - `c:\dev\antigravity-awesome-skills\skills` (212+ community skills)

- **MCP Tools**:
  - `skills_list` - List all available skills
  - `skills_search` - Search skills by keyword
  - `skills_get` - Get full SKILL.md content
  - `skills_refresh` - Refresh skill cache

- **MCP Resources**:
  - `skill://{id}` - Direct access to skill content

## Installation

```bash
cd c:\dev\apps\mcp-skills-server
pnpm install
pnpm build
```

## Configuration

### Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skills": {
      "command": "node",
      "args": ["C:\\dev\\apps\\mcp-skills-server\\dist\\index.js"]
    }
  }
}
```

### Gemini CLI

Add to `.gemini/mcp_config.json`:

```json
{
  "mcpServers": {
    "skills": {
      "command": "node",
      "args": ["C:\\dev\\apps\\mcp-skills-server\\dist\\index.js"]
    }
  }
}
```

### VS Code (Copilot Chat)

MCP servers are auto-discovered from Claude Desktop config when `chat.mcp.discovery.enabled.claude-desktop` is true.

## Usage

Once configured, any MCP-compatible agent can:

1. **Search for skills**: "Find a skill for Docker containerization"
2. **Read skill content**: Automatically applies the skill instructions
3. **List all skills**: Browse available capabilities

## Development

```bash
pnpm dev  # Watch mode with tsx
```
