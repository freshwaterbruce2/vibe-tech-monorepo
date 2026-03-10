import React from 'react';

interface Destination {
	id: string;
	name: string;
	country: string;
	image: string;
	description: string;
	hotelCount: number;
	averagePrice: number;
	popularAttractions: string[];
}

interface FeaturedDestinationsProps {
	destinations?: Destination[];
	onDestinationSelect?: (destination: Destination) => void;
	className?: string;
}

const FeaturedDestinations: React.FC<FeaturedDestinationsProps> = ({
	destinations = [
		{
			id: '1',
			name: 'Paris',
			country: 'France',
			image:
				'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=500&fit=crop&crop=center',
			description:
				'The City of Light, famous for its iconic landmarks, art, and cuisine.',
			hotelCount: 1200,
			averagePrice: 180,
			popularAttractions: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame'],
		},
		{
			id: '2',
			name: 'Tokyo',
			country: 'Japan',
			image:
				'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=500&fit=crop&crop=center',
			description:
				'A vibrant metropolis blending traditional culture with modern innovation.',
			hotelCount: 800,
			averagePrice: 220,
			popularAttractions: [
				'Tokyo Tower',
				'Shibuya Crossing',
				'Senso-ji Temple',
			],
		},
		{
			id: '3',
			name: 'New York',
			country: 'USA',
			image:
				'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=500&fit=crop&crop=center',
			description:
				'The city that never sleeps, offering endless entertainment and culture.',
			hotelCount: 950,
			averagePrice: 280,
			popularAttractions: ['Times Square', 'Central Park', 'Statue of Liberty'],
		},
		{
			id: '4',
			name: 'Bali',
			country: 'Indonesia',
			image:
				'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800&h=500&fit=crop&crop=center',
			description:
				'Tropical paradise with stunning beaches, temples, and rice terraces.',
			hotelCount: 600,
			averagePrice: 120,
			popularAttractions: ['Uluwatu Temple', 'Rice Terraces', 'Mount Batur'],
		},
		{
			id: '5',
			name: 'Rome',
			country: 'Italy',
			image:
				'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=500&fit=crop&crop=center',
			description:
				'The Eternal City, home to ancient history and incredible architecture.',
			hotelCount: 750,
			averagePrice: 160,
			popularAttractions: ['Colosseum', 'Vatican City', 'Trevi Fountain'],
		},
		{
			id: '6',
			name: 'Dubai',
			country: 'UAE',
			image:
				'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=500&fit=crop&crop=center',
			description:
				'A modern oasis of luxury, shopping, and architectural marvels.',
			hotelCount: 400,
			averagePrice: 250,
			popularAttractions: ['Burj Khalifa', 'Palm Jumeirah', 'Dubai Mall'],
		},
	],
	onDestinationSelect,
	className = '',
}) => {
	return (
		<section className={`py-12 ${className}`}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<h2 className="text-3xl font-bold text-gray-900 mb-4">
						Featured Destinations
					</h2>
					<p className="text-lg text-gray-600 max-w-2xl mx-auto">
						Discover amazing places around the world and find the perfect hotel
						for your next adventure.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{destinations.map((destination) => (
						<div
							key={destination.id}
							className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
							onClick={() =>
								onDestinationSelect && onDestinationSelect(destination)
							}
						>
							<div className="bg-white rounded-xl shadow-lg overflow-hidden">
								<div className="relative">
									<img
										src={destination.image}
										alt={destination.name}
										className="w-full h-48 object-cover group-hover:brightness-110 transition-all duration-300"
										width="400"
										height="192"
										loading="lazy"
										decoding="async"
									/>
									<div className="absolute top-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-3 py-1">
										<span className="text-sm font-semibold text-gray-800">
											${destination.averagePrice}/night
										</span>
									</div>
								</div>

								<div className="p-6">
									<div className="flex justify-between items-start mb-3">
										<div>
											<h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
												{destination.name}
											</h3>
											<p className="text-gray-600">{destination.country}</p>
										</div>
										<div className="text-right">
											<div className="text-sm text-gray-500">
												{destination.hotelCount} hotels
											</div>
										</div>
									</div>

									<p className="text-gray-700 text-sm mb-4 line-clamp-2">
										{destination.description}
									</p>

									<div className="space-y-2">
										<h4 className="text-sm font-semibold text-gray-800">
											Popular Attractions:
										</h4>
										<div className="flex flex-wrap gap-2">
											{destination.popularAttractions
												.slice(0, 2)
												.map((attraction, index) => (
													<span
														key={index}
														className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
													>
														{attraction}
													</span>
												))}
											{destination.popularAttractions.length > 2 && (
												<span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
													+{destination.popularAttractions.length - 2} more
												</span>
											)}
										</div>
									</div>

									<div className="mt-4 pt-4 border-t border-gray-200">
										<button className="w-full text-center text-blue-600 font-medium hover:text-blue-800 transition-colors">
											Explore Hotels →
										</button>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="text-center mt-12">
					<button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
						View All Destinations
					</button>
				</div>
			</div>
		</section>
	);
};

export default FeaturedDestinations;
