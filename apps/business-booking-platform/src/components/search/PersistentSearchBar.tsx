import {
	Calendar,
	Clock,
	MapPin,
	Search,
	TrendingUp,
	Users,
	X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '@/services/searchService';
import { useSearchStore } from '@/store/searchStore';

// Popular destinations for suggestions
const popularDestinations = [
	{ city: 'New York', country: 'USA', trending: true },
	{ city: 'Paris', country: 'France', trending: true },
	{ city: 'Tokyo', country: 'Japan', trending: false },
	{ city: 'Dubai', country: 'UAE', trending: true },
	{ city: 'London', country: 'UK', trending: false },
	{ city: 'Bali', country: 'Indonesia', trending: true },
	{ city: 'Miami', country: 'USA', trending: false },
	{ city: 'Barcelona', country: 'Spain', trending: true },
];

// Recent searches (would come from localStorage)
const recentSearches = [
	'Miami Beach Hotels',
	'Paris Luxury Hotels',
	'Tokyo Business Hotels',
];

interface PersistentSearchBarProps {
	className?: string;
	compact?: boolean;
}

export function PersistentSearchBar({
	className = '',
	compact = false,
}: PersistentSearchBarProps) {
	const navigate = useNavigate();
	const searchRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const [destination, setDestination] = useState('');
	const [checkIn, setCheckIn] = useState('');
	const [checkOut, setCheckOut] = useState('');
	const [guests, setGuests] = useState('2 Adults, 1 Room');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
	const [isExpanded, setIsExpanded] = useState(false);

	// Generate suggestions based on input
	useEffect(() => {
		const getSuggestions = async () => {
			if (destination.length > 1) {
				try {
					const apiSuggestions =
						await searchService.getSuggestions(destination);
					setSuggestions(apiSuggestions);
				} catch (_error) {
					// Fallback to static suggestions
					const filtered = popularDestinations
						.filter(
							(d) =>
								d.city.toLowerCase().includes(destination.toLowerCase()) ||
								d.country.toLowerCase().includes(destination.toLowerCase()),
						)
						.map((d) => `${d.city}, ${d.country}`)
						.slice(0, 6);

					setSuggestions(filtered);
				}
			} else {
				setSuggestions([]);
			}
		};

		const debounceTimer = setTimeout(getSuggestions, 300);
		return () => clearTimeout(debounceTimer);
	}, [destination]);

	// Handle click outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				searchRef.current &&
				!searchRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
				setIsExpanded(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const { setQuery, setLoading, setResults, setError } = useSearchStore();

	const handleSearch = async (e?: React.FormEvent) => {
		e?.preventDefault();

		if (!destination) {
			// Focus input if empty search
			inputRef.current?.focus();
			return;
		}

		try {
			setLoading(true);
			setError(null);
			setQuery(destination);

			// Perform search with robust service
			const searchResults = await searchService.searchHotels({
				destination,
				checkIn: checkIn || '',
				checkOut: checkOut || '',
				guests: guests || '2 Adults, 1 Room',
				rooms: '1',
			});

			setResults(searchResults.hotels);

			// Save to recent searches
			const recentSearches = JSON.parse(
				localStorage.getItem('recentSearches') || '[]',
			);
			const newSearch = `${destination} Hotels`;
			if (!recentSearches.includes(newSearch)) {
				recentSearches.unshift(newSearch);
				localStorage.setItem(
					'recentSearches',
					JSON.stringify(recentSearches.slice(0, 5)),
				);
			}

			// Navigate to search results
			const params = new URLSearchParams({
				destination,
				checkIn: checkIn || '',
				checkOut: checkOut || '',
				guests: guests || '2 Adults, 1 Room',
				rooms: '1',
			});

			navigate(`/search?${params.toString()}`);
		} catch (error) {
			console.error('Search failed:', error);
			setError('Search failed. Please try again.');
		} finally {
			setLoading(false);
			setShowSuggestions(false);
			setIsExpanded(false);
		}
	};

	const handleSuggestionClick = (suggestion: string) => {
		const [city] = suggestion.split(',');
		if (city) {
			setDestination(city.trim());
			setShowSuggestions(false);
			handleSearch();
		}
	};

	const handleInputFocus = () => {
		setShowSuggestions(true);
		if (compact && !isExpanded) {
			setIsExpanded(true);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedSuggestion((prev) =>
				prev <
				(suggestions.length > 0
					? suggestions.length - 1
					: recentSearches.length - 1)
					? prev + 1
					: prev,
			);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (selectedSuggestion >= 0) {
				if (suggestions.length > 0) {
					const suggestion = suggestions[selectedSuggestion];
					if (suggestion) {
						handleSuggestionClick(suggestion);
					}
				} else if (recentSearches[selectedSuggestion]) {
					setDestination(
						recentSearches[selectedSuggestion].replace(' Hotels', ''),
					);
					handleSearch();
				}
			} else {
				handleSearch();
			}
		} else if (e.key === 'Escape') {
			setShowSuggestions(false);
			setIsExpanded(false);
			inputRef.current?.blur();
		}
	};

	// Get today's date for min date
	const today = new Date().toISOString().split('T')[0];

	return (
		<div ref={searchRef} className={`relative ${className}`}>
			<form onSubmit={handleSearch} className="w-full">
				{/* Compact Mode - Always Visible */}
				{compact && !isExpanded ? (
					<div className="flex items-center gap-3">
						{/* Main Search Input */}
						<div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 transition-all">
							<MapPin className="w-5 h-5 text-gray-500" aria-hidden="true" />
							<input
								ref={inputRef}
								id="compact-destination-input"
								name="destination"
								type="text"
								value={destination}
								onChange={(e) => setDestination(e.target.value)}
								onFocus={handleInputFocus}
								onKeyDown={handleKeyDown}
								placeholder="Search hotels, destinations..."
								aria-label="Search hotels and destinations"
								aria-expanded={showSuggestions}
								aria-haspopup="listbox"
								autoComplete="destination"
								className="flex-1 bg-transparent outline-none text-sm placeholder-gray-500"
							/>
							{destination && (
								<button
									type="button"
									onClick={() => setDestination('')}
									aria-label="Clear search"
									className="text-gray-400 hover:text-gray-600 p-1"
								>
									<X className="w-4 h-4" />
								</button>
							)}
						</div>

						{/* Search Button */}
						<button
							type="submit"
							aria-label="Search hotels"
							className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 flex items-center gap-2 font-medium text-sm min-h-[44px]"
						>
							<Search className="w-4 h-4" />
							<span className="hidden md:inline">Search</span>
						</button>
					</div>
				) : (
					/* Expanded Mode - Full Featured */
					<div className="space-y-4">
						{/* Main Search Row */}
						<div className="flex flex-col lg:flex-row gap-3">
							{/* Destination Input */}
							<div className="flex-1 relative">
								<label htmlFor="destination-input" className="sr-only">
									Destination or Hotel Name
								</label>
								<div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 transition-all">
									<MapPin
										className="w-5 h-5 text-gray-500"
										aria-hidden="true"
									/>
									<input
										id="destination-input"
										name="destination"
										ref={inputRef}
										type="text"
										value={destination}
										onChange={(e) => setDestination(e.target.value)}
										onFocus={handleInputFocus}
										onKeyDown={handleKeyDown}
										placeholder="Where would you like to stay?"
										aria-label="Destination or hotel name"
										aria-expanded={showSuggestions}
										aria-haspopup="listbox"
										autoComplete="destination"
										className="flex-1 bg-transparent outline-none text-base placeholder-gray-500"
									/>
									{destination && (
										<button
											type="button"
											onClick={() => setDestination('')}
											aria-label="Clear destination"
											className="text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
										>
											<X className="w-4 h-4" />
										</button>
									)}
								</div>
							</div>

							{/* Check In Date */}
							<div className="lg:w-48">
								<label htmlFor="checkin-input" className="sr-only">
									Check-in Date
								</label>
								<div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 transition-all">
									<Calendar
										className="w-5 h-5 text-gray-500"
										aria-hidden="true"
									/>
									<div className="flex-1">
										<div className="text-xs text-gray-500 mb-1">Check-in</div>
										<input
											id="checkin-input"
											name="checkin"
											type="date"
											value={checkIn}
											onChange={(e) => setCheckIn(e.target.value)}
											min={today}
											aria-label="Check-in date"
											autoComplete="checkin"
											className="bg-transparent outline-none text-sm font-medium w-full"
										/>
									</div>
								</div>
							</div>

							{/* Check Out Date */}
							<div className="lg:w-48">
								<label htmlFor="checkout-input" className="sr-only">
									Check-out Date
								</label>
								<div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 transition-all">
									<Calendar
										className="w-5 h-5 text-gray-500"
										aria-hidden="true"
									/>
									<div className="flex-1">
										<div className="text-xs text-gray-500 mb-1">Check-out</div>
										<input
											id="checkout-input"
											name="checkout"
											type="date"
											value={checkOut}
											onChange={(e) => setCheckOut(e.target.value)}
											min={checkIn || today}
											aria-label="Check-out date"
											autoComplete="checkout"
											className="bg-transparent outline-none text-sm font-medium w-full"
										/>
									</div>
								</div>
							</div>

							{/* Guests */}
							<div className="lg:w-52">
								<label htmlFor="guests-select" className="sr-only">
									Number of Guests and Rooms
								</label>
								<div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10 transition-all">
									<Users className="w-5 h-5 text-gray-500" aria-hidden="true" />
									<div className="flex-1">
										<div className="text-xs text-gray-500 mb-1">Guests</div>
										<select
											id="guests-select"
											name="guests"
											value={guests}
											onChange={(e) => setGuests(e.target.value)}
											aria-label="Number of guests and rooms"
											className="bg-transparent outline-none text-sm font-medium cursor-pointer w-full"
										>
											<option>1 Adult, 1 Room</option>
											<option>2 Adults, 1 Room</option>
											<option>2 Adults, 2 Rooms</option>
											<option>3 Adults, 2 Rooms</option>
											<option>4 Adults, 2 Rooms</option>
										</select>
									</div>
								</div>
							</div>

							{/* Search Button */}
							<button
								type="submit"
								className="px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[44px]"
								aria-label="Search for hotels"
							>
								<Search className="w-5 h-5" />
								<span>Search Hotels</span>
							</button>
						</div>

						{/* Quick Filters */}
						<div className="flex flex-wrap items-center gap-3 text-xs">
							<span className="text-gray-500 font-medium">Quick Search:</span>
							{[
								'Beach Resort',
								'City Hotel',
								'Mountain Lodge',
								'Spa Resort',
							].map((filter) => (
								<button
									key={filter}
									type="button"
									onClick={() => {
										setDestination(filter);
										handleSearch();
									}}
									className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-700 hover:text-gray-900 min-h-[44px] flex items-center"
									aria-label={`Search for ${filter.toLowerCase()}`}
								>
									{filter}
								</button>
							))}
						</div>
					</div>
				)}
			</form>

			{/* Suggestions Dropdown */}
			{showSuggestions && (
				<div
					className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto"
					role="listbox"
					aria-label="Search suggestions"
				>
					{/* Search Suggestions */}
					{suggestions.length > 0 && (
						<div className="p-2">
							<div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Suggestions
							</div>
							{suggestions.map((suggestion, index) => (
								<button
									key={suggestion}
									type="button"
									onClick={() => handleSuggestionClick(suggestion)}
									role="option"
									aria-selected={selectedSuggestion === index}
									className={`
                    w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors min-h-[44px]
                    ${selectedSuggestion === index ? 'bg-gray-100' : 'hover:bg-gray-50'}
                  `}
								>
									<MapPin
										className="w-4 h-4 text-gray-400"
										aria-hidden="true"
									/>
									<span className="text-sm">{suggestion}</span>
									{popularDestinations.find((d) => suggestion.includes(d.city))
										?.trending && (
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
							<div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
								<Clock className="w-3 h-3" />
								Recent Searches
							</div>
							{recentSearches.map((search, index) => (
								<button
									key={search}
									type="button"
									onClick={() => {
										setDestination(search.replace(' Hotels', ''));
										handleSearch();
									}}
									role="option"
									aria-selected={
										selectedSuggestion === suggestions.length + index
									}
									className={`
                    w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600 min-h-[44px]
                    ${selectedSuggestion === suggestions.length + index ? 'bg-gray-100' : ''}
                  `}
								>
									{search}
								</button>
							))}
						</div>
					)}

					{/* Popular Destinations */}
					{!destination && (
						<div className="p-2 border-t border-gray-100">
							<div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
								Popular Destinations
							</div>
							<div className="grid grid-cols-2 gap-2">
								{popularDestinations.slice(0, 6).map((dest) => (
									<button
										key={dest.city}
										type="button"
										onClick={() => {
											setDestination(dest.city);
											handleSearch();
										}}
										className="text-left px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors group min-h-[44px]"
										aria-label={`Search hotels in ${dest.city}, ${dest.country}`}
									>
										<div className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
											{dest.city}
										</div>
										<div className="text-xs text-gray-500">{dest.country}</div>
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
