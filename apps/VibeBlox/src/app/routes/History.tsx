import { useEffect, useState } from "react";
import type { User } from "../../types";

interface HistoryProps {
	user: User;
}

interface QuestCompletion {
	id: number;
	quest_name: string;
	category: string;
	icon: string;
	without_reminder: boolean;
	base_coins: number;
	multiplier: number;
	final_coins: number;
	completed_at: string;
	awarded_by: number | null;
}

interface Purchase {
	id: number;
	reward_name: string;
	category: string;
	icon: string;
	rarity: string;
	cost: number;
	status: string;
	purchased_at: string;
	approved_at: string | null;
	fulfilled_at: string | null;
}

type FilterType = "all" | "quests" | "purchases";

export default function History({ user }: HistoryProps) {
	const [questHistory, setQuestHistory] = useState<QuestCompletion[]>([]);
	const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
	const [filter, setFilter] = useState<FilterType>("all");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchHistory();
	}, []);

	const fetchHistory = async () => {
		try {
			const token = localStorage.getItem("token");

			// Fetch quest history
			const questResponse = await fetch("/api/quests/history?limit=50", {
				headers: { Authorization: `Bearer ${token}` },
			});

			// Fetch purchase history
			const purchaseResponse = await fetch("/api/rewards/history?limit=50", {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (questResponse.ok) {
				const questData = await questResponse.json();
				setQuestHistory(questData.history || []);
			}

			if (purchaseResponse.ok) {
				const purchaseData = await purchaseResponse.json();
				setPurchaseHistory(purchaseData.history || []);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load history");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-bg-dark pb-20">
				<header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
					<div className="container mx-auto flex items-center justify-between px-4 py-4">
						<h1 className="font-heading text-2xl font-bold text-text-primary">
							History
						</h1>
						<div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
							<span className="vibe-coin-static">💰</span>
							<span className="font-bold text-gold">
								{user.current_coins} VC
							</span>
						</div>
					</div>
				</header>
				<main className="container mx-auto px-4 py-8">
					<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
						<p className="text-text-muted">Loading history...</p>
					</div>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-bg-dark pb-20">
				<header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
					<div className="container mx-auto flex items-center justify-between px-4 py-4">
						<h1 className="font-heading text-2xl font-bold text-text-primary">
							History
						</h1>
						<div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
							<span className="vibe-coin-static">💰</span>
							<span className="font-bold text-gold">
								{user.current_coins} VC
							</span>
						</div>
					</div>
				</header>
				<main className="container mx-auto px-4 py-8">
					<div className="rounded-lg border border-red-500/30 bg-red-500/10 p-8 text-center">
						<p className="text-red-400">{error}</p>
					</div>
				</main>
			</div>
		);
	}

	const totalEarned = questHistory.reduce((sum, q) => sum + q.final_coins, 0);
	const totalSpent = purchaseHistory
		.filter((p) => p.status === "approved" || p.status === "fulfilled")
		.reduce((sum, p) => sum + p.cost, 0);

	return (
		<div className="min-h-screen bg-bg-dark pb-20">
			<header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
				<div className="container mx-auto flex items-center justify-between px-4 py-4">
					<h1 className="font-heading text-2xl font-bold text-text-primary">
						History
					</h1>
					<div className="flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2">
						<span className="vibe-coin-static">💰</span>
						<span className="font-bold text-gold">{user.current_coins} VC</span>
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				{/* Summary Stats */}
				<div className="mb-8 grid gap-4 sm:grid-cols-3">
					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<h3 className="mb-2 text-sm font-medium text-text-secondary">
							Total Earned
						</h3>
						<p className="text-3xl font-bold text-green-primary">
							+{totalEarned} VC
						</p>
						<p className="text-xs text-text-muted">
							{questHistory.length} quests completed
						</p>
					</div>
					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<h3 className="mb-2 text-sm font-medium text-text-secondary">
							Total Spent
						</h3>
						<p className="text-3xl font-bold text-red-400">-{totalSpent} VC</p>
						<p className="text-xs text-text-muted">
							{purchaseHistory.length} purchases
						</p>
					</div>
					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<h3 className="mb-2 text-sm font-medium text-text-secondary">
							Net Change
						</h3>
						<p
							className={`text-3xl font-bold ${
								totalEarned - totalSpent >= 0
									? "text-green-primary"
									: "text-red-400"
							}`}
						>
							{totalEarned - totalSpent >= 0 ? "+" : ""}
							{totalEarned - totalSpent} VC
						</p>
						<p className="text-xs text-text-muted">All time</p>
					</div>
				</div>

				{/* Filter Tabs */}
				<div className="mb-6 flex gap-2">
					<button
						onClick={() => setFilter("all")}
						className={`rounded-lg px-4 py-2 font-medium transition-colors ${
							filter === "all"
								? "bg-purple text-white"
								: "bg-bg-card text-text-secondary hover:bg-bg-card/80"
						}`}
					>
						All ({questHistory.length + purchaseHistory.length})
					</button>
					<button
						onClick={() => setFilter("quests")}
						className={`rounded-lg px-4 py-2 font-medium transition-colors ${
							filter === "quests"
								? "bg-green-primary text-white"
								: "bg-bg-card text-text-secondary hover:bg-bg-card/80"
						}`}
					>
						Quests ({questHistory.length})
					</button>
					<button
						onClick={() => setFilter("purchases")}
						className={`rounded-lg px-4 py-2 font-medium transition-colors ${
							filter === "purchases"
								? "bg-blue-primary text-white"
								: "bg-bg-card text-text-secondary hover:bg-bg-card/80"
						}`}
					>
						Purchases ({purchaseHistory.length})
					</button>
				</div>

				{/* History Items */}
				<div className="space-y-3">
					{filter !== "purchases" &&
						questHistory.map((quest) => (
							<div
								key={`quest-${quest.id}`}
								className="flex items-start gap-4 rounded-lg border border-border-subtle bg-bg-card p-4 transition-all hover:border-green-primary/30"
							>
								<span className="text-3xl">{quest.icon}</span>
								<div className="flex-1">
									<h4 className="font-bold text-text-primary">
										{quest.quest_name}
									</h4>
									<p className="text-sm text-text-secondary capitalize">
										{quest.category}
									</p>
									{quest.without_reminder && (
										<span className="mt-1 inline-block rounded-full bg-purple/20 px-2 py-0.5 text-xs font-medium text-purple">
											⚡ No Reminder Bonus
										</span>
									)}
									<p className="mt-1 text-xs text-text-muted">
										{new Date(quest.completed_at).toLocaleString()}
									</p>
								</div>
								<div className="text-right">
									<div className="rounded-full bg-green-primary/20 px-3 py-1 text-sm font-bold text-green-primary">
										+{quest.final_coins} VC
									</div>
									{quest.multiplier > 1 && (
										<p className="mt-1 text-xs text-text-muted">
											{quest.multiplier}x multiplier
										</p>
									)}
								</div>
							</div>
						))}

					{filter !== "quests" &&
						purchaseHistory.map((purchase) => (
							<div
								key={`purchase-${purchase.id}`}
								className="flex items-start gap-4 rounded-lg border border-border-subtle bg-bg-card p-4 transition-all hover:border-blue-primary/30"
							>
								<span className="text-3xl">{purchase.icon}</span>
								<div className="flex-1">
									<h4 className="font-bold text-text-primary">
										{purchase.reward_name}
									</h4>
									<p className="text-sm text-text-secondary capitalize">
										{purchase.category}
									</p>
									<div className="mt-1 flex items-center gap-2">
										<span
											className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
												purchase.status === "fulfilled"
													? "bg-green-primary/20 text-green-primary"
													: purchase.status === "approved"
														? "bg-blue-primary/20 text-blue-primary"
														: "bg-yellow-500/20 text-yellow-500"
											}`}
										>
											{purchase.status === "fulfilled"
												? "✓ Fulfilled"
												: purchase.status === "approved"
													? "✓ Approved"
													: "⏳ Pending"}
										</span>
										<span className="text-xs capitalize text-text-muted">
											{purchase.rarity}
										</span>
									</div>
									<p className="mt-1 text-xs text-text-muted">
										{new Date(purchase.purchased_at).toLocaleString()}
									</p>
								</div>
								<div className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-bold text-red-400">
									-{purchase.cost} VC
								</div>
							</div>
						))}

					{filter === "all" &&
						questHistory.length === 0 &&
						purchaseHistory.length === 0 && (
							<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
								<p className="text-text-muted">
									No history yet. Start completing quests!
								</p>
							</div>
						)}

					{filter === "quests" && questHistory.length === 0 && (
						<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
							<p className="text-text-muted">No quest completions yet.</p>
						</div>
					)}

					{filter === "purchases" && purchaseHistory.length === 0 && (
						<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
							<p className="text-text-muted">No purchases yet.</p>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
