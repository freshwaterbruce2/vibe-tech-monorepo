// User types
export interface User {
	id: number;
	username: string;
	display_name: string;
	role: "child" | "parent";
	avatar_mood: string;
	current_coins: number;
	lifetime_coins: number;
	current_level: number;
	sound_enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface Streak {
	id: number;
	user_id: number;
	category: string;
	current_streak: number;
	longest_streak: number;
	last_completed_date: string | null;
	created_at: string;
	updated_at: string;
}

// Quest types
export interface Quest {
	id: number;
	name: string;
	description: string | null;
	category: QuestCategory;
	subcategory: string | null;
	icon: string;
	base_coins: number;
	bonus_coins: number;
	is_daily: boolean;
	is_active: boolean;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export type QuestCategory =
	| "self_care"
	| "household"
	| "self_regulation"
	| "social"
	| "spiritual"
	| "academic"
	| "physical"
	| "above_beyond";

export interface QuestCompletion {
	id: number;
	user_id: number;
	quest_id: number;
	without_reminder: boolean;
	base_coins: number;
	multiplier: number;
	final_coins: number;
	notes: string | null;
	awarded_by: number | null;
	completed_at: string;
	quest?: Quest; // Joined data
}

// Reward types
export interface Reward {
	id: number;
	name: string;
	description: string | null;
	category: RewardCategory;
	icon: string;
	cost: number;
	real_value: string | null;
	rarity: Rarity;
	is_limited: boolean;
	is_active: boolean;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export type RewardCategory = "robux" | "gaming" | "lego" | "experience";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Purchase {
	id: number;
	user_id: number;
	reward_id: number;
	cost: number;
	status: PurchaseStatus;
	approved_by: number | null;
	notes: string | null;
	purchased_at: string;
	approved_at: string | null;
	fulfilled_at: string | null;
	reward?: Reward; // Joined data
}

export type PurchaseStatus = "pending" | "approved" | "fulfilled" | "denied";

// Achievement types
export interface Achievement {
	id: number;
	name: string;
	description: string;
	icon: string;
	category: string;
	requirement_type: RequirementType;
	requirement_value: number;
	requirement_category: string | null;
	bonus_coins: number;
	rarity: Rarity;
	is_active: boolean;
	created_at: string;
}

export type RequirementType =
	| "streak"
	| "count"
	| "total_coins"
	| "level"
	| "custom";

export interface UserAchievement {
	id: number;
	user_id: number;
	achievement_id: number;
	unlocked_at: string;
	achievement?: Achievement; // Joined data
}

// Activity feed types
export interface Activity {
	id: number;
	user_id: number;
	activity_type: ActivityType;
	title: string;
	description: string | null;
	coins_change: number;
	icon: string | null;
	created_at: string;
}

export type ActivityType =
	| "quest_complete"
	| "purchase"
	| "achievement"
	| "level_up"
	| "streak";

// Daily log types
export interface DailyLog {
	id: number;
	user_id: number;
	log_date: string;
	quests_completed: number;
	coins_earned: number;
	without_reminder_count: number;
	notes: string | null;
	created_at: string;
}

// API request/response types
export interface LoginRequest {
	username: string;
	password: string;
}

export interface LoginResponse {
	user: User;
	token: string;
}

export interface CompleteQuestRequest {
	quest_id: number;
	without_reminder: boolean;
	notes?: string;
}

export interface PurchaseRewardRequest {
	reward_id: number;
}

export interface AwardCoinsRequest {
	user_id: number;
	quest_id?: number;
	amount?: number;
	without_reminder: boolean;
	notes?: string;
}

export interface ApproveRequest {
	approved: boolean;
	notes?: string;
}

// Stats and reporting
export interface UserStats {
	current_coins: number;
	lifetime_coins: number;
	current_level: number;
	quests_completed_today: number;
	quests_completed_week: number;
	badges_unlocked: number;
	total_badges: number;
	current_streak: number;
	longest_streak: number;
}

export interface DashboardData {
	user: User;
	stats: UserStats;
	recent_activity: Activity[];
	pending_approvals?: number; // Parent only
}

// Level system
export interface LevelThreshold {
	level: number;
	title: string;
	coins_required: number;
	cumulative: number;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
	{ level: 1, title: "Noob Builder", coins_required: 0, cumulative: 0 },
	{ level: 2, title: "Brick Stacker", coins_required: 500, cumulative: 500 },
	{ level: 3, title: "Place Builder", coins_required: 1000, cumulative: 1500 },
	{ level: 4, title: "Game Creator", coins_required: 2000, cumulative: 3500 },
	{
		level: 5,
		title: "Rising Developer",
		coins_required: 3500,
		cumulative: 7000,
	},
	{ level: 6, title: "Pro Builder", coins_required: 5000, cumulative: 12000 },
	{ level: 7, title: "Legendary Dev", coins_required: 8000, cumulative: 20000 },
	{
		level: 8,
		title: "Builderman Status",
		coins_required: 15000,
		cumulative: 35000,
	},
];

// Streak multipliers
export interface StreakMultiplier {
	min_days: number;
	max_days: number | null;
	multiplier: number;
	display: string;
}

export const STREAK_MULTIPLIERS: StreakMultiplier[] = [
	{ min_days: 0, max_days: 2, multiplier: 1.0, display: "✨" },
	{ min_days: 3, max_days: 6, multiplier: 1.25, display: "⚡" },
	{ min_days: 7, max_days: 13, multiplier: 1.5, display: "🔥" },
	{ min_days: 14, max_days: 29, multiplier: 2.0, display: "🔥🔥" },
	{ min_days: 30, max_days: null, multiplier: 2.5, display: "💎" },
];
