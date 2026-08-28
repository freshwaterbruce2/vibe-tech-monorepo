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
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercentage: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  
  const [bookingType, setBookingType] = useState<'individual' | 'team'>('individual');
  const [teamName, setTeamName] = useState('');
  const [billingMethod, setBillingMethod] = useState<'personal' | 'corporate_invoice' | 'bleisure_split'>('personal');
  const [businessNights, setBusinessNights] = useState(1);

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!promoCodeInput.trim()) return;
    try {
      const res = await apiFetch<{ promo: { code: string; discountPercentage: number } }>(
        '/bookings/validate-promo',
        {
          method: 'POST',
          body: JSON.stringify({ code: promoCodeInput }),
        }
      );
      setAppliedPromo(res.promo);
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Invalid promo code');
      setAppliedPromo(null);
    }
  };

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
            promoCode: appliedPromo?.code || undefined,
            bookingType,
            teamName: bookingType === 'team' ? teamName : undefined,
            billingMethod,
            businessNights: billingMethod === 'bleisure_split' ? businessNights : undefined,
            leisureNights: billingMethod === 'bleisure_split' ? Math.max(0, nights - businessNights) : undefined,
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

            <div className="formSection">
              <h2>Corporate booking options</h2>
              <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  Booking Type
                  <select
                    value={bookingType}
                    onChange={(event) => setBookingType(event.target.value as 'individual' | 'team')}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#1c1c1e', color: '#fff' }}
                  >
                    <option value="individual">Individual Stay (Me)</option>
                    <option value="team">Team / Group Stay</option>
                  </select>
                </label>
                
                {bookingType === 'team' && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    Company Team Name
                    <input
                      type="text"
                      value={teamName}
                      onChange={(event) => setTeamName(event.target.value)}
                      placeholder="e.g. Sales Team, Engineering"
                      required
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#1c1c1e', color: '#fff' }}
                    />
                  </label>
                )}

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  Billing & Invoice Method
                  <select
                    value={billingMethod}
                    onChange={(event) => {
                      const method = event.target.value as 'personal' | 'corporate_invoice' | 'bleisure_split';
                      setBillingMethod(method);
                      if (method === 'bleisure_split' && businessNights >= nights) {
                        setBusinessNights(Math.max(1, nights - 1));
                      }
                    }}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#1c1c1e', color: '#fff' }}
                  >
                    <option value="personal">Personal / Credit Card (Stripe Checkout)</option>
                    <option value="corporate_invoice">Corporate Invoice (Send to Company Central Billing)</option>
                    <option value="bleisure_split">Bleisure Split-Payment (Split Business & Leisure nights)</option>
                  </select>
                </label>

                {billingMethod === 'bleisure_split' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      Business Stay Portion (Nights Billed to Corporate Central Invoice)
                      <select
                        value={businessNights}
                        onChange={(event) => setBusinessNights(Number(event.target.value))}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#1c1c1e', color: '#fff' }}
                      >
                        {Array.from({ length: nights }, (_, i) => i + 1).map((val) => (
                          <option key={val} value={val}>{val} {val === 1 ? 'night' : 'nights'}</option>
                        ))}
                      </select>
                    </label>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9ca3af' }}>
                      <span>Leisure Stay Portion (Personal Card):</span>
                      <strong style={{ color: '#fff' }}>{Math.max(0, nights - businessNights)} {Math.max(0, nights - businessNights) === 1 ? 'night' : 'nights'}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="formSection promoSection">
              <h2>Promo / Coupon Code</h2>
              <div className="promoInputGrid">
                <input
                  type="text"
                  placeholder="Enter code (e.g. VIBE20)"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  className="promoInput"
                />
                <button type="button" onClick={() => { void handleApplyPromo(); }} className="secondaryButton">
                  Apply
                </button>
              </div>
              {promoError && <p className="promoError">{promoError}</p>}
              {appliedPromo && (
                <p className="promoSuccess">
                  Code {appliedPromo.code} applied! ({appliedPromo.discountPercentage}% discount)
                </p>
              )}
            </div>

            <button
              className="primaryButton wideButton"
              disabled={isSubmitting || !hotel}
              type="submit"
            >
              {isSubmitting ? 'Creating booking...' : 'Continue to payment'}
            </button>
          </form>

          {hotel && <StaySummary hotel={hotel} nights={nights} appliedPromo={appliedPromo} billingMethod={billingMethod} businessNights={billingMethod === 'bleisure_split' ? businessNights : undefined} />}
        </section>
      </main>
    </AppShell>
  );
}

export function PaymentPage() {
  const { bookingId = '' } = useParams();
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
      const result = await apiFetch<{ url: string }>(
        '/payments/create-checkout-session',
        {
          method: 'POST',
          body: JSON.stringify({
            bookingId: booking.id,
          }),
        },
        true,
      );
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('Payment checkout session failed to initialize');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setIsPaying(false);
    }
  };

  if (!bookingId) return <Navigate to="/" replace />;
  const isInvoiceBooking = booking?.billingMethod === 'corporate_invoice';
  const isBleisureSplit = booking?.billingMethod === 'bleisure_split';

  // Calculate pricing split
  const totalNights = booking ? calculateNights(booking.checkIn, booking.checkOut) : 0;
  const businessNights = booking?.businessNights ?? 0;
  const leisureNights = booking?.leisureNights ?? 0;
  const totalPrice = booking?.totalPrice ?? 0;
  const currency = booking?.currency ?? 'USD';

  const leisurePrice = totalNights > 0 ? (leisureNights / totalNights) * totalPrice : 0;
  const corporatePrice = totalPrice - leisurePrice;

  return (
    <AppShell>
      <main className="checkoutPage">
        <section className="checkoutHeader">
          <div>
            <h1>Secure payment</h1>
            <p>
              {isInvoiceBooking 
                ? 'Confirm corporate invoicing and reserve.' 
                : isBleisureSplit 
                  ? 'Confirm corporate invoice and pay personal leisure portion.' 
                  : 'Review the total and confirm the booking.'}
            </p>
          </div>
          <div className="secureNote">
            <ShieldCheck size={18} aria-hidden="true" />
            {isInvoiceBooking ? 'Central billing validation' : 'Payment protected'}
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
                
                {isBleisureSplit ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: '#9ca3af' }}>Business Invoice ({businessNights} nights):</span>
                      <strong style={{ color: '#60a5fa' }}>{formatCurrency(corporatePrice, currency)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: '#9ca3af' }}>Personal Card ({leisureNights} nights):</span>
                      <strong style={{ color: '#10b981' }}>{formatCurrency(leisurePrice, currency)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', fontWeight: 'bold' }}>
                      <span>Total Price:</span>
                      <span>{formatCurrency(totalPrice, currency)}</span>
                    </div>
                  </div>
                ) : (
                  <p>
                    {formatCurrency(booking.totalPrice, booking.currency)} 
                    {isInvoiceBooking ? ' will be billed directly to your company account.' : ' total due today.'}
                  </p>
                )}
                
                {booking.teamName && (
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                    Group Booking for: <strong>{booking.teamName}</strong>
                  </p>
                )}
              </div>
              <button
                className="primaryButton wideButton"
                disabled={isPaying}
                type="button"
                onClick={() => {
                  void payNow();
                }}
              >
                {isInvoiceBooking ? (
                  <>
                    <ReceiptText size={18} aria-hidden="true" />
                    {isPaying ? 'Processing invoice...' : 'Generate & Send Invoice'}
                  </>
                ) : isBleisureSplit ? (
                  <>
                    <CreditCard size={18} aria-hidden="true" />
                    {isPaying ? 'Processing payment...' : `Pay Personal Portion (${formatCurrency(leisurePrice, currency)})`}
                  </>
                ) : (
                  <>
                    <CreditCard size={18} aria-hidden="true" />
                    {isPaying ? 'Processing payment...' : 'Pay now'}
                  </>
                )}
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
  const [params] = useSearchParams();

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

  const isInvoice = params.get('method') === 'invoice' || booking?.billingMethod === 'corporate_invoice';
  const isBleisureSplit = params.get('method') === 'bleisure_split' || booking?.billingMethod === 'bleisure_split';

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
                <span>Billing: {booking.billingMethod === 'corporate_invoice' ? 'Corporate Central Invoice' : booking.billingMethod === 'bleisure_split' ? 'Bleisure Split-Payment' : 'Credit Card'}</span>
                {booking.teamName && <span>Team: {booking.teamName}</span>}
                <span>{formatCurrency(booking.totalPrice, booking.currency)}</span>
              </div>
              {isInvoice && (
                <div style={{
                  margin: '20px 0',
                  padding: '16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  textAlign: 'left'
                }}>
                  <h3 style={{ color: '#60a5fa', marginBottom: '8px', fontSize: '15px' }}>📄 Corporate Invoice Generated</h3>
                  <p style={{ fontSize: '13px', margin: 0, color: '#9ca3af', marginBottom: '12px' }}>
                    An invoice has been sent directly to the central account for approval and payment. No personal card will be charged.
                  </p>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Downloading Invoice PDF Receipt... \n\nBooking Reference: ' + booking.id + '\nTotal Billed: ' + formatCurrency(booking.totalPrice, booking.currency) + (booking.teamName ? ('\nGroup: ' + booking.teamName) : ''));
                    }}
                    style={{
                      color: '#3b82f6',
                      textDecoration: 'underline',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Download Invoice PDF Receipt
                  </a>
                </div>
              )}
              {isBleisureSplit && (
                <div style={{
                  margin: '20px 0',
                  padding: '16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  textAlign: 'left'
                }}>
                  <h3 style={{ color: '#34d399', marginBottom: '8px', fontSize: '15px' }}>📄 Bleisure Split Checkout Completed</h3>
                  <p style={{ fontSize: '13px', margin: 0, color: '#9ca3af', marginBottom: '12px' }}>
                    Business stay portion has been invoiced directly to your central corporate account. Personal/leisure portion has been successfully billed to your card.
                  </p>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const bNights = booking.businessNights ?? 0;
                        const nights = calculateNights(booking.checkIn, booking.checkOut);
                        const corporatePrice = nights > 0 ? (bNights / nights) * booking.totalPrice : 0;
                        alert('Downloading Corporate Invoice PDF... \n\nBooking Reference: ' + booking.id + '\nCorporate Portion: ' + formatCurrency(corporatePrice, booking.currency) + ` (${bNights} business nights)`);
                      }}
                      style={{
                        color: '#60a5fa',
                        textDecoration: 'underline',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Download Corporate Invoice
                    </a>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const lNights = booking.leisureNights ?? 0;
                        const nights = calculateNights(booking.checkIn, booking.checkOut);
                        const leisurePrice = nights > 0 ? (lNights / nights) * booking.totalPrice : 0;
                        alert('Downloading Leisure Receipt PDF... \n\nBooking Reference: ' + booking.id + '\nPersonal Charge: ' + formatCurrency(leisurePrice, booking.currency) + ` (${lNights} leisure nights)`);
                      }}
                      style={{
                        color: '#34d399',
                        textDecoration: 'underline',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Download Card Receipt
                    </a>
                  </div>
                </div>
              )}
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

function StaySummary({
  hotel,
  nights,
  appliedPromo,
  billingMethod,
  businessNights,
}: {
  hotel: Hotel;
  nights: number;
  appliedPromo?: { code: string; discountPercentage: number } | null;
  billingMethod?: 'personal' | 'corporate_invoice' | 'bleisure_split';
  businessNights?: number;
}) {
  const baseTotal = hotel.nightlyRate * nights;
  const finalTotal = appliedPromo ? baseTotal * (1 - appliedPromo.discountPercentage / 100) : baseTotal;

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
        {appliedPromo && (
          <div className="discountRow">
            <dt>Promo Discount ({appliedPromo.code})</dt>
            <dd>- {appliedPromo.discountPercentage}%</dd>
          </div>
        )}
        <div>
          <dt>Total</dt>
          <dd className={appliedPromo ? 'discountedPrice' : ''}>
            {appliedPromo && (
              <span className="originalTotal">{formatCurrency(baseTotal, hotel.currency)}</span>
            )}
            {formatCurrency(finalTotal, hotel.currency)}
          </dd>
        </div>
        {billingMethod === 'bleisure_split' && businessNights && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px' }}>
              <dt style={{ color: '#60a5fa' }}>Corporate portion ({businessNights} nights)</dt>
              <dd style={{ color: '#60a5fa' }}>{formatCurrency((businessNights / nights) * finalTotal, hotel.currency)}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <dt style={{ color: '#10b981' }}>Leisure portion ({Math.max(0, nights - businessNights)} nights)</dt>
              <dd style={{ color: '#10b981' }}>{formatCurrency(((nights - businessNights) / nights) * finalTotal, hotel.currency)}</dd>
            </div>
          </>
        )}
      </dl>
      <p>{hotel.cancellationPolicy}</p>
    </aside>
  );
}
