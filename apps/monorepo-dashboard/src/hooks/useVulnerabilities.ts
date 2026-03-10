// React hook for security vulnerabilities monitoring
import { useEffect, useState } from "react";

export interface Vulnerability {
	packageName: string;
	severity: "critical" | "high" | "moderate" | "low" | "info";
	title: string;
	vulnerable_versions: string;
	patched_versions: string;
	recommendation: string;
}

export interface VulnerabilityReport {
	totalVulnerabilities: number;
	critical: number;
	high: number;
	moderate: number;
	low: number;
	info: number;
	vulnerabilities: Vulnerability[];
}

const API_BASE_URL = "http://localhost:5177/api";

export function useVulnerabilities() {
	const [report, setReport] = useState<VulnerabilityReport>({
		totalVulnerabilities: 0,
		critical: 0,
		high: 0,
		moderate: 0,
		low: 0,
		info: 0,
		vulnerabilities: [],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		async function fetchVulnerabilities() {
			try {
				setLoading(true);
				const response = await fetch(
					`${API_BASE_URL}/dependencies/vulnerabilities`,
				);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const data = await response.json();

				if (mounted) {
					setReport(data);
					setError(null);
				}
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error
							? err.message
							: "Failed to fetch vulnerabilities",
					);
					setReport({
						totalVulnerabilities: 0,
						critical: 0,
						high: 0,
						moderate: 0,
						low: 0,
						info: 0,
						vulnerabilities: [],
					});
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		}

		fetchVulnerabilities();

		// Refetch every 5 minutes (vulnerabilities don't change frequently)
		const interval = setInterval(fetchVulnerabilities, 5 * 60 * 1000);

		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, []);

	return { report, loading, error };
}
