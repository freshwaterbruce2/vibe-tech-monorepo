/**
 * WebTools Tests
 * Test suite for HTTP fetch and web search operations
 */

import * as http from "node:http";
import * as https from "node:https";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Web from "../WebTools";

// Mock dependencies
vi.mock("node:http");
vi.mock("node:https");

describe("WebTools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("fetchUrl", () => {
		it("should fetch URL successfully", async () => {
			const mockResponse = {
				statusCode: 200,
				statusMessage: "OK",
				headers: { "content-type": "text/html" },
				on: vi.fn((event, handler) => {
					if (event === "data") {
						handler(Buffer.from("response body"));
					} else if (event === "end") {
						handler();
					}
				}),
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			const result = await Web.fetchUrl("https://example.com");

			expect(result.ok).toBe(true);
			expect(result.status).toBe(200);
			expect(result.body).toBe("response body");
			expect(result.truncated).toBe(false);
		});

		it("should handle HTTP URLs", async () => {
			const mockResponse = {
				statusCode: 200,
				statusMessage: "OK",
				headers: {},
				on: vi.fn((event, handler) => {
					if (event === "end") handler();
				}),
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(http.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			const result = await Web.fetchUrl("http://example.com");

			expect(result.ok).toBe(true);
			expect(http.request).toHaveBeenCalled();
		});

		it("should reject non-HTTP/HTTPS URLs", async () => {
			await expect(Web.fetchUrl("file:///etc/passwd")).rejects.toThrow(
				"Only HTTP/HTTPS URLs allowed",
			);
			await expect(Web.fetchUrl("ftp://example.com")).rejects.toThrow(
				"Only HTTP/HTTPS URLs allowed",
			);
		});

		it("should reject invalid URL format", async () => {
			await expect(Web.fetchUrl("not-a-url")).rejects.toThrow(
				"Invalid URL format",
			);
		});

		it("should support HEAD method", async () => {
			const mockResponse = {
				statusCode: 200,
				statusMessage: "OK",
				headers: { "content-length": "1234" },
				on: vi.fn((event, handler) => {
					if (event === "end") handler();
				}),
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					expect(options.method).toBe("HEAD");
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			await Web.fetchUrl("https://example.com", { method: "HEAD" });

			expect(https.request).toHaveBeenCalled();
		});

		it("should include custom headers", async () => {
			const mockResponse = {
				statusCode: 200,
				statusMessage: "OK",
				headers: {},
				on: vi.fn((event, handler) => {
					if (event === "end") handler();
				}),
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			const customHeaders = { "X-Custom-Header": "value" };

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					expect(options.headers).toMatchObject(customHeaders);
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			await Web.fetchUrl("https://example.com", { headers: customHeaders });

			expect(https.request).toHaveBeenCalled();
		});

		it("should truncate response if exceeds maxBytes", async () => {
			const mockResponse = {
				statusCode: 200,
				statusMessage: "OK",
				headers: {},
				on: vi.fn((event, handler) => {
					if (event === "data") {
						handler(Buffer.alloc(2000000)); // 2MB
					}
				}),
				destroy: vi.fn(),
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			await Web.fetchUrl("https://example.com", { maxBytes: 1000000 });

			expect(mockResponse.destroy).toHaveBeenCalled();
		});

		it("should respect timeout", async () => {
			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn((timeout, _callback) => {
					expect(timeout).toBe(30000);
				}),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(() => {
				return mockRequest as any;
			});

			// Trigger timeout manually
			setTimeout(() => {
				const timeoutCallback = mockRequest.setTimeout.mock.calls[0][1];
				if (timeoutCallback) timeoutCallback();
			}, 0);

			// Don't await, just check setTimeout was called
			Web.fetchUrl("https://example.com", { timeoutMs: 30000 }).catch(() => {});

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(mockRequest.setTimeout).toHaveBeenCalledWith(
				30000,
				expect.any(Function),
			);
		});

		it("should handle request errors", async () => {
			const mockRequest = {
				on: vi.fn((event, handler) => {
					if (event === "error") {
						handler(new Error("Network error"));
					}
				}),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(() => {
				return mockRequest as any;
			});

			await expect(Web.fetchUrl("https://example.com")).rejects.toThrow(
				"Network error",
			);
		});

		it("should mark response as not ok for non-2xx status codes", async () => {
			const mockResponse = {
				statusCode: 404,
				statusMessage: "Not Found",
				headers: {},
				on: vi.fn((event, handler) => {
					if (event === "end") handler();
				}),
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			const result = await Web.fetchUrl("https://example.com/not-found");

			expect(result.ok).toBe(false);
			expect(result.status).toBe(404);
		});
	});

	describe("webSearch", () => {
		it("should search using DuckDuckGo", async () => {
			const mockHtml = `
        <a class="result__a" href="https://example.com/page1">Example Page 1</a>
        <a class="result__a" href="https://example.com/page2">Example Page 2</a>
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
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			const results = await Web.webSearch("test query");

			expect(results).toHaveLength(2);
			expect(results[0].title).toBe("Example Page 1");
			expect(results[0].url).toBe("https://example.com/page1");
			expect(results[1].title).toBe("Example Page 2");
			expect(results[1].url).toBe("https://example.com/page2");
		});

		it("should respect maxResults limit", async () => {
			const mockHtml = Array(20)
				.fill(0)
				.map(
					(_value, i) =>
						`<a class="result__a" href="https://example.com/page${i}">Page ${i}</a>`,
				)
				.join("\n");

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
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			const results = await Web.webSearch("test", { maxResults: 5 });

			expect(results.length).toBeLessThanOrEqual(5);
		});

		it("should decode HTML entities in titles", async () => {
			const mockHtml = `
        <a class="result__a" href="https://example.com">Test &amp; Example &lt;Tag&gt;</a>
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
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			const results = await Web.webSearch("test");

			expect(results[0].title).toContain("&");
			expect(results[0].title).toContain("<");
			expect(results[0].title).toContain(">");
		});

		it("should strip HTML tags from titles", async () => {
			const mockHtml = `
        <a class="result__a" href="https://example.com"><b>Bold</b> <i>Italic</i> Text</a>
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
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			const results = await Web.webSearch("test");

			expect(results[0].title).not.toContain("<b>");
			expect(results[0].title).not.toContain("</b>");
			expect(results[0].title).toContain("Bold");
			expect(results[0].title).toContain("Italic");
		});

		it("should handle empty search results", async () => {
			const mockHtml = "<html><body>No results</body></html>";

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
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			const results = await Web.webSearch("rare query");

			expect(results).toHaveLength(0);
		});

		it("should throw error for unsupported search engine", async () => {
			await expect(
				Web.webSearch("test", { engine: "google" as any }),
			).rejects.toThrow("Unsupported search engine");
		});

		it("should URL encode search query", async () => {
			const mockResponse = {
				statusCode: 200,
				statusMessage: "OK",
				headers: {},
				on: vi.fn((event, handler) => {
					if (event === "end") handler();
				}),
			};

			const mockRequest = {
				on: vi.fn(),
				setTimeout: vi.fn(),
				end: vi.fn(),
			};

			vi.mocked(https.request).mockImplementation(
				(url: any, options: any, callback: any) => {
					expect(url.href).toContain(encodeURIComponent("test query"));
					callback(mockResponse);
					return mockRequest as any;
				},
			);

			await Web.webSearch("test query");

			expect(https.request).toHaveBeenCalled();
		});
	});
});
