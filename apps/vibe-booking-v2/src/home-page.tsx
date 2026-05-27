import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Star,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from './api';
import { DEFAULT_SEARCH_VALUES, formatCurrency, toSearchParams } from './booking-utils';
import { AppShell } from './layout';
import { SearchForm } from './search-form';
import type { Hotel } from './types';

const HERO_IMAGE = '/images/hotel-rooftop.png';

const trustItems = [
  {
    icon: ShieldCheck,
    label: 'Verified stays',
    detail: 'Review scores and amenities stay visible before checkout.',
  },
  {
    icon: WalletCards,
    label: 'Clear totals',
    detail: 'Nightly rate and trip total appear together on hotel cards.',
  },
  {
    icon: Clock3,
    label: 'Flexible plans',
    detail: 'Cancellation terms are surfaced before you reserve.',
  },
  {
    icon: BriefcaseBusiness,
    label: 'Work-trip ready',
    detail: 'Perks highlight meeting rooms, Wi-Fi, offices, and late checkout.',
  },
];

export function HomePage() {
  const [featuredHotels, setFeaturedHotels] = useState<Hotel[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await apiFetch<{ hotels: Hotel[] }>('/hotels/search', {
          method: 'POST',
          body: JSON.stringify({
            destination: '',
            guests: DEFAULT_SEARCH_VALUES.guests,
          }),
        });
        setFeaturedHotels(result.hotels.slice(0, 3));
      } catch {
        setFeaturedHotels([]);
      }
    };
    void run();
  }, []);

  const query = toSearchParams(DEFAULT_SEARCH_VALUES).toString();

  return (
    <AppShell>
      <main>
        <section className="heroSection">
          <div className="heroCopy">
            <h1>Book work-ready hotels without second guessing the stay.</h1>
            <p>
              Compare business amenities, real review strength, flexible cancellation, and full-trip
              pricing before you commit.
            </p>
            <SearchForm initialValues={DEFAULT_SEARCH_VALUES} />
          </div>
          <div className="heroMedia" aria-label="Hotel pool and lobby preview">
            <img src={HERO_IMAGE} alt="Modern hotel pool with resort seating" />
            <div className="heroDealCard">
              <span>Recommended today</span>
              <strong>Miami business stays</strong>
              <p>From {formatCurrency(199, 'USD')} per night with flexible options</p>
            </div>
          </div>
        </section>

        <section className="trustStrip" aria-label="Booking confidence">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label}>
                <Icon size={24} aria-hidden="true" />
                <div>
                  <h2>{item.label}</h2>
                  <p>{item.detail}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section className="sectionBlock">
          <div className="sectionHeader">
            <div>
              <h2>Strong options for the next trip</h2>
              <p>Photo-led listings with the decision details travelers expect up front.</p>
            </div>
            <Link className="textLink" to={`/search?${query}`}>
              See all stays <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="featuredGrid">
            {featuredHotels.map((hotel) => (
              <Link key={hotel.id} className="featuredStay" to={`/hotel/${hotel.id}?${query}`}>
                <img
                  src={hotel.imageUrl}
                  alt={`${hotel.name} exterior or guest area`}
                  loading="lazy"
                />
                <div>
                  <span>{hotel.badge}</span>
                  <h3>{hotel.name}</h3>
                  <p>
                    {hotel.neighborhood} · {hotel.distanceFromCenter}
                  </p>
                  <div className="featuredMeta">
                    <span>
                      <Star size={15} aria-hidden="true" />
                      {hotel.reviewScore.toFixed(1)}
                    </span>
                    <span>{formatCurrency(hotel.nightlyRate, hotel.currency)} night</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="checkoutPreview">
          <div>
            <h2>Built for the questions people ask before booking.</h2>
            <p>
              The redesigned flow keeps the important answers close: where it is, what it costs,
              whether cancellation is flexible, and why it fits a business trip.
            </p>
          </div>
          <ul>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" /> Sort and filter before reviewing hotels.
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" /> Review score, reviews, and perks stay on
              each listing.
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" /> Booking and payment pages keep the stay
              summary visible.
            </li>
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
