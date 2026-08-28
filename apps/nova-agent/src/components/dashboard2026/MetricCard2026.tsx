import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

const colorStyles = {
	purple: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.25)', icon: '#a855f7' },
	pink: { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.25)', icon: '#ec4899' },
	cyan: { bg: 'rgba(34, 211, 238, 0.15)', border: 'rgba(34, 211, 238, 0.25)', icon: '#22d3ee' },
	green: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.25)', icon: '#22c55e' },
};

export type MetricCardColor = "purple" | "pink" | "cyan" | "green";

export const MetricCard2026 = ({
	label,
	value,
	icon: Icon,
	color = "purple",
}: {
	label: string;
	value: string | number;
	icon: LucideIcon;
	color?: MetricCardColor;
}) => {
	const styles = colorStyles[color];

	return (
		<motion.div
			style={{
				background: 'rgba(15, 12, 28, 0.6)',
				backdropFilter: 'blur(16px)',
				border: '1px solid rgba(255, 255, 255, 0.06)',
				borderRadius: '20px',
				padding: '24px',
			}}
			whileHover={{ scale: 1.02, borderColor: 'rgba(176, 38, 255, 0.3)' }}
			transition={{ type: "spring", stiffness: 400, damping: 25 }}
		>
			<div className="flex items-start justify-between mb-4">
				<div
					style={{
						width: '48px',
						height: '48px',
						borderRadius: '14px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: styles.bg,
						border: `1px solid ${styles.border}`,
					}}
				>
					<Icon style={{ width: '20px', height: '20px', color: styles.icon }} />
				</div>
				<div 
					style={{
						width: '8px',
						height: '8px',
						borderRadius: '50%',
						background: '#b026ff',
						boxShadow: '0 0 12px rgba(176, 38, 255, 0.8)',
					}}
				/>
			</div>
			<div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>{value}</div>
			<div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{label}</div>
		</motion.div>
	);
};
