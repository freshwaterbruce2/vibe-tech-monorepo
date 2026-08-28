import { BriefcaseBusiness, CheckCircle2, MapPin, Star, Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch, getToken } from './api';
import {
  calculateNights,
  formatCurrency,
  formatReviewCount,
  parseSearchValues,
  toSearchParams,
} from './booking-utils';
import { AppShell } from './layout';
import type { Hotel, Review } from './types';

export function HotelPage() {
  const { hotelId = '' } = useParams();
  const [params] = useSearchParams();
  const searchValues = useMemo(() => parseSearchValues(params), [params]);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewFormError, setReviewFormError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const run = async () => {
      setError('');
      try {
        const result = await apiFetch<{ hotel: Hotel }>(`/hotels/${hotelId}`);
        setHotel(result.hotel);
        const reviewsRes = await apiFetch<{ reviews: Review[] }>(`/hotels/${hotelId}/reviews`);
        setReviews(reviewsRes.reviews);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hotel');
      }
    };
    if (hotelId) void run();
  }, [hotelId]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewFormError('');
    setIsSubmittingReview(true);
    try {
      const result = await apiFetch<{ ok: boolean; reviews: Review[] }>(
        `/hotels/${hotelId}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify({ rating: newRating, comment: newComment }),
        },
        true,
      );
      setReviews(result.reviews);
      setNewComment('');
      setNewRating(5);
    } catch (err) {
      setReviewFormError(err instanceof Error ? err.message : 'Failed to post review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span>{hotel.badge}</span>
                    {hotel.policyCompliance && (
                      hotel.policyCompliance.isWithinPolicy ? (
                        <span style={{
                          backgroundColor: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}>
                          ✓ Within Corporate Policy
                        </span>
                      ) : (
                        <span 
                          title={hotel.policyCompliance.policyReason}
                          style={{
                            backgroundColor: 'rgba(234, 179, 8, 0.15)',
                            color: '#facc15',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            cursor: 'help'
                          }}
                        >
                          ⚠ Requires Manager Approval
                        </span>
                      )
                    )}
                  </div>
                  <h2>Why this stay works</h2>
                  <p>{hotel.description}</p>
                  {hotel.policyCompliance && !hotel.policyCompliance.isWithinPolicy && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      color: '#f87171',
                      fontSize: '13px'
                    }}>
                      <strong>Policy Advisory:</strong> This room rate exceeds the company nightly travel budget limit ($250). Managers will receive a sign-off request upon reservation submission.
                    </div>
                  )}
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

            <section className="reviewsSection">
              <div className="reviewsHeader">
                <div>
                  <h2>Guest reviews</h2>
                  <p className="subtitle">Real stays. Verified reviews from Vibe guests.</p>
                </div>
                <div className="reviewsStats">
                  <div className="overallScore">
                    <strong>{(reviews.length > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length) : hotel.reviewScore).toFixed(1)}</strong>
                    <span>out of 5</span>
                  </div>
                  <div className="reviewVolume">
                    <span>{reviews.length || hotel.reviewCount} verified ratings</span>
                  </div>
                </div>
              </div>

              {/* Add Review Form */}
              {getToken() ? (
                <form className="addReviewForm" onSubmit={(e) => { void submitReview(e); }}>
                  <h3>Share your experience</h3>
                  {reviewFormError && <p className="error">{reviewFormError}</p>}
                  <div className="ratingSelection">
                    <label>
                      Rating
                      <select value={newRating} onChange={(e) => setNewRating(Number(e.target.value))}>
                        <option value="5">5 Stars (Excellent)</option>
                        <option value="4">4 Stars (Very Good)</option>
                        <option value="3">3 Stars (Good)</option>
                        <option value="2">2 Stars (Fair)</option>
                        <option value="1">1 Star (Poor)</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Comment
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write your review here..."
                      rows={4}
                      required
                    />
                  </label>
                  <button type="submit" disabled={isSubmittingReview} className="secondaryButton">
                    {isSubmittingReview ? 'Submitting...' : 'Post review'}
                  </button>
                </form>
              ) : (
                <p className="loginPromptText">
                  You must be <Link to={`/booking/${hotel.id}?${query}`}>signed in</Link> to write a review.
                </p>
              )}

              {/* Reviews List */}
              <div className="reviewsList">
                {reviews.length === 0 ? (
                  <p className="statusText">No reviews yet. Be the first to leave one!</p>
                ) : (
                  reviews.map((rev) => (
                    <article key={rev.id} className="reviewItem">
                      <header>
                        <div className="reviewAuthor">
                          <strong>{rev.userName}</strong>
                          <span className="reviewDate">{new Date(rev.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="reviewItemRating">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} size={14} className="starFilled" fill="currentColor" />
                          ))}
                          {Array.from({ length: 5 - rev.rating }).map((_, i) => (
                            <Star key={i} size={14} className="starEmpty" />
                          ))}
                        </div>
                      </header>
                      <p className="commentText">{rev.comment}</p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}
