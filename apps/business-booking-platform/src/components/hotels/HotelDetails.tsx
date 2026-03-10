import {
	ArrowLeft,
	Calendar,
	Camera,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	Heart,
	Leaf,
	MapPin,
	Play,
	Share2,
	Shield,
	Sparkles,
	Star,
	Users,
	X,
} from 'lucide-react';
import React from 'react';
import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useHotelStore } from '@/store/hotelStore';
import { useSearchStore } from '@/store/searchStore';

import type { HotelDetails as HotelDetailsType } from '@/types/hotel';
import { cn } from '@/utils/cn';
import { Button } from '../ui/Button';
import './HotelDetails.css';

interface HotelDetailsProps {
	hotelId?: string;
	hotel?: HotelDetailsType;
	isLoading?: boolean;
	onBookRoom?: (roomId: string) => void;
	onBackToResults?: () => void;
	className?: string;
}

const HotelDetails: React.FC<HotelDetailsProps> = ({
	// hotelId removed (unused)
	hotel: providedHotel,
	isLoading = false,
	onBookRoom,
	onBackToResults,
	className = '',
}) => {
	const navigate = useNavigate();
	const {
		selectedHotel,
		loading: hotelLoading,
		setSelectedHotel,
	} = useHotelStore();
	const { selectedDateRange, guestCount } = useSearchStore();

	const hotel = (providedHotel || selectedHotel) as HotelDetailsType | null;
	const loading = isLoading || hotelLoading;

	const [selectedImageIndex, setSelectedImageIndex] = useState(0);
	const [activeTab, setActiveTab] = useState<
		'overview' | 'rooms' | 'amenities' | 'location' | 'reviews'
	>('rooms');
	const [showAllImages, setShowAllImages] = useState(false);

	const renderStars = (rating: number) => {
		return (
			<div className="flex items-center gap-1">
				{[...Array(5)].map((_, i) => (
					<Star
						key={i}
						className={cn(
							'w-5 h-5',
							i < Math.floor(rating)
								? 'text-yellow-400 fill-current'
								: 'text-gray-300',
						)}
					/>
				))}
				<span className="ml-2 text-lg font-medium text-gray-700 dark:text-gray-300">
					{rating.toFixed(1)}
				</span>
			</div>
		);
	};

	const getPassionScoreColor = (score: number) => {
		if (score >= 0.8) {
			return 'from-purple-500 to-pink-500';
		}
		if (score >= 0.6) {
			return 'from-secondary-500 to-purple-500';
		}
		if (score >= 0.4) {
			return 'from-accent-500 to-secondary-500';
		}
		return 'from-gray-400 to-gray-500';
	};

	const formatPrice = (price: number, currency = 'USD') => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
		}).format(price);
	};

	if (!hotel) {
		return (
			<div className={cn('text-center py-12', className)}>
				<div className="max-w-md mx-auto">
					<div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
						<MapPin className="w-8 h-8 text-gray-400" />
					</div>
					<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
						Hotel not found
					</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						The hotel you're looking for doesn't exist or has been removed.
					</p>
					<Button onClick={onBackToResults} variant="outline">
						Back to Results
					</Button>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className={cn('animate-pulse space-y-6', className)}>
				<div className="h-96 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
				<div className="space-y-4">
					<div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
					<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
					<div className="h-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
				</div>
			</div>
		);
	}

	const maxPassionScore = hotel.passionScore
		? Math.max(...Object.values(hotel.passionScore))
		: 0;
	// const primaryImage = hotel.images?.find((img) => img.isPrimary) || hotel.images?.[0];
	const totalNights =
		selectedDateRange.checkIn && selectedDateRange.checkOut
			? Math.ceil(
					(new Date(selectedDateRange.checkOut).getTime() -
						new Date(selectedDateRange.checkIn).getTime()) /
						(1000 * 60 * 60 * 24),
				)
			: 1;

	return (
		<div className={cn('max-w-7xl mx-auto', className)}>
			{/* Back Button & Actions */}
			<div className="flex items-center justify-between mb-6">
				{onBackToResults && (
					<Button
						onClick={onBackToResults}
						variant="ghost"
						className="text-primary-600 hover:text-primary-800"
					>
						<ArrowLeft className="w-5 h-5 mr-2" />
						Back to Results
					</Button>
				)}

				<div className="flex items-center gap-3">
					{maxPassionScore > 0.6 && (
						<div
							className={cn(
								'bg-gradient-to-r text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
								getPassionScoreColor(maxPassionScore),
							)}
						>
							<Sparkles className="w-4 h-4" />
							{Math.round(maxPassionScore * 100)}% Passion Match
						</div>
					)}

					{hotel.sustainabilityScore && hotel.sustainabilityScore > 0.8 && (
						<div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
							<Leaf className="w-4 h-4" />
							Eco-Friendly
						</div>
					)}

					<Button variant="outline" size="icon">
						<Heart className="w-4 h-4" />
					</Button>

					<Button variant="outline" size="icon">
						<Share2 className="w-4 h-4" />
					</Button>
				</div>
			</div>

			{/* Hotel Images */}
			<div className="relative mb-8">
				{!showAllImages ? (
					<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
						<div className="lg:col-span-3 relative group">
							<img
								src={
									hotel.images[selectedImageIndex]?.url ||
									'/placeholder-hotel.jpg'
								}
								alt={hotel.images[selectedImageIndex]?.alt || hotel.name}
								className="w-full h-96 object-cover rounded-lg"
								width="800"
								height="384"
								loading="lazy"
								decoding="async"
								onError={(e) => {
									(e.target as HTMLImageElement).src = '/placeholder-hotel.jpg';
								}}
							/>

							{/* Image Navigation */}
							{hotel.images.length > 1 && (
								<>
									<Button
										variant="secondary"
										size="icon"
										className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
										onClick={() =>
											setSelectedImageIndex(
												selectedImageIndex > 0
													? selectedImageIndex - 1
													: hotel.images.length - 1,
											)
										}
									>
										<ChevronLeft className="w-5 h-5" />
									</Button>
									<Button
										variant="secondary"
										size="icon"
										className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
										onClick={() =>
											setSelectedImageIndex(
												selectedImageIndex < hotel.images.length - 1
													? selectedImageIndex + 1
													: 0,
											)
										}
									>
										<ChevronRight className="w-5 h-5" />
									</Button>
								</>
							)}

							{/* Virtual Tour */}
							{hotel.virtualTourUrl && (
								<Button
									variant="secondary"
									className="absolute bottom-4 left-4 bg-black/50 hover:bg-black/70 text-white"
									onClick={() => window.open(hotel.virtualTourUrl, '_blank')}
								>
									<Play className="w-4 h-4 mr-2" />
									Virtual Tour
								</Button>
							)}

							{/* Image Counter */}
							<div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
								{selectedImageIndex + 1} / {hotel.images.length}
							</div>
						</div>

						<div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
							{hotel.images.slice(1, 4).map((image, index) => (
								<div key={index + 1} className="relative group cursor-pointer">
									<img
										src={image.url}
										alt={image.alt}
										className="w-full h-28 lg:h-32 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
										width="200"
										height="128"
										loading="lazy"
										decoding="async"
										onClick={() => setSelectedImageIndex(index + 1)}
										onError={(e) => {
											(e.target as HTMLImageElement).src =
												'/placeholder-hotel.jpg';
										}}
									/>
									{index === 2 && hotel.images.length > 4 && (
										<div
											className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white font-medium cursor-pointer"
											onClick={() => setShowAllImages(true)}
										>
											<Camera className="w-5 h-5 mr-2" />
											View All {hotel.images.length} Photos
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
						{hotel.images.map((image, index) => (
							<div key={index} className="relative group cursor-pointer">
								<img
									src={image.url}
									alt={image.alt}
									className="w-full h-48 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
									width="300"
									height="192"
									loading="lazy"
									decoding="async"
									onClick={() => {
										setSelectedImageIndex(index);
										setShowAllImages(false);
									}}
									onError={(e) => {
										(e.target as HTMLImageElement).src =
											'/placeholder-hotel.jpg';
									}}
								/>
							</div>
						))}
					</div>
				)}

				{showAllImages && (
					<Button
						onClick={() => setShowAllImages(false)}
						variant="outline"
						className="mt-4"
					>
						<X className="w-4 h-4 mr-2" />
						Close Gallery
					</Button>
				)}
			</div>

			{/* Hotel Header */}
			<div className="mb-8">
				<div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
					<div className="flex-1">
						<h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
							{hotel.name}
						</h1>
						<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
							<MapPin className="w-5 h-5" />
							<span className="text-lg">
								{hotel.location.address}, {hotel.location.city},{' '}
								{hotel.location.country}
							</span>
						</div>
						<div className="flex items-center gap-4 mb-4">
							{renderStars(hotel.rating)}
							<span className="text-gray-600 dark:text-gray-400">
								({hotel.reviewCount.toLocaleString()} reviews)
							</span>
						</div>

						{/* Quick Info */}
						<div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
							<div className="flex items-center gap-1">
								<Clock className="w-4 h-4" />
								Check-in: {hotel.checkInTime}
							</div>
							<div className="flex items-center gap-1">
								<Clock className="w-4 h-4" />
								Check-out: {hotel.checkOutTime}
							</div>
						</div>
					</div>

					{/* Booking Card */}
					<Card className="w-full lg:w-96 p-6 lg:sticky lg:top-6">
						<div className="text-center mb-4">
							<div className="text-sm text-gray-500 dark:text-gray-400">
								From
							</div>
							<div className="text-3xl font-bold text-primary-600">
								{formatPrice(
									hotel.priceRange.avgNightly,
									hotel.priceRange.currency,
								)}
							</div>
							<div className="text-sm text-gray-500 dark:text-gray-400">
								per night
							</div>
							{totalNights > 1 && (
								<div className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
									Total:{' '}
									{formatPrice(
										hotel.priceRange.avgNightly * totalNights,
										hotel.priceRange.currency,
									)}
								</div>
							)}
						</div>

						{/* Date & Guest Info */}
						{selectedDateRange.checkIn && selectedDateRange.checkOut && (
							<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<div className="text-gray-600 dark:text-gray-400">
											Check-in
										</div>
										<div className="font-medium">
											{selectedDateRange.checkIn}
										</div>
									</div>
									<div>
										<div className="text-gray-600 dark:text-gray-400">
											Check-out
										</div>
										<div className="font-medium">
											{selectedDateRange.checkOut}
										</div>
									</div>
									<div className="col-span-2">
										<div className="text-gray-600 dark:text-gray-400">
											Guests
										</div>
										<div className="font-medium">
											{guestCount.adults} adults
											{guestCount.children > 0 &&
												`, ${guestCount.children} children`}{' '}
											â€¢ {guestCount.rooms} room
											{guestCount.rooms > 1 ? 's' : ''}
										</div>
									</div>
								</div>
							</div>
						)}

						<Button
							className="w-full mb-3"
							size="lg"
							onClick={() => {
								if (hotel) {
									setSelectedHotel(hotel);
									navigate('/booking');
								}
							}}
						>
							<Calendar className="w-4 h-4 mr-2" />
							Book Now
						</Button>

						<Button variant="outline" className="w-full">
							<Users className="w-4 h-4 mr-2" />
							View Rooms
						</Button>
					</Card>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="border-b border-gray-200 dark:border-gray-700 mb-8">
				<nav className="flex space-x-8 overflow-x-auto">
					{[
						{ id: 'overview', label: 'Overview', icon: null },
						{ id: 'rooms', label: 'Rooms & Rates', icon: null },
						{ id: 'amenities', label: 'Amenities', icon: null },
						{ id: 'location', label: 'Location', icon: MapPin },
						{ id: 'reviews', label: 'Reviews', icon: Star },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as typeof activeTab)}
							className={cn(
								'flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
								activeTab === tab.id
									? 'border-primary-600 text-primary-600'
									: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
							)}
						>
							{tab.icon && <tab.icon className="w-4 h-4" />}
							{tab.label}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content */}
			<div className="mb-8">
				{activeTab === 'overview' && (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-2">
							<h3 className="text-xl font-semibold mb-4">About This Hotel</h3>
							<p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
								{hotel.fullDescription || hotel.description}
							</p>

							{/* Passion Scores */}
							{hotel.passionScore &&
								Object.keys(hotel.passionScore).length > 0 && (
									<div className="mb-6">
										<h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
											Perfect For
										</h4>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{Object.entries(hotel.passionScore)
												.filter(([_, score]) => score > 0.3)
												.sort(([_, a], [__, b]) => b - a)
												.map(([passion, score]) => (
													<div
														key={passion}
														className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
													>
														<span className="font-medium text-gray-900 dark:text-white capitalize">
															{passion.replace(/([A-Z])/g, ' $1').trim()}
														</span>
														<div className="flex items-center gap-2">
															<div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
																<div
																	className={cn(
																		'h-full bg-gradient-to-r transition-all duration-500 passion-bar',
																		getPassionScoreColor(score),
																	)}
																	data-width={score * 100}
																/>
															</div>
															<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
																{Math.round(score * 100)}%
															</span>
														</div>
													</div>
												))}
										</div>
									</div>
								)}

							<h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
								Hotel Policies
							</h4>
							<div className="space-y-3">
								{hotel.policies.map(
									(policy: HotelDetailsType['policies'][number], index: number) => (
										<div
											key={index}
											className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
										>
											{policy.type === 'cancellation' ? (
												<Shield className="w-5 h-5 text-secondary-500 mt-0.5 flex-shrink-0" />
											) : (
												<Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
											)}
											<div>
												<div className="font-medium text-gray-900 dark:text-white">
													{policy.title}
												</div>
												<div className="text-sm text-gray-600 dark:text-gray-400">
													{policy.description}
												</div>
											</div>
										</div>
									),
								)}
							</div>
						</div>

						<div className="space-y-6">
							<Card className="p-6">
								<h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
									Check-in Information
								</h4>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-gray-600 dark:text-gray-400">
											Check-in:
										</span>
										<span className="font-medium text-gray-900 dark:text-white">
											{hotel.checkInTime}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-gray-600 dark:text-gray-400">
											Check-out:
										</span>
										<span className="font-medium text-gray-900 dark:text-white">
											{hotel.checkOutTime}
										</span>
									</div>
								</div>
							</Card>

							{hotel.sustainabilityScore && hotel.sustainabilityScore > 0.5 && (
								<Card className="p-6">
									<div className="flex items-center gap-3 mb-3">
										<Leaf className="w-6 h-6 text-green-500" />
										<h4 className="text-lg font-semibold text-gray-900 dark:text-white">
											Sustainability
										</h4>
									</div>
									<div className="flex items-center gap-2 mb-2">
										<div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
											<div
												className="h-full bg-green-500 transition-all duration-500 passion-bar"
												data-width={hotel.sustainabilityScore * 100}
											/>
										</div>
										<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
											{Math.round(hotel.sustainabilityScore * 100)}%
										</span>
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										This hotel has green certifications and follows sustainable
										practices.
									</p>
								</Card>
							)}
						</div>
					</div>
				)}

				{activeTab === 'rooms' && (
					<div className="grid gap-6">
						{hotel.rooms.map((room: HotelDetailsType['rooms'][number]) => (
							<div
								key={room.id}
								className="border border-gray-200 rounded-lg p-6"
							>
								<div className="flex flex-col lg:flex-row gap-6">
									<div className="lg:w-1/3">
										<img
											src={room.images[0] || '/placeholder-room.jpg'}
											alt={room.name}
											className="w-full h-48 object-cover rounded-lg"
											onError={(e) => {
												(e.target as HTMLImageElement).src =
													'/placeholder-room.jpg';
											}}
										/>
									</div>

									<div className="lg:w-2/3">
										<div className="flex justify-between items-start mb-4">
											<div>
												<h4 className="text-xl font-semibold mb-2">
													{room.name}
												</h4>
												<p className="text-gray-600 mb-2">{room.description}</p>
												<div className="flex flex-wrap gap-4 text-sm text-gray-600">
													<span>ðŸ‘¥ Up to {room.capacity} guests</span>
													<span>ðŸ›ï¸ {room.type}</span>
												</div>
											</div>
											<div className="text-right">
												<div className="text-2xl font-bold text-secondary-600">
													{formatPrice(room.price, room.currency)}
												</div>
												<div className="text-sm text-gray-500">per night</div>
											</div>
										</div>

										<div className="mb-4">
											<h5 className="font-medium mb-2">Room Amenities:</h5>
											<div className="flex flex-wrap gap-2">
												{room.amenities.map(
													(amenity: string, index: number) => (
														<span
															key={index}
															className="px-2 py-1 bg-secondary-100 text-secondary-800 text-sm rounded-full"
														>
															{amenity}
														</span>
													),
												)}
											</div>
										</div>

										<button
											onClick={() => onBookRoom && onBookRoom(room.id)}
											disabled={!room.availability}
											className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											{room.availability ? 'Book This Room' : 'Not Available'}
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{activeTab === 'amenities' && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{Object.entries(
							hotel.amenities.reduce<
								Record<string, HotelDetailsType['amenities'][number][]>
							>((acc, amenity) => {
								if (!acc[amenity.category]) {
									acc[amenity.category] = [];
								}
								const categoryAmenities = acc[amenity.category];
								if (categoryAmenities) {
									categoryAmenities.push(amenity);
								}
								return acc;
							}, {}),
						).map(([category, amenities]) => (
							<div
								key={category}
								className="bg-white border border-gray-200 rounded-lg p-6"
							>
								<h4 className="text-lg font-semibold mb-4 capitalize">
									{category.replace('_', ' ')} Amenities
								</h4>
								<div className="space-y-3">
									{amenities.map((amenity) => (
										<div key={amenity.id} className="flex items-center">
											<span className="text-2xl mr-3">{amenity.icon}</span>
											<span className="text-gray-700">{amenity.name}</span>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}

				{activeTab === 'location' && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						<div>
							<h4 className="text-lg font-semibold mb-4">Nearby Attractions</h4>
							<div className="space-y-3">
								{hotel.nearbyAttractions.map(
									(
										attraction: HotelDetailsType['nearbyAttractions'][number],
										index: number,
									) => (
										<div
											key={index}
											className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
										>
											<div>
												<div className="font-medium text-gray-900">
													{attraction.name}
												</div>
												<div className="text-sm text-gray-600">
													{attraction.type}
												</div>
											</div>
											<div className="text-sm font-medium text-secondary-600">
												{attraction.distance}
											</div>
										</div>
									),
								)}
							</div>
						</div>

						<div>
							<h4 className="text-lg font-semibold mb-4">Map Location</h4>
							<div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
								<span className="text-gray-500">
									Interactive Map Coming Soon
								</span>
							</div>
							<div className="mt-4 text-sm text-gray-600">
								<strong>Address:</strong> {hotel.location.address},{' '}
								{hotel.location.city}, {hotel.location.country}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default memo(HotelDetails);
