import { Clock, Eye, TrendingUp, Users } from 'lucide-react';
import React from 'react';
import { cn } from '@/utils/cn';

interface UrgencyIndicatorProps {
	type: 'viewing' | 'recently_booked' | 'trending' | 'limited';
	count?: number;
	timeframe?: string;
	className?: string;
}

const urgencyConfig = {
	viewing: {
		icon: Eye,
		color: 'text-orange-600',
		bgColor: 'bg-orange-50',
		borderColor: 'border-orange-200',
		getText: (count: number) => `${count} people viewing`,
	},
	recently_booked: {
		icon: Clock,
		color: 'text-green-600',
		bgColor: 'bg-green-50',
		borderColor: 'border-green-200',
		getText: (_count: number, timeframe?: string) =>
			`Booked ${timeframe || '2 hours ago'}`,
	},
	trending: {
		icon: TrendingUp,
		color: 'text-purple-600',
		bgColor: 'bg-purple-50',
		borderColor: 'border-purple-200',
		getText: () => 'Trending today',
	},
	limited: {
		icon: Users,
		color: 'text-red-600',
		bgColor: 'bg-red-50',
		borderColor: 'border-red-200',
		getText: (count: number) => `Only ${count} rooms left`,
	},
};

export const UrgencyIndicator: React.FC<UrgencyIndicatorProps> = ({
	type,
	count = 0,
	timeframe,
	className,
}) => {
	const config = urgencyConfig[type];
	const IconComponent = config.icon;
	const text = config.getText(count, timeframe);

	return (
		<div
			className={cn(
				'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium animate-pulse',
				config.bgColor,
				config.borderColor,
				config.color,
				className,
			)}
		>
			<IconComponent className="w-3.5 h-3.5" />
			<span>{text}</span>
		</div>
	);
};
