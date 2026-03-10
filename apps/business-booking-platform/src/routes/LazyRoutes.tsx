/**
 * Lazy-loaded Route Components
 * Code splitting for optimal bundle performance
 */

import { createLazyRoute } from '../utils/lazyLoader';

// Lazy load pages for code splitting
export const LazyHomePage = createLazyRoute(
	() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })),
	'Home',
);

export const LazySearchResultsPage = createLazyRoute(
	() =>
		import('../pages/SearchResultsPage').then((m) => ({
			default: m.SearchResultsPage,
		})),
	'Search Results',
);

export const LazyPaymentPage = createLazyRoute(
	() =>
		import('../pages/PaymentPage').then((m) => ({ default: m.PaymentPage })),
	'Payment',
);

export const LazyBookingConfirmationPage = createLazyRoute(
	() =>
		import('../pages/BookingConfirmationPage').then((m) => ({
			default: m.BookingConfirmationPage,
		})),
	'Booking Confirmation',
);

export const LazyDealsPage = createLazyRoute(
	() => import('../pages/DealsPage').then((m) => ({ default: m.DealsPage })),
	'Hot Deals',
);

export const LazyDestinationsPage = createLazyRoute(
	() =>
		import('../pages/DestinationsPage').then((m) => ({
			default: m.DestinationsPage,
		})),
	'Destinations',
);

export const LazyExperiencesPage = createLazyRoute(
	() =>
		import('../pages/ExperiencesPage').then((m) => ({ default: m.default })),
	'Experiences',
);

export const LazyRewardsPage = createLazyRoute(
	() => import('../pages/RewardsPage').then((m) => ({ default: m.default })),
	'Rewards',
);

export const LazyBookingHistoryPage = createLazyRoute(
	() => import('../pages/BookingHistoryPage'),
	'My Bookings',
);

export const LazyUserProfilePage = createLazyRoute(
	() => import('../pages/UserProfilePage'),
	'My Profile',
);

export const LazyHotelDetailsPage = createLazyRoute(
	() =>
		import('../pages/HotelDetailsPage').then((m) => ({
			default: m.HotelDetailsPage,
		})),
	'Hotel Details',
);

export const LazyBookingPage = createLazyRoute(
	() =>
		import('../pages/BookingPage').then((m) => ({ default: m.BookingPage })),
	'Booking',
);

// Lazy load heavy components
export const LazyRoomComparison = createLazyRoute(
	() => import('../components/hotels/RoomComparison'),
	'Room Comparison',
);

export const LazyVirtualizedHotelList = createLazyRoute(
	() => import('../components/search/VirtualizedHotelList'),
	'Hotel List',
);
