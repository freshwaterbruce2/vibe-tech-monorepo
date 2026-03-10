import {
	Calendar,
	Clock,
	MapPin,
	Search,
	Sparkles,
	Star,
	TrendingUp,
	Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// import { useSearchStore } from '@/store/searchStore'; // Removed unused import

// Popular destinations data
const popularDestinations = [
	{ city: 'New York', country: 'USA', trending: true },
	{ city: 'Paris', country: 'France', trending: true },
	{ city: 'Tokyo', country: 'Japan', trending: false },
	{ city: 'Dubai', country: 'UAE', trending: true },
	{ city: 'London', country: 'UK', trending: false },
	{ city: 'Bali', country: 'Indonesia', trending: true },
];

// Recent searches (would come from localStorage in production)
const recentSearches = [
	'Miami Beach Hotels',
	'Luxury Resorts Maldives',
	'Tokyo Business Hotels',
];

// Trending searches for social proof
const trendingSearches = [
	{ term: 'Beach Resorts', increase: '+45%' },
	{ term: 'Mountain Retreats', increase: '+32%' },
	{ term: 'City Hotels', increase: '+28%' },
	{ term: 'Spa Resorts', increase: '+67%' },
];

export function IntelligentSearchBar() {
	const navigate = useNavigate();
	const searchRef = useRef<HTMLDivElement>(null);

	const [isVisible, setIsVisible] = useState(false);
	const [isCompact, setIsCompact] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);

	// Form states
	const [destination, setDestination] = useState('');
	const [checkIn, setCheckIn] = useState('');
	const [checkOut, setCheckOut] = useState('');
	const [guests, setGuests] = useState('2 Adults, 1 Room');

	// Suggestion states
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

	// Handle scroll behavior
	useEffect(() => {
		const handleScroll = () => {
			const {scrollY} = window;
			const heroHeight = 500; // Approximate hero section height

			// Show search bar after scrolling past hero
			if (scrollY > heroHeight - 100) {
				setIsVisible(true);
			} else {
				setIsVisible(false);
			}

			// Make compact after more scrolling
			if (scrollY > heroHeight + 200) {
				setIsCompact(true);
			} else {
				setIsCompact(false);
			}
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Handle click outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchRef.current &&
				!searchRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
				setIsFocused(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Generate smart suggestions based on input
	useEffect(() => {
		if (destination.length > 0) {
			const filtered = popularDestinations
				.filter(
					(d) =>
						d.city.toLowerCase().includes(destination.toLowerCase()) ||
						d.country.toLowerCase().includes(destination.toLowerCase()),
				)
				.map((d) => `${d.city}, ${d.country}`);

			setSuggestions(filtered);
		} else {
			setSuggestions([]);
		}
	}, [destination]);

	const handleSearch = (e?: React.FormEvent) => {
		e?.preventDefault();

		// Save to recent searches
		if (destination) {
			// In production, save to localStorage
			// localStorage.setItem('recentSearch', `${destination} Hotels`);
		}

		// Navigate to search results with query params
		const params = new URLSearchParams({
			destination,
			checkIn,
			checkOut,
			guests: '2',
			rooms: '1',
		});

		navigate(`/search?${params.toString()}`);
		setShowSuggestions(false);
	};

	const handleSuggestionClick = (suggestion: string) => {
		const [city] = suggestion.split(',');
		if (city) {
			setDestination(city.trim());
			setShowSuggestions(false);
			handleSearch();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			setSelectedSuggestion((prev) =>
				prev < suggestions.length - 1 ? prev + 1 : prev,
			);
		} else if (e.key === 'ArrowUp') {
			setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
		} else if (e.key === 'Enter' && selectedSuggestion >= 0) {
			const suggestion = suggestions[selectedSuggestion];
			if (suggestion) {
				handleSuggestionClick(suggestion);
			}
		}
	};

	// Get today's date for min date
	const today = new Date().toISOString().split('T')[0];

	return (
		<>
			{/* Sticky Search Bar */}
			<div
				ref={searchRef}
				className={`
          fixed top-0 left-0 right-0 z-40 
          transition-all duration-500 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
          ${isCompact ? 'py-2' : 'py-4'}
        `}
			>
				{/* Backdrop blur effect */}
				<div className="absolute inset-0 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100" />

				{/* Search Content */}
				<div className="relative max-w-7xl mx-auto px-4">
					<form
						onSubmit={handleSearch}
						className={`
            transition-all duration-300
            ${isCompact ? 'flex items-center gap-2' : 'space-y-3'}
          `}
					>
						{/* Compact Mode - Single Line */}
						{isCompact ? (
							<div className="flex items-center gap-3 flex-1">
								{/* Destination Input */}
								<div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 transition-all">
									<MapPin className="w-4 h-4 text-gray-500" />
									<input
										type="text"
										value={destination}
										onChange={(e) => setDestination(e.target.value)}
										onFocus={() => {
											setIsFocused(true);
											setShowSuggestions(true);
										}}
										onKeyDown={handleKeyDown}
										placeholder="Where are you going?"
										className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
									/>
								</div>

								{/* Date Range */}
								<div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 focus-within:border-gray-900 transition-all">
									<Calendar className="w-4 h-4 text-gray-500" />
									<input
										type="date"
										value={checkIn}
										onChange={(e) => setCheckIn(e.target.value)}
										min={today}
										className="bg-transparent outline-none text-sm"
									/>
									<span className="text-gray-400">→</span>
									<input
										type="date"
										value={checkOut}
										onChange={(e) => setCheckOut(e.target.value)}
										min={checkIn || today}
										className="bg-transparent outline-none text-sm"
									/>
								</div>

								{/* Guests */}
								<div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 focus-within:border-gray-900 transition-all">
									<Users className="w-4 h-4 text-gray-500" />
									<select
										value={guests}
										onChange={(e) => setGuests(e.target.value)}
										className="bg-transparent outline-none text-sm cursor-pointer"
									>
										<option>1 Adult, 1 Room</option>
										<option>2 Adults, 1 Room</option>
										<option>2 Adults, 2 Rooms</option>
										<option>3 Adults, 2 Rooms</option>
										<option>4 Adults, 2 Rooms</option>
									</select>
								</div>

								{/* Search Button */}
								<button
									type="submit"
									className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 font-medium text-sm"
								>
									<Search className="w-4 h-4" />
									Search
								</button>
							</div>
						) : (
							/* Expanded Mode - Full Featured */
							<div className="space-y-3">
								{/* Main Search Row */}
								<div className="flex items-center gap-3">
									{/* Destination with Icon */}
									<div className="flex-1 relative">
										<div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 focus-within:ring-4 focus-within:ring-gray-900/10 transition-all">
											<MapPin className="w-5 h-5 text-gray-500" />
											<input
												type="text"
												value={destination}
												onChange={(e) => setDestination(e.target.value)}
												onFocus={() => {
													setIsFocused(true);
													setShowSuggestions(true);
												}}
												onKeyDown={handleKeyDown}
												placeholder="Search destinations, hotels, or landmarks..."
												className="flex-1 bg-transparent outline-none text-base placeholder-gray-400"
											/>
											{destination && (
												<button
													type="button"
													onClick={() => setDestination('')}
													className="text-gray-400 hover:text-gray-600"
												>
													×
												</button>
											)}
										</div>
									</div>

									{/* Check In */}
									<div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 transition-all">
										<Calendar className="w-5 h-5 text-gray-500" />
										<div>
											<label className="text-xs text-gray-500 block">
												Check in
											</label>
											<input
												type="date"
												value={checkIn}
												onChange={(e) => setCheckIn(e.target.value)}
												min={today}
												className="bg-transparent outline-none text-sm font-medium"
											/>
										</div>
									</div>

									{/* Check Out */}
									<div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 transition-all">
										<Calendar className="w-5 h-5 text-gray-500" />
										<div>
											<label className="text-xs text-gray-500 block">
												Check out
											</label>
											<input
												type="date"
												value={checkOut}
												onChange={(e) => setCheckOut(e.target.value)}
												min={checkIn || today}
												className="bg-transparent outline-none text-sm font-medium"
											/>
										</div>
									</div>

									{/* Guests */}
									<div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 transition-all">
										<Users className="w-5 h-5 text-gray-500" />
										<div>
											<label className="text-xs text-gray-500 block">
												Guests
											</label>
											<select
												value={guests}
												onChange={(e) => setGuests(e.target.value)}
												className="bg-transparent outline-none text-sm font-medium cursor-pointer"
											>
												<option>1 Adult, 1 Room</option>
												<option>2 Adults, 1 Room</option>
												<option>2 Adults, 2 Rooms</option>
												<option>3 Adults, 2 Rooms</option>
												<option>4 Adults, 2 Rooms</option>
											</select>
										</div>
									</div>

									{/* Search Button */}
									<button
										type="submit"
										className="px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
									>
										<Search className="w-5 h-5" />
										Search Hotels
									</button>
								</div>

								{/* Quick Filters */}
								<div className="flex items-center gap-2 text-xs">
									<span className="text-gray-500">Popular filters:</span>
									<button
										type="button"
										className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
										onClick={() => setDestination('Beach Resort')}
									>
										🏖️ Beach
									</button>
									<button
										type="button"
										className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
										onClick={() => setDestination('City Hotel')}
									>
										🏙️ City
									</button>
									<button
										type="button"
										className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
										onClick={() => setDestination('Mountain Lodge')}
									>
										⛰️ Mountain
									</button>
									<button
										type="button"
										className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
										onClick={() => setDestination('Spa Resort')}
									>
										💆 Spa
									</button>
									<span className="ml-auto text-gray-500 flex items-center gap-1">
										<Sparkles className="w-3 h-3" />
										AI-powered search
									</span>
								</div>
							</div>
						)}
					</form>

					{/* Suggestions Dropdown */}
					{showSuggestions && (destination || isFocused) && (
						<div className="absolute top-full left-4 right-4 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-w-2xl">
							{/* Suggestions */}
							{suggestions.length > 0 && (
								<div className="p-2">
									<div className="text-xs font-semibold text-gray-500 px-3 py-2">
										SUGGESTIONS
									</div>
									{suggestions.map((suggestion, index) => (
										<button
											key={suggestion}
											type="button"
											onClick={() => handleSuggestionClick(suggestion)}
											className={`
                        w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors
                        ${selectedSuggestion === index ? 'bg-gray-100' : 'hover:bg-gray-50'}
                      `}
										>
											<MapPin className="w-4 h-4 text-gray-400" />
											<span className="text-sm">{suggestion}</span>
											{popularDestinations.find((d) =>
												suggestion.includes(d.city),
											)?.trending && (
												<span className="ml-auto text-xs text-orange-600 font-medium flex items-center gap-1">
													<TrendingUp className="w-3 h-3" />
													Trending
												</span>
											)}
										</button>
									))}
								</div>
							)}

							{/* Recent Searches */}
							{!destination && recentSearches.length > 0 && (
								<div className="p-2 border-t border-gray-100">
									<div className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-2">
										<Clock className="w-3 h-3" />
										RECENT SEARCHES
									</div>
									{recentSearches.map((search) => (
										<button
											key={search}
											type="button"
											onClick={() => {
												setDestination(search.replace(' Hotels', ''));
												handleSearch();
											}}
											className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
										>
											{search}
										</button>
									))}
								</div>
							)}

							{/* Trending Searches */}
							{!destination && (
								<div className="p-2 border-t border-gray-100">
									<div className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-2">
										<TrendingUp className="w-3 h-3" />
										TRENDING NOW
									</div>
									<div className="grid grid-cols-2 gap-2">
										{trendingSearches.map((trend) => (
											<button
												key={trend.term}
												type="button"
												onClick={() => {
													setDestination(trend.term);
													handleSearch();
												}}
												className="text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group"
											>
												<span className="text-sm text-gray-700 group-hover:text-gray-900">
													{trend.term}
												</span>
												<span className="text-xs text-green-600 font-medium">
													{trend.increase}
												</span>
											</button>
										))}
									</div>
								</div>
							)}

							{/* Popular Destinations */}
							{!destination && (
								<div className="p-2 border-t border-gray-100">
									<div className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-2">
										<Star className="w-3 h-3" />
										POPULAR DESTINATIONS
									</div>
									<div className="grid grid-cols-3 gap-2">
										{popularDestinations.map((dest) => (
											<button
												key={dest.city}
												type="button"
												onClick={() => {
													setDestination(dest.city);
													handleSearch();
												}}
												className="text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
											>
												<div className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
													{dest.city}
												</div>
												<div className="text-xs text-gray-500">
													{dest.country}
												</div>
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Spacer to prevent content jump */}
			{isVisible && (
				<div
					className={`${isCompact ? 'h-16' : 'h-32'} transition-all duration-300`}
				/>
			)}
		</>
	);
}
