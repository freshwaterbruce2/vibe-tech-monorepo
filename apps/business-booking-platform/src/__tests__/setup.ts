import "@testing-library/jest-dom";
import "jest-axe/extend-expect";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, vi } from "vitest";

// Auto cleanup after each test
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.resetAllMocks();
});

// Reset all modules between tests
beforeEach(() => {
	vi.resetModules();
});
// Mock intersection observer
(globalThis as any).IntersectionObserver = vi.fn(() => ({
	disconnect: vi.fn(),
	observe: vi.fn(),
	unobserve: vi.fn(),
}));
// Mock resize observer
(globalThis as any).ResizeObserver = vi.fn(() => ({
	disconnect: vi.fn(),
	observe: vi.fn(),
	unobserve: vi.fn(),
}));

// Mock match media
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock localStorage
Object.defineProperty(window, "localStorage", {
	value: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		length: 0,
		key: vi.fn(),
	},
	writable: true,
});

// Mock sessionStorage
Object.defineProperty(window, "sessionStorage", {
	value: {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		length: 0,
		key: vi.fn(),
	},
	writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock axios
vi.mock("axios", () => ({
	default: {
		create: vi.fn(() => ({
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
			get: vi.fn(),
			post: vi.fn(),
			put: vi.fn(),
			delete: vi.fn(),
		})),
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		interceptors: {
			request: { use: vi.fn() },
			response: { use: vi.fn() },
		},
	},
}));

// Mock React Router
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: vi.fn(() => vi.fn()),
		useLocation: vi.fn(() => ({
			pathname: "/",
			search: "",
			hash: "",
			state: null,
		})),
		useParams: vi.fn(() => ({})),
		useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
		BrowserRouter: ({ children }: any) => children,
		MemoryRouter: ({ children }: any) => children,
		Routes: ({ children }: any) => children,
		Route: ({ children }: any) => children,
		Link: ({ children, ...props }: any) =>
			React.createElement("a", props, children),
		NavLink: ({ children, ...props }: any) =>
			React.createElement("a", props, children),
	};
});

// Mock framer-motion
vi.mock("framer-motion", () => ({
	motion: {
		div: "div",
		section: "section",
		article: "article",
		button: "button",
		form: "form",
		input: "input",
		textarea: "textarea",
		select: "select",
		span: "span",
		p: "p",
		h1: "h1",
		h2: "h2",
		h3: "h3",
	},
	AnimatePresence: ({ children }: any) => children,
	useAnimation: () => ({
		start: vi.fn(),
		stop: vi.fn(),
		set: vi.fn(),
	}),
}));

// Mock react-intersection-observer
vi.mock("react-intersection-observer", () => ({
	useInView: () => ({ ref: vi.fn(), inView: true }),
}));

// Global test utilities
const mockSearchResults = [
	{
		id: "hotel-1",
		name: "Test Hotel 1",
		description: "A wonderful test hotel with great amenities",
		location: {
			address: "123 Test Street",
			city: "Test City",
			country: "TC",
			coordinates: { lat: 40.7128, lng: -74.006 },
			neighborhood: "Downtown",
		},
		rating: 4.5,
		reviewCount: 1250,
		priceRange: {
			min: 120,
			max: 180,
			avgNightly: 150,
			currency: "USD",
		},
		images: [
			{
				id: "img-1",
				url: "test-image-1.jpg",
				alt: "Test Hotel 1",
				category: "exterior" as const,
				isPrimary: true,
			},
		],
		amenities: [
			{ id: "wifi", name: "WiFi", category: "connectivity", icon: "📶" },
			{ id: "pool", name: "Pool", category: "recreation", icon: "🏊" },
			{ id: "gym", name: "Gym", category: "fitness", icon: "💪" },
		],
		availability: {
			available: true,
			lastChecked: "2024-12-01T10:00:00Z",
			lowAvailability: false,
			priceChange: undefined,
		},
		passionScore: {
			"luxury-indulgence": 0.8,
			"wellness-retreat": 0.0,
			"romantic-escape": 0.0,
			"adventure-seeker": 0.0,
			"cultural-explorer": 0.0,
			"budget-conscious": 0.0,
			"family-fun": 0.0,
			"business-traveler": 0.0,
			"eco-conscious": 0.0,
			"foodie-experience": 0.0,
		},
		sustainabilityScore: 0.75,
		virtualTourUrl: "https://example.com/tour1",
	},
	{
		id: "hotel-2",
		name: "Test Hotel 2",
		description: "Another excellent test hotel",
		location: {
			address: "456 Test Avenue",
			city: "Test City",
			country: "TC",
			coordinates: { lat: 40.7589, lng: -73.9851 },
			neighborhood: "Uptown",
		},
		rating: 4.8,
		reviewCount: 856,
		priceRange: {
			min: 180,
			max: 220,
			avgNightly: 200,
			currency: "USD",
		},
		images: [
			{
				id: "img-2",
				url: "test-image-2.jpg",
				alt: "Test Hotel 2",
				category: "exterior" as const,
				isPrimary: true,
			},
		],
		amenities: [
			{ id: "wifi", name: "WiFi", category: "connectivity", icon: "📶" },
			{ id: "spa", name: "Spa", category: "wellness", icon: "🧖" },
			{ id: "restaurant", name: "Restaurant", category: "dining", icon: "🍽️" },
		],
		availability: {
			available: true,
			lastChecked: "2024-12-01T11:00:00Z",
			lowAvailability: true,
			priceChange: -15,
		},
		passionScore: {
			"luxury-indulgence": 0.0,
			"wellness-retreat": 0.9,
			"romantic-escape": 0.0,
			"adventure-seeker": 0.0,
			"cultural-explorer": 0.0,
			"budget-conscious": 0.0,
			"family-fun": 0.0,
			"business-traveler": 0.0,
			"eco-conscious": 0.0,
			"foodie-experience": 0.0,
		},
		sustainabilityScore: 0.85,
		virtualTourUrl: "https://example.com/tour2",
	},
];

const mockBookingData = {
	id: "booking-123",
	hotelId: "hotel-1",
	checkIn: "2024-12-01",
	checkOut: "2024-12-03",
	guests: { adults: 2, children: 0, rooms: 1 },
	totalAmount: 300,
	status: "confirmed",
};

const mockPaymentIntent = {
	id: "pi_test_123",
	status: "succeeded",
	amount: 30000,
	currency: "usd",
	client_secret: "pi_test_123_secret",
};

// Export test utilities for use in tests
export const testUtils = {
	mockSearchResults,
	mockBookingData,
	mockPaymentIntent,

	// Helper to create mock fetch responses
	createMockResponse: (data: any, status = 200) => {
		return Promise.resolve({
			ok: status >= 200 && status < 300,
			status,
			json: () => Promise.resolve(data),
			text: () => Promise.resolve(JSON.stringify(data)),
		} as Response);
	},

	// Helper to wait for async updates
	waitForNextTick: () => new Promise((resolve) => setTimeout(resolve, 0)),

	// Helper to mock API responses
	mockApiCall: (endpoint: string, response: any, status = 200) => {
		const mockFetch = global.fetch as any;
		mockFetch.mockImplementation((url: string) => {
			if (url.includes(endpoint)) {
				return testUtils.createMockResponse(response, status);
			}
			return Promise.reject(new Error(`Unexpected API call to ${url}`));
		});
	},
};

// Set default fetch mock
(global.fetch as any).mockImplementation(() =>
	Promise.reject(new Error("Unmocked fetch call")),
);
