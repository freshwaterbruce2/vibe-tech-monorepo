import DashboardHeader from "./DashboardHeader";
import DashboardRefreshButton from "./DashboardRefreshButton";
import NotificationBadge from "./NotificationBadge";

interface DashboardTopbarProps {
	onRefresh: () => void;
	isPro: boolean;
}

const DashboardTopbar = ({
	onRefresh,
	isPro: _isPro,
}: DashboardTopbarProps) => {
	return (
		<div className="flex flex-col gap-6 mb-8">
			<div className="flex justify-between items-center">
				<DashboardHeader title="Nova Agent Dashboard" />
				<div className="flex items-center gap-4">
					<NotificationBadge />
					<DashboardRefreshButton onRefresh={onRefresh} />
				</div>
			</div>
		</div>
	);
};

export default DashboardTopbar;
