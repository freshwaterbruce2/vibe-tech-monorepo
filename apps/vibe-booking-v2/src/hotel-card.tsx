import { BriefcaseBusiness, CheckCircle2, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  calculateNights,
  formatCurrency,
  formatReviewCount,
  toSearchParams,
} from './booking-utils';
import type { Hotel, SearchValues } from './types';

interface HotelCardProps {
  hotel: Hotel;
  searchValues: SearchValues;
}

export function HotelCard({ hotel, searchValues }: HotelCardProps) {
  const nights = calculateNights(searchValues.checkIn, searchValues.checkOut);
  const total = hotel.nightlyRate * nights;
  const query = toSearchParams(searchValues).toString();

  return (
    <article className="hotelResult">
      <Link className="hotelImageLink" to={`/hotel/${hotel.id}?${query}`}>
        <img src={hotel.imageUrl} alt={`${hotel.name} property view`} loading="lazy" />
        <span>{hotel.badge}</span>
      </Link>
      <div className="hotelResultBody">
        <div className="hotelResultTopline">
          <span>
            <MapPin size={15} aria-hidden="true" />
            {hotel.neighborhood}
          </span>
          <span>
            <Star size={15} aria-hidden="true" />
            {hotel.rating.toFixed(1)}
          </span>
        </div>
        <div className="hotelResultHeader">
          <div>
            <h2>{hotel.name}</h2>
            <p>{hotel.description}</p>
          </div>
          <div className="reviewBox" aria-label={`${hotel.reviewScore} review score`}>
            <strong>{hotel.reviewScore.toFixed(1)}</strong>
            <span>{formatReviewCount(hotel.reviewCount)} reviews</span>
          </div>
        </div>
        <div className="amenityRow">
          {hotel.amenities.slice(0, 4).map((amenity) => (
            <span key={amenity}>{amenity}</span>
          ))}
        </div>
        <div className="hotelPerks">
          <span>
            <CheckCircle2 size={16} aria-hidden="true" />
            {hotel.cancellationPolicy}
          </span>
          <span>
            <BriefcaseBusiness size={16} aria-hidden="true" />
            {hotel.businessPerks[0]}
          </span>
        </div>
        <div className="hotelResultFooter">
          <div>
            <span className="nightlyPrice">
              {formatCurrency(hotel.nightlyRate, hotel.currency)}
            </span>
            <span className="priceDetail">per night</span>
            <span className="totalPrice">
              {formatCurrency(total, hotel.currency)} total for {nights} nights
            </span>
          </div>
          <div className="resultActions">
            <Link className="secondaryButton" to={`/hotel/${hotel.id}?${query}`}>
              View details
            </Link>
            <Link className="primaryButton" to={`/booking/${hotel.id}?${query}`}>
              Reserve
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
