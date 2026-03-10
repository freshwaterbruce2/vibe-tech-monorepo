import { Calendar, MapPin, Search, Users, X } from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchStore } from '@/store/searchStore';
import { cn } from '@/utils/cn';

export const StickySearchBar: React.FC = () => {
	const navigate = useNavigate();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [localDestination, setLocalDestination] = useState('');
	const [localCheckIn, setLocalCheckIn] = useState('');
	const [localCheckOut, setLocalCheckOut] = useState('');
	const [localGuests, setLocalGuests] = useState('2 Guests, 1 Room');

	const { setQuery, setDateRange } = useSearchStore();

	// Handle scroll to show/hide sticky bar
	useEffect(() => {
		const handleScroll = () => {
			const scrolled = window.scrollY > 400; // Show after hero section
			setIsScrolled(scrolled);
			if (!scrolled) {
				setIsExpanded(false);
			}
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const handleSearch = () => {
		if (localDestination.trim()) {
			setQuery(localDestination);
			if (localCheckIn && localCheckOut) {
				setDateRange(localCheckIn, localCheckOut);
			}
			navigate('/search');
			setIsExpanded(false);
		}
	};

	// Professional date formatting
	const formatDateDisplay = (date: string) => {
		if (!date) {
return '';
}
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	};

	// Get today's date for min attribute
	const today = new Date().toISOString().split('T')[0];

	if (!isScrolled) {
return null;
}

	return (
		<>
			{/* Backdrop when expanded */}
			{isExpanded && (
				<div
					className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
					onClick={() => setIsExpanded(false)}
				/>
			)}

			{/* Sticky Search Bar - Marriott/Hilton Style */}
			<div
				className={cn(
					'fixed top-0 left-0 right-0 z-50 transform transition-all duration-500 ease-out',
					isScrolled
						? 'translate-y-0 opacity-100'
						: '-translate-y-full opacity-0',
				)}
			>
				<div
					className={cn(
						'bg-white shadow-2xl transition-all duration-300',
						isExpanded ? 'py-6' : 'py-3',
					)}
				>
					<div className="container mx-auto px-4">
						{!isExpanded ? (
							/* Collapsed State - Elegant Minimal Bar */
							<div
								onClick={() => setIsExpanded(true)}
								className="flex items-center justify-between bg-gray-50 rounded-full px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
							>
								<div className="flex items-center gap-6">
									<div className="flex items-center gap-2">
										<MapPin className="h-4 w-4 text-gray-500" />
										<span className="text-sm font-medium text-gray-700">
											{localDestination || 'Where are you going?'}
										</span>
									</div>

									{(localCheckIn || localCheckOut) && (
										<>
											<div className="h-4 w-px bg-gray-300" />
											<div className="flex items-center gap-2">
												<Calendar className="h-4 w-4 text-gray-500" />
												<span className="text-sm text-gray-600">
													{formatDateDisplay(localCheckIn)} -{' '}
													{formatDateDisplay(localCheckOut)}
												</span>
											</div>
										</>
									)}

									<div className="h-4 w-px bg-gray-300" />
									<div className="flex items-center gap-2">
										<Users className="h-4 w-4 text-gray-500" />
										<span className="text-sm text-gray-600">{localGuests}</span>
									</div>
								</div>

								<button className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 group-hover:scale-105 transform transition-transform">
									<Search className="h-4 w-4" />
									<span>Search</span>
								</button>
							</div>
						) : (
							/* Expanded State - Full Search Form */
							<div className="relative">
								{/* Close button */}
								<button
									onClick={() => setIsExpanded(false)}
									className="absolute -top-2 right-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
								>
									<X className="h-5 w-5 text-gray-500" />
								</button>

								{/* Search Form - Professional Grid Layout */}
								<div className="grid grid-cols-12 gap-3 items-end">
									{/* Destination */}
									<div className="col-span-12 md:col-span-4">
										<label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">
											Destination
										</label>
										<div className="relative">
											<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
											<input
												type="text"
												value={localDestination}
												onChange={(e) => setLocalDestination(e.target.value)}
												placeholder="City, Airport, Address or Hotel"
												className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
												autoFocus
											/>
										</div>
									</div>

									{/* Check-in */}
									<div className="col-span-6 md:col-span-2">
										<label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">
											Check-in
										</label>
										<input
											type="date"
											value={localCheckIn}
											onChange={(e) => setLocalCheckIn(e.target.value)}
											min={today}
											className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
										/>
									</div>

									{/* Check-out */}
									<div className="col-span-6 md:col-span-2">
										<label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">
											Check-out
										</label>
										<input
											type="date"
											value={localCheckOut}
											onChange={(e) => setLocalCheckOut(e.target.value)}
											min={localCheckIn || today}
											className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
										/>
									</div>

									{/* Guests & Rooms */}
									<div className="col-span-12 md:col-span-2">
										<label className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">
											Guests & Rooms
										</label>
										<select
											value={localGuests}
											onChange={(e) => setLocalGuests(e.target.value)}
											className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm appearance-none bg-white"
										>
											<option>1 Guest, 1 Room</option>
											<option>2 Guests, 1 Room</option>
											<option>3 Guests, 1 Room</option>
											<option>4 Guests, 2 Rooms</option>
											<option>5+ Guests</option>
										</select>
									</div>

									{/* Search Button */}
									<div className="col-span-12 md:col-span-2">
										<button
											onClick={handleSearch}
											className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
										>
											<Search className="h-4 w-4" />
											<span>Search</span>
										</button>
									</div>
								</div>

								{/* Quick Links - Like Marriott */}
								<div className="flex items-center gap-4 mt-4 text-xs">
									<button className="text-blue-600 hover:underline font-medium">
										Use Points
									</button>
									<span className="text-gray-300">|</span>
									<button className="text-blue-600 hover:underline font-medium">
										Find Deals
									</button>
									<span className="text-gray-300">|</span>
									<button className="text-blue-600 hover:underline font-medium">
										My Trips
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
};
