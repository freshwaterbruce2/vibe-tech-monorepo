import { BriefcaseBusiness, CheckCircle2, MapPin, Star, Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch } from './api';
import {
  calculateNights,
  formatCurrency,
  formatReviewCount,
  parseSearchValues,
  toSearchParams,
} from './booking-utils';
import { AppShell } from './layout';
import type { Hotel } from './types';

export function HotelPage() {
  const { hotelId = '' } = useParams();
  const [params] = useSearchParams();
  const searchValues = useMemo(() => parseSearchValues(params), [params]);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      setError('');
      try {
        const result = await apiFetch<{ hotel: Hotel }>(`/hotels/${hotelId}`);
        setHotel(result.hotel);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hotel');
      }
    };
    if (hotelId) void run();
  }, [hotelId]);

  if (!hotelId) return <Navigate to="/" replace />;

  const nights = calculateNights(searchValues.checkIn, searchValues.checkOut);
  const query = toSearchParams(searchValues).toString();

  return (
    <AppShell>
      <main className="hotelPage">
        {error && <p className="error">{error}</p>}
        {!hotel && !error && <p className="statusText">Loading hotel...</p>}
        {hotel && (
          <>
            <section className="propertyHero">
              <div>
                <Link className="textLink" to={`/search?${query}`}>
                  Back to results
                </Link>
                <h1>{hotel.name}</h1>
                <p>
                  <MapPin size={17} aria-hidden="true" />
                  {hotel.neighborhood}, {hotel.city} · {hotel.distanceFromCenter}
                </p>
              </div>
              <div className="propertyScore">
                <strong>{hotel.reviewScore.toFixed(1)}</strong>
                <span>{formatReviewCount(hotel.reviewCount)} verified reviews</span>
              </div>
            </section>

            <section className="galleryGrid" aria-label={`${hotel.name} photos`}>
              <img
                className="galleryLead"
                src={hotel.imageUrl}
                alt={`${hotel.name} main property view`}
              />
              {hotel.gallery.map((image, index) => (
                <img key={image} src={image} alt={`${hotel.name} gallery view ${index + 1}`} />
              ))}
            </section>

            <section className="propertyLayout">
              <div className="propertyDetails">
                <div className="propertyIntro">
                  <span>{hotel.badge}</span>
                  <h2>Why this stay works</h2>
                  <p>{hotel.description}</p>
                </div>
                <div className="detailGrid">
                  <article>
                    <Star size={22} aria-hidden="true" />
                    <h3>Strong reviews</h3>
                    <p>{hotel.reviewScore.toFixed(1)} guest score with visible review volume.</p>
                  </article>
                  <article>
                    <BriefcaseBusiness size={22} aria-hidden="true" />
                    <h3>Business ready</h3>
                    <p>{hotel.businessPerks.join(', ')}.</p>
                  </article>
                  <article>
                    <Wifi size={22} aria-hidden="true" />
                    <h3>Useful amenities</h3>
                    <p>{hotel.amenities.join(', ')}.</p>
                  </article>
                  <article>
                    <CheckCircle2 size={22} aria-hidden="true" />
                    <h3>Flexible booking</h3>
                    <p>{hotel.cancellationPolicy}.</p>
                  </article>
                </div>
              </div>

              <aside className="bookingPanel" aria-label="Reservation summary">
                <div>
                  <span className="nightlyPrice">
                    {formatCurrency(hotel.nightlyRate, hotel.currency)}
                  </span>
                  <span className="priceDetail">per night</span>
                </div>
                <dl>
                  <div>
                    <dt>Dates</dt>
                    <dd>
                      {searchValues.checkIn} to {searchValues.checkOut}
                    </dd>
                  </div>
                  <div>
                    <dt>Guests</dt>
                    <dd>{searchValues.guests}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{formatCurrency(hotel.nightlyRate * nights, hotel.currency)}</dd>
                  </div>
                </dl>
                <Link className="primaryButton wideButton" to={`/booking/${hotel.id}?${query}`}>
                  Reserve this stay
                </Link>
                <p>{hotel.cancellationPolicy}</p>
              </aside>
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
