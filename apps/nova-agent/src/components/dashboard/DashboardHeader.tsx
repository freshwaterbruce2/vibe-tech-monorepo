import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface DashboardHeaderProps {
	title: string;
	className?: string;
}

const DashboardHeader = ({ title, className = "" }: DashboardHeaderProps) => {
	return (
		<div className={`flex items-center gap-4 ${className}`}>
			<motion.div
				className="flex items-center gap-3"
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3 }}
			>
				<div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
					<Sparkles className="w-5 h-5 text-purple-400" />
				</div>
				<h1 className="text-2xl font-bold text-white">{title}</h1>
			</motion.div>
		</div>
	);
};

export default DashboardHeader;
