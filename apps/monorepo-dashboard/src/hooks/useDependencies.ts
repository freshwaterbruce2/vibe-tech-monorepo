import { useEffect, useState } from "react";

interface DependencyUpdate {
	name: string;
	current: string;
	latest: string;
	severity: "critical" | "recommended" | "optional";
	category: "dependencies" | "devDependencies" | "peerDependencies";
	affectedProjects: string[];
}

export function useDependencies() {
	const [updates, setUpdates] = useState<DependencyUpdate[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		async function fetchUpdates() {
			try {
				setLoading(true);
				const response = await fetch(
					"http://localhost:5177/api/dependencies/check",
				);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const data = await response.json();

				if (mounted) {
					setUpdates(data);
					setError(null);
				}
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to fetch dependencies",
					);
					setUpdates([]);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		}

		fetchUpdates();

		return () => {
			mounted = false;
		};
	}, []);

	const metrics = {
		totalUpdates: updates.length,
		critical: updates.filter((u) => u.severity === "critical").length,
		recommended: updates.filter((u) => u.severity === "recommended").length,
		optional: updates.filter((u) => u.severity === "optional").length,
	};

	return { updates, loading, error, metrics };
}
