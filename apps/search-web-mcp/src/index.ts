#!/usr/bin/env node
/**
 * search-web-mcp — Custom Web Search MCP server.
 * Uses DuckDuckGo HTML scraping to query the web without API keys.
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface FetchOptions {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
}

interface FetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

function normalizeDuckDuckGoUrl(url: string): string {
  try {
    const urlToParse = url.startsWith("//") ? `https:${url}` : url;
    const parsed = new URL(urlToParse);
    if (
      parsed.hostname.includes("duckduckgo.com") &&
      parsed.pathname === "/l/"
    ) {
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) {
        return decodeURIComponent(uddg);
      }
    }
  } catch {
    // Ignore parse errors, return original
  }
  return url;
}

async function requestUrl(
  target: string,
  options: FetchOptions = {},
  redirectCount = 0
): Promise<FetchResult> {
  if (redirectCount > 3) {
    throw new Error("Too many redirects");
  }
  const parsed = new URL(target);
  const transport = parsed.protocol === "https:" ? https : http;
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxBytes = options.maxBytes ?? 1024 * 1024;

  return new Promise((resolve, reject) => {
    let settled = false;
    let req: http.ClientRequest;
    const settle = (result: FetchResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    const fail = (err: Error) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    };

    // eslint-disable-next-line prefer-const
    req = transport.request(
      parsed,
      {
        method,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const statusText = res.statusMessage ?? "";

        // Check for redirects
        if (status >= 300 && status < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, target).toString();
          if (req) {
            req.destroy();
          } else {
            res.destroy();
          }
          resolve(requestUrl(redirectUrl, options, redirectCount + 1));
          return;
        }

        const chunks: Buffer[] = [];
        let received = 0;

        res.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > maxBytes) {
            res.destroy();
            settle({
              ok: status >= 200 && status < 300,
              status,
              statusText,
              body: Buffer.concat(chunks).toString("utf-8"),
            });
            return;
          }
          chunks.push(chunk);
        });

        res.on("end", () => {
          settle({
            ok: status >= 200 && status < 300,
            status,
            statusText,
            body: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      },
    );

    req.on("error", fail);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Request timed out"));
    });
    req.end();
  });
}

export async function webSearch(
  query: string,
  maxResults = 8
): Promise<WebSearchResult[]> {
  const limit = Math.max(1, Math.min(20, maxResults));
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  const response = await requestUrl(searchUrl, { maxBytes: 1024 * 1024 });
  if (!response.body) {
    return [];
  }

  const results: WebSearchResult[] = [];
  
  // Regex to match the result__a link
  // e.g. <a class="result__a" href="[URL]">[TITLE]</a>
  const linkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  
  // Find all matches first
  const matches: Array<{
    url: string;
    title: string;
    startIndex: number;
    endIndex: number;
  }> = [];
  
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(response.body)) !== null) {
    const rawUrl = match[1];
    const rawTitle = match[2];
    const title = decodeHtmlEntities(stripHtmlTags(rawTitle)).trim();
    const url = normalizeDuckDuckGoUrl(decodeHtmlEntities(rawUrl));
    
    if (title && url) {
      matches.push({
        url,
        title,
        startIndex: match.index,
        endIndex: linkRegex.lastIndex,
      });
    }
  }

  // Iterate over matches and extract snippet in the HTML following each match
  for (let i = 0; i < matches.length; i++) {
    if (results.length >= limit) {
      break;
    }
    
    const current = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].startIndex : response.body.length;
    const followingHtml = response.body.substring(current.endIndex, nextStart);
    
    // Look for class="result__snippet" or class="result-snippet"
    // e.g. <span class="result__snippet">...</span> or <td class="result-snippet">...</td>
    const snippetMatch = followingHtml.match(/class="[^"]*(?:result__snippet|result-snippet)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|a|td|dd)>/i);
    let snippet = "";
    if (snippetMatch) {
      snippet = decodeHtmlEntities(stripHtmlTags(snippetMatch[1])).trim();
    }
    
    results.push({
      title: current.title,
      url: current.url,
      snippet,
    });
  }

  return results;
}

const server = new McpServer({
  name: "search-web-mcp",
  version: "1.0.0",
});

server.tool(
  "search_web",
  "Search the web using DuckDuckGo. Returns a list of matching page titles, URLs, and snippet descriptions.",
  {
    query: z.string().min(1).describe("The search query"),
    maxResults: z.number().optional().describe("Maximum number of results to return (default 8, max 20)"),
  },
  async ({ query, maxResults }) => {
    try {
      const results = await webSearch(query, maxResults);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(results, null, 2),
        }],
      };
    } catch (error: unknown) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("search-web-mcp running on stdio\n");
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    process.stderr.write(`Fatal error: ${error}\n`);
    process.exit(1);
  });
}
