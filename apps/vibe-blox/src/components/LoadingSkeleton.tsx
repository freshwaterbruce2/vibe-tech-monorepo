interface LoadingSkeletonProps {
	variant?: "card" | "text" | "circle" | "button";
	count?: number;
	className?: string;
}

export default function LoadingSkeleton({
	variant = "card",
	count = 1,
	className = "",
}: LoadingSkeletonProps) {
	const baseClasses = "animate-pulse bg-bg-elevated rounded";

	const variantClasses = {
		card: "h-32 w-full",
		text: "h-4 w-full",
		circle: "h-12 w-12 rounded-full",
		button: "h-10 w-24",
	};

	const items = Array.from({ length: count }, (_, i) => i);

	return (
		<>
			{items.map((i) => (
				<div
					key={i}
					className={`${baseClasses} ${variantClasses[variant]} ${className}`}
				/>
			))}
		</>
	);
}

export function QuestCardSkeleton() {
	return (
		<div className="animate-pulse rounded-lg border border-border-subtle bg-bg-card p-4">
			<div className="mb-3 flex items-start gap-3">
				<div className="h-12 w-12 rounded-full bg-bg-elevated" />
				<div className="flex-1">
					<div className="mb-2 h-5 w-3/4 rounded bg-bg-elevated" />
					<div className="h-4 w-1/2 rounded bg-bg-elevated" />
				</div>
			</div>
			<div className="mb-3 h-4 w-full rounded bg-bg-elevated" />
			<div className="flex gap-2">
				<div className="h-10 flex-1 rounded-lg bg-bg-elevated" />
				<div className="h-10 w-24 rounded-lg bg-bg-elevated" />
			</div>
		</div>
	);
}

export function RewardCardSkeleton() {
	return (
		<div className="animate-pulse rounded-lg border border-border-subtle bg-bg-card p-4">
			<div className="mb-3 flex items-start justify-between">
				<div className="h-12 w-12 rounded-full bg-bg-elevated" />
				<div className="h-6 w-16 rounded-full bg-bg-elevated" />
			</div>
			<div className="mb-2 h-5 w-3/4 rounded bg-bg-elevated" />
			<div className="mb-3 h-4 w-full rounded bg-bg-elevated" />
			<div className="flex items-center justify-between">
				<div className="h-8 w-20 rounded-full bg-bg-elevated" />
				<div className="h-10 w-24 rounded-lg bg-bg-elevated" />
			</div>
		</div>
	);
}

export function AchievementCardSkeleton() {
	return (
		<div className="animate-pulse rounded-lg border border-border-subtle bg-bg-card p-4">
			<div className="mb-3 flex items-start justify-between">
				<div className="h-12 w-12 rounded-full bg-bg-elevated" />
				<div className="h-6 w-16 rounded-full bg-bg-elevated" />
			</div>
			<div className="mb-2 h-5 w-2/3 rounded bg-bg-elevated" />
			<div className="mb-3 h-4 w-full rounded bg-bg-elevated" />
			<div className="flex items-center justify-between">
				<div className="h-6 w-16 rounded-full bg-bg-elevated" />
				<div className="h-4 w-24 rounded bg-bg-elevated" />
			</div>
		</div>
	);
}
