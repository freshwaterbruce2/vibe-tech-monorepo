import { Bed, Check, Info, Star, Users, X } from 'lucide-react';
import { memo, useMemo } from 'react';
import { logger } from '../../utils/logger';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { OptimizedImage } from '../ui/OptimizedImage';

interface Room {
	id: string;
	name: string;
	type: string;
	image: string;
	price: number;
	originalPrice?: number;
	currency: string;
	size: number; // in sq meters
	bedType: string;
	maxOccupancy: number;
	amenities: string[];
	features: {
		name: string;
		included: boolean;
		description?: string;
	}[];
	cancelPolicy: 'free' | 'partial' | 'non-refundable';
	breakfast: boolean;
	view: string;
	rating: number;
	available: boolean;
}

interface RoomComparisonProps {
	rooms: Room[];
	onClose: () => void;
	onSelectRoom: (room: Room) => void;
	className?: string;
}

const RoomComparison = memo<RoomComparisonProps>(
	({ rooms, onClose, onSelectRoom, className = '' }) => {
		// Get all unique features across rooms for comparison
		const allFeatures = useMemo(() => {
			const featuresSet = new Set<string>();
			rooms.forEach((room) => {
				room.features.forEach((feature) => {
					featuresSet.add(feature.name);
				});
			});
			return Array.from(featuresSet);
		}, [rooms]);

		const formatPrice = (price: number, currency = 'USD') => {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency,
			}).format(price);
		};

		const handleRoomSelect = (room: Room) => {
			logger.info('Room selected from comparison', {
				component: 'RoomComparison',
				roomId: room.id,
				roomName: room.name,
				price: room.price,
			});
			onSelectRoom(room);
		};

		const getCancelPolicyLabel = (policy: Room['cancelPolicy']) => {
			switch (policy) {
				case 'free':
					return { label: 'Free Cancellation', color: 'green' };
				case 'partial':
					return { label: 'Partial Refund', color: 'yellow' };
				case 'non-refundable':
					return { label: 'Non-Refundable', color: 'red' };
				default:
					return { label: 'Unknown', color: 'gray' };
			}
		};

		const renderStars = (rating: number) => {
			return Array.from({ length: 5 }, (_, i) => (
				<Star
					key={i}
					className={`h-3 w-3 ${
						i < Math.floor(rating)
							? 'fill-amber-400 text-amber-400'
							: 'text-gray-300'
					}`}
				/>
			));
		};

		return (
			<div
				className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${className}`}
			>
				<div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
					{/* Header */}
					<div className="flex items-center justify-between p-6 border-b border-gray-200">
						<div>
							<h2 className="text-2xl font-bold text-luxury-navy">
								Compare Rooms
							</h2>
							<p className="text-sm text-gray-600 mt-1">
								Compare {rooms.length} rooms side by side to find your perfect
								stay
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="text-gray-500 hover:text-gray-700"
						>
							<X className="h-5 w-5" />
						</Button>
					</div>

					{/* Comparison Table */}
					<div className="overflow-x-auto">
						<div className="min-w-full">
							{/* Room Cards Row */}
							<div className="flex border-b border-gray-200">
								<div className="w-48 p-4 bg-gray-50 font-medium text-gray-900">
									Room Details
								</div>
								{rooms.map((room) => (
									<div
										key={room.id}
										className="flex-1 min-w-72 border-l border-gray-200"
									>
										<Card className="m-4 overflow-hidden">
											{/* Room Image */}
											<div className="relative h-40">
												<OptimizedImage
													src={room.image}
													alt={room.name}
													className="w-full h-full"
													aspectRatio="16/9"
													objectFit="cover"
													sizes="(max-width: 640px) 100vw, 300px"
													priority
												/>
												{!room.available && (
													<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
														<Badge variant="destructive">Not Available</Badge>
													</div>
												)}
											</div>

											{/* Room Info */}
											<div className="p-4">
												<h3 className="font-bold text-lg text-luxury-navy mb-2">
													{room.name}
												</h3>
												<div className="space-y-2 text-sm text-gray-600 mb-4">
													<div className="flex items-center gap-2">
														<Bed className="h-4 w-4" />
														<span>{room.bedType}</span>
													</div>
													<div className="flex items-center gap-2">
														<Users className="h-4 w-4" />
														<span>Up to {room.maxOccupancy} guests</span>
													</div>
													<div className="flex items-center gap-1">
														{renderStars(room.rating)}
														<span className="ml-1">({room.rating}/5)</span>
													</div>
												</div>

												{/* Price */}
												<div className="mb-4">
													<div className="text-2xl font-bold text-luxury-navy">
														{formatPrice(room.price, room.currency)}
														{room.originalPrice &&
															room.originalPrice > room.price && (
																<span className="text-sm text-gray-400 line-through ml-2">
																	{formatPrice(
																		room.originalPrice,
																		room.currency,
																	)}
																</span>
															)}
													</div>
													<p className="text-sm text-gray-500">per night</p>
												</div>

												{/* Cancellation Policy */}
												<div className="mb-4">
													<Badge
														variant={
															getCancelPolicyLabel(room.cancelPolicy).color ===
															'green'
																? 'default'
																: 'secondary'
														}
														className="text-xs"
													>
														{getCancelPolicyLabel(room.cancelPolicy).label}
													</Badge>
												</div>

												{/* Select Button */}
												<Button
													onClick={() => handleRoomSelect(room)}
													disabled={!room.available}
													className="w-full bg-gradient-to-r from-luxury-gold to-amber-500 hover:from-luxury-gold/90 hover:to-amber-500/90 text-white font-semibold"
												>
													{room.available ? 'Select Room' : 'Not Available'}
												</Button>
											</div>
										</Card>
									</div>
								))}
							</div>

							{/* Feature Comparison Rows */}
							<div className="bg-white">
								{/* Room Size */}
								<div className="flex border-b border-gray-200">
									<div className="w-48 p-4 bg-gray-50 font-medium text-gray-900">
										Room Size
									</div>
									{rooms.map((room) => (
										<div
											key={room.id}
											className="flex-1 min-w-72 p-4 border-l border-gray-200 text-center"
										>
											<span className="text-lg font-semibold">
												{room.size} m²
											</span>
										</div>
									))}
								</div>

								{/* View */}
								<div className="flex border-b border-gray-200">
									<div className="w-48 p-4 bg-gray-50 font-medium text-gray-900">
										View
									</div>
									{rooms.map((room) => (
										<div
											key={room.id}
											className="flex-1 min-w-72 p-4 border-l border-gray-200 text-center"
										>
											<span>{room.view}</span>
										</div>
									))}
								</div>

								{/* Breakfast */}
								<div className="flex border-b border-gray-200">
									<div className="w-48 p-4 bg-gray-50 font-medium text-gray-900">
										Breakfast Included
									</div>
									{rooms.map((room) => (
										<div
											key={room.id}
											className="flex-1 min-w-72 p-4 border-l border-gray-200 text-center"
										>
											{room.breakfast ? (
												<Check className="h-5 w-5 text-green-600 mx-auto" />
											) : (
												<X className="h-5 w-5 text-red-400 mx-auto" />
											)}
										</div>
									))}
								</div>

								{/* Features */}
								{allFeatures.map((featureName) => (
									<div
										key={featureName}
										className="flex border-b border-gray-200"
									>
										<div className="w-48 p-4 bg-gray-50 font-medium text-gray-900 flex items-center">
											{featureName}
											<Info className="h-4 w-4 ml-2 text-gray-400" />
										</div>
										{rooms.map((room) => {
											const feature = room.features.find(
												(f) => f.name === featureName,
											);
											return (
												<div
													key={room.id}
													className="flex-1 min-w-72 p-4 border-l border-gray-200 text-center"
												>
													{feature?.included ? (
														<Check className="h-5 w-5 text-green-600 mx-auto" />
													) : (
														<X className="h-5 w-5 text-red-400 mx-auto" />
													)}
												</div>
											);
										})}
									</div>
								))}

								{/* Amenities */}
								<div className="flex border-b border-gray-200">
									<div className="w-48 p-4 bg-gray-50 font-medium text-gray-900">
										Amenities
									</div>
									{rooms.map((room) => (
										<div
											key={room.id}
											className="flex-1 min-w-72 p-4 border-l border-gray-200"
										>
											<div className="flex flex-wrap gap-1">
												{room.amenities.slice(0, 4).map((amenity) => (
													<Badge
														key={amenity}
														variant="secondary"
														className="text-xs"
													>
														{amenity}
													</Badge>
												))}
												{room.amenities.length > 4 && (
													<Badge variant="outline" className="text-xs">
														+{room.amenities.length - 4} more
													</Badge>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="p-6 border-t border-gray-200 bg-gray-50">
						<div className="flex items-center justify-between">
							<p className="text-sm text-gray-600">
								Compare up to 4 rooms at once. Features may vary by availability
								and season.
							</p>
							<Button variant="outline" onClick={onClose}>
								Close Comparison
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

RoomComparison.displayName = 'RoomComparison';

export default RoomComparison;
