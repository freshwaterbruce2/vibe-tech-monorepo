import { motion } from "framer-motion";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import DashboardTable from "@/components/dashboard/DashboardTable";
import type { SystemActivity, SystemMetrics } from "@/hooks/dashboard/types";

interface DashboardContentProps {
	activities: SystemActivity[];
	metrics: SystemMetrics;
	onClearActivity: (id: number) => void;
}

const DashboardContent = ({
	activities,
	metrics,
	onClearActivity,
}: DashboardContentProps) => {
	const itemVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { duration: 0.3 },
		},
	};

	return (
		<motion.div variants={itemVariants}>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<DashboardMetrics metrics={metrics} />
			</div>

			<DashboardTable activities={activities} onClear={onClearActivity} />
		</motion.div>
	);
};

export default DashboardContent;
