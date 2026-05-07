import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userApi } from "../../api/client";
import { getProgressToNextLevel } from "../../lib/levelSystem";
import type { User, UserStats } from "../../types";

interface DashboardProps {
	user: User;
}

interface ActivityFeedItem {
	id: number;
	user_id: number;
	activity_type: string;
	title: string;
	description: string | null;
	coins_change: number;
	icon: string | null;
	created_at: string;
}

export default function Dashboard({ user }: DashboardProps) {
	const [stats, setStats] = useState<UserStats | null>(null);
	const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
	const [loadingActivities, setLoadingActivities] = useState(true);
	const levelProgress = getProgressToNextLevel(user.lifetime_coins);

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const response = await userApi.getStats();
				if (response.success) {
					setStats(response.stats);
				}
			} catch (error) {
				console.error("Failed to fetch user stats:", error);
				setStats({
					current_coins: user.current_coins,
					lifetime_coins: user.lifetime_coins,
					current_level: user.current_level,
					quests_completed_today: 0,
					quests_completed_week: 0,
					badges_unlocked: 0,
					total_badges: 30,
					current_streak: 0,
					longest_streak: 0,
				});
			}
		};

		const fetchActivities = async () => {
			try {
				const token = localStorage.getItem("token");
				const response = await fetch("/api/activity?limit=10", {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (response.ok) {
					const data = await response.json();
					setActivities(data.activities || []);
				}
			} catch (error) {
				console.error("Failed to fetch activities:", error);
			} finally {
				setLoadingActivities(false);
			}
		};

		fetchStats();
		fetchActivities();
	}, [user]);

	if (!stats) {
		return (
			<div className="flex h-screen items-center justify-center">
				Loading...
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-bg-dark">
			{/* Header */}
			<header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
				<div className="container mx-auto flex items-center justify-between px-4 py-4">
					<h1 className="font-heading text-2xl font-bold text-blue-primary">
						VibeBlox
					</h1>

					<div className="flex items-center gap-4">
						{/* Streak Badge */}
						<div className="streak-badge">
							<span>🔥</span>
							<span>{stats.current_streak} day streak</span>
						</div>

						{/* Coin Balance */}
						<div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
							<span className="vibe-coin-static">💰</span>
							<span className="font-bold text-gold">
								{stats.current_coins} VC
							</span>
						</div>

						{/* Avatar/Logout */}
						<div className="flex items-center gap-2">
							<span className="text-2xl">😊</span>
							<span className="text-sm font-medium text-text-secondary">
								{user.display_name}
							</span>
						</div>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{/* Welcome Section */}
				<div className="mb-8">
					<h2 className="mb-2 text-3xl font-bold text-text-primary">
						Welcome back, {user.display_name}! 👋
					</h2>
					<p className="text-text-secondary">Ready to level up today?</p>
				</div>

				{/* Level Progress Card */}
				<div className="mb-8 rounded-lg border border-border-subtle bg-bg-card p-6">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<div className="level-badge">
								<span>⭐</span>
								<span>
									Level {levelProgress.currentLevel}:{" "}
									{levelProgress.currentTitle}
								</span>
							</div>
						</div>
						<div className="text-right">
							<p className="text-sm text-text-secondary">Lifetime Coins</p>
							<p className="text-2xl font-bold text-gold">
								{stats.lifetime_coins} VC
							</p>
						</div>
					</div>

					{/* Progress Bar */}
					<div className="mb-2">
						<div className="h-4 overflow-hidden rounded-full bg-bg-elevated">
							<div
								className="h-full bg-gradient-to-r from-blue-primary to-purple transition-all duration-500"
								style={{ width: `${levelProgress.progressPercent}%` }}
							/>
						</div>
					</div>

					{levelProgress.nextLevel && (
						<p className="text-sm text-text-secondary">
							{levelProgress.coinsNeeded} VC to {levelProgress.nextTitle}
						</p>
					)}
				</div>

				{/* Stats Grid */}
				<div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<p className="mb-1 text-sm text-text-secondary">Quests This Week</p>
						<p className="text-3xl font-bold text-blue-primary">
							{stats.quests_completed_week}
						</p>
					</div>
					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<p className="mb-1 text-sm text-text-secondary">
							Total Coins Earned
						</p>
						<p className="text-3xl font-bold text-gold">
							{stats.lifetime_coins}
						</p>
					</div>
					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<p className="mb-1 text-sm text-text-secondary">Badges Unlocked</p>
						<p className="text-3xl font-bold text-purple">
							{stats.badges_unlocked}/{stats.total_badges}
						</p>
					</div>
					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<p className="mb-1 text-sm text-text-secondary">Current Streak</p>
						<p className="text-3xl font-bold text-orange">
							{stats.current_streak} 🔥
						</p>
					</div>
				</div>

				{/* Quick Actions */}
				<div className="mb-8">
					<h3 className="mb-4 text-xl font-bold text-text-primary">
						Quick Actions
					</h3>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<Link to="/quests" className="quest-card group">
							<div className="mb-2 text-4xl">📝</div>
							<h4 className="mb-1 font-bold text-text-primary">Quest Board</h4>
							<p className="text-sm text-text-secondary">
								Complete daily quests and earn coins
							</p>
						</Link>

						<Link to="/shop" className="quest-card group">
							<div className="mb-2 text-4xl">🛍️</div>
							<h4 className="mb-1 font-bold text-text-primary">Vibe Shop</h4>
							<p className="text-sm text-text-secondary">
								Spend your hard-earned coins
							</p>
						</Link>

						<Link to="/badges" className="quest-card group">
							<div className="mb-2 text-4xl">🏆</div>
							<h4 className="mb-1 font-bold text-text-primary">Achievements</h4>
							<p className="text-sm text-text-secondary">
								View unlocked badges
							</p>
						</Link>
					</div>
				</div>

				{/* Activity Feed */}
				<div>
					<h3 className="mb-4 text-xl font-bold text-text-primary">
						Recent Activity
					</h3>
					{loadingActivities ? (
						<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
							<p className="text-text-muted">Loading activity...</p>
						</div>
					) : activities.length === 0 ? (
						<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
							<p className="text-text-muted">
								No recent activity yet. Complete your first quest to get
								started!
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{activities.map((activity) => (
								<div
									key={activity.id}
									className="flex items-start gap-4 rounded-lg border border-border-subtle bg-bg-card p-4 transition-all hover:border-blue-primary/30"
								>
									<span className="text-3xl">{activity.icon || "📌"}</span>
									<div className="flex-1">
										<h4 className="font-bold text-text-primary">
											{activity.title}
										</h4>
										{activity.description && (
											<p className="text-sm text-text-secondary">
												{activity.description}
											</p>
										)}
										<p className="mt-1 text-xs text-text-muted">
											{new Date(activity.created_at).toLocaleString()}
										</p>
									</div>
									{activity.coins_change !== 0 && (
										<div
											className={`rounded-full px-3 py-1 text-sm font-bold ${
												activity.coins_change > 0
													? "bg-green-primary/20 text-green-primary"
													: "bg-red-500/20 text-red-400"
											}`}
										>
											{activity.coins_change > 0 ? "+" : ""}
											{activity.coins_change} VC
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{/* Navigation Footer */}
				<nav className="fixed bottom-0 left-0 right-0 border-t border-border-subtle bg-bg-card/95 backdrop-blur">
					<div className="container mx-auto flex items-center justify-around px-4 py-3">
						<Link
							to="/"
							className="flex flex-col items-center text-blue-primary"
						>
							<span className="text-2xl">🏠</span>
							<span className="text-xs font-medium">Home</span>
						</Link>
						<Link
							to="/quests"
							className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
						>
							<span className="text-2xl">📝</span>
							<span className="text-xs font-medium">Quests</span>
						</Link>
						<Link
							to="/shop"
							className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
						>
							<span className="text-2xl">🛍️</span>
							<span className="text-xs font-medium">Shop</span>
						</Link>
						<Link
							to="/badges"
							className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
						>
							<span className="text-2xl">🏆</span>
							<span className="text-xs font-medium">Badges</span>
						</Link>
						{user.role === "parent" && (
							<Link
								to="/admin"
								className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
							>
								<span className="text-2xl">⚙️</span>
								<span className="text-xs font-medium">Admin</span>
							</Link>
						)}
					</div>
				</nav>
			</main>
		</div>
	);
}
