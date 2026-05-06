import { CreditCard, LockKeyhole, ReceiptText, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiFetch, clearToken, getToken, setToken } from './api';
import { calculateNights, formatCurrency, parseSearchValues } from './booking-utils';
import { AppShell } from './layout';
import type { AuthResponse, Booking, Hotel } from './types';

export function BookingPage() {
  const { hotelId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const searchValues = useMemo(() => parseSearchValues(params), [params]);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('Demo');
  const [lastName, setLastName] = useState('Traveler');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
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

  const ensureAuth = async () => {
    if (getToken()) return;
    const path = authMode === 'register' ? '/auth/register' : '/auth/login';
    const payload =
      authMode === 'register' ? { email, password, firstName, lastName } : { email, password };
    const auth = await apiFetch<AuthResponse>(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(auth.token);
  };

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!hotel) return;

    setError('');
    if (searchValues.checkIn >= searchValues.checkOut) {
      setError('Check-out date must be after check-in.');
      return;
    }

    setIsSubmitting(true);
    try {
      await ensureAuth();
      const result = await apiFetch<{ booking: Booking }>(
        '/bookings',
        {
          method: 'POST',
          body: JSON.stringify({
            hotelId: hotel.id,
            checkIn: searchValues.checkIn,
            checkOut: searchValues.checkOut,
            guests: searchValues.guests,
          }),
        },
        true,
      );
      void navigate(`/payment/${result.booking.id}`);
    } catch (err) {
      if ((err as Error).message.includes('401')) clearToken();
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main className="checkoutPage">
        <section className="checkoutHeader">
          <div>
            <h1>Review and reserve</h1>
            <p>Confirm the stay details before moving to secure payment.</p>
          </div>
          <div className="secureNote">
            <LockKeyhole size={18} aria-hidden="true" />
            Protected checkout
          </div>
        </section>

        <section className="checkoutLayout">
          <form
            className="checkoutForm"
            onSubmit={(event) => {
              void submitBooking(event);
            }}
          >
            {error && <p className="error">{error}</p>}
            <div className="formSection">
              <h2>Traveler account</h2>
              {getToken() ? (
                <p className="statusText">You are signed in for this booking.</p>
              ) : (
                <div className="authGrid">
                  <label>
                    Auth mode
                    <select
                      value={authMode}
                      onChange={(event) => setAuthMode(event.target.value as 'login' | 'register')}
                    >
                      <option value="register">Create account</option>
                      <option value="login">Sign in</option>
                    </select>
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </label>
                  {authMode === 'register' && (
                    <>
                      <label>
                        First name
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          required
                        />
                      </label>
                      <label>
                        Last name
                        <input
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          required
                        />
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="formSection">
              <h2>Trip details</h2>
              <div className="summaryRows">
                <span>{searchValues.checkIn}</span>
                <span>{searchValues.checkOut}</span>
                <span>{searchValues.guests} guests</span>
              </div>
            </div>

            <button
              className="primaryButton wideButton"
              disabled={isSubmitting || !hotel}
              type="submit"
            >
              {isSubmitting ? 'Creating booking...' : 'Continue to payment'}
            </button>
          </form>

          {hotel && <StaySummary hotel={hotel} nights={nights} />}
        </section>
      </main>
    </AppShell>
  );
}

export function PaymentPage() {
  const { bookingId = '' } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await apiFetch<{ booking: Booking }>(`/bookings/${bookingId}`, {}, true);
        setBooking(result.booking);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load booking');
      }
    };
    if (bookingId) void run();
  }, [bookingId]);

  const payNow = async () => {
    if (!booking) return;
    setIsPaying(true);
    setError('');
    try {
      await apiFetch(
        '/payments/create',
        {
          method: 'POST',
          body: JSON.stringify({
            bookingId: booking.id,
            amount: booking.totalPrice,
            currency: booking.currency,
          }),
        },
        true,
      );
      void navigate(`/confirmation/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  if (!bookingId) return <Navigate to="/" replace />;

  return (
    <AppShell>
      <main className="checkoutPage">
        <section className="checkoutHeader">
          <div>
            <h1>Secure payment</h1>
            <p>Review the total and confirm the booking.</p>
          </div>
          <div className="secureNote">
            <ShieldCheck size={18} aria-hidden="true" />
            Payment protected
          </div>
        </section>
        <section className="paymentPanel">
          {error && <p className="error">{error}</p>}
          {!booking && !error && <p className="statusText">Loading booking...</p>}
          {booking && (
            <>
              <div>
                <ReceiptText size={24} aria-hidden="true" />
                <h2>Booking #{booking.id.slice(0, 8)}</h2>
                <p>{formatCurrency(booking.totalPrice, booking.currency)} total due today.</p>
              </div>
              <button
                className="primaryButton wideButton"
                disabled={isPaying}
                type="button"
                onClick={() => {
                  void payNow();
                }}
              >
                <CreditCard size={18} aria-hidden="true" />
                {isPaying ? 'Processing payment...' : 'Pay now'}
              </button>
            </>
          )}
        </section>
      </main>
    </AppShell>
  );
}

export function ConfirmationPage() {
  const { bookingId = '' } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const result = await apiFetch<{ booking: Booking }>(`/bookings/${bookingId}`, {}, true);
        setBooking(result.booking);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load confirmation');
      }
    };
    if (bookingId) void run();
  }, [bookingId]);

  return (
    <AppShell>
      <main className="confirmationPage">
        <section>
          <ShieldCheck size={34} aria-hidden="true" />
          <h1>Booking confirmed</h1>
          {error && <p className="error">{error}</p>}
          {!booking && !error && <p className="statusText">Loading confirmation...</p>}
          {booking && (
            <>
              <p>Booking #{booking.id}</p>
              <div className="summaryRows">
                <span>Status: {booking.status}</span>
                <span>Payment: {booking.paymentStatus}</span>
                <span>{formatCurrency(booking.totalPrice, booking.currency)}</span>
              </div>
              <Link className="primaryButton" to="/">
                Start another search
              </Link>
            </>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function StaySummary({ hotel, nights }: { hotel: Hotel; nights: number }) {
  return (
    <aside className="staySummary">
      <img src={hotel.imageUrl} alt={`${hotel.name} preview`} />
      <div>
        <h2>{hotel.name}</h2>
        <p>{hotel.neighborhood}</p>
      </div>
      <dl>
        <div>
          <dt>Nightly</dt>
          <dd>{formatCurrency(hotel.nightlyRate, hotel.currency)}</dd>
        </div>
        <div>
          <dt>Stay length</dt>
          <dd>{nights} nights</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatCurrency(hotel.nightlyRate * nights, hotel.currency)}</dd>
        </div>
      </dl>
      <p>{hotel.cancellationPolicy}</p>
    </aside>
  );
}
