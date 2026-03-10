import { Calendar, Loader2, MapPin, Search } from 'lucide-react';
import React from 'react';
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg' | 'xl';
	variant?: 'default' | 'dots' | 'pulse' | 'bounce';
	className?: string;
}

interface PageLoadingProps {
	message?: string;
	submessage?: string;
	variant?: 'search' | 'booking' | 'details' | 'default';
	className?: string;
}

interface SkeletonProps {
	className?: string;
	variant?: 'text' | 'circular' | 'rectangular';
	width?: string | number;
	height?: string | number;
	animation?: 'pulse' | 'wave';
}

// Basic loading spinner
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	size = 'md',
	variant = 'default',
	className,
}) => {
	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8',
		xl: 'w-12 h-12',
	};

	if (variant === 'dots') {
		return (
			<div className={cn('flex space-x-1', className)}>
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className={cn(
							'bg-primary-600 rounded-full animate-bounce',
							size === 'sm'
								? 'w-2 h-2'
								: size === 'md'
									? 'w-3 h-3'
									: size === 'lg'
										? 'w-4 h-4'
										: 'w-5 h-5',
						)}
						style={{
							animationDelay: `${i * 0.1}s`,
						}}
					/>
				))}
			</div>
		);
	}

	if (variant === 'pulse') {
		return (
			<div
				className={cn(
					'bg-primary-600 rounded-full animate-pulse',
					sizeClasses[size],
					className,
				)}
			/>
		);
	}

	if (variant === 'bounce') {
		return (
			<div
				className={cn(
					'bg-primary-600 rounded-full animate-bounce',
					sizeClasses[size],
					className,
				)}
			/>
		);
	}

	return (
		<Loader2
			className={cn(
				'animate-spin text-primary-600',
				sizeClasses[size],
				className,
			)}
		/>
	);
};

// Skeleton loading component
export const Skeleton: React.FC<SkeletonProps> = ({
	className,
	variant = 'rectangular',
	width,
	height,
	animation = 'pulse',
}) => {
	const baseClasses = cn(
		'bg-gray-200 dark:bg-gray-700',
		animation === 'pulse' ? 'animate-pulse' : 'animate-wave',
		variant === 'circular' && 'rounded-full',
		variant === 'text' && 'rounded',
		variant === 'rectangular' && 'rounded-md',
		className,
	);

	const style: React.CSSProperties = {};
	if (width) {
		style.width = typeof width === 'number' ? `${width}px` : width;
	}
	if (height) {
		style.height = typeof height === 'number' ? `${height}px` : height;
	}

	if (variant === 'text') {
		return <div className={cn(baseClasses, 'h-4')} style={style} />;
	}

	return <div className={baseClasses} style={style} />;
};

// Page-level loading component
export const PageLoading: React.FC<PageLoadingProps> = ({
	message,
	submessage,
	variant = 'default',
	className,
}) => {
	const getVariantContent = () => {
		switch (variant) {
			case 'search':
				return {
					icon: Search,
					defaultMessage: 'Searching for hotels...',
					defaultSubmessage:
						'Finding the perfect match for your travel preferences',
					color: 'text-blue-600',
				};
			case 'booking':
				return {
					icon: Calendar,
					defaultMessage: 'Processing your booking...',
					defaultSubmessage: 'Securing your reservation with the hotel',
					color: 'text-green-600',
				};
			case 'details':
				return {
					icon: MapPin,
					defaultMessage: 'Loading hotel details...',
					defaultSubmessage:
						'Gathering comprehensive information about this property',
					color: 'text-purple-600',
				};
			default:
				return {
					icon: Loader2,
					defaultMessage: 'Loading...',
					defaultSubmessage: 'Please wait while we prepare everything for you',
					color: 'text-primary-600',
				};
		}
	};

	const {
		icon: Icon,
		defaultMessage,
		defaultSubmessage,
		color,
	} = getVariantContent();

	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center min-h-[400px] p-8 text-center',
				className,
			)}
		>
			<div className="space-y-6">
				{/* Animated Icon */}
				<div className="relative">
					<div
						className={cn(
							'w-16 h-16 rounded-full flex items-center justify-center',
							'bg-gradient-to-br from-primary-100 to-secondary-100',
							'dark:from-primary-900/20 dark:to-secondary-900/20',
						)}
					>
						<Icon className={cn('w-8 h-8 animate-spin', color)} />
					</div>

					{/* Outer ring animation */}
					<div
						className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary-200 dark:border-t-primary-800 animate-spin"
						style={{ animationDuration: '2s' }}
					/>
				</div>

				{/* Messages */}
				<div className="space-y-2 max-w-md">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						{message || defaultMessage}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{submessage || defaultSubmessage}
					</p>
				</div>

				{/* Progress indicators */}
				<div className="flex space-x-1">
					{[0, 1, 2, 3, 4].map((i) => (
						<div
							key={i}
							className="w-2 h-2 bg-primary-300 dark:bg-primary-700 rounded-full animate-pulse"
							style={{
								animationDelay: `${i * 0.2}s`,
								animationDuration: '1s',
							}}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

// Hotel card skeleton
export const HotelCardSkeleton: React.FC<{ className?: string }> = ({
	className,
}) => (
	<div
		className={cn(
			'bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse',
			className,
		)}
	>
		<div className="flex flex-col lg:flex-row gap-6">
			{/* Image skeleton */}
			<Skeleton variant="rectangular" className="w-full lg:w-80 h-48 lg:h-40" />

			{/* Content skeleton */}
			<div className="flex-1 space-y-4">
				<div className="space-y-2">
					<Skeleton variant="text" className="h-6 w-3/4" />
					<Skeleton variant="text" className="h-4 w-1/2" />
				</div>

				<div className="flex items-center space-x-2">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} variant="rectangular" className="w-4 h-4" />
					))}
					<Skeleton variant="text" className="h-4 w-20" />
				</div>

				<div className="flex flex-wrap gap-2">
					{[1, 2, 3].map((i) => (
						<Skeleton
							key={i}
							variant="rectangular"
							className="h-6 w-16 rounded-full"
						/>
					))}
				</div>

				<div className="flex justify-between items-center">
					<Skeleton variant="text" className="h-4 w-32" />
					<div className="text-right space-y-1">
						<Skeleton variant="text" className="h-6 w-20" />
						<Skeleton variant="text" className="h-4 w-16" />
					</div>
				</div>
			</div>
		</div>
	</div>
);

// Search filters skeleton
export const FiltersSkeleton: React.FC<{ className?: string }> = ({
	className,
}) => (
	<div
		className={cn(
			'bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse space-y-6',
			className,
		)}
	>
		<div className="flex justify-between items-center">
			<Skeleton variant="text" className="h-6 w-24" />
			<Skeleton variant="text" className="h-4 w-16" />
		</div>

		{[1, 2, 3, 4].map((section) => (
			<div key={section} className="space-y-3">
				<Skeleton variant="text" className="h-5 w-32" />
				<div className="space-y-2">
					{[1, 2, 3].map((item) => (
						<div key={item} className="flex items-center space-x-3">
							<Skeleton variant="rectangular" className="w-4 h-4" />
							<Skeleton variant="text" className="h-4 w-24" />
						</div>
					))}
				</div>
			</div>
		))}
	</div>
);

// Loading overlay
export const LoadingOverlay: React.FC<{
	isVisible: boolean;
	message?: string;
	className?: string;
}> = ({ isVisible, message = 'Loading...', className }) => {
	if (!isVisible) {
		return null;
	}

	return (
		<div
			className={cn(
				'absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
				'flex items-center justify-center z-50',
				className,
			)}
		>
			<div className="flex flex-col items-center space-y-4">
				<LoadingSpinner size="lg" />
				<p className="text-sm font-medium text-gray-900 dark:text-white">
					{message}
				</p>
			</div>
		</div>
	);
};

export default LoadingSpinner;
