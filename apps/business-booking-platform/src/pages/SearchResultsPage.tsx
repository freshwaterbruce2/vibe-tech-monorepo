import SearchFilters from '@/components/search/SearchFilters';
import SearchResults from '@/components/search/SearchResults';

export function SearchResultsPage() {
	// The useHotelSearch hook in SearchResults component will handle search triggering
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
				<aside className="lg:col-span-1">
					<SearchFilters />
				</aside>
				<main className="lg:col-span-3" data-testid="search-results">
					<SearchResults />
				</main>
			</div>
		</div>
	);
}
