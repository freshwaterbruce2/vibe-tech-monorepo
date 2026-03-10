import { invoke } from "@tauri-apps/api/core";

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
 * Service for interacting with the RAG (Retrieval-Augmented Generation) system
 * Provides semantic code search using ChromaDB vector embeddings
 */
export class RAGService {
	private readonly __instanceMarker = true;

	/**
	 * Index a single file into the RAG system
	 * @param filePath - Full path to the file
	 * @param content - File content as string
	 * @param metadata - Additional metadata (language, project, etc.)
	 */
	static async indexFile(
		filePath: string,
		content: string,
		metadata: Record<string, unknown> = {},
	): Promise<void> {
		try {
			await invoke("rag_index_file", {
				filePath,
				content,
				metadata,
			});
		} catch (error) {
			console.error(`Failed to index file ${filePath}:`, error);
			throw error;
		}
	}

	/**
	 * Search for semantically similar code chunks
	 * @param query - Natural language or code query
	 * @param topK - Number of results to return (default: 5)
	 * @returns Array of search results with similarity scores
	 */
	static async search(
		query: string,
		topK: number = 5,
	): Promise<RAGSearchResult[]> {
		try {
			const results = await invoke<RAGSearchResult[]>("rag_search", {
				query,
				topK,
			});
			return results;
		} catch (error) {
			console.error("RAG search failed:", error);
			throw error;
		}
	}

	/**
	 * Index an entire directory recursively
	 * @param dirPath - Directory path to index
	 * @param extensions - File extensions to include (e.g., ['ts', 'rs', 'md'])
	 * @returns Number of files indexed
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
	 * WARNING: This deletes all indexed documents
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
	 * @param results - RAG search results
	 * @returns Formatted context string
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
				const similarity = (1 - result.distance).toFixed(2); // Convert distance to similarity

				return `[Context ${index + 1}] (${similarity}% relevant)
File: ${filePath} ${language ? `[${language}]` : ""} ${chunkIndex !== "" ? `chunk ${chunkIndex}` : ""}
${result.document}
`;
			})
			.join("\n---\n");
	}

	/**
	 * Search and format context for AI in one call
	 * @param query - Search query
	 * @param topK - Number of results
	 * @returns Formatted context string ready for AI prompt
	 */
	static async searchAndFormatContext(
		query: string,
		topK: number = 3,
	): Promise<string> {
		const results = await RAGService.search(query, topK);
		return RAGService.buildContextString(results);
	}
}
