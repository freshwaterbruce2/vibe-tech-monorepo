/**
 * AgentContextLoader - Dynamic context loading with tiered caching
 *
 * Purpose: Load agent-specific context efficiently with minimal token overhead
 * Strategy: Lazy load, smart caching (5-min TTL), tiered context levels
 *
 * Token Budget: <2% of 200k window (<4000 tokens per invocation)
 * Cache Hit Rate Target: 80%+
 *
 * Created: 2026-01-15
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

interface CacheEntry {
	content: string;
	timestamp: number;
	level: ContextLevel;
}

type ContextLevel = 1 | 2 | 3;

interface LoadContextOptions {
	agentName: string;
	projectName?: string;
	level?: ContextLevel;
	includeGlobal?: boolean;
	includeLearning?: boolean;
}

interface LoadedContext {
	global?: string;
	agent?: string;
	project?: string;
	learning?: string;
	totalTokens: number;
}

export class AgentContextLoader {
	private cache: Map<string, CacheEntry> = new Map();
	private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
	private readonly CLAUDE_ROOT = process.env.CLAUDE_ROOT || "C:\\dev\\.claude";
	private readonly CONTEXT_DIR = join(this.CLAUDE_ROOT, "context");
	private readonly AGENTS_DIR = join(this.CLAUDE_ROOT, "agents");

	/**
	 * Load context with tiered levels
	 *
	 * Level 1 (500 tokens): Global overview only
	 * Level 2 (2000 tokens): Global + Agent context
	 * Level 3 (10000 tokens): Global + Agent + Project + Learning patterns
	 */
	async loadContext(options: LoadContextOptions): Promise<LoadedContext> {
		const {
			agentName,
			projectName,
			level = 2,
			includeGlobal = true,
			includeLearning = false,
		} = options;

		const result: LoadedContext = {
			totalTokens: 0,
		};

		// Level 1: Global context only
		if (includeGlobal && level >= 1) {
			result.global = this.loadGlobalContext();
			result.totalTokens += this.estimateTokens(result.global);
		}

		// Level 2: Add agent-specific context
		if (level >= 2) {
			result.agent = this.loadAgentContext(agentName);
			result.totalTokens += this.estimateTokens(result.agent);
		}

		// Level 3: Add project and learning patterns
		if (level >= 3) {
			if (projectName) {
				result.project = this.loadProjectContext(projectName);
				result.totalTokens += this.estimateTokens(result.project);
			}

			if (includeLearning) {
				result.learning = await this.loadLearningPatterns(
					agentName,
					projectName,
				);
				result.totalTokens += this.estimateTokens(result.learning);
			}
		}

		return result;
	}

	/**
	 * Load global monorepo context (380 tokens)
	 */
	private loadGlobalContext(): string {
		const cacheKey = "global";
		const cached = this.getFromCache(cacheKey);
		if (cached) return cached;

		const globalPath = join(this.CONTEXT_DIR, "global.md");
		if (!existsSync(globalPath)) {
			throw new Error(`Global context not found: ${globalPath}`);
		}

		const content = readFileSync(globalPath, "utf-8");
		this.setCache(cacheKey, content, 1);
		return content;
	}

	/**
	 * Load agent-specific context (600-750 tokens)
	 */
	private loadAgentContext(agentName: string): string {
		const cacheKey = `agent:${agentName}`;
		const cached = this.getFromCache(cacheKey);
		if (cached) return cached;

		const agentPath = join(this.AGENTS_DIR, `${agentName}.md`);
		if (!existsSync(agentPath)) {
			throw new Error(`Agent context not found: ${agentPath}`);
		}

		const content = readFileSync(agentPath, "utf-8");
		this.setCache(cacheKey, content, 2);
		return content;
	}

	/**
	 * Load project-specific context (500-1000 tokens)
	 */
	private loadProjectContext(projectName: string): string {
		const cacheKey = `project:${projectName}`;
		const cached = this.getFromCache(cacheKey);
		if (cached) return cached;

		const projectPath = join(this.CONTEXT_DIR, "projects", `${projectName}.md`);
		if (!existsSync(projectPath)) {
			console.warn(
				`Project context not found: ${projectPath}, using empty context`,
			);
			return "";
		}

		const content = readFileSync(projectPath, "utf-8");
		this.setCache(cacheKey, content, 3);
		return content;
	}

	/**
	 * Load learning patterns from RAG system
	 *
	 * Queries D:\databases\nova_shared.db for proven patterns
	 * Returns top 5 patterns by confidence score (≥0.8)
	 */
	private async loadLearningPatterns(
		agentName: string,
		projectName?: string,
	): Promise<string> {
		const cacheKey = `learning:${agentName}:${projectName || "global"}`;
		const cached = this.getFromCache(cacheKey);
		if (cached) return cached;

		try {
			// Dynamic import to avoid circular dependencies
			const { AgentLearningRAG } = await import(
				"../../packages/nova-core/src/intelligence/AgentLearningRAG"
			);

			const rag = new AgentLearningRAG();
			const patterns = await rag.queryPatterns({
				agentName,
				projectName,
				limit: 5,
				minConfidence: 0.8,
			});

			const content = this.formatLearningPatterns(patterns);
			this.setCache(cacheKey, content, 3);
			return content;
		} catch (error) {
			console.error("Failed to load learning patterns:", error);
			return "";
		}
	}

	/**
	 * Format learning patterns for context injection
	 */
	private formatLearningPatterns(patterns: any[]): string {
		if (patterns.length === 0) return "";

		const formatted = patterns
			.map(
				(p, i) => `
## Pattern ${i + 1}: ${p.task_type}
**Approach**: ${p.approach}
**Tools**: ${p.tools_used}
**Success Rate**: ${(p.confidence_score * 100).toFixed(1)}%
**Usage Count**: ${p.success_count} times
`,
			)
			.join("\n");

		return `# Proven Patterns from Learning System\n${formatted}`;
	}

	/**
	 * Estimate tokens using character count
	 * Approximation: 1 token ≈ 4 characters
	 */
	private estimateTokens(text?: string): number {
		if (!text) return 0;
		return Math.ceil(text.length / 4);
	}

	/**
	 * Get from cache if not expired
	 */
	private getFromCache(key: string): string | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const age = Date.now() - entry.timestamp;
		if (age > this.CACHE_TTL_MS) {
			this.cache.delete(key);
			return null;
		}

		return entry.content;
	}

	/**
	 * Set cache with TTL
	 */
	private setCache(key: string, content: string, level: ContextLevel): void {
		this.cache.set(key, {
			content,
			timestamp: Date.now(),
			level,
		});
	}

	/**
	 * Clear expired cache entries
	 */
	public clearExpiredCache(): number {
		const now = Date.now();
		let cleared = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.CACHE_TTL_MS) {
				this.cache.delete(key);
				cleared++;
			}
		}

		return cleared;
	}

	/**
	 * Get cache statistics
	 */
	public getCacheStats() {
		const now = Date.now();
		const entries = Array.from(this.cache.entries());

		return {
			totalEntries: entries.length,
			byLevel: {
				level1: entries.filter(([_, e]) => e.level === 1).length,
				level2: entries.filter(([_, e]) => e.level === 2).length,
				level3: entries.filter(([_, e]) => e.level === 3).length,
			},
			avgAge: entries.length
				? entries.reduce((sum, [_, e]) => sum + (now - e.timestamp), 0) /
					entries.length /
					1000
				: 0,
			hitRate: 0, // Updated externally
		};
	}

	/**
	 * Force reload context (bypass cache)
	 */
	public invalidateCache(pattern?: string): void {
		if (!pattern) {
			this.cache.clear();
			return;
		}

		for (const key of this.cache.keys()) {
			if (key.includes(pattern)) {
				this.cache.delete(key);
			}
		}
	}
}

// Singleton instance
let instance: AgentContextLoader | null = null;

export function getContextLoader(): AgentContextLoader {
	if (!instance) {
		instance = new AgentContextLoader();
	}
	return instance;
}

// Example usage
if (require.main === module) {
	(async () => {
		const loader = getContextLoader();

		// Level 1: Quick context (500 tokens)
		const level1 = await loader.loadContext({
			agentName: "webapp-expert",
			level: 1,
		});
		console.log("Level 1 tokens:", level1.totalTokens);

		// Level 2: Full agent context (2000 tokens)
		const level2 = await loader.loadContext({
			agentName: "webapp-expert",
			projectName: "iconforge",
			level: 2,
		});
		console.log("Level 2 tokens:", level2.totalTokens);

		// Level 3: With learning patterns (10000 tokens)
		const level3 = await loader.loadContext({
			agentName: "webapp-expert",
			projectName: "iconforge",
			level: 3,
			includeLearning: true,
		});
		console.log("Level 3 tokens:", level3.totalTokens);

		// Cache stats
		console.log("Cache stats:", loader.getCacheStats());
	})();
}
