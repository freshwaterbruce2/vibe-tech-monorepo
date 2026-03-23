/**
 * RAG Service — routes search through the TS RAG pipeline via memory-mcp HTTP bridge.
 * Phase 2: Replaced Tauri IPC (Rust rag.rs) with TS RAG (hybrid search + RRF reranking + caching).
 * Falls back to Tauri IPC if the HTTP bridge is unavailable.
 */
import { invoke } from "@tauri-apps/api/core";

const RAG_HTTP_BRIDGE = "http://localhost:3200";
let callBridgeId = 0;

export interface RAGSearchResult {
	id: string;
	document: string;
	distance: number;
	metadata: {
		file_path?: string;
		language?: string;
		chunk_index?: number;
		[key: string]: unknown;
	};
}

export interface RAGIndexOptions {
	chunkSize?: number;
	overlap?: number;
	metadata?: Record<string, unknown>;
}

/**
 * Call memory-mcp HTTP bridge for TS RAG operations
 */
async function callBridge(tool: string, args: Record<string, unknown>): Promise<unknown> {
	const response = await fetch(RAG_HTTP_BRIDGE, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: ++callBridgeId,
			method: "tools/call",
			params: { name: tool, arguments: args },
		}),
		signal: AbortSignal.timeout(3000),
	});

	if (!response.ok) {
		throw new Error(`Bridge error: ${response.status}`);
	}

	const data = await response.json();
	if (data.result?.content?.[0]?.text) {
		return JSON.parse(data.result.content[0].text);
	}
	return data.result;
}

/**
 * Service for interacting with the RAG (Retrieval-Augmented Generation) system.
 * Uses hybrid vector+FTS search with RRF reranking via the TS RAG pipeline.
 */
export class RAGService {
	private readonly __instanceMarker = true;

	/**
	 * Index a single file into the RAG system
	 */
	static async indexFile(
		filePath: string,
		content: string,
		metadata: Record<string, unknown> = {},
	): Promise<void> {
		try {
			// Indexing still uses Tauri IPC (Rust writes to LanceDB directly)
			await invoke("rag_index_file", { filePath, content, metadata });
		} catch (error) {
			console.error(`Failed to index file ${filePath}:`, error);
			throw error;
		}
	}

	/**
	 * Search for semantically similar code chunks
	 * Routes through TS RAG pipeline (hybrid search + RRF) via memory-mcp HTTP bridge,
	 * falls back to Tauri IPC if bridge is unavailable.
	 */
	static async search(
		query: string,
		topK: number = 5,
	): Promise<RAGSearchResult[]> {
		// Try TS RAG via memory-mcp HTTP bridge (hybrid search + RRF reranking)
		let bridgeResults: RAGSearchResult[] | null = null;
		try {
			const bridgeResult = (await callBridge("memory_rag_search", {
				query,
				limit: topK,
			})) as {
				results?: Array<{
					filePath: string;
					content: string;
					score: number;
					type: string;
					startLine: number;
					endLine: number;
					symbolName?: string;
					language: string;
				}>;
			};

			if (bridgeResult?.results && bridgeResult.results.length > 0) {
				bridgeResults = bridgeResult.results.map((r, i) => ({
					id: `${r.filePath}::${r.startLine}`,
					document: r.content,
					distance: 1 - r.score,
					metadata: {
						file_path: r.filePath,
						language: r.language,
						chunk_index: i,
						type: r.type,
						startLine: r.startLine,
						endLine: r.endLine,
						symbolName: r.symbolName,
					},
				}));
			}
		} catch {
			// Bridge unavailable — will fall through to Tauri
		}

		if (bridgeResults) {
			return bridgeResults;
		}

		// Fallback to Tauri IPC (Rust RAG — vector-only search)
		try {
			return await invoke<RAGSearchResult[]>("rag_search", { query, topK });
		} catch (error) {
			console.error("RAG search failed:", error);
			throw error;
		}
	}

	/**
	 * Index an entire directory recursively
	 */
	static async indexDirectory(
		dirPath: string,
		extensions: string[] = ["ts", "tsx", "rs", "md", "py", "js", "jsx"],
	): Promise<number> {
		try {
			const count = await invoke<number>("rag_index_directory", {
				dirPath,
				fileExtensions: extensions,
			});
			return count;
		} catch (error) {
			console.error(`Failed to index directory ${dirPath}:`, error);
			throw error;
		}
	}

	/**
	 * Clear the entire RAG index
	 */
	static async clearIndex(): Promise<void> {
		try {
			await invoke("rag_clear_index");
		} catch (error) {
			console.error("Failed to clear RAG index:", error);
			throw error;
		}
	}

	/**
	 * Build context string from search results for AI prompts
	 */
	static buildContextString(results: RAGSearchResult[]): string {
		if (results.length === 0) {
			return "";
		}

		return results
			.map((result, index) => {
				const filePath = result.metadata.file_path ?? "unknown";
				const language = result.metadata.language ?? "";
				const chunkIndex = result.metadata.chunk_index ?? "";
				const similarity = (1 - result.distance).toFixed(2);

				return `[Context ${index + 1}] (${similarity}% relevant)
File: ${filePath} ${language ? `[${language}]` : ""} ${chunkIndex !== "" ? `chunk ${chunkIndex}` : ""}
${result.document}
`;
			})
			.join("\n---\n");
	}

	/**
	 * Search and format context for AI in one call
	 */
	static async searchAndFormatContext(
		query: string,
		topK: number = 3,
	): Promise<string> {
		const results = await RAGService.search(query, topK);
		return RAGService.buildContextString(results);
	}
}
