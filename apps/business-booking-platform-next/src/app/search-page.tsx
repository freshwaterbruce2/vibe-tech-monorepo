import { ArrowDownUp, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from './api';
import { calculateNights, parseSearchValues } from './booking-utils';
import { HotelCard } from './hotel-card';
import { AppShell } from './layout';
import { SearchForm } from './search-form';
import type { Hotel } from './types';

type SortMode = 'recommended' | 'price' | 'rating';

export function SearchPage() {
  const [params] = useSearchParams();
  const searchValues = useMemo(() => parseSearchValues(params), [params]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [maxPrice, setMaxPrice] = useState(325);
  const [minScore, setMinScore] = useState(8.5);
  const [flexOnly, setFlexOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await apiFetch<{ hotels: Hotel[] }>('/hotels/search', {
          method: 'POST',
          body: JSON.stringify(searchValues),
        });
        setHotels(result.hotels);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hotels');
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [searchValues]);

  const filteredHotels = useMemo(() => {
    const filtered = hotels.filter((hotel) => {
      const flexible = hotel.cancellationPolicy.toLowerCase().includes('free');
      return (
        hotel.nightlyRate <= maxPrice && hotel.reviewScore >= minScore && (!flexOnly || flexible)
      );
    });

    return [...filtered].sort((first, second) => {
      if (sortMode === 'price') return first.nightlyRate - second.nightlyRate;
      if (sortMode === 'rating') return second.reviewScore - first.reviewScore;
      return second.reviewScore + second.rating - (first.reviewScore + first.rating);
    });
  }, [flexOnly, hotels, maxPrice, minScore, sortMode]);

  const nights = calculateNights(searchValues.checkIn, searchValues.checkOut);

  return (
    <AppShell>
      <main className="searchPage">
        <section className="searchHero">
          <div>
            <h1>Hotels in {searchValues.destination || 'your destination'}</h1>
            <p>
              {searchValues.checkIn} to {searchValues.checkOut} · {nights} nights ·{' '}
              {searchValues.guests} guests
            </p>
          </div>
          <SearchForm initialValues={searchValues} submitLabel="Update search" variant="compact" />
        </section>

        <section className="resultsLayout">
          <aside className="filtersPanel" aria-label="Hotel filters">
            <div className="panelTitle">
              <SlidersHorizontal size={18} aria-hidden="true" />
              <h2>Filter stays</h2>
            </div>
            <label>
              Max nightly price
              <input
                type="range"
                min={175}
                max={350}
                step={25}
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
              />
              <strong>${maxPrice}</strong>
            </label>
            <label>
              Minimum review score
              <input
                type="range"
                min={8}
                max={9.5}
                step={0.1}
                value={minScore}
                onChange={(event) => setMinScore(Number(event.target.value))}
              />
              <strong>{minScore.toFixed(1)}+</strong>
            </label>
            <label className="checkControl">
              <input
                type="checkbox"
                checked={flexOnly}
                onChange={(event) => setFlexOnly(event.target.checked)}
              />
              Free cancellation only
            </label>
          </aside>

          <div className="resultsColumn">
            <div className="resultsToolbar">
              <div>
                <strong>{filteredHotels.length} stays match</strong>
                <span>Prices include the selected stay length before payment.</span>
              </div>
              <label>
                <ArrowDownUp size={16} aria-hidden="true" />
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="price">Lowest price</option>
                  <option value="rating">Highest reviewed</option>
                </select>
              </label>
            </div>
            {isLoading && <p className="statusText">Loading hotels...</p>}
            {error && <p className="error">{error}</p>}
            {!isLoading && !error && filteredHotels.length === 0 && (
              <p className="statusText">No stays match the current filters.</p>
            )}
            <div className="resultsStack">
              {filteredHotels.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} searchValues={searchValues} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
