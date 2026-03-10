// Unified Design System for Vibe Hotels
// Based on industry best practices from Booking.com, Expedia, Hotels.com

export const theme = {
	// Brand Colors - Professional travel industry standard
	colors: {
		// Primary - Trust-building blue (like Booking.com, Expedia)
		primary: {
			50: '#EBF8FF',
			100: '#BEE3F8',
			200: '#90CDF4',
			300: '#63B3ED',
			400: '#4299E1',
			500: '#3182CE', // Main brand color
			600: '#2B6CB0',
			700: '#2C5282',
			800: '#2A4E7C',
			900: '#1A365D',
		},
		// Accent - Urgency orange (like Kayak's CTAs)
		accent: {
			500: '#FF6B35', // Booking urgency
			600: '#E85D2D',
		},
		// Success - Confirmation green
		success: {
			50: '#F0FDF4',
			500: '#10B981',
			600: '#059669',
		},
		// Warning - Deal highlights
		warning: {
			50: '#FFFBEB',
			500: '#F59E0B',
			600: '#D97706',
		},
		// Danger - Error states
		danger: {
			50: '#FEF2F2',
			500: '#EF4444',
			600: '#DC2626',
		},
	},

	// Typography - Clean and readable
	fonts: {
		heading: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
		body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
	},

	// Spacing - Consistent 8px grid
	spacing: {
		xs: '0.5rem', // 8px
		sm: '1rem', // 16px
		md: '1.5rem', // 24px
		lg: '2rem', // 32px
		xl: '3rem', // 48px
		xxl: '4rem', // 64px
	},

	// Border Radius - Modern, not too rounded
	radius: {
		sm: '0.25rem', // 4px
		md: '0.5rem', // 8px
		lg: '0.75rem', // 12px
		xl: '1rem', // 16px
		full: '9999px',
	},

	// Shadows - Subtle depth
	shadows: {
		sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
		md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
		lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
		xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
	},

	// Z-index layers
	zIndex: {
		dropdown: 1000,
		sticky: 1020,
		fixed: 1030,
		modalBackdrop: 1040,
		modal: 1050,
		popover: 1060,
		tooltip: 1070,
	},
};

// Urgency and Social Proof Messages (like Booking.com)
export const urgencyMessages = [
	'In high demand - only {count} rooms left!',
	'{count} other people are looking at this hotel',
	'Booked {count} times in the last 24 hours',
	'Last booked {time} ago',
	'Great value today!',
	'Limited time offer',
];

// Trust Badges
export const trustBadges = [
	'Free Cancellation',
	'No Booking Fees',
	'Best Price Guarantee',
	'Instant Confirmation',
	'Secure Payment',
	'24/7 Customer Support',
];

// Deal Types (like Hotels.com rewards)
export const dealTypes = {
	lastMinute: {
		label: 'Last Minute Deal',
		color: 'danger',
		discount: '30%',
	},
	earlyBird: {
		label: 'Early Bird Special',
		color: 'success',
		discount: '20%',
	},
	memberOnly: {
		label: 'Member Exclusive',
		color: 'primary',
		discount: '15%',
	},
	seasonal: {
		label: 'Seasonal Offer',
		color: 'warning',
		discount: '25%',
	},
};
