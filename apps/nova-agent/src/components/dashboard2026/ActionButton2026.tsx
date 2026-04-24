import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export const ActionButton2026 = ({
	icon: Icon,
	label,
	onClick,
}: {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
}) => {
	return (
		<motion.button
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '12px',
				padding: '24px 16px',
				background: 'rgba(15, 12, 28, 0.5)',
				border: '1px solid rgba(255, 255, 255, 0.06)',
				borderRadius: '20px',
				cursor: 'pointer',
				width: '100%',
			}}
			onClick={onClick}
			whileHover={{ scale: 1.02, background: 'rgba(176, 38, 255, 0.1)', borderColor: 'rgba(176, 38, 255, 0.3)' }}
			whileTap={{ scale: 0.98 }}
		>
			<div style={{
				width: '56px',
				height: '56px',
				borderRadius: '16px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'linear-gradient(135deg, rgba(176, 38, 255, 0.2), rgba(255, 45, 149, 0.1))',
				border: '1px solid rgba(176, 38, 255, 0.2)',
			}}>
				<Icon style={{ width: '24px', height: '24px', color: '#a855f7' }} />
			</div>
			<span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
		</motion.button>
	);
};
