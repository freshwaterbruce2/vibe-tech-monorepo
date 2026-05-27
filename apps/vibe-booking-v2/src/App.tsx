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
        <Route
          path="/terms"
          element={
            <LegalPage
              title="Terms of service"
              intro="This generated SaaS app includes starter legal copy so every factory app has real terms and privacy entry points on day one."
              sections={[
                {
                  heading: 'Use of the service',
                  body: 'Use the generated app for the workflow it is configured to support. Product-specific commitments still belong to the app owner.',
                },
                {
                  heading: 'Billing',
                  body: 'Paid access is expected to flow through the shared Stripe billing package and the plans configured for this product.',
                },
                {
                  heading: 'Acceptable use',
                  body: 'Do not upload or submit content you are not allowed to process. Replace this section with product-specific rules before shipping.',
                },
              ]}
            />
          }
        />
        <Route
          path="/privacy"
          element={
            <LegalPage
              title="Privacy policy"
              intro="This generated SaaS app includes starter privacy copy so every factory app has legal-friendly structure on day one."
              sections={[
                {
                  heading: 'Data collection',
                  body: 'The generated app may store account, billing, and workflow data required to deliver the product. Replace this with the actual data inventory before production.',
                },
                {
                  heading: 'Payments',
                  body: 'Payments should be delegated to Stripe through the shared billing package. Raw card data should not be stored by the app.',
                },
                {
                  heading: 'Analytics',
                  body: 'Analytics are scaffolded through the shared analytics package and should stay limited to the events needed to operate the product.',
                },
              ]}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
}) {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '48px 24px',
        background: '#08111f',
        color: '#f5f7fb',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '880px',
          margin: '0 auto',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '8px',
          background: 'rgba(15, 23, 42, 0.82)',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            marginBottom: '16px',
            padding: '6px 12px',
            borderRadius: '999px',
            background: 'rgba(14, 165, 233, 0.16)',
            color: '#67e8f9',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Factory legal stub
        </div>
        <h1 style={{ margin: '0 0 16px', fontSize: '40px', lineHeight: 1.1 }}>{title}</h1>
        <p style={{ margin: '0 0 24px', color: '#b7c3d6', lineHeight: 1.7 }}>{intro}</p>
        <div style={{ display: 'grid', gap: '20px' }}>
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 style={{ margin: '0 0 8px', fontSize: '22px' }}>{section.heading}</h2>
              <p style={{ margin: 0, color: '#dbe4f2', lineHeight: 1.7 }}>{section.body}</p>
            </section>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
          <a href="/" style={{ color: '#67e8f9' }}>
            Back to app
          </a>
          <a href="/terms" style={{ color: '#67e8f9' }}>
            Terms
          </a>
          <a href="/privacy" style={{ color: '#67e8f9' }}>
            Privacy
          </a>
        </div>
      </div>
    </main>
  );
}

export default App;
