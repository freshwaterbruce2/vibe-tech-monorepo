/**
 * WebTools - HTTP fetch and lightweight web search for Desktop Commander V3
 * Uses built-in http/https modules to avoid external dependencies.
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

export interface FetchOptions {
	method?: "GET" | "HEAD";
	headers?: Record<string, string>;
	timeoutMs?: number;
	maxBytes?: number;
}

export interface FetchResult {
	ok: boolean;
	status: number;
	statusText: string;
	headers: Record<string, string | string[] | undefined>;
	body: string;
	truncated: boolean;
}

export interface WebSearchResult {
	title: string;
	url: string;
}

export interface WebSearchOptions {
	maxResults?: number;
	engine?: "duckduckgo";
}

function ensureHttpUrl(value: string): URL {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		throw new Error("Invalid URL format");
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error("Only HTTP/HTTPS URLs allowed");
	}
	return parsed;
}

function decodeHtmlEntities(input: string): string {
	return input
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function stripHtmlTags(input: string): string {
	return input.replace(/<[^>]*>/g, "");
}

function normalizeDuckDuckGoUrl(url: string): string {
	try {
		const parsed = new URL(url);
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
): Promise<FetchResult> {
	const parsed = ensureHttpUrl(target);
	const transport = parsed.protocol === "https:" ? https : http;
	const method = options.method ?? "GET";
	const timeoutMs = options.timeoutMs ?? 15000;
	const maxBytes = options.maxBytes ?? 1024 * 1024;

	return new Promise((resolve, reject) => {
		const req = transport.request(
			parsed,
			{
				method,
				headers: {
					"User-Agent": "desktop-commander-v3",
					"Accept-Encoding": "identity",
					...(options.headers ?? {}),
				},
			},
			(res) => {
				const status = res.statusCode ?? 0;
				const statusText = res.statusMessage ?? "";
				const chunks: Buffer[] = [];
				let received = 0;
				let truncated = false;

				res.on("data", (chunk: Buffer) => {
					received += chunk.length;
					if (received > maxBytes) {
						truncated = true;
						res.destroy();
						return;
					}
					chunks.push(chunk);
				});

				res.on("end", () => {
					const body = Buffer.concat(chunks).toString("utf-8");
					resolve({
						ok: status >= 200 && status < 300,
						status,
						statusText,
						headers: res.headers,
						body,
						truncated,
					});
				});
			},
		);

		req.on("error", (error) => reject(error));
		req.setTimeout(timeoutMs, () => {
			req.destroy(new Error("Request timed out"));
		});
		req.end();
	});
}

export async function fetchUrl(
	url: string,
	options: FetchOptions = {},
): Promise<FetchResult> {
	return await requestUrl(url, options);
}

export async function webSearch(
	query: string,
	options: WebSearchOptions = {},
): Promise<WebSearchResult[]> {
	const engine = options.engine ?? "duckduckgo";
	const maxResults = Math.max(1, Math.min(20, options.maxResults ?? 8));

	if (engine !== "duckduckgo") {
		throw new Error(`Unsupported search engine: ${engine}`);
	}

	const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
	const response = await requestUrl(searchUrl, { maxBytes: 512 * 1024 });

	if (!response.body) {
		return [];
	}

	const results: WebSearchResult[] = [];
	const linkRegex =
		/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;
	let match: RegExpExecArray | null;

	while ((match = linkRegex.exec(response.body)) !== null) {
		if (results.length >= maxResults) break;
		const rawUrl = match[1];
		const rawTitle = match[2];
		const title = decodeHtmlEntities(stripHtmlTags(rawTitle)).trim();
		const url = normalizeDuckDuckGoUrl(rawUrl);
		if (title && url) {
			results.push({ title, url });
		}
	}

	return results;
}
