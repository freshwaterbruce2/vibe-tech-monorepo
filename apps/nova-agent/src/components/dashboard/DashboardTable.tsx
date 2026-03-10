import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { SystemActivity } from "@/hooks/dashboard/types";

interface DashboardTableProps {
	activities: SystemActivity[];
	onClear: (id: number) => void;
}

const DashboardTable = ({ activities, onClear }: DashboardTableProps) => {
	const getStatusColor = (status: SystemActivity["status"]) => {
		switch (status) {
			case "success":
				return "bg-green-500/10 text-green-500 ring-green-500/20";
			case "failed":
				return "bg-red-500/10 text-red-500 ring-red-500/20";
			case "in-progress":
				return "bg-blue-500/10 text-blue-500 ring-blue-500/20";
			default:
				return "bg-gray-500/10 text-gray-500 ring-gray-500/20";
		}
	};

	const getTypeColor = (type: SystemActivity["type"]) => {
		switch (type) {
			case "analysis":
				return "bg-purple-500/10 text-purple-500 ring-purple-500/20";
			case "execution":
				return "bg-orange-500/10 text-orange-500 ring-orange-500/20";
			case "memory":
				return "bg-cyan-500/10 text-cyan-500 ring-cyan-500/20";
			case "network":
				return "bg-pink-500/10 text-pink-500 ring-pink-500/20";
			default:
				return "bg-gray-500/10 text-gray-500 ring-gray-500/20";
		}
	};

	return (
		<div className="rounded-md border border-aura-accent/10 bg-card">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Description</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Timestamp</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{activities.length === 0 ? (
						<TableRow>
							<TableCell colSpan={5} className="h-24 text-center">
								No activities found.
							</TableCell>
						</TableRow>
					) : (
						activities.map((activity) => (
							<TableRow key={activity.id}>
								<TableCell className="font-medium">
									{activity.description}
								</TableCell>
								<TableCell>
									<span
										className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getTypeColor(activity.type)}`}
									>
										{activity.type}
									</span>
								</TableCell>
								<TableCell>
									<span
										className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(activity.status)}`}
									>
										{activity.status}
									</span>
								</TableCell>
								<TableCell>
									{new Date(activity.timestamp).toLocaleString()}
								</TableCell>
								<TableCell className="text-right">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => onClear(activity.id)}
										className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
									>
										<X className="h-4 w-4" />
										<span className="sr-only">Clear</span>
									</Button>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
};

export default DashboardTable;
