import * as https from "node:https";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { webSearch } from "./index.js";

vi.mock("node:https");

describe("search-web-mcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("webSearch", () => {
    it("should extract search results with snippets successfully", async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="result">
              <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage1">Example <b>Page</b> 1</a>
              <span class="result__snippet">This is the <i>first</i> snippet &amp; description.</span>
            </div>
            <div class="result">
              <a class="result__a" href="https://example.com/page2">Example Page 2</a>
              <span class="result__snippet">This is the second snippet.</span>
            </div>
          </body>
        </html>
      `;

      const mockResponse = {
        statusCode: 200,
        statusMessage: "OK",
        headers: {},
        on: vi.fn((event, handler) => {
          if (event === "data") {
            handler(Buffer.from(mockHtml));
          } else if (event === "end") {
            handler();
          }
        }),
      } as any;

      const mockRequest = {
        on: vi.fn(),
        setTimeout: vi.fn(),
        end: vi.fn(),
      } as any;

      vi.mocked(https.request).mockImplementation(
        (url: any, options: any, callback: any) => {
          callback(mockResponse);
          return mockRequest;
        }
      );

      const results = await webSearch("test query", 5);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        title: "Example Page 1",
        url: "https://example.com/page1",
        snippet: "This is the first snippet & description.",
      });
      expect(results[1]).toEqual({
        title: "Example Page 2",
        url: "https://example.com/page2",
        snippet: "This is the second snippet.",
      });
    });

    it("should follow redirect and return search results", async () => {
      const mockHtml = `
        <a class="result__a" href="https://example.com">Example Redirect Target</a>
        <span class="result__snippet">Snippet target</span>
      `;

      const mockRedirectResponse = {
        statusCode: 302,
        headers: { location: "https://html.duckduckgo.com/html/redirected" },
        on: vi.fn(),
        destroy: vi.fn(),
      } as any;

      const mockOkResponse = {
        statusCode: 200,
        headers: {},
        on: vi.fn((event, handler) => {
          if (event === "data") {
            handler(Buffer.from(mockHtml));
          } else if (event === "end") {
            handler();
          }
        }),
      } as any;

      const mockRequest = {
        on: vi.fn(),
        setTimeout: vi.fn(),
        end: vi.fn(),
        destroy: vi.fn(),
      } as any;

      let callCount = 0;
      vi.mocked(https.request).mockImplementation(
        (url: any, options: any, callback: any) => {
          callCount++;
          if (callCount === 1) {
            callback(mockRedirectResponse);
          } else {
            callback(mockOkResponse);
          }
          return mockRequest;
        }
      );

      const results = await webSearch("test query", 1);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: "Example Redirect Target",
        url: "https://example.com",
        snippet: "Snippet target",
      });
    });
  });
});
