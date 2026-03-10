/**
 * Database Schema Definitions for VibeTech Monorepo
 *
 * Location: D:\databases\
 * Format: SQLite (primary), PostgreSQL (n8n), Redis (cache)
 * Last Updated: January 11, 2026
 *
 * This file provides TypeScript type definitions for all databases in the monorepo.
 * It is indexed by Augment Code and other AI agents for better code completion and understanding.
 */

// ============================================
// CRYPTO TRADING SYSTEM (trading.db)
// ============================================

export interface Order {
	id: number;
	order_id: string;
	pair: string; // e.g., "XLM/USD"
	side: "buy" | "sell";
	order_type: string;
	volume: number;
	price?: number;
	status: "pending" | "open" | "closed" | "cancelled" | "rejected";
	created_at: string; // ISO 8601
	updated_at: string;
	metadata?: string; // JSON
}

export interface Trade {
	id: number;
	trade_id: string;
	order_id: string;
	pair: string;
	side: "buy" | "sell";
	price: number;
	volume: number;
	fee?: number;
	executed_at?: string;
	created_at: string;
}

export interface Position {
	id: number;
	pair: string;
	amount: number;
	entry_price: number;
	current_price?: number;
	pnl: number; // Profit/Loss
	status: "open" | "closed";
	opened_at: string;
	closed_at?: string;
}

export interface PerformanceMetrics {
	id: number;
	timestamp: string;
	balance: number;
	total_trades: number;
	winning_trades: number;
	losing_trades: number;
	win_rate: number; // Percentage 0-100
	expectancy: number; // Average profit per trade
	profit_factor: number; // Gross profit / Gross loss
	max_drawdown: number; // Maximum loss from peak
	created_at: string;
}

// ============================================
// AGENT LEARNING SYSTEM (agent_learning.db)
// ============================================

export interface Interaction {
	id: number;
	timestamp: string;
	agent_name: string; // 'desktop-commander', 'nova-agent', etc.
	project_path?: string; // C:\dev\apps\crypto-enhanced
	tool_name: string; // 'bash_tool', 'read_file', etc.
	input_context?: string; // User's input/request
	output_result?: string; // Tool's output
	success: boolean;
	error_message?: string;
	duration_ms?: number;
	metadata?: Record<string, any>;
}

export interface Pattern {
	id: number;
	pattern_type: "success" | "failure" | "optimization";
	pattern_name: string;
	context_keywords?: string;
	solution_template?: string;
	examples?: Record<string, any>;
	confidence_score: number; // 0-1
	usage_count: number;
	success_rate: number;
	created_at: string;
	updated_at: string;
}

export interface KnowledgeEntry {
	id: number;
	topic: string; // 'react', 'database', 'deployment'
	subtopic?: string;
	content: string;
	source_type?: "interaction" | "documentation" | "manual";
	source_ids?: string; // Comma-separated interaction IDs
	tags?: string; // 'typescript,react,hooks'
	confidence: number; // 0-1
	relevance_score: number; // 0-1
	created_at: string;
	accessed_count: number;
	last_accessed?: string;
}

export interface Recommendation {
	id: number;
	interaction_id?: number;
	recommendation_type: "alternative" | "optimization" | "warning";
	title: string;
	description: string;
	code_example?: string;
	priority: "low" | "medium" | "high" | "critical";
	status: "pending" | "applied" | "dismissed";
	applied_at?: string;
	applied_result?: string;
	created_at: string;
}

export interface ProjectLearning {
	id: number;
	project_name: string;
	project_path: string;
	learning_category?: "architecture" | "dependencies" | "workflows";
	learning_text: string;
	related_files?: string;
	importance: "critical" | "important" | "normal";
	created_at: string;
	verified: boolean;
	verification_notes?: string;
}

export interface ErrorPattern {
	id: number;
	error_type: "syntax" | "runtime" | "logical";
	error_signature: string;
	occurrence_count: number;
	first_seen: string;
	last_seen: string;
	contexts?: Record<string, any>;
	solutions?: Record<string, any>;
	resolution_success_rate: number;
}

// ============================================
// NOVA AGENT (nova_activity.db)
// ============================================

export interface NovaActivity {
	id: number;
	timestamp: string;
	activity_type:
		| "file_read"
		| "file_write"
		| "command_execution"
		| "ai_interaction";
	project_name?: string;
	file_path?: string;
	command?: string;
	result?: string;
	duration_ms?: number;
	success: boolean;
	metadata?: Record<string, any>;
}

export interface NovaTask {
	id: number;
	task_name: string;
	task_type: "coding" | "debugging" | "refactoring" | "testing";
	status: "pending" | "in_progress" | "completed" | "failed";
	created_at: string;
	completed_at?: string;
	result?: string;
	error_message?: string;
}

// ============================================
// VIBE TUTOR (vibe-tutor.db)
// ============================================

export interface Student {
	id: number;
	name: string;
	email?: string;
	grade_level?: number;
	created_at: string;
}

export interface Assignment {
	id: number;
	student_id: number;
	subject: string;
	description: string;
	difficulty: "easy" | "medium" | "hard";
	status: "pending" | "in_progress" | "completed" | "reviewed";
	assigned_at: string;
	due_date?: string;
	completed_at?: string;
	score?: number;
}

export interface TutorSession {
	id: number;
	student_id: number;
	assignment_id?: number;
	conversation_log?: string; // JSON
	ai_model_used: string;
	duration_seconds: number;
	started_at: string;
	ended_at?: string;
}

// ============================================
// VIBE JUSTICE (vibe_justice.db)
// ============================================

export interface LegalCase {
	id: number;
	case_number: string;
	case_type: "civil" | "criminal" | "family" | "corporate";
	title: string;
	description?: string;
	status: "active" | "pending" | "closed";
	created_at: string;
	closed_at?: string;
}

export interface LegalDocument {
	id: number;
	case_id: number;
	document_type: "complaint" | "motion" | "brief" | "evidence";
	file_path: string;
	summary?: string;
	ai_analysis?: string; // JSON
	created_at: string;
}

export interface CaseLaw {
	id: number;
	citation: string;
	court: string;
	year: number;
	summary: string;
	relevance_score?: number;
	full_text_path?: string;
	created_at: string;
}

// ============================================
// INVOICE AUTOMATION (invoiceflow.db)
// ============================================

export interface Invoice {
	id: number;
	invoice_number: string;
	client_name: string;
	client_email?: string;
	total_amount: number;
	currency: string; // 'USD', 'EUR', etc.
	status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
	issued_date: string;
	due_date?: string;
	paid_date?: string;
	created_at: string;
}

export interface InvoiceItem {
	id: number;
	invoice_id: number;
	description: string;
	quantity: number;
	unit_price: number;
	total: number;
}

export interface Payment {
	id: number;
	invoice_id: number;
	amount: number;
	payment_method: "card" | "bank_transfer" | "cash" | "other";
	transaction_id?: string;
	paid_at: string;
}

// ============================================
// AGENT TASKS (agent_tasks.db)
// ============================================

export interface AgentTask {
	id: number;
	task_name: string;
	task_description: string;
	assigned_agent: string; // 'desktop-commander', 'nova-agent'
	priority: "low" | "medium" | "high" | "critical";
	status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
	created_at: string;
	started_at?: string;
	completed_at?: string;
	result?: string;
	error_message?: string;
}

export interface TaskDependency {
	id: number;
	task_id: number;
	depends_on_task_id: number;
	dependency_type: "blocking" | "soft";
}

// ============================================
// VIBE STUDIO (vibe_studio.db)
// ============================================

export interface StudioProject {
	id: number;
	project_name: string;
	project_path: string;
	language: string; // 'typescript', 'python', 'rust'
	last_opened: string;
	is_favorite: boolean;
	settings?: Record<string, any>;
}

export interface EditorSettings {
	id: number;
	project_id: number;
	theme: string;
	font_size: number;
	tab_size: number;
	word_wrap: boolean;
	minimap_enabled: boolean;
	custom_settings?: Record<string, any>;
}

// ============================================
// HELPER TYPES
// ============================================

/** ISO 8601 datetime string */
export type ISODateTime = string;

/** JSON serialized object */
export type JSONString = string;

/** Database boolean (0 or 1 in SQLite) */
export type SQLiteBoolean = 0 | 1 | boolean;

// ============================================
// DATABASE CONNECTION HELPERS
// ============================================

/** Database paths on D:\ drive */
export const DATABASE_PATHS = {
	TRADING: "D:\\databases\\trading.db",
	AGENT_LEARNING: "D:\\databases\\agent_learning.db",
	AGENT_TASKS: "D:\\databases\\agent_tasks.db",
	NOVA_ACTIVITY: "D:\\databases\\nova_activity.db",
	VIBE_TUTOR: "D:\\databases\\vibe-tutor.db",
	VIBE_JUSTICE: "D:\\databases\\vibe_justice.db",
	INVOICEFLOW: "D:\\databases\\invoiceflow.db",
	VIBE_STUDIO: "D:\\databases\\vibe_studio.db",
	UNIFIED: "D:\\databases\\database.db",
} as const;

/** Database names mapped to their TypeScript types */
export interface DatabaseSchemaMap {
	"trading.db": {
		orders: Order;
		trades: Trade;
		positions: Position;
		performance_metrics: PerformanceMetrics;
	};
	"agent_learning.db": {
		interactions: Interaction;
		patterns: Pattern;
		knowledge_entries: KnowledgeEntry;
		recommendations: Recommendation;
		project_learnings: ProjectLearning;
		error_patterns: ErrorPattern;
	};
	"nova_activity.db": {
		activities: NovaActivity;
		tasks: NovaTask;
	};
	"vibe-tutor.db": {
		students: Student;
		assignments: Assignment;
		tutor_sessions: TutorSession;
	};
	"vibe_justice.db": {
		legal_cases: LegalCase;
		legal_documents: LegalDocument;
		case_law: CaseLaw;
	};
	"invoiceflow.db": {
		invoices: Invoice;
		invoice_items: InvoiceItem;
		payments: Payment;
	};
	"agent_tasks.db": {
		agent_tasks: AgentTask;
		task_dependencies: TaskDependency;
	};
	"vibe_studio.db": {
		studio_projects: StudioProject;
		editor_settings: EditorSettings;
	};
}
