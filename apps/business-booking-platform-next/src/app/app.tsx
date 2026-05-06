import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BookingPage, ConfirmationPage, PaymentPage } from './booking-flow';
import { ErrorBoundary } from './error-boundary';
import { HomePage } from './home-page';
import { HotelPage } from './hotel-page';
import { SearchPage } from './search-page';

export function App() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  return (
    <ErrorBoundary resetKey={routeKey}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/hotel/:hotelId" element={<HotelPage />} />
        <Route path="/booking/:hotelId" element={<BookingPage />} />
        <Route path="/payment/:bookingId" element={<PaymentPage />} />
        <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
