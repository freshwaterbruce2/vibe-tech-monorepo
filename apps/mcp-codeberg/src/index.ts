import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios, { type AxiosInstance } from 'axios';
import { z } from 'zod';

// --- Configuration ---
const CODEBERG_API_URL = process.env.CODEBERG_API_URL || 'https://codeberg.org/api/v1';
const CODEBERG_TOKEN = process.env.CODEBERG_TOKEN;

// --- API Client ---
class CodebergClient {
  private api: AxiosInstance;

  constructor(baseURL: string, token?: string) {
    this.api = axios.create({
      baseURL,
      headers: token ? { Authorization: `token ${token}` } : {},
    });
  }

  async searchRepositories(query: string, limit = 10) {
    try {
      const response = await this.api.get('/repos/search', {
        params: { q: query, limit },
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        `Failed to search repositories: ${error.message}. ` +
          `Verify the query syntax and check network connection to Codeberg.`,
      );
    }
  }

  async getFileContent(owner: string, repo: string, filepath: string, ref?: string) {
    try {
      const params: any = {};
      if (ref) params.ref = ref;

      const response = await this.api.get(`/repos/${owner}/${repo}/contents/${filepath}`, {
        params,
      });

      const content = response.data.content;
      const encoding = response.data.encoding;

      if (encoding === 'base64') {
        return Buffer.from(content, 'base64').toString('utf-8');
      }
      return content;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(
          `File not found: ${filepath} in ${owner}/${repo}. ` +
            `Check the path and ref parameter. Use 'codeberg_get_repo_details' to verify the repository exists.`,
        );
      }
      if (error.response?.status === 403) {
        throw new Error(
          `Access denied to ${owner}/${repo}. Repository may be private. ` +
            `Set CODEBERG_TOKEN environment variable if you have access.`,
        );
      }
      throw new Error(
        `Failed to get file content: ${error.message}. Check repository name and network connection.`,
      );
    }
  }

  async getRepository(owner: string, repo: string) {
    try {
      const response = await this.api.get(`/repos/${owner}/${repo}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(
          `Repository not found: ${owner}/${repo}. ` +
            `Check spelling or use 'codeberg_search_repos' to find the correct name.`,
        );
      }
      throw new Error(
        `Failed to get repository: ${error.message}. ` +
          `Verify owner and repo names are correct.`,
      );
    }
  }
}

const client = new CodebergClient(CODEBERG_API_URL, CODEBERG_TOKEN);

// --- MCP Server (new registerTool API) ---
const server = new McpServer({
  name: 'mcp-codeberg',
  version: '1.0.0',
});

// --- Tool: codeberg_search_repos ---
server.tool(
  'codeberg_search_repos',
  `Search for public repositories on Codeberg by keywords. Searches across repo names, descriptions, and topics. Returns repository metadata including owner, name, description, stars, and last updated date.

Examples:
- query: "markdown parser" (finds markdown-related projects)
- query: "lang:rust database" (finds Rust database projects)
- limit: 10 (default, max 50)

Returns: Array of repository objects sorted by relevance.`,
  {
    query: z.string().min(1).describe('Search keywords (names, descriptions, topics)'),
    limit: z.number().min(1).max(50).default(10).describe('Max results (1-50, default 10)'),
  },
  async ({ query, limit }) => {
    try {
      const results = await client.searchRepositories(query, limit);
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  },
);

// --- Tool: codeberg_read_file ---
server.tool(
  'codeberg_read_file',
  `Read the decoded UTF-8 content of a text file from a Codeberg repository. Automatically decodes base64-encoded files from the API.

Parameters:
- owner: Repository owner (user or organization name)
- repo: Repository name
- path: File path within repo (e.g., "src/index.ts", "README.md")
- ref: (optional) Branch, tag, or commit SHA. Defaults to repo's default branch.

Returns: Plain text content of the file.

Error Cases:
- 404: File not found at specified path
- 403: Access denied (repository may be private)

Examples:
- owner: "Vibe-Tech", repo: "Monorepo", path: "CLAUDE.md"
- owner: "forgejo", repo: "forgejo", path: "README.md", ref: "v1.21.0"`,
  {
    owner: z.string().min(1).describe('Repository owner (user or organization)'),
    repo: z.string().min(1).describe('Repository name'),
    path: z.string().min(1).describe("File path (e.g., 'src/index.ts')"),
    ref: z.string().optional().describe('Branch, tag, or commit SHA (optional)'),
  },
  async ({ owner, repo, path, ref }) => {
    try {
      const content = await client.getFileContent(owner, repo, path, ref);
      return { content: [{ type: 'text', text: content }] };
    } catch (error: any) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  },
);

// --- Tool: codeberg_get_repo_details ---
server.tool(
  'codeberg_get_repo_details',
  `Get detailed metadata about a specific Codeberg repository, including description, star count, fork count, language, license, and timestamps.

Use this when:
- You know the exact owner/repo name
- You need full repository metadata (not just search results)
- Verifying a repository exists before reading files

Returns: Repository object with ~20 fields including name, description, stars, forks, language, default_branch, created_at, updated_at.

Example:
- owner: "Vibe-Tech", repo: "Monorepo"`,
  {
    owner: z.string().min(1).describe('Repository owner (user or organization)'),
    repo: z.string().min(1).describe('Repository name'),
  },
  async ({ owner, repo }) => {
    try {
      const details = await client.getRepository(owner, repo);
      return { content: [{ type: 'text', text: JSON.stringify(details, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }
  },
);

// --- Start Server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Codeberg MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main loop:', error);
  process.exit(1);
});
