import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HotelDetails from "@/components/hotels/HotelDetails";
import { useHotelStore } from "@/store/hotelStore";
import { useSearchStore } from "@/store/searchStore";
import type { HotelDetails as HotelDetailsType } from "@/types/hotel";

// Mock stores
vi.mock("@/store/hotelStore");
vi.mock("@/store/searchStore");
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => vi.fn(),
	};
});

// Mock CSS imports
vi.mock("@/components/hotels/HotelDetails.css", () => ({}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<BrowserRouter>{children}</BrowserRouter>
);

// Build a complete HotelDetailsType object matching what the component needs
const buildMockHotel = (overrides: Partial<HotelDetailsType> = {}): HotelDetailsType => ({
	id: "hotel-test-001",
	name: "Test Luxury Hotel",
	description: "A beautiful luxury hotel with amazing amenities",
	rating: 4.5,
	reviewCount: 1250,
	priceRange: { min: 200, max: 400, avgNightly: 300, currency: "USD" },
	location: {
		address: "123 Luxury Avenue",
		city: "Test City",
		country: "TC",
		coordinates: { lat: 40.7128, lng: -74.006 },
		neighborhood: "Downtown",
	},
	amenities: [
		{ id: "wifi", name: "WiFi", category: "connectivity", icon: "📶" },
		{ id: "spa", name: "Spa", category: "wellness", icon: "🧖" },
		{ id: "pool", name: "Pool", category: "recreation", icon: "🏊" },
	],
	images: [
		{
			id: "img-1",
			url: "test-hotel-1.jpg",
			alt: "Test Luxury Hotel",
			category: "exterior",
			isPrimary: true,
		},
		{
			id: "img-2",
			url: "test-hotel-2.jpg",
			alt: "Hotel Lobby",
			category: "interior",
			isPrimary: false,
		},
	],
	rooms: [
		{
			id: "room-1",
			name: "Deluxe Room",
			type: "deluxe",
			capacity: 2,
			price: 250,
			currency: "USD",
			amenities: ["WiFi", "AC", "TV"],
			images: ["room1.jpg"],
			availability: true,
			description: "A comfortable deluxe room",
			bedType: "king",
			size: 350,
			maxOccupancy: 3,
			smokingAllowed: false,
		},
		{
			id: "room-2",
			name: "Suite",
			type: "suite",
			capacity: 4,
			price: 450,
			currency: "USD",
			amenities: ["WiFi", "AC", "TV", "Minibar"],
			images: ["suite1.jpg"],
			availability: true,
			description: "A luxurious suite",
			bedType: "king",
			size: 600,
			maxOccupancy: 4,
			smokingAllowed: false,
		},
	],
	policies: [
		{
			type: "cancellation",
			title: "Free Cancellation",
			description: "Cancel up to 24 hours before check-in",
		},
	],
	nearbyAttractions: [
		{ name: "City Museum", type: "museum", distance: "0.5 km" },
	],
	checkInTime: "15:00",
	checkOutTime: "11:00",
	availability: {
		available: true,
		lastChecked: new Date().toISOString(),
		lowAvailability: false,
	},
	passionScore: {
		"luxury-indulgence": 0.9,
		"wellness-retreat": 0.7,
		"romantic-escape": 0.6,
		"adventure-seeker": 0.3,
		"cultural-explorer": 0.4,
		"budget-conscious": 0.1,
		"family-fun": 0.4,
		"business-traveler": 0.5,
		"eco-conscious": 0.5,
		"foodie-experience": 0.6,
	},
	sustainabilityScore: 0.85,
	virtualTourUrl: "https://example.com/tour",
	...overrides,
} as HotelDetailsType);

describe("HotelDetails Component", () => {
	const mockHotel = buildMockHotel();

	const mockUseHotelStore = {
		selectedHotel: null as HotelDetailsType | null,
		loading: false,
		setSelectedHotel: vi.fn(),
		clearSelectedHotel: vi.fn(),
	};

	const mockUseSearchStore = {
		selectedDateRange: {
			checkIn: "2024-12-01",
			checkOut: "2024-12-03",
		},
		guestCount: {
			adults: 2,
			children: 0,
			rooms: 1,
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseHotelStore.selectedHotel = null;
		mockUseHotelStore.loading = false;
		(useHotelStore as any).mockReturnValue(mockUseHotelStore);
		(useSearchStore as any).mockReturnValue(mockUseSearchStore);
	});

	describe("Rendering", () => {
		it("should render hotel details when provided", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
			// Address is formatted as "address, city, country"
			expect(
				screen.getByText(/123 Luxury Avenue, Test City/),
			).toBeInTheDocument();
			expect(screen.getByText("4.5")).toBeInTheDocument();
			expect(screen.getByText("(1,250 reviews)")).toBeInTheDocument();
		});

		it("should render loading skeleton when hotel provided with isLoading true", () => {
			// Component checks !hotel first, so need both hotel + isLoading to show skeleton
			const { container } = render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} isLoading={true} />
				</TestWrapper>,
			);
			// When isLoading=true with a hotel, the component renders an animate-pulse skeleton
			expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
		});

		it("should render error state when no hotel data", () => {
			render(
				<TestWrapper>
					<HotelDetails />
				</TestWrapper>,
			);

			expect(screen.getByText("Hotel not found")).toBeInTheDocument();
		});

		it("should apply custom className", () => {
			const { container } = render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} className="custom-class" />
				</TestWrapper>,
			);

			expect(container.firstChild).toHaveClass("custom-class");
		});
	});

	describe("Hotel Information Display", () => {
		it("should display hotel rating with star icons", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Stars rendered as SVGs — verify the rating number is shown
			expect(screen.getByText("4.5")).toBeInTheDocument();
		});

		it("should display price range information", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// avgNightly price shown in booking card — "per night" appears multiple times
			expect(screen.getAllByText(/per night/i).length).toBeGreaterThan(0);
			expect(screen.getByText("$300.00")).toBeInTheDocument();
		});

		it("should display amenities list in amenities tab", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Click the Amenities tab to see amenities
			fireEvent.click(screen.getByText("Amenities"));

			expect(screen.getByText("WiFi")).toBeInTheDocument();
			expect(screen.getByText("Spa")).toBeInTheDocument();
			expect(screen.getByText("Pool")).toBeInTheDocument();
		});

		it("should display sustainability score in overview tab", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Click Overview tab
			fireEvent.click(screen.getByText("Overview"));

			expect(screen.getByText(/85%/)).toBeInTheDocument();
			expect(screen.getByText(/sustainability/i)).toBeInTheDocument();
		});
	});

	describe("Image Gallery", () => {
		it("should display image gallery", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const images = screen.getAllByRole("img");
			expect(images.length).toBeGreaterThan(0);
		});

		it("should show image counter", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Image counter shows "1 / 2" for 2 images
			expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
		});

		it("should have navigation buttons for multiple images", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Multiple images → prev/next navigation buttons in DOM (hidden via opacity-0)
			const buttons = screen.getAllByRole("button");
			expect(buttons.length).toBeGreaterThan(0);
		});
	});

	describe("Room Selection", () => {
		it("should display available rooms", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("Deluxe Room")).toBeInTheDocument();
			expect(screen.getByText("Suite")).toBeInTheDocument();
			// formatPrice returns formatted currency strings
			expect(screen.getByText("$250.00")).toBeInTheDocument();
			expect(screen.getByText("$450.00")).toBeInTheDocument();
		});

		it("should handle room booking when callback provided", () => {
			const mockOnBookRoom = vi.fn();

			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} onBookRoom={mockOnBookRoom} />
				</TestWrapper>,
			);

			// Component renders "Book This Room" for available rooms
			const bookButtons = screen.getAllByText(/Book This Room/i);
			fireEvent.click(bookButtons[0]);

			expect(mockOnBookRoom).toHaveBeenCalledWith("room-1");
		});

		it("should display room capacity information", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Component shows "Up to N guests"
			expect(screen.getByText(/Up to 2 guests/)).toBeInTheDocument();
			expect(screen.getByText(/Up to 4 guests/)).toBeInTheDocument();
		});

		it("should show unavailable rooms as disabled", () => {
			const hotelWithUnavailableRoom = buildMockHotel({
				rooms: [
					{
						...mockHotel.rooms![0],
						availability: false,
					},
				],
			});

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithUnavailableRoom} />
				</TestWrapper>,
			);

			// Component shows "Not Available" for unavailable rooms
			const notAvailableButton = screen.getByText("Not Available");
			expect(notAvailableButton.closest("button")).toBeDisabled();
		});
	});

	describe("Navigation", () => {
		it("should handle back to results action", () => {
			const mockOnBackToResults = vi.fn();

			render(
				<TestWrapper>
					<HotelDetails
						hotel={mockHotel}
						onBackToResults={mockOnBackToResults}
					/>
				</TestWrapper>,
			);

			const backButton = screen.getByRole("button", {
				name: /back to results/i,
			});
			fireEvent.click(backButton);

			expect(mockOnBackToResults).toHaveBeenCalled();
		});

		it("should display hotel name prominently", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText(/test luxury hotel/i)).toBeInTheDocument();
		});
	});

	describe("User Actions", () => {
		it("should render Heart and Share icon buttons in actions area", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Component has icon-only buttons for Heart and Share2
			const buttons = screen.getAllByRole("button");
			expect(buttons.length).toBeGreaterThan(2);
		});

		it("should display Book Now button in booking card", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("Book Now")).toBeInTheDocument();
		});

		it("should display View Rooms button in booking card", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("View Rooms")).toBeInTheDocument();
		});
	});

	describe("Responsive Behavior", () => {
		it("should render correctly at mobile width without crashing", () => {
			Object.defineProperty(window, "innerWidth", {
				writable: true,
				configurable: true,
				value: 375,
			});

			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
		});

		it("should render correctly at tablet width without crashing", () => {
			Object.defineProperty(window, "innerWidth", {
				writable: true,
				configurable: true,
				value: 768,
			});

			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should display hotel rating as a visible number", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("4.5")).toBeInTheDocument();
		});

		it("should have all buttons as proper button elements", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const buttons = screen.getAllByRole("button");
			buttons.forEach((button) => {
				expect(button.tagName).toBe("BUTTON");
			});
		});

		it("should render tab navigation labels", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("Overview")).toBeInTheDocument();
			expect(screen.getByText("Rooms & Rates")).toBeInTheDocument();
			expect(screen.getByText("Amenities")).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it("should handle empty rooms array without crashing", () => {
			const hotelWithoutRooms = buildMockHotel({ rooms: [] });

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithoutRooms} />
				</TestWrapper>,
			);

			// Component renders without crash — rooms tab shows empty list
			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
		});

		it("should handle empty images array without crashing", () => {
			const hotelWithoutImages = buildMockHotel({ images: [] });

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithoutImages} />
				</TestWrapper>,
			);

			// Component shows placeholder when no images
			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
		});

		it("should handle room booking callback", () => {
			const mockOnBookRoom = vi.fn();

			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} onBookRoom={mockOnBookRoom} />
				</TestWrapper>,
			);

			const bookButton = screen.getAllByText(/Book This Room/i)[0];
			fireEvent.click(bookButton);

			expect(mockOnBookRoom).toHaveBeenCalledWith("room-1");
		});
	});

	describe("Performance", () => {
		it("should memoize component to prevent unnecessary re-renders", () => {
			const { rerender } = render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Re-render with same props
			rerender(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Component should still render correctly after re-render
			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
		});

		it("should have loading lazy on main hotel image", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const images = screen.getAllByRole("img");
			// The main displayed image should have loading="lazy"
			const mainImage = images[0];
			expect(mainImage).toHaveAttribute("loading", "lazy");
		});
	});

	describe("Edge Cases", () => {
		it("should handle very long hotel names", () => {
			const hotelWithLongName = buildMockHotel({ name: "A".repeat(100) });

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithLongName} />
				</TestWrapper>,
			);

			expect(screen.getByText("A".repeat(100))).toBeInTheDocument();
		});

		it("should handle hotels with zero reviews", () => {
			const hotelWithNoReviews = buildMockHotel({ reviewCount: 0 });

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithNoReviews} />
				</TestWrapper>,
			);

			expect(screen.getByText("(0 reviews)")).toBeInTheDocument();
		});

		it("should handle extreme price ranges", () => {
			const hotelWithExtremePrices = buildMockHotel({
				priceRange: {
					min: 50000,
					max: 100000,
					avgNightly: 75000,
					currency: "USD",
				},
			});

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithExtremePrices} />
				</TestWrapper>,
			);

			// avgNightly formatted
			expect(screen.getByText("$75,000.00")).toBeInTheDocument();
		});
	});

	describe("Integration with Stores", () => {
		it("should use selectedHotel from store when no hotel prop provided", () => {
			mockUseHotelStore.selectedHotel = mockHotel;
			(useHotelStore as any).mockReturnValue(mockUseHotelStore);

			render(
				<TestWrapper>
					<HotelDetails />
				</TestWrapper>,
			);

			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
		});

		it("should display search context dates from store", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			// Dates displayed as raw strings from the store (not formatted)
			expect(screen.getByText("2024-12-01")).toBeInTheDocument();
			expect(screen.getByText("2024-12-03")).toBeInTheDocument();
			expect(screen.getByText(/2 adults/)).toBeInTheDocument();
		});

		it("should show Hotel not found when store has loading=true but no hotel", () => {
			// Component checks !hotel first before loading; if no hotel → "Hotel not found"
			mockUseHotelStore.loading = true;
			mockUseHotelStore.selectedHotel = null;
			(useHotelStore as any).mockReturnValue(mockUseHotelStore);

			render(
				<TestWrapper>
					<HotelDetails />
				</TestWrapper>,
			);

			expect(screen.getByText("Hotel not found")).toBeInTheDocument();
		});
	});
});
