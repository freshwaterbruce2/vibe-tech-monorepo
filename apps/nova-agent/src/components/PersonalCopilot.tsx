import { invoke } from "@tauri-apps/api/core";
import {
	Code,
	Lightbulb,
	Loader2,
	RefreshCw,
	Search,
	TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface CodePattern {
	id: number;
	pattern_type: string;
	name: string;
	code_snippet: string;
	file_path: string;
	language: string;
	imports?: string;
	usage_count: number;
	last_used?: number;
	tags?: string;
	created_at: number;
}

interface CodeSuggestion {
	pattern: CodePattern;
	relevance_score: number;
	reason: string;
}

interface IndexStats {
	total_patterns: number;
	by_language: [string, number][];
	by_type: [string, number][];
	last_indexed?: number;
}

export default function PersonalCopilot() {
	const [stats, setStats] = useState<IndexStats | null>(null);
	const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
	const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<CodePattern[]>([]);
	const [isIndexing, setIsIndexing] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedLanguage, _setSelectedLanguage] = useState<string>("");

	const loadStats = useCallback(async () => {
		try {
			const result = await invoke<IndexStats>("get_copilot_stats_command");
			setStats(result);
		} catch (error) {
			console.error("Failed to load stats:", error);
		}
	}, []);

	const getSuggestions = useCallback(
		async (context: string) => {
			setIsLoadingSuggestions(true);
			try {
				const results = await invoke<CodeSuggestion[]>("get_suggestions", {
					context,
					language: selectedLanguage || null,
				});
				setSuggestions(results);
			} catch (error) {
				console.error("Failed to get suggestions:", error);
			} finally {
				setIsLoadingSuggestions(false);
			}
		},
		[selectedLanguage],
	);

	// Load stats and initial suggestions on mount
	useEffect(() => {
		void loadStats();
		void getSuggestions("general");
	}, [loadStats, getSuggestions]);

	const indexCodebase = async () => {
		setIsIndexing(true);
		try {
			const result = await invoke<string>("index_codebase_command", {
				rootPath: "C:\\dev",
				maxFiles: 2000,
			});
			console.log(result);
			await loadStats();
			// Refresh suggestions after re-indexing
			await getSuggestions("general");
		} catch (error) {
			console.error("Indexing failed:", error);
		} finally {
			setIsIndexing(false);
		}
	};

	const searchPatterns = async () => {
		if (!searchQuery.trim()) return;

		setIsSearching(true);
		try {
			const results = await invoke<CodePattern[]>("search_patterns", {
				query: searchQuery,
				language: selectedLanguage || null,
				limit: 10,
			});
			setSearchResults(results);
			// Also refresh suggestions based on the search context
			await getSuggestions(searchQuery);
		} catch (error) {
			console.error("Search failed:", error);
		} finally {
			setIsSearching(false);
		}
	};

	const markPatternAsUsed = async (patternId: number) => {
		try {
			await invoke("use_pattern", { patternId });
			await loadStats();
		} catch (error) {
			console.error("Failed to mark pattern as used:", error);
		}
	};

	const copyToClipboard = (code: string) => {
		void navigator.clipboard.writeText(code);
	};

	return (
		<div className="h-full flex flex-col bg-gray-900 text-white">
			{/* Header */}
			<div className="p-4 border-b border-gray-700">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Lightbulb className="w-6 h-6 text-yellow-400" />
						<h2 className="text-xl font-bold">Personal Copilot</h2>
					</div>
					<button
						onClick={() => {
							void indexCodebase();
						}}
						disabled={isIndexing}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
					>
						{isIndexing ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Indexing...
							</>
						) : (
							<>
								<RefreshCw className="w-4 h-4" />
								Index Codebase
							</>
						)}
					</button>
				</div>

				{/* Stats */}
				{stats && (
					<div className="grid grid-cols-3 gap-4 text-sm">
						<div className="bg-gray-800 p-3 rounded-lg">
							<div className="text-gray-400">Total Patterns</div>
							<div className="text-2xl font-bold">{stats.total_patterns}</div>
						</div>
						<div className="bg-gray-800 p-3 rounded-lg">
							<div className="text-gray-400">Languages</div>
							<div className="text-2xl font-bold">
								{stats.by_language.length}
							</div>
						</div>
						<div className="bg-gray-800 p-3 rounded-lg">
							<div className="text-gray-400">Pattern Types</div>
							<div className="text-2xl font-bold">{stats.by_type.length}</div>
						</div>
					</div>
				)}
			</div>

			{/* Search */}
			<div className="p-4 border-b border-gray-700">
				<div className="flex gap-2">
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyPress={(e) => {
							if (e.key === "Enter") {
								void searchPatterns();
							}
						}}
						placeholder="Search patterns..."
						className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
					/>
					<button
						onClick={() => {
							void searchPatterns();
						}}
						disabled={isSearching}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
					>
						{isSearching ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Search className="w-4 h-4" />
						)}
					</button>
				</div>
			</div>

			{/* Results */}
			<div className="flex-1 overflow-y-auto p-4">
				{searchResults.length > 0 && (
					<div className="space-y-4">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Code className="w-5 h-5" />
							Search Results ({searchResults.length})
						</h3>
						{searchResults.map((pattern) => (
							<PatternCard
								key={pattern.id}
								pattern={pattern}
								onUse={() => {
									void markPatternAsUsed(pattern.id);
								}}
								onCopy={() => copyToClipboard(pattern.code_snippet)}
							/>
						))}
					</div>
				)}

				{suggestions.length > 0 && (
					<div className="space-y-4 mt-6">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<TrendingUp className="w-5 h-5" />
							Suggestions
						</h3>
						{suggestions.map((suggestion, idx) => (
							<div key={idx} className="space-y-2">
								<div className="text-sm text-gray-400">
									{suggestion.reason} (Relevance:{" "}
									{(suggestion.relevance_score * 100).toFixed(0)}%)
								</div>
								<PatternCard
									pattern={suggestion.pattern}
									onUse={() => {
										void markPatternAsUsed(suggestion.pattern.id);
									}}
									onCopy={() =>
										copyToClipboard(suggestion.pattern.code_snippet)
									}
								/>
							</div>
						))}
					</div>
				)}

				{stats?.total_patterns === 0 && (
					<div className="text-center py-12 text-gray-400">
						<Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-50" />
						<p className="text-lg mb-2">No patterns indexed yet</p>
						<p className="text-sm">
							Click "Index Codebase" to start learning from your code
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

interface PatternCardProps {
	pattern: CodePattern;
	onUse: () => void;
	onCopy: () => void;
}

function PatternCard({ pattern, onUse, onCopy }: PatternCardProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
			<div className="flex items-start justify-between mb-2">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<span className="px-2 py-1 bg-blue-600 text-xs rounded">
							{pattern.pattern_type}
						</span>
						<span className="px-2 py-1 bg-gray-700 text-xs rounded">
							{pattern.language}
						</span>
						<span className="font-mono text-sm">{pattern.name}</span>
					</div>
					<div className="text-xs text-gray-400 truncate">
						{pattern.file_path}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-gray-400">
						Used {pattern.usage_count}x
					</span>
					<button
						onClick={onCopy}
						className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded"
					>
						Copy
					</button>
					<button
						onClick={onUse}
						className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-xs rounded"
					>
						Use
					</button>
				</div>
			</div>

			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="text-sm text-blue-400 hover:text-blue-300"
			>
				{isExpanded ? "Hide" : "Show"} code
			</button>

			{isExpanded && (
				<pre className="mt-2 p-3 bg-gray-900 rounded text-xs overflow-x-auto">
					<code>{pattern.code_snippet}</code>
				</pre>
			)}

			{pattern.tags && (
				<div className="mt-2 flex gap-1 flex-wrap">
					{pattern.tags.split(",").map((tag, idx) => (
						<span key={idx} className="px-2 py-1 bg-gray-700 text-xs rounded">
							{tag.trim()}
						</span>
					))}
				</div>
			)}
		</div>
	);
}
