import { Clock, Heart, Shield, Star, Users, Zap } from 'lucide-react';
import React from 'react';
import { cn } from '@/utils/cn';

interface TrustBadgeProps {
	type: 'security' | 'rating' | 'speed' | 'popular' | 'instant' | 'favorite';
	text: string;
	subtext?: string;
	className?: string;
}

const badgeConfig = {
	security: {
		icon: Shield,
		color: 'text-emerald-600',
		bgColor: 'bg-emerald-50',
		borderColor: 'border-emerald-200',
	},
	rating: {
		icon: Star,
		color: 'text-yellow-600',
		bgColor: 'bg-yellow-50',
		borderColor: 'border-yellow-200',
	},
	speed: {
		icon: Zap,
		color: 'text-blue-600',
		bgColor: 'bg-blue-50',
		borderColor: 'border-blue-200',
	},
	popular: {
		icon: Users,
		color: 'text-purple-600',
		bgColor: 'bg-purple-50',
		borderColor: 'border-purple-200',
	},
	instant: {
		icon: Clock,
		color: 'text-green-600',
		bgColor: 'bg-green-50',
		borderColor: 'border-green-200',
	},
	favorite: {
		icon: Heart,
		color: 'text-primary',
		bgColor: 'bg-primary-50',
		borderColor: 'border-primary-200',
	},
};

export const TrustBadge: React.FC<TrustBadgeProps> = ({
	type,
	text,
	subtext,
	className,
}) => {
	const config = badgeConfig[type];
	const IconComponent = config.icon;

	return (
		<div
			className={cn(
				'inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium',
				config.bgColor,
				config.borderColor,
				config.color,
				className,
			)}
		>
			<IconComponent className="w-4 h-4" />
			<span>{text}</span>
			{subtext && <span className="text-xs opacity-75">• {subtext}</span>}
		</div>
	);
};
