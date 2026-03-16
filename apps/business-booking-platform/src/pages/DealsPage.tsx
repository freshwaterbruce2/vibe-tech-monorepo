import {
	Calendar,
	ChevronRight,
	Clock,
	MapPin,
	Star,
	Tag,
	TrendingDown,
	Zap,
} from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '@/store/searchStore';
import { OptimizedImage } from '../components/ui/OptimizedImage';

// Deal types for filtering
const dealCategories = [
	{ id: 'all', label: 'All Deals', icon: Tag },
	{ id: 'lastminute', label: 'Last Minute', icon: Clock },
	{ id: 'weekend', label: 'Weekend Getaways', icon: Calendar },
	{ id: 'luxury', label: 'Luxury Deals', icon: Star },
	{ id: 'family', label: 'Family Packages', icon: Users },
];

// Mock deals data (like Hotels.com and Expedia deals)
const deals = [
	{
		id: 1,
		type: 'lastminute',
		hotel: 'Bellagio Las Vegas',
		city: 'Las Vegas',
		image: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800',
		originalPrice: 450,
		discountPrice: 315,
		discount: 30,
		rating: 4.8,
		reviews: 2341,
		validUntil: '2025-08-29',
		roomsLeft: 3,
		includes: ['Breakfast', 'Spa Credit', 'Late Checkout'],
		urgency: 'Only 3 rooms left at this price!',
	},
	{
		id: 2,
		type: 'weekend',
		hotel: 'The Plaza New York',
		city: 'New York',
		image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
		originalPrice: 650,
		discountPrice: 455,
		discount: 30,
		rating: 4.9,
		reviews: 1876,
		validUntil: '2025-09-01',
		roomsLeft: 5,
		includes: ['Airport Transfer', 'Welcome Champagne', 'City Tour'],
		urgency: 'Weekend special - Book by Friday!',
	},
	{
		id: 3,
		type: 'luxury',
		hotel: 'Four Seasons Miami',
		city: 'Miami',
		image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800',
		originalPrice: 520,
		discountPrice: 390,
		discount: 25,
		rating: 4.7,
		reviews: 1234,
		validUntil: '2025-09-15',
		roomsLeft: 8,
		includes: ['Beach Access', 'All Meals', 'Water Sports'],
		urgency: 'Summer special ending soon!',
	},
	{
		id: 4,
		type: 'family',
		hotel: 'Disney Grand Floridian',
		city: 'Orlando',
		image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800',
		originalPrice: 580,
		discountPrice: 435,
		discount: 25,
		rating: 4.9,
		reviews: 3456,
		validUntil: '2025-09-30',
		roomsLeft: 12,
		includes: ['Park Tickets', 'Character Breakfast', 'FastPass+'],
		urgency: 'Family package - Save $145!',
	},
	{
		id: 5,
		type: 'lastminute',
		hotel: 'Fairmont San Francisco',
		city: 'San Francisco',
		image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
		originalPrice: 380,
		discountPrice: 228,
		discount: 40,
		rating: 4.6,
		reviews: 987,
		validUntil: '2025-08-26',
		roomsLeft: 2,
		includes: ['Wine Tasting', 'Cable Car Pass'],
		urgency: 'Flash sale - 48 hours only!',
	},
	{
		id: 6,
		type: 'weekend',
		hotel: 'The Drake Chicago',
		city: 'Chicago',
		image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
		originalPrice: 320,
		discountPrice: 256,
		discount: 20,
		rating: 4.5,
		reviews: 765,
		validUntil: '2025-09-05',
		roomsLeft: 6,
		includes: ['Museum Pass', 'River Cruise'],
		urgency: 'Labor Day weekend special!',
	},
];

// Import Users icon
import { Users } from 'lucide-react';

export const DealsPage: React.FC = () => {
	const navigate = useNavigate();
	const { setQuery } = useSearchStore();
	const [selectedCategory, setSelectedCategory] = useState('all');
	const [sortBy, setSortBy] = useState('discount');

	// Filter deals based on category
	const filteredDeals =
		selectedCategory === 'all'
			? deals
			: deals.filter((deal) => deal.type === selectedCategory);

	// Sort deals
	const sortedDeals = [...filteredDeals].sort((a, b) => {
		if (sortBy === 'discount') {
return b.discount - a.discount;
}
		if (sortBy === 'price') {
return a.discountPrice - b.discountPrice;
}
		if (sortBy === 'rating') {
return b.rating - a.rating;
}
		return 0;
	});

	const handleDealClick = (city: string) => {
		setQuery(city);
		navigate('/search');
	};

	const calculateSavings = (original: number, discounted: number) => {
		return original - discounted;
	};

	const daysUntilExpiry = (date: string) => {
		const today = new Date();
		const expiry = new Date(date);
		const diffTime = Math.abs(expiry.getTime() - today.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Hero Section with Gradient */}
			<div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-12">
				<div className="container mx-auto px-4">
					<div className="flex items-center gap-3 mb-4">
						<Zap className="h-8 w-8" />
						<h1 className="text-4xl md:text-5xl font-bold">Hot Deals</h1>
					</div>
					<p className="text-xl text-orange-100 max-w-3xl">
						Save up to 40% on selected hotels. Limited time offers you won't
						find anywhere else!
					</p>

					{/* Urgency Banner */}
					<div className="mt-6 bg-white/20 backdrop-blur-sm rounded-lg p-4 inline-flex items-center gap-3">
						<Clock className="h-5 w-5" />
						<span className="font-medium">
							Flash Sale: 17 deals ending in the next 48 hours!
						</span>
					</div>
				</div>
			</div>

			{/* Filter Bar */}
			<div className="bg-white border-b sticky top-0 z-10">
				<div className="container mx-auto px-4 py-4">
					<div className="flex flex-col md:flex-row gap-4 items-center justify-between">
						{/* Category Filters */}
						<div className="flex gap-2 overflow-x-auto w-full md:w-auto">
							{dealCategories.map((category) => {
								const Icon = category.icon;
								return (
									<button
										key={category.id}
										onClick={() => setSelectedCategory(category.id)}
										className={[
											'flex items-center gap-2 px-4 py-2',
											'rounded-lg whitespace-nowrap',
											'transition-colors',
											selectedCategory === category.id
												? 'bg-blue-600 text-white'
												: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
										].join(' ')}
									>
										<Icon className="h-4 w-4" />
										<span className="text-sm font-medium">
											{category.label}
										</span>
									</button>
								);
							})}
						</div>

						{/* Sort Dropdown */}
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
							className="px-4 py-2 border rounded-lg text-sm font-medium"
						>
							<option value="discount">Biggest Discount</option>
							<option value="price">Lowest Price</option>
							<option value="rating">Highest Rating</option>
						</select>
					</div>
				</div>
			</div>

			{/* Deals Grid */}
			<div className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{sortedDeals.map((deal) => (
						<div
							key={deal.id}
							className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden group"
						>
							{/* Image with Discount Badge */}
							<div className="relative h-48 overflow-hidden">
								<OptimizedImage
									src={deal.image}
									alt={deal.hotel}
									className="w-full h-full group-hover:scale-110 transition-transform duration-300"
									aspectRatio="4/3"
									objectFit="cover"
									sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
								/>
								<div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-lg font-bold">
									-{deal.discount}%
								</div>
								<div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-xs">
									{daysUntilExpiry(deal.validUntil)} days left
								</div>
							</div>

							{/* Content */}
							<div className="p-4">
								{/* Hotel Name and Location */}
								<h3 className="text-lg font-bold text-gray-900 mb-1">
									{deal.hotel}
								</h3>
								<div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
									<MapPin className="h-4 w-4" />
									<span>{deal.city}</span>
								</div>

								{/* Rating */}
								<div className="flex items-center gap-2 mb-3">
									<div className="flex items-center gap-1">
										<Star className="h-4 w-4 text-yellow-500 fill-current" />
										<span className="font-semibold text-sm">{deal.rating}</span>
									</div>
									<span className="text-xs text-gray-500">
										({deal.reviews} reviews)
									</span>
								</div>

								{/* Price */}
								<div className="flex items-center gap-3 mb-3">
									<span className="text-gray-400 line-through text-sm">
										${deal.originalPrice}
									</span>
									<span className="text-2xl font-bold text-green-600">
										${deal.discountPrice}
									</span>
									<span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
										Save $
										{calculateSavings(deal.originalPrice, deal.discountPrice)}
									</span>
								</div>

								{/* Urgency Message */}
								<div className="bg-orange-50 text-orange-700 px-3 py-2 rounded-lg text-sm font-medium mb-3">
									<TrendingDown className="h-4 w-4 inline mr-1" />
									{deal.urgency}
								</div>

								{/* Includes */}
								<div className="mb-4">
									<p className="text-xs text-gray-500 mb-1">
										This deal includes:
									</p>
									<div className="flex flex-wrap gap-1">
										{deal.includes.map((item) => (
											<span
												key={item}
												className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
											>
												{item}
											</span>
										))}
									</div>
								</div>

								{/* CTA Button */}
								<button
									onClick={() => handleDealClick(deal.city)}
									className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
								>
									Book Now
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Newsletter CTA */}
			<div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold mb-4">Never Miss a Deal!</h2>
					<p className="text-xl text-blue-100 mb-6">
						Join 500,000+ travelers who get exclusive deals delivered to their
						inbox
					</p>
					<div className="max-w-md mx-auto flex gap-2">
						<input
							type="email"
							placeholder="Enter your email"
							className="flex-1 px-4 py-3 rounded-lg text-gray-900"
						/>
						<button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors">
							Subscribe
						</button>
					</div>
					<p className="text-xs text-blue-200 mt-3">
						Unsubscribe anytime. We'll never share your email.
					</p>
				</div>
			</div>
		</div>
	);
};
