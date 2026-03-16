import {
	Briefcase,
	Check,
	Heart,
	MapPin,
	Sparkles,
	Star,
	TreePine,
	Users,
	Utensils,
	Waves,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useSearchStore } from '@/store/searchStore';
import { cn } from '@/utils/cn';
import { Button } from '../ui/Button';

interface PassionOption {
	id: string;
	name: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	gradient: string;
	keywords: string[];
	popularWith: string[];
}

const passionOptions: PassionOption[] = [
	{
		id: 'gourmet-foodie',
		name: 'Gourmet Foodie',
		description: 'Exceptional dining experiences and culinary adventures',
		icon: Utensils,
		gradient: 'from-orange-500 to-red-500',
		keywords: [
			'restaurant',
			'fine dining',
			'michelin',
			'chef',
			'culinary',
			'gastronomy',
		],
		popularWith: ['Solo travelers', 'Couples', 'Food enthusiasts'],
	},
	{
		id: 'outdoor-adventure',
		name: 'Outdoor Adventure',
		description: 'Thrilling activities and nature exploration',
		icon: TreePine,
		gradient: 'from-green-500 to-emerald-500',
		keywords: [
			'hiking',
			'adventure',
			'outdoor',
			'nature',
			'mountain',
			'forest',
		],
		popularWith: ['Adventure seekers', 'Families', 'Nature lovers'],
	},
	{
		id: 'cultural-explorer',
		name: 'Cultural Explorer',
		description: 'Rich history, art, and local cultural experiences',
		icon: MapPin,
		gradient: 'from-purple-500 to-indigo-500',
		keywords: ['museum', 'culture', 'history', 'art', 'heritage', 'local'],
		popularWith: ['History buffs', 'Art lovers', 'Cultural enthusiasts'],
	},
	{
		id: 'luxury-relaxation',
		name: 'Luxury Relaxation',
		description: 'Premium amenities and ultimate comfort',
		icon: Star,
		gradient: 'from-yellow-500 to-amber-500',
		keywords: ['spa', 'luxury', 'premium', 'relaxation', 'wellness', 'massage'],
		popularWith: ['Honeymooners', 'Wellness seekers', 'Luxury travelers'],
	},
	{
		id: 'family-fun',
		name: 'Family Fun',
		description: 'Activities and amenities perfect for families',
		icon: Users,
		gradient: 'from-blue-500 to-cyan-500',
		keywords: [
			'family',
			'kids',
			'children',
			'playground',
			'activities',
			'entertainment',
		],
		popularWith: ['Families', 'Parents', 'Multi-generational groups'],
	},
	{
		id: 'business-travel',
		name: 'Business Travel',
		description: 'Professional facilities and convenient locations',
		icon: Briefcase,
		gradient: 'from-gray-500 to-slate-600',
		keywords: [
			'business',
			'conference',
			'meeting',
			'wifi',
			'workspace',
			'corporate',
		],
		popularWith: ['Business travelers', 'Corporate groups', 'Professionals'],
	},
	{
		id: 'romantic-getaway',
		name: 'Romantic Getaway',
		description: 'Intimate settings perfect for couples',
		icon: Heart,
		gradient: 'from-pink-500 to-rose-500',
		keywords: [
			'romantic',
			'couples',
			'honeymoon',
			'intimate',
			'privacy',
			'sunset',
		],
		popularWith: ['Couples', 'Honeymooners', 'Anniversary celebrants'],
	},
	{
		id: 'beach-paradise',
		name: 'Beach Paradise',
		description: 'Oceanfront locations and water activities',
		icon: Waves,
		gradient: 'from-teal-500 to-blue-500',
		keywords: ['beach', 'ocean', 'water', 'swimming', 'snorkeling', 'seaside'],
		popularWith: ['Beach lovers', 'Water sports enthusiasts', 'Sun seekers'],
	},
];

interface PassionSelectorProps {
	onClose?: () => void;
	className?: string;
	maxSelections?: number;
}

export const PassionSelector: React.FC<PassionSelectorProps> = ({
	onClose,
	className,
	maxSelections = 3,
}) => {
	const { filters, setFilters } = useSearchStore();
	const [selectedPassions, setSelectedPassions] = useState<string[]>(
		filters.passions || [],
	);
	const [hoveredPassion, setHoveredPassion] = useState<string | null>(null);
	const getCardClasses = (isSelected: boolean, canSelect: boolean) => {
		if (isSelected) {
			return 'ring-2 ring-primary-500 shadow-lg scale-105';
		}

		if (canSelect) {
			return 'hover:shadow-lg hover:scale-105';
		}

		return 'opacity-50 cursor-not-allowed pointer-events-none';
	};

	const handlePassionToggle = (passionId: string) => {
		setSelectedPassions((prev) => {
			if (prev.includes(passionId)) {
				return prev.filter((id) => id !== passionId);
			} else if (prev.length < maxSelections) {
				return [...prev, passionId];
			}
			return prev;
		});
	};

	const handleApplyPassions = () => {
		setFilters({ passions: selectedPassions });
		onClose?.();
	};

	const handleClearAll = () => {
		setSelectedPassions([]);
	};

	return (
		<div className={cn('space-y-6', className)}>
			{/* Header */}
			<div className="text-center">
				<div className="flex items-center justify-center gap-2 mb-3">
					<Sparkles className="w-6 h-6 text-primary-600" />
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						What's Your Travel Passion?
					</h2>
				</div>
				<p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
					Select up to {maxSelections} travel styles that match your interests.
					We'll find hotels that perfectly align with your passions.
				</p>
			</div>

			{/* Selection Counter */}
			<div className="flex items-center justify-center gap-4">
				<div className="text-sm text-gray-600 dark:text-gray-400">
					{selectedPassions.length} of {maxSelections} selected
				</div>
				{selectedPassions.length > 0 && (
					<Button
						onClick={handleClearAll}
						variant="ghost"
						size="sm"
						className="text-primary-600 hover:text-primary-800"
					>
						Clear All
					</Button>
				)}
			</div>

			{/* Passion Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{passionOptions.map((passion) => {
					const isSelected = selectedPassions.includes(passion.id);
					const isHovered = hoveredPassion === passion.id;
					const canSelect =
						selectedPassions.length < maxSelections || isSelected;
					const IconComponent = passion.icon;

					return (
						<Card
							key={passion.id}
							className={cn(
								'relative overflow-hidden cursor-pointer transition-all duration-300 group',
								getCardClasses(isSelected, canSelect),
							)}
							onClick={() => canSelect && handlePassionToggle(passion.id)}
							onMouseEnter={() => setHoveredPassion(passion.id)}
							onMouseLeave={() => setHoveredPassion(null)}
						>
							{/* Background Gradient */}
							<div
								className={cn(
									'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300',
									passion.gradient,
									(isSelected || isHovered) && 'opacity-10',
								)}
							/>

							{/* Selection Indicator */}
							{isSelected && (
								<div className="absolute top-3 right-3 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center z-10">
									<Check className="w-4 h-4 text-white" />
								</div>
							)}

							{/* Content */}
							<div className="relative p-6 h-full flex flex-col">
								{/* Icon */}
								<div
									className={cn(
										'w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-all duration-300',
										isSelected || isHovered
											? `bg-gradient-to-br ${passion.gradient} text-white`
											: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
									)}
								>
									<IconComponent className="w-6 h-6" />
								</div>

								{/* Title & Description */}
								<div className="flex-1">
									<h3
										className={cn(
											'font-semibold mb-2 transition-colors',
											isSelected
												? 'text-primary-700 dark:text-primary-400'
												: 'text-gray-900 dark:text-white',
										)}
									>
										{passion.name}
									</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
										{passion.description}
									</p>
								</div>

								{/* Popular With */}
								<div className="mt-auto">
									<div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
										Popular with:
									</div>
									<div className="flex flex-wrap gap-1">
										{passion.popularWith.slice(0, 2).map((tag, index) => (
											<span
												key={index}
												className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
							</div>
						</Card>
					);
				})}
			</div>

			{/* Selected Passions Summary */}
			{selectedPassions.length > 0 && (
				<Card className="p-6 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
					<h3 className="font-semibold text-primary-900 dark:text-primary-300 mb-3 flex items-center gap-2">
						<Sparkles className="w-5 h-5" />
						Your Selected Travel Passions
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						{selectedPassions.map((passionId) => {
							const passion = passionOptions.find((p) => p.id === passionId);
							if (!passion) {
								return null;
							}
							const IconComponent = passion.icon;

							return (
								<div
									key={passionId}
									className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg"
								>
									<div
										className={cn(
											'w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br text-white',
											passion.gradient,
										)}
									>
										<IconComponent className="w-4 h-4" />
									</div>
									<div className="flex-1">
										<div className="font-medium text-gray-900 dark:text-white text-sm">
											{passion.name}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</Card>
			)}

			{/* Action Buttons */}
			<div className="flex justify-center gap-4">
				{onClose && (
					<Button
						onClick={onClose}
						variant="outline"
						size="lg"
						className="px-8"
					>
						Cancel
					</Button>
				)}
				<Button
					onClick={handleApplyPassions}
					disabled={selectedPassions.length === 0}
					size="lg"
					className="px-8 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700"
				>
					Apply Passions ({selectedPassions.length})
				</Button>
			</div>
		</div>
	);
};

export default PassionSelector;
