import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  nightlyRate: number;
  currency: string;
  rating: number;
}

interface Booking {
  id: string;
  hotelId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  createdAt: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'booking_next_token';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function apiFetch<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (auth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <header className="header">
        <Link to="/" className="brand">
          Business Booking Next
        </Link>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/search">Search</Link>
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('Miami');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = new URLSearchParams({
      destination,
      checkIn,
      checkOut,
      guests: String(guests),
    });
    void navigate(`/search?${query.toString()}`);
  };

  return (
    <Shell>
      <section className="card">
        <h1>Clean-break booking MVP</h1>
        <p>Search business-friendly hotels, create bookings, and complete payment.</p>
        <form className="gridForm" onSubmit={onSubmit}>
          <label>
            Destination
            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              required
            />
          </label>
          <label>
            Check-in
            <input
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              required
            />
          </label>
          <label>
            Check-out
            <input
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              required
            />
          </label>
          <label>
            Guests
            <input
              type="number"
              min={1}
              max={8}
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              required
            />
          </label>
          <button type="submit">Search hotels</button>
        </form>
      </section>
    </Shell>
  );
}

function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const payload = useMemo(
    () => ({
      destination: params.get('destination') ?? '',
      checkIn: params.get('checkIn') ?? '',
      checkOut: params.get('checkOut') ?? '',
      guests: Number(params.get('guests') ?? '1'),
    }),
    [params]
  );

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await apiFetch<{ hotels: Hotel[] }>('/hotels/search', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setHotels(result.hotels);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch hotels');
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [payload]);

  return (
    <Shell>
      <section className="card">
        <h1>Search results</h1>
        <p>
          Destination: <strong>{payload.destination || 'Any'}</strong>
        </p>
        {isLoading && <p>Loading hotels...</p>}
        {error && <p className="error">{error}</p>}
        {!isLoading && !error && hotels.length === 0 && <p>No hotels found.</p>}
        <div className="stack">
          {hotels.map((hotel) => (
            <article key={hotel.id} className="hotelCard">
              <h2>{hotel.name}</h2>
              <p>
                {hotel.city}, {hotel.country} · {hotel.rating.toFixed(1)} stars
              </p>
              <p>{hotel.description}</p>
              <p className="price">
                {hotel.currency} {hotel.nightlyRate.toFixed(2)} / night
              </p>
              <div className="actions">
                <button type="button" onClick={() => void navigate(`/hotel/${hotel.id}`)}>
                  View details
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}

function HotelPage() {
  const { hotelId = '' } = useParams();
  const navigate = useNavigate();
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

  return (
    <Shell>
      <section className="card">
        {error && <p className="error">{error}</p>}
        {!hotel && !error && <p>Loading hotel...</p>}
        {hotel && (
          <>
            <h1>{hotel.name}</h1>
            <p>
              {hotel.city}, {hotel.country}
            </p>
            <p>{hotel.description}</p>
            <p className="price">
              {hotel.currency} {hotel.nightlyRate.toFixed(2)} / night
            </p>
            <button type="button" onClick={() => void navigate(`/booking/${hotel.id}`)}>
              Book this hotel
            </button>
          </>
        )}
      </section>
    </Shell>
  );
}

function BookingPage() {
  const { hotelId = '' } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('Demo');
  const [lastName, setLastName] = useState('User');
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

  const ensureAuth = async () => {
    if (getToken()) return;
    const path = authMode === 'register' ? '/auth/register' : '/auth/login';
    const payload =
      authMode === 'register'
        ? { email, password, firstName, lastName }
        : { email, password };
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
    setIsSubmitting(true);
    try {
      await ensureAuth();
      const result = await apiFetch<{ booking: Booking }>(
        '/bookings',
        {
          method: 'POST',
          body: JSON.stringify({
            hotelId: hotel.id,
            checkIn,
            checkOut,
            guests,
          }),
        },
        true
      );
      void navigate(`/payment/${result.booking.id}`);
    } catch (err) {
      if ((err as Error).message.includes('401')) {
        clearToken();
      }
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hotelId) return <Navigate to="/" replace />;

  return (
    <Shell>
      <section className="card">
        <h1>Booking details</h1>
        {hotel && <p>Hotel: {hotel.name}</p>}
        {error && <p className="error">{error}</p>}
        <form
          className="gridForm"
          onSubmit={(event) => {
            void submitBooking(event);
          }}
        >
          <label>
            Check-in
            <input
              type="date"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
              required
            />
          </label>
          <label>
            Check-out
            <input
              type="date"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
              required
            />
          </label>
          <label>
            Guests
            <input
              type="number"
              min={1}
              max={8}
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              required
            />
          </label>
          <label>
            Auth mode
            <select value={authMode} onChange={(event) => setAuthMode(event.target.value as 'login' | 'register')}>
              <option value="login">Login</option>
              <option value="register">Register</option>
            </select>
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
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
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
              </label>
              <label>
                Last name
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
              </label>
            </>
          )}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating booking...' : 'Continue to payment'}
          </button>
        </form>
      </section>
    </Shell>
  );
}

function PaymentPage() {
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
        true
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
    <Shell>
      <section className="card">
        <h1>Payment</h1>
        {error && <p className="error">{error}</p>}
        {!booking && !error && <p>Loading booking...</p>}
        {booking && (
          <>
            <p>
              Booking #{booking.id} · {booking.currency} {booking.totalPrice.toFixed(2)}
            </p>
            <button
              disabled={isPaying}
              type="button"
              onClick={() => {
                void payNow();
              }}
            >
              {isPaying ? 'Processing payment...' : 'Pay now'}
            </button>
          </>
        )}
      </section>
    </Shell>
  );
}

function ConfirmationPage() {
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
    <Shell>
      <section className="card">
        <h1>Booking confirmed</h1>
        {error && <p className="error">{error}</p>}
        {!booking && !error && <p>Loading confirmation...</p>}
        {booking && (
          <>
            <p>Booking ID: {booking.id}</p>
            <p>Status: {booking.status}</p>
            <p>Payment: {booking.paymentStatus}</p>
            <Link to="/">Start another search</Link>
          </>
        )}
      </section>
    </Shell>
  );
}

function LogoutButton() {
  const location = useLocation();
  const hasToken = Boolean(getToken());
  if (!hasToken) return null;
  return (
    <button
      type="button"
      onClick={() => {
        clearToken();
        if (location.pathname.startsWith('/booking') || location.pathname.startsWith('/payment')) {
          window.location.href = '/';
        }
      }}
    >
      Sign out
    </button>
  );
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/hotel/:hotelId" element={<HotelPage />} />
        <Route path="/booking/:hotelId" element={<BookingPage />} />
        <Route path="/payment/:bookingId" element={<PaymentPage />} />
        <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="floatingLogout">
        <LogoutButton />
      </div>
    </>
  );
}

export default App;
