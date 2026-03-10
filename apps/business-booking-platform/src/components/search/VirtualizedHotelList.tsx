import {
	Camera,
	Car,
	Coffee,
	Heart,
	MapPin,
	Share2,
	Sparkles,
	Star,
	Wifi,
} from 'lucide-react';
import React from 'react';
import { memo, useCallback } from 'react';
// import { FixedSizeList as List } from 'react-window';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useHotelStore } from '@/store/hotelStore';
import { useSearchStore } from '@/store/searchStore';
import type { Hotel } from '@/types/hotel';
import { logger } from '../../utils/logger';
import { Button } from '../ui/Button';
import { OptimizedImage } from '../ui/OptimizedImage';
import { TrustBadge } from '../ui/TrustBadge';
import { UrgencyIndicator } from '../ui/UrgencyIndicator';

interface VirtualizedHotelListProps {
	hotels: Hotel[];
	height?: number;
	itemHeight?: number;
	className?: string;
}

interface HotelItemProps {
	index: number;
	style: React.CSSProperties;
	data: Hotel[];
}

const HotelItem = memo<HotelItemProps>(({ index, style, data }) => {
	const navigate = useNavigate();
	const { setSelectedHotel } = useHotelStore();
	const { selectedDateRange, guestCount } = useSearchStore();
	const hotel = data[index];

	const handleViewHotel = useCallback(() => {
		if (!hotel) {
			return;
		}

		logger.debug('Hotel selected from virtual list', {
			component: 'VirtualizedHotelList',
			hotelId: hotel.id,
			hotelName: hotel.name,
		});
		setSelectedHotel(hotel);
		navigate(`/hotel/${hotel.id}`);
	}, [hotel, navigate, setSelectedHotel]);

	const handleSaveHotel = useCallback(
		(e: React.MouseEvent) => {
			if (!hotel) {
				return;
			}

			e.stopPropagation();
			logger.debug('Hotel saved', {
				component: 'VirtualizedHotelList',
				hotelId: hotel.id,
			});
			// Implement save functionality
		},
		[hotel?.id],
	);

	const handleShareHotel = useCallback(
		(e: React.MouseEvent) => {
			if (!hotel) {
				return;
			}

			e.stopPropagation();
			logger.debug('Hotel shared', {
				component: 'VirtualizedHotelList',
				hotelId: hotel.id,
			});
			// Implement share functionality
		},
		[hotel?.id],
	);

	if (!hotel) {
		return null;
	}

	const formatPrice = (price: number, currency = 'USD') => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency,
		}).format(price);
	};

	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => (
			<Star
				key={i}
				className={`h-4 w-4 ${
					i < Math.floor(rating)
						? 'fill-amber-400 text-amber-400'
						: 'text-gray-300'
				}`}
			/>
		));
	};

	const getPassionIcon = (passion: string) => {
		const iconMap: Record<string, React.ComponentType<any>> = {
			adventure: Camera,
			wellness: Sparkles,
			luxury: Star,
			business: Wifi,
			family: Heart,
			romance: Heart,
		};
		return iconMap[passion.toLowerCase()] || Star;
	};

	return (
		<div style={style} className="px-4 pb-4">
			<Card className="overflow-hidden hover:shadow-luxury-lg transition-all duration-300 cursor-pointer">
				<div className="flex flex-col lg:flex-row h-full">
					{/* Hotel Image */}
					<div className="lg:w-1/3 relative group">
						<OptimizedImage
							src={
								hotel.images[0]?.url ||
								'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300'
							}
							alt={hotel.name}
							className="w-full h-48 lg:h-full transition-transform duration-300 group-hover:scale-105"
							aspectRatio="4/3"
							objectFit="cover"
							sizes="(max-width: 1024px) 100vw, 33vw"
							fallbackSrc="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300"
						/>

						{/* Image Overlay Actions */}
						<div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="secondary"
								size="icon"
								className="bg-white/90 hover:bg-white text-gray-700 shadow-luxury"
								onClick={handleSaveHotel}
							>
								<Heart className="h-4 w-4" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="bg-white/90 hover:bg-white text-gray-700 shadow-luxury"
								onClick={handleShareHotel}
							>
								<Share2 className="h-4 w-4" />
							</Button>
						</div>

						{/* Passion Badge */}
						{hotel.passionScore &&
							Object.keys(hotel.passionScore).length > 0 && (
								<div className="absolute bottom-3 left-3">
									{Object.entries(hotel.passionScore)
										.filter(([, score]) => score > 0.8)
										.slice(0, 1)
										.map(([passion]) => {
											const IconComponent = getPassionIcon(passion);
											return (
												<div
													key={passion}
													className="flex items-center gap-1 bg-luxury-gold/90 text-white px-2 py-1 rounded-full text-xs font-medium shadow-luxury-sm"
												>
													<IconComponent className="h-3 w-3" />
													{passion.charAt(0).toUpperCase() + passion.slice(1)}
												</div>
											);
										})}
								</div>
							)}

						{/* Deal Badge */}
						{hotel.deals && hotel.deals.length > 0 && hotel.deals[0] && (
							<div className="absolute top-3 left-3">
								<div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-luxury-sm">
									-{hotel.deals[0].discountPercent}% OFF
								</div>
							</div>
						)}
					</div>

					{/* Hotel Information */}
					<div className="lg:w-2/3 p-6 flex flex-col justify-between">
						<div>
							{/* Header */}
							<div className="flex justify-between items-start mb-3">
								<div className="flex-1">
									<h3 className="text-xl font-bold text-luxury-navy mb-1 line-clamp-2 hover:text-luxury-gold transition-colors">
										{hotel.name}
									</h3>
									<div className="flex items-center gap-1 mb-2">
										<MapPin className="h-4 w-4 text-luxury-mocha" />
										<span className="text-sm text-luxury-mocha">
											{hotel.location.neighborhood &&
												`${hotel.location.neighborhood}, `}
											{hotel.location.city}
										</span>
									</div>
								</div>

								{/* Rating */}
								<div className="flex items-center gap-2 ml-4">
									<div className="flex items-center">
										{renderStars(hotel.rating)}
									</div>
									<div className="text-right">
										<div className="text-lg font-bold text-luxury-gold">
											{hotel.rating.toFixed(1)}
										</div>
										<div className="text-xs text-gray-500">
											({hotel.reviewCount} reviews)
										</div>
									</div>
								</div>
							</div>

							{/* Description */}
							<p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
								{hotel.description}
							</p>

							{/* Amenities */}
							<div className="flex flex-wrap gap-3 mb-4">
								{hotel.amenities.slice(0, 4).map((amenity, index) => {
									const amenityIcons: Record<
										string,
										React.ComponentType<any>
									> = {
										WiFi: Wifi,
										Parking: Car,
										Restaurant: Coffee,
										Pool: Sparkles,
									};
									const IconComponent = amenityIcons[amenity.name] || Sparkles;

									return (
										<div
											key={index}
											className="flex items-center gap-1 text-xs text-luxury-mocha bg-luxury-cream px-2 py-1 rounded-full"
										>
											<IconComponent className="h-3 w-3" />
											{amenity.name}
										</div>
									);
								})}
								{hotel.amenities.length > 4 && (
									<div className="text-xs text-luxury-mocha bg-luxury-cream px-2 py-1 rounded-full">
										+{hotel.amenities.length - 4} more
									</div>
								)}
							</div>

							{/* Trust Indicators */}
							<div className="flex items-center gap-3 mb-4">
								<TrustBadge type="security" text="Verified" />
								{hotel.sustainabilityScore &&
									hotel.sustainabilityScore > 80 && (
										<TrustBadge type="favorite" text="Eco-Friendly" />
									)}
								<UrgencyIndicator
									type={hotel.availability.available ? 'viewing' : 'limited'}
									count={hotel.availability.available ? 12 : 2}
								/>
							</div>
						</div>

						{/* Footer */}
						<div className="flex items-end justify-between">
							<div className="flex flex-col">
								<div className="text-2xl font-bold text-luxury-navy">
									{formatPrice(hotel.priceRange.avgNightly)}
									{hotel.priceRange.originalPrice &&
										hotel.priceRange.originalPrice >
											hotel.priceRange.avgNightly && (
											<span className="text-sm text-gray-400 line-through ml-2">
												{formatPrice(hotel.priceRange.originalPrice)}
											</span>
										)}
								</div>
								<div className="text-sm text-gray-500">
									per night • {selectedDateRange.checkIn} -{' '}
									{selectedDateRange.checkOut}
								</div>
								<div className="text-xs text-luxury-mocha">
									{guestCount.adults} adults
									{guestCount.children > 0 &&
										`, ${guestCount.children} children`}
								</div>
							</div>

							<Button
								onClick={handleViewHotel}
								className="bg-gradient-to-r from-luxury-gold to-amber-500 hover:from-luxury-gold/90 hover:to-amber-500/90 text-white font-semibold px-6 py-2 rounded-lg shadow-luxury-md hover:shadow-luxury-lg transform hover:scale-105 transition-all duration-200"
							>
								View Details
							</Button>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
});

HotelItem.displayName = 'HotelItem';

const VirtualizedHotelList = memo<VirtualizedHotelListProps>(
	({ hotels, height = 600, itemHeight = 280, className = '' }) => {
		if (!hotels.length) {
			return (
				<div className="flex items-center justify-center h-64 text-gray-500">
					<div className="text-center">
						<Sparkles className="h-12 w-12 mx-auto mb-4 text-luxury-gold" />
						<p className="text-lg font-medium">No hotels found</p>
						<p className="text-sm">Try adjusting your search filters</p>
					</div>
				</div>
			);
		}

		return (
			<div className={className}>
				<div style={{ height: `${height}px`, overflow: 'auto' }}>
					{hotels.map((hotel, index) => (
						<div key={hotel.id} style={{ height: `${itemHeight}px` }}>
							<HotelItem index={index} style={{}} data={hotels} />
						</div>
					))}
				</div>
			</div>
		);
	},
);

VirtualizedHotelList.displayName = 'VirtualizedHotelList';

export default VirtualizedHotelList;
