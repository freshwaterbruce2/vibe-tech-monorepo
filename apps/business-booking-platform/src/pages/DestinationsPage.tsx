import { MapPin, Star, TrendingUp, Users } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '@/store/searchStore';

// Popular destinations data (like Booking.com's destination page)
const destinations = [
	{
		id: 1,
		city: 'Las Vegas',
		state: 'Nevada',
		country: 'USA',
		image: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=800',
		hotels: 852,
		avgPrice: 145,
		rating: 4.5,
		trending: true,
		description: 'Entertainment capital with world-class casinos and shows',
		popularFor: ['Casinos', 'Shows', 'Nightlife', 'Weddings'],
	},
	{
		id: 2,
		city: 'New York',
		state: 'New York',
		country: 'USA',
		image: 'https://images.unsplash.com/photo-1543716091-a840c05249ec?w=800',
		hotels: 1403,
		avgPrice: 225,
		rating: 4.6,
		trending: true,
		description: 'The city that never sleeps - culture, dining, and Broadway',
		popularFor: ['Museums', 'Broadway', 'Shopping', 'Dining'],
	},
	{
		id: 3,
		city: 'Miami',
		state: 'Florida',
		country: 'USA',
		image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800',
		hotels: 678,
		avgPrice: 189,
		rating: 4.4,
		trending: false,
		description:
			'Beach paradise with Art Deco architecture and vibrant nightlife',
		popularFor: ['Beaches', 'Art Deco', 'Cuban Food', 'Nightlife'],
	},
	{
		id: 4,
		city: 'Los Angeles',
		state: 'California',
		country: 'USA',
		image: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800',
		hotels: 923,
		avgPrice: 175,
		rating: 4.3,
		trending: true,
		description: 'Hollywood glamour meets beach vibes in the City of Angels',
		popularFor: ['Hollywood', 'Beaches', 'Theme Parks', 'Celebrity Tours'],
	},
	{
		id: 5,
		city: 'Orlando',
		state: 'Florida',
		country: 'USA',
		image: 'https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=800',
		hotels: 567,
		avgPrice: 135,
		rating: 4.5,
		trending: false,
		description: 'Theme park capital with Disney World and Universal Studios',
		popularFor: ['Disney World', 'Universal', 'Water Parks', 'Family Fun'],
	},
	{
		id: 6,
		city: 'San Francisco',
		state: 'California',
		country: 'USA',
		image: 'https://images.unsplash.com/photo-1521747116042-5a810fda9664?w=800',
		hotels: 412,
		avgPrice: 245,
		rating: 4.7,
		trending: false,
		description: 'Tech hub with iconic Golden Gate Bridge and cable cars',
		popularFor: ['Golden Gate', 'Alcatraz', 'Wine Country', 'Tech Tours'],
	},
	{
		id: 7,
		city: 'Chicago',
		state: 'Illinois',
		country: 'USA',
		image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
		hotels: 489,
		avgPrice: 165,
		rating: 4.4,
		trending: true,
		description: 'Architectural marvels and deep-dish pizza by Lake Michigan',
		popularFor: ['Architecture', 'Museums', 'Deep Dish Pizza', 'Jazz'],
	},
	{
		id: 8,
		city: 'Nashville',
		state: 'Tennessee',
		country: 'USA',
		image: 'https://images.unsplash.com/photo-1545178803-4056771d60a3?w=800',
		hotels: 312,
		avgPrice: 145,
		rating: 4.6,
		trending: true,
		description: 'Music City USA - Country music capital with honky-tonks',
		popularFor: ['Country Music', 'Live Music', 'BBQ', 'Whiskey'],
	},
];

export const DestinationsPage: React.FC = () => {
	const navigate = useNavigate();
	const { setQuery } = useSearchStore();

	const handleDestinationClick = (city: string) => {
		setQuery(city);
		navigate('/search');
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Hero Section */}
			<div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
				<div className="container mx-auto px-4">
					<h1 className="text-4xl md:text-5xl font-bold mb-4">
						Popular Destinations
					</h1>
					<p className="text-xl text-blue-100 max-w-3xl">
						Discover amazing hotels in top cities across the United States. From
						vibrant nightlife to peaceful beaches, find your perfect getaway.
					</p>
				</div>
			</div>

			{/* Stats Bar (like Booking.com) */}
			<div className="bg-white border-b">
				<div className="container mx-auto px-4 py-6">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-8">
							<div className="flex items-center gap-2">
								<Users className="h-5 w-5 text-gray-500" />
								<span className="text-sm text-gray-600">
									<strong>2.5M+</strong> travelers served
								</span>
							</div>
							<div className="flex items-center gap-2">
								<MapPin className="h-5 w-5 text-gray-500" />
								<span className="text-sm text-gray-600">
									<strong>50+</strong> destinations
								</span>
							</div>
						</div>
						<div className="flex items-center gap-2 text-orange-600">
							<TrendingUp className="h-5 w-5" />
							<span className="text-sm font-medium">5 trending right now</span>
						</div>
					</div>
				</div>
			</div>

			{/* Destinations Grid */}
			<div className="container mx-auto px-4 py-12">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{destinations.map((destination) => (
						<div
							key={destination.id}
							onClick={() => handleDestinationClick(destination.city)}
							className="group cursor-pointer bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
						>
							{/* Image Container */}
							<div className="relative h-48 overflow-hidden">
								<img
									src={destination.image}
									alt={destination.city}
									className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
								/>
								{destination.trending && (
									<div className="absolute top-3 left-3 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
										TRENDING
									</div>
								)}
								<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
									<h3 className="text-white text-xl font-bold">
										{destination.city}
									</h3>
									<p className="text-white/80 text-sm">{destination.state}</p>
								</div>
							</div>

							{/* Content */}
							<div className="p-4">
								<p className="text-gray-600 text-sm mb-3 line-clamp-2">
									{destination.description}
								</p>

								{/* Stats */}
								<div className="flex items-center justify-between mb-3">
									<div className="text-sm">
										<span className="font-semibold text-gray-900">
											{destination.hotels}
										</span>
										<span className="text-gray-500"> hotels</span>
									</div>
									<div className="flex items-center gap-1">
										<Star className="h-4 w-4 text-yellow-500 fill-current" />
										<span className="text-sm font-semibold">
											{destination.rating}
										</span>
									</div>
								</div>

								{/* Price */}
								<div className="flex items-center justify-between border-t pt-3">
									<div>
										<p className="text-xs text-gray-500">Avg. per night</p>
										<p className="text-lg font-bold text-blue-600">
											${destination.avgPrice}
										</p>
									</div>
									<button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
										View Hotels
									</button>
								</div>

								{/* Popular For Tags */}
								<div className="mt-3 flex flex-wrap gap-1">
									{destination.popularFor.slice(0, 3).map((tag) => (
										<span
											key={tag}
											className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
										>
											{tag}
										</span>
									))}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Bottom CTA Section */}
			<div className="bg-blue-50 py-12">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-2xl font-bold mb-4">
						Can't find your destination?
					</h2>
					<p className="text-gray-600 mb-6">
						We have hotels in over 200 cities worldwide. Search for any
						location!
					</p>
					<button
						onClick={() => navigate('/search')}
						className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
					>
						Search All Destinations
					</button>
				</div>
			</div>
		</div>
	);
};
