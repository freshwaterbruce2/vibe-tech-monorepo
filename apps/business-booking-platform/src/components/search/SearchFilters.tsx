import { Filter, Sliders, Star, X } from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { useSearchStore } from '@/store/searchStore';
import type { SearchFilters as FilterOptions } from '@/types/hotel';
import { cn } from '@/utils/cn';
import { Button } from '../ui/Button';

interface SearchFiltersProps {
	isVisible?: boolean;
	onToggleVisibility?: () => void;
	className?: string;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
	isVisible = true,
	onToggleVisibility,
	className = '',
}) => {
	const { filters, setFilters } = useSearchStore();
	const [sortBy, setSortBy] = useState('relevance');

	const handleFilterChange = (key: keyof FilterOptions, value: any) => {
		setFilters({ [key]: value });
	};

	const handleAmenityToggle = (amenity: string) => {
		const currentAmenities = filters.amenities;
		const newAmenities = currentAmenities.includes(amenity)
			? currentAmenities.filter((a) => a !== amenity)
			: [...currentAmenities, amenity];
		handleFilterChange('amenities', newAmenities);
	};

	const handleStarRatingToggle = (rating: number) => {
		const currentRatings = filters.starRating;
		const newRatings = currentRatings.includes(rating)
			? currentRatings.filter((r) => r !== rating)
			: [...currentRatings, rating];
		handleFilterChange('starRating', newRatings);
	};

	const clearFilters = () => {
		setFilters({
			priceRange: [0, 1000],
			starRating: [],
			amenities: [],
			location: {},
			accessibility: {
				wheelchairAccessible: false,
				hearingAccessible: false,
				visualAccessible: false,
			},
			sustainability: false,
			passions: [],
		});
		setSortBy('relevance');
	};

	if (!isVisible) {
		return (
			<Button
				onClick={onToggleVisibility}
				variant="outline"
				className="flex items-center gap-2"
			>
				<Filter className="w-4 h-4" />
				Show Filters
			</Button>
		);
	}

	const activeFiltersCount = [
		filters.starRating.length > 0,
		filters.amenities.length > 0,
		filters.priceRange[0] > 0 || filters.priceRange[1] < 1000,
		filters.passions.length > 0,
		filters.sustainability,
		Object.values(filters.accessibility).some(Boolean),
	].filter(Boolean).length;

	return (
		<div
			className={cn(
				'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6',
				className,
			)}
		>
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center gap-2">
					<Sliders className="w-5 h-5 text-gray-600 dark:text-gray-400" />
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Filters
					</h3>
					{activeFiltersCount > 0 && (
						<span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
							{activeFiltersCount}
						</span>
					)}
				</div>
				<div className="flex gap-2">
					<Button
						onClick={clearFilters}
						variant="ghost"
						size="sm"
						className="text-primary-600 hover:text-primary-800"
					>
						Clear All
					</Button>
					{onToggleVisibility && (
						<Button
							onClick={onToggleVisibility}
							variant="ghost"
							size="icon"
							className="text-gray-500 hover:text-gray-700"
						>
							<X className="w-4 h-4" />
						</Button>
					)}
				</div>
			</div>

			<div className="space-y-6">
				{/* Sort By */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Sort By
					</label>
					<select
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
					>
						<option value="relevance">Relevance</option>
						<option value="price-low">Price: Low to High</option>
						<option value="price-high">Price: High to Low</option>
						<option value="rating">Guest Rating</option>
						<option value="distance">Distance</option>
						<option value="passion">Passion Match</option>
					</select>
				</div>

				{/* Price Range */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Price Range (per night)
					</label>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<input
								type="number"
								min="0"
								max="2000"
								value={filters.priceRange[0]}
								onChange={(e) =>
									handleFilterChange('priceRange', [
										parseInt(e.target.value) || 0,
										filters.priceRange[1],
									])
								}
								className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-sm focus:ring-2 focus:ring-primary-500"
								placeholder="Min"
							/>
							<span className="text-gray-500 dark:text-gray-400">to</span>
							<input
								type="number"
								min="0"
								max="2000"
								value={filters.priceRange[1]}
								onChange={(e) =>
									handleFilterChange('priceRange', [
										filters.priceRange[0],
										parseInt(e.target.value) || 2000,
									])
								}
								className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md text-sm focus:ring-2 focus:ring-primary-500"
								placeholder="Max"
							/>
						</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">
							${filters.priceRange[0]} - ${filters.priceRange[1]} per night
						</div>
					</div>
				</div>

				{/* Star Rating */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						Star Rating
					</label>
					<div className="space-y-3">
						{[5, 4, 3, 2, 1].map((rating) => (
							<label
								key={rating}
								className="flex items-center cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors"
							>
								<input
									type="checkbox"
									checked={filters.starRating.includes(rating)}
									onChange={() => handleStarRatingToggle(rating)}
									className="mr-3 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-2"
								/>
								<div className="flex items-center">
									<div className="flex items-center mr-2">
										{[...Array(rating)].map((_, i) => (
											<Star
												key={i}
												className="w-4 h-4 text-yellow-400 fill-current"
											/>
										))}
									</div>
									<span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
										{rating} star{rating > 1 ? 's' : ''} & up
									</span>
								</div>
							</label>
						))}
					</div>
				</div>

				{/* Amenities */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						Amenities
					</label>
					<div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
						{[
							'Free WiFi',
							'Swimming Pool',
							'Gym/Fitness Center',
							'Spa & Wellness',
							'Restaurant',
							'Room Service',
							'Pet Friendly',
							'Business Center',
							'Free Parking',
							'Airport Shuttle',
							'Beach Access',
							'Air Conditioning',
							'Concierge Service',
							'Laundry Service',
							'Meeting Rooms',
						].map((amenity) => (
							<label
								key={amenity}
								className="flex items-center cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors"
							>
								<input
									type="checkbox"
									checked={filters.amenities.includes(amenity)}
									onChange={() => handleAmenityToggle(amenity)}
									className="mr-3 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-2"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
									{amenity}
								</span>
							</label>
						))}
					</div>
				</div>

				{/* Passions */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						Travel Passions
					</label>
					<div className="space-y-2">
						{[
							'Gourmet Foodie',
							'Outdoor Adventure',
							'Cultural Explorer',
							'Luxury Relaxation',
							'Family Fun',
							'Business Travel',
							'Romantic Getaway',
						].map((passion) => (
							<label
								key={passion}
								className="flex items-center cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors"
							>
								<input
									type="checkbox"
									checked={filters.passions.includes(passion)}
									onChange={() => {
										const currentPassions = filters.passions;
										const newPassions = currentPassions.includes(passion)
											? currentPassions.filter((p) => p !== passion)
											: [...currentPassions, passion];
										handleFilterChange('passions', newPassions);
									}}
									className="mr-3 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-2"
								/>
								<span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
									{passion}
								</span>
							</label>
						))}
					</div>
				</div>

				{/* Accessibility */}
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						Accessibility
					</label>
					<div className="space-y-2">
						<label className="flex items-center cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors">
							<input
								type="checkbox"
								checked={filters.accessibility.wheelchairAccessible}
								onChange={(e) =>
									handleFilterChange('accessibility', {
										...filters.accessibility,
										wheelchairAccessible: e.target.checked,
									})
								}
								className="mr-3 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-2"
							/>
							<span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
								Wheelchair Accessible
							</span>
						</label>
						<label className="flex items-center cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors">
							<input
								type="checkbox"
								checked={filters.accessibility.hearingAccessible}
								onChange={(e) =>
									handleFilterChange('accessibility', {
										...filters.accessibility,
										hearingAccessible: e.target.checked,
									})
								}
								className="mr-3 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-2"
							/>
							<span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
								Hearing Accessible
							</span>
						</label>
					</div>
				</div>

				{/* Sustainability */}
				<div>
					<label className="flex items-center cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors">
						<input
							type="checkbox"
							checked={filters.sustainability}
							onChange={(e) =>
								handleFilterChange('sustainability', e.target.checked)
							}
							className="mr-3 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-2"
						/>
						<div>
							<span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
								Eco-Friendly Hotels
							</span>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Hotels with green certifications
							</p>
						</div>
					</label>
				</div>
			</div>
		</div>
	);
};

export default SearchFilters;
