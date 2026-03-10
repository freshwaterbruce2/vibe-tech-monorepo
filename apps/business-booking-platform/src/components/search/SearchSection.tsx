import React from 'react';

interface SearchSectionProps {
	onSearch?: (searchData: any) => void;
	isLoading?: boolean;
	className?: string;
}

const SearchSection: React.FC<SearchSectionProps> = ({
	onSearch,
	isLoading = false,
	className = '',
}) => {
	return (
		<section className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
			<div className="max-w-4xl mx-auto">
				<h2 className="text-2xl font-bold text-gray-800 mb-6">
					Find Your Perfect Hotel
				</h2>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
					<div>
						<label
							htmlFor="search-destination"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Destination
						</label>
						<input
							type="text"
							id="search-destination"
							name="destination"
							placeholder="Where are you going?"
							autoComplete="address-level2"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>

					<div>
						<label
							htmlFor="search-checkin"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Check-in Date
						</label>
						<input
							type="date"
							id="search-checkin"
							name="checkin"
							autoComplete="checkin"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>

					<div>
						<label
							htmlFor="search-checkout"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Check-out Date
						</label>
						<input
							type="date"
							id="search-checkout"
							name="checkout"
							autoComplete="checkout"
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
				</div>

				<div className="flex flex-col md:flex-row gap-4 items-end">
					<div className="flex-1">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Guests
						</label>
						<select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
							<option>1 Guest</option>
							<option>2 Guests</option>
							<option>3 Guests</option>
							<option>4+ Guests</option>
						</select>
					</div>

					<button
						onClick={() => onSearch && onSearch({})}
						disabled={isLoading}
						className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isLoading ? 'Searching...' : 'Search Hotels'}
					</button>
				</div>
			</div>
		</section>
	);
};

export default SearchSection;
