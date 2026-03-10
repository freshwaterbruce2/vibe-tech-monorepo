import { motion } from "framer-motion";
import { useEffect } from "react";
import DashboardBackground from "@/components/dashboard/DashboardBackground";
import DashboardContent from "@/components/dashboard/DashboardContent";
import DashboardErrorState from "@/components/dashboard/DashboardErrorState";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import NavBar from "@/components/NavBar";
import { Toaster } from "@/components/ui/toaster";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDashboardData } from "@/hooks/useDashboardData";

const Dashboard = () => {
	const {
		activeTab,
		isLoading,
		error,
		activities,
		metrics,
		loadDashboardData,
		clearActivity,
		runDiagnostics: _runDiagnostics,
		isPro,
	} = useDashboardData();

	const { trackEvent } = useAnalytics();

	// Track dashboard page view with additional details
	useEffect(() => {
		trackEvent("dashboard_view", {
			category: "Dashboard",
			label: isPro ? "Pro Dashboard" : "Standard Dashboard",
			customDimensions: {
				is_pro_user: isPro,
				active_tab: activeTab,
				activity_count: activities.length,
				has_error: error !== null,
			},
		});
	}, [isPro, activeTab, activities.length, error, trackEvent]);

	// Simplified animation variant
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				duration: 0.3,
			},
		},
	};

	return (
		<div className="min-h-screen bg-aura-darkBg pb-16 relative overflow-hidden">
			{/* Background effects with further reduced intensity */}
			<DashboardBackground />

			<NavBar />

			<motion.div
				className="max-w-7xl mx-auto px-4 pt-24 relative z-10"
				variants={containerVariants}
				initial="hidden"
				animate={!isLoading ? "visible" : "hidden"}
			>
				<DashboardTopbar
					onRefresh={() => {
						void loadDashboardData();
					}}
					isPro={isPro}
				/>

				{isLoading ? (
					<DashboardSkeleton />
				) : error ? (
					<DashboardErrorState
						error={error}
						onRetry={() => {
							void loadDashboardData();
						}}
					/>
				) : (
					<DashboardContent
						activities={activities}
						metrics={metrics}
						onClearActivity={clearActivity}
					/>
				)}
			</motion.div>

			{/* Keep the Toaster component here to handle toast notifications */}
			<Toaster />
		</div>
	);
};

export default Dashboard;
