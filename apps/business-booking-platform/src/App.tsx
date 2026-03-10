import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { setupGlobalErrorHandling } from '@/hooks/useErrorHandling';
// Lazy-loaded route components for optimal bundle splitting
import {
	LazyBookingConfirmationPage,
	LazyBookingHistoryPage,
	LazyBookingPage,
	LazyDealsPage,
	LazyDestinationsPage,
	LazyExperiencesPage,
	LazyHomePage,
	LazyHotelDetailsPage,
	LazyPaymentPage,
	LazyRewardsPage,
	LazySearchResultsPage,
	LazyUserProfilePage,
} from '@/routes/LazyRoutes';
import { preloadCriticalComponents } from '@/utils/lazyLoader';

function App() {
	useEffect(() => {
		// Setup global error handling
		setupGlobalErrorHandling();

		// Preload critical components after initial render
		const timer = setTimeout(() => {
			preloadCriticalComponents();
		}, 2000);

		return () => clearTimeout(timer);
	}, []);

	return (
		<ErrorBoundary>
			<AuthProvider>
				<Layout>
					<Routes>
						<Route path="/" element={<LazyHomePage />} />
						<Route path="/search" element={<LazySearchResultsPage />} />
						<Route path="/destinations" element={<LazyDestinationsPage />} />
						<Route path="/deals" element={<LazyDealsPage />} />
						<Route path="/experiences" element={<LazyExperiencesPage />} />
						<Route path="/rewards" element={<LazyRewardsPage />} />
						<Route path="/hotel/:id" element={<LazyHotelDetailsPage />} />
						<Route path="/booking" element={<LazyBookingPage />} />
						<Route path="/payment" element={<LazyPaymentPage />} />
						<Route
							path="/confirmation/:bookingId"
							element={<LazyBookingConfirmationPage />}
						/>
						<Route path="/my-bookings" element={<LazyBookingHistoryPage />} />
						<Route path="/profile" element={<LazyUserProfilePage />} />
					</Routes>
				</Layout>
				<Toaster
					position="top-right"
					expand={true}
					richColors={true}
					toastOptions={{
						duration: 4000,
						style: {
							background: 'hsl(var(--background))',
							color: 'hsl(var(--foreground))',
							border: '1px solid hsl(var(--border))',
						},
					}}
				/>
			</AuthProvider>
		</ErrorBoundary>
	);
}

export default App;
