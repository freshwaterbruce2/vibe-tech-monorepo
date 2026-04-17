import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "../../../types";

interface AdminDashboardProps {
	user: User;
}

interface PendingQuest {
	id: number;
	quest_name: string;
	category: string;
	icon: string;
	user_name: string;
	user_id: number;
	without_reminder: boolean;
	base_coins: number;
	multiplier: number;
	final_coins: number;
	notes: string | null;
	completed_at: string;
}

interface PendingPurchase {
	id: number;
	reward_name: string;
	category: string;
	icon: string;
	rarity: string;
	real_value: string | null;
	user_name: string;
	user_id: number;
	cost: number;
	purchased_at: string;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
	const navigate = useNavigate();
	const [pending, setPending] = useState<PendingQuest[]>([]);
	const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>(
		[],
	);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState<number | null>(null);
	const [processingPurchase, setProcessingPurchase] = useState<number | null>(
		null,
	);
	const [bulkProcessing, setBulkProcessing] = useState(false);

	useEffect(() => {
		fetchPending();
		fetchPendingPurchases();
	}, []);

	const fetchPending = async () => {
		try {
			const token = window.electronAPI.store.get("token");
			const response = await fetch("/api/quests/pending", {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!response.ok) throw new Error("Failed to fetch pending quests");

			const data = await response.json();
			setPending(data.pending || []);
		} catch (error) {
			console.error("Error fetching pending:", error);
			alert("Failed to load pending approvals");
		} finally {
			setLoading(false);
		}
	};

	const fetchPendingPurchases = async () => {
		try {
			const token = window.electronAPI.store.get("token");
			const response = await fetch("/api/rewards/pending", {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!response.ok) throw new Error("Failed to fetch pending purchases");

			const data = await response.json();
			setPendingPurchases(data.pending || []);
		} catch (error) {
			console.error("Error fetching pending purchases:", error);
			alert("Failed to load pending purchases");
		}
	};

	const handleApproval = async (completionId: number, approved: boolean) => {
		if (processing) return;

		const confirmation = approved
			? "Approve this quest completion?"
			: "Deny this quest completion?";

		if (!confirm(confirmation)) return;

		setProcessing(completionId);
		try {
			const token = window.electronAPI.store.get("token");
			const response = await fetch(`/api/quests/${completionId}/approve`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ approved }),
			});

			if (!response.ok) throw new Error("Failed to process approval");

			const data = await response.json();
			alert(data.message);

			// Refresh pending list
			await fetchPending();
		} catch (error) {
			console.error("Error processing approval:", error);
			alert("Failed to process approval");
		} finally {
			setProcessing(null);
		}
	};

	const handlePurchaseApproval = async (
		purchaseId: number,
		approved: boolean,
	) => {
		if (processingPurchase) return;

		const confirmation = approved
			? "Approve this purchase?"
			: "Deny this purchase?";

		if (!confirm(confirmation)) return;

		setProcessingPurchase(purchaseId);
		try {
			const token = window.electronAPI.store.get("token");
			const response = await fetch(`/api/rewards/${purchaseId}/approve`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ approved }),
			});

			if (!response.ok) throw new Error("Failed to process approval");

			const data = await response.json();
			alert(data.message);

			// Refresh pending purchases list
			await fetchPendingPurchases();
		} catch (error) {
			console.error("Error processing purchase approval:", error);
			alert("Failed to process purchase approval");
		} finally {
			setProcessingPurchase(null);
		}
	};

	const handleBulkApproveQuests = async () => {
		if (bulkProcessing || pending.length === 0) return;

		if (!confirm(`Approve all ${pending.length} pending quests?`)) return;

		setBulkProcessing(true);
		try {
			const token = window.electronAPI.store.get("token");
			let successCount = 0;

			for (const quest of pending) {
				try {
					const response = await fetch(`/api/quests/${quest.id}/approve`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ approved: true }),
					});

					if (response.ok) successCount++;
				} catch (err) {
					console.error(`Failed to approve quest ${quest.id}:`, err);
				}
			}

			alert(`Approved ${successCount} of ${pending.length} quests`);
			await fetchPending();
		} catch (error) {
			console.error("Error in bulk approval:", error);
			alert("Failed to complete bulk approval");
		} finally {
			setBulkProcessing(false);
		}
	};

	const handleBulkApprovePurchases = async () => {
		if (bulkProcessing || pendingPurchases.length === 0) return;

		if (!confirm(`Approve all ${pendingPurchases.length} pending purchases?`))
			return;

		setBulkProcessing(true);
		try {
			const token = window.electronAPI.store.get("token");
			let successCount = 0;

			for (const purchase of pendingPurchases) {
				try {
					const response = await fetch(`/api/rewards/${purchase.id}/approve`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ approved: true }),
					});

					if (response.ok) successCount++;
				} catch (err) {
					console.error(`Failed to approve purchase ${purchase.id}:`, err);
				}
			}

			alert(`Approved ${successCount} of ${pendingPurchases.length} purchases`);
			await fetchPendingPurchases();
		} catch (error) {
			console.error("Error in bulk approval:", error);
			alert("Failed to complete bulk approval");
		} finally {
			setBulkProcessing(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
		return date.toLocaleDateString();
	};

	return (
		<div className="min-h-screen bg-bg-dark pb-20">
			<header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-card/95 backdrop-blur">
				<div className="container mx-auto flex items-center justify-between px-4 py-4">
					<h1 className="font-heading text-2xl font-bold text-red-primary">
						Admin Dashboard
					</h1>
					<span className="text-sm text-text-secondary">
						Parent: {user.display_name}
					</span>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<div className="mb-6">
					<h2 className="mb-2 text-2xl font-bold text-text-primary">
						Parent Controls
					</h2>
					<p className="text-text-secondary">
						Manage quests, rewards, and approvals
					</p>
				</div>

				{/* Stats Cards */}
				<div className="mb-8 grid gap-4 sm:grid-cols-4">
					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<div className="mb-2 text-3xl">✅</div>
						<h3 className="mb-1 font-bold text-text-primary">Pending Quests</h3>
						<p className="text-2xl font-bold text-blue-primary">
							{pending.length}
						</p>
						<p className="text-xs text-text-secondary">Awaiting approval</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<div className="mb-2 text-3xl">🛍️</div>
						<h3 className="mb-1 font-bold text-text-primary">
							Pending Purchases
						</h3>
						<p className="text-2xl font-bold text-green-primary">
							{pendingPurchases.length}
						</p>
						<p className="text-xs text-text-secondary">Awaiting approval</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<div className="mb-2 text-3xl">🪙</div>
						<h3 className="mb-1 font-bold text-text-primary">Pending Value</h3>
						<p className="text-2xl font-bold text-gold">
							{pending.reduce((sum, p) => sum + p.final_coins, 0) +
								pendingPurchases.reduce((sum, p) => sum + p.cost, 0)}{" "}
							VC
						</p>
						<p className="text-xs text-text-secondary">To award/deduct</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-bg-card p-4">
						<div className="mb-2 text-3xl">📊</div>
						<h3 className="mb-1 font-bold text-text-primary">Quick Stats</h3>
						<Link to="/admin/reports" className="btn-secondary text-sm">
							View Reports
						</Link>
					</div>
				</div>

				{/* Pending Approvals */}
				<div className="mb-8">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="text-xl font-bold text-text-primary">
							Pending Quest Approvals
						</h3>
						{pending.length > 0 && (
							<button
								onClick={handleBulkApproveQuests}
								disabled={bulkProcessing}
								className="rounded-lg bg-green-primary px-4 py-2 font-medium text-white transition-colors hover:bg-green-primary/80 disabled:opacity-50"
							>
								{bulkProcessing
									? "Processing..."
									: `Approve All (${pending.length})`}
							</button>
						)}
					</div>

					{loading ? (
						<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
							<div className="text-4xl">⏳</div>
							<p className="mt-2 text-text-secondary">
								Loading pending quests...
							</p>
						</div>
					) : pending.length === 0 ? (
						<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
							<div className="text-4xl">✨</div>
							<p className="mt-2 text-text-secondary">No pending approvals</p>
							<p className="mt-1 text-sm text-text-muted">All caught up!</p>
						</div>
					) : (
						<div className="space-y-4">
							{pending.map((quest) => (
								<div
									key={quest.id}
									className="rounded-lg border border-border-subtle bg-bg-card p-4 transition-all hover:border-blue-primary/50"
								>
									<div className="mb-3 flex items-start justify-between">
										<div className="flex items-start gap-3">
											<span className="text-3xl">{quest.icon}</span>
											<div>
												<h4 className="mb-1 font-bold text-text-primary">
													{quest.quest_name}
												</h4>
												<p className="mb-1 text-sm text-text-secondary">
													Completed by{" "}
													<span className="font-medium text-blue-primary">
														{quest.user_name}
													</span>
												</p>
												<p className="text-xs text-text-muted">
													{formatDate(quest.completed_at)}
												</p>
											</div>
										</div>

										<div className="text-right">
											<p className="text-2xl font-bold text-gold">
												+{quest.final_coins} VC
											</p>
											<p className="text-xs text-text-muted">
												{quest.multiplier}x multiplier
											</p>
										</div>
									</div>

									{quest.without_reminder && (
										<div className="mb-3 rounded-md bg-green-primary/10 px-3 py-2">
											<p className="text-sm font-medium text-green-primary">
												⭐ Completed without reminder!
											</p>
										</div>
									)}

									{quest.notes && (
										<div className="mb-3 rounded-md bg-bg-elevated px-3 py-2">
											<p className="text-sm text-text-secondary">
												<span className="font-medium">Notes:</span>{" "}
												{quest.notes}
											</p>
										</div>
									)}

									<div className="flex gap-3">
										<button
											onClick={async () => handleApproval(quest.id, false)}
											disabled={processing !== null}
											className="flex-1 rounded-lg border border-red-primary/50 bg-red-primary/10 px-4 py-2 font-medium text-red-primary transition-colors hover:bg-red-primary/20 disabled:opacity-50"
										>
											{processing === quest.id ? "Processing..." : "Deny"}
										</button>
										<button
											onClick={async () => handleApproval(quest.id, true)}
											disabled={processing !== null}
											className="flex-1 rounded-lg bg-green-primary px-4 py-2 font-medium text-white transition-colors hover:bg-green-primary/90 disabled:opacity-50"
										>
											{processing === quest.id ? "Processing..." : "Approve"}
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Pending Purchase Approvals */}
				<div className="mb-8">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="text-xl font-bold text-text-primary">
							Pending Purchase Approvals
						</h3>
						{pendingPurchases.length > 0 && (
							<button
								onClick={handleBulkApprovePurchases}
								disabled={bulkProcessing}
								className="rounded-lg bg-green-primary px-4 py-2 font-medium text-white transition-colors hover:bg-green-primary/80 disabled:opacity-50"
							>
								{bulkProcessing
									? "Processing..."
									: `Approve All (${pendingPurchases.length})`}
							</button>
						)}
					</div>

					{pendingPurchases.length === 0 ? (
						<div className="rounded-lg border border-border-subtle bg-bg-card p-8 text-center">
							<div className="text-4xl">✨</div>
							<p className="mt-2 text-text-secondary">No pending purchases</p>
							<p className="mt-1 text-sm text-text-muted">All caught up!</p>
						</div>
					) : (
						<div className="space-y-4">
							{pendingPurchases.map((purchase) => {
								const rarityColors = {
									common: "border-gray-500",
									rare: "border-blue-primary",
									epic: "border-purple",
									legendary: "border-gold",
								};

								const rarityLabels = {
									common: "COMMON",
									rare: "RARE",
									epic: "EPIC",
									legendary: "LEGENDARY",
								};

								const rarityBadgeColors = {
									common: "bg-gray-500 text-white",
									rare: "bg-blue-primary text-white",
									epic: "bg-purple text-white",
									legendary: "bg-gold text-bg-dark",
								};

								return (
									<div
										key={purchase.id}
										className={`rounded-lg border-2 ${rarityColors[purchase.rarity as keyof typeof rarityColors]} bg-bg-card p-4 transition-all hover:border-opacity-100`}
									>
										<div className="mb-3 flex items-start justify-between">
											<div className="flex items-start gap-3">
												<span className="text-3xl">{purchase.icon}</span>
												<div>
													<h4 className="mb-1 font-bold text-text-primary">
														{purchase.reward_name}
													</h4>
													<p className="mb-1 text-sm text-text-secondary">
														Requested by{" "}
														<span className="font-medium text-green-primary">
															{purchase.user_name}
														</span>
													</p>
													<p className="text-xs text-text-muted">
														{formatDate(purchase.purchased_at)}
													</p>
												</div>
											</div>

											<div className="text-right">
												<span
													className={`mb-2 inline-block rounded-full px-2 py-1 text-xs font-bold ${rarityBadgeColors[purchase.rarity as keyof typeof rarityBadgeColors]}`}
												>
													{
														rarityLabels[
															purchase.rarity as keyof typeof rarityLabels
														]
													}
												</span>
												<p className="text-2xl font-bold text-gold">
													{purchase.cost} VC
												</p>
											</div>
										</div>

										{purchase.real_value && (
											<div className="mb-3 rounded-md bg-bg-elevated px-3 py-2">
												<p className="text-sm text-text-secondary">
													<span className="font-medium">Real value:</span>{" "}
													{purchase.real_value}
												</p>
											</div>
										)}

										<div className="flex gap-3">
											<button
												onClick={async () =>
													handlePurchaseApproval(purchase.id, false)
												}
												disabled={processingPurchase !== null}
												className="flex-1 rounded-lg border border-red-primary/50 bg-red-primary/10 px-4 py-2 font-medium text-red-primary transition-colors hover:bg-red-primary/20 disabled:opacity-50"
											>
												{processingPurchase === purchase.id
													? "Processing..."
													: "Deny"}
											</button>
											<button
												onClick={async () =>
													handlePurchaseApproval(purchase.id, true)
												}
												disabled={processingPurchase !== null}
												className="flex-1 rounded-lg bg-green-primary px-4 py-2 font-medium text-white transition-colors hover:bg-green-primary/90 disabled:opacity-50"
											>
												{processingPurchase === purchase.id
													? "Processing..."
													: "Approve"}
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Quick Actions */}
				<div className="grid gap-4 sm:grid-cols-2">
					<Link to="/admin/award" className="quest-card text-left group">
						<div className="mb-2 text-4xl">🪙</div>
						<h3 className="mb-1 font-bold text-text-primary group-hover:text-blue-primary">
							Award Bonus Coins
						</h3>
						<p className="text-sm text-text-secondary">
							Manually award VibeCoins for special achievements
						</p>
					</Link>

					<button
						className="quest-card text-left"
						onClick={() => navigate('/admin/quests')}
					>
						<div className="mb-2 text-4xl">⚙️</div>
						<h3 className="mb-1 font-bold text-text-primary">Manage Quests</h3>
						<p className="text-sm text-text-secondary">
							Add, edit, or disable quests
						</p>
					</button>
				</div>
			</main>

			{/* Bottom Navigation */}
			<nav className="fixed bottom-0 left-0 right-0 border-t border-border-subtle bg-bg-card/95 backdrop-blur">
				<div className="container mx-auto flex items-center justify-around px-4 py-3">
					<Link
						to="/"
						className="flex flex-col items-center text-text-secondary hover:text-blue-primary"
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
					<Link
						to="/admin"
						className="flex flex-col items-center text-blue-primary"
					>
						<span className="text-2xl">⚙️</span>
						<span className="text-xs font-medium">Admin</span>
					</Link>
				</div>
			</nav>
		</div>
	);
}
