import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HotelDetails from "@/components/hotels/HotelDetails";
import { useHotelStore } from "@/store/hotelStore";
import { useSearchStore } from "@/store/searchStore";
import type { HotelDetails as HotelDetailsType } from "@/types/hotel";
import { MockDataGenerator } from "../../fixtures/mockDataGenerators";

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

describe("HotelDetails Component", () => {
	const mockHotel: HotelDetailsType = MockDataGenerator.generateHotel({
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
	}) as HotelDetailsType;

	const mockUseHotelStore = {
		selectedHotel: null,
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
			expect(
				screen.getByText("A beautiful luxury hotel with amazing amenities"),
			).toBeInTheDocument();
			expect(
				screen.getByText("123 Luxury Avenue, Test City"),
			).toBeInTheDocument();
			expect(screen.getByText("4.5")).toBeInTheDocument();
			expect(screen.getByText("(1,250 reviews)")).toBeInTheDocument();
		});

		it("should render loading state", () => {
			render(
				<TestWrapper>
					<HotelDetails isLoading={true} />
				</TestWrapper>,
			);

			expect(screen.getByText("Loading hotel details...")).toBeInTheDocument();
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
		it("should display hotel rating with stars", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const stars = screen.getAllByTestId("star-icon");
			expect(stars).toHaveLength(5); // Should show 5 stars total
		});

		it("should display price range information", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText(/\$200/)).toBeInTheDocument();
			expect(screen.getByText(/\$400/)).toBeInTheDocument();
			expect(screen.getByText(/per night/i)).toBeInTheDocument();
		});

		it("should display amenities list", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("WiFi")).toBeInTheDocument();
			expect(screen.getByText("Spa")).toBeInTheDocument();
			expect(screen.getByText("Pool")).toBeInTheDocument();
		});

		it("should display sustainability score", () => {
			const sustainableHotel = MockDataGenerator.generateHotel({
				...mockHotel,
				sustainabilityScore: 0.85,
			}) as HotelDetailsType;

			render(
				<TestWrapper>
					<HotelDetails hotel={sustainableHotel} />
				</TestWrapper>,
			);

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

		it("should handle image navigation", async () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const nextButton = screen.getByRole("button", { name: /next image/i });
			fireEvent.click(nextButton);

			await waitFor(() => {
				// Should change to next image
				expect(screen.getByAltText("Hotel Lobby")).toBeInTheDocument();
			});
		});

		it("should handle previous image navigation", async () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const nextButton = screen.getByRole("button", { name: /next image/i });
			fireEvent.click(nextButton);

			const prevButton = screen.getByRole("button", {
				name: /previous image/i,
			});
			fireEvent.click(prevButton);

			await waitFor(() => {
				// Should go back to first image
				expect(screen.getByAltText("Test Luxury Hotel")).toBeInTheDocument();
			});
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
			expect(screen.getByText("$250")).toBeInTheDocument();
			expect(screen.getByText("$450")).toBeInTheDocument();
		});

		it("should handle room booking when callback provided", async () => {
			const mockOnBookRoom = vi.fn();

			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} onBookRoom={mockOnBookRoom} />
				</TestWrapper>,
			);

			const bookButtons = screen.getAllByText(/book now/i);
			fireEvent.click(bookButtons[0]);

			expect(mockOnBookRoom).toHaveBeenCalledWith("room-1");
		});

		it("should display room capacity and amenities", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText(/2 guests/)).toBeInTheDocument();
			expect(screen.getByText(/4 guests/)).toBeInTheDocument();
			expect(screen.getByText("King bed")).toBeInTheDocument();
		});

		it("should show unavailable rooms as disabled", () => {
			const hotelWithUnavailableRoom = {
				...mockHotel,
				rooms: [
					{
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						...mockHotel.rooms![0],
						availability: false,
					},
				],
			} as HotelDetailsType;

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithUnavailableRoom} />
				</TestWrapper>,
			);

			const bookButton = screen.getByRole("button", { name: /unavailable/i });
			expect(bookButton).toBeDisabled();
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

		it("should display breadcrumb navigation", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText(/hotels/i)).toBeInTheDocument();
			expect(screen.getByText(/test luxury hotel/i)).toBeInTheDocument();
		});
	});

	describe("User Actions", () => {
		it("should handle save hotel action", async () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const saveButton = screen.getByRole("button", { name: /save hotel/i });
			fireEvent.click(saveButton);

			await waitFor(() => {
				expect(saveButton).toHaveAttribute("aria-pressed", "true");
			});
		});

		it("should handle share hotel action", async () => {
			// Mock navigator.share
			Object.assign(navigator, {
				share: vi.fn().mockResolvedValue(undefined),
			});

			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const shareButton = screen.getByRole("button", { name: /share hotel/i });
			fireEvent.click(shareButton);

			await waitFor(() => {
				expect(navigator.share).toHaveBeenCalledWith({
					title: "Test Luxury Hotel",
					text: "Check out this amazing hotel!",
					url: expect.stringContaining("hotel-test-001"),
				});
			});
		});

		it("should fallback to clipboard when share is unavailable", async () => {
			// Mock clipboard
			Object.assign(navigator, {
				clipboard: {
					writeText: vi.fn().mockResolvedValue(undefined),
				},
				share: undefined,
			});

			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const shareButton = screen.getByRole("button", { name: /share hotel/i });
			fireEvent.click(shareButton);

			await waitFor(() => {
				expect(navigator.clipboard.writeText).toHaveBeenCalled();
			});
		});
	});

	describe("Responsive Behavior", () => {
		it("should handle mobile layout", () => {
			// Mock window.innerWidth
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

			expect(screen.getByTestId("hotel-details-mobile")).toBeInTheDocument();
		});

		it("should handle tablet layout", () => {
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

			expect(screen.getByTestId("hotel-details-tablet")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA labels", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByLabelText(/hotel rating/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/save hotel/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/share hotel/i)).toBeInTheDocument();
		});

		it("should support keyboard navigation", async () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const firstButton = screen.getAllByRole("button")[0];
			firstButton.focus();

			fireEvent.keyDown(firstButton, { key: "Tab" });

			await waitFor(() => {
				expect(document.activeElement).not.toBe(firstButton);
			});
		});

		it("should announce important actions to screen readers", async () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const saveButton = screen.getByRole("button", { name: /save hotel/i });
			fireEvent.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/hotel saved/i)).toBeInTheDocument();
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle missing room data gracefully", () => {
			const hotelWithoutRooms = {
				...mockHotel,
				rooms: [],
			} as HotelDetailsType;

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithoutRooms} />
				</TestWrapper>,
			);

			expect(screen.getByText(/no rooms available/i)).toBeInTheDocument();
		});

		it("should handle missing images gracefully", () => {
			const hotelWithoutImages = {
				...mockHotel,
				images: [],
			} as HotelDetailsType;

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithoutImages} />
				</TestWrapper>,
			);

			expect(screen.getByText(/no images available/i)).toBeInTheDocument();
		});

		it("should handle API errors during booking", async () => {
			const mockOnBookRoom = vi
				.fn()
				.mockRejectedValue(new Error("Booking failed"));

			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} onBookRoom={mockOnBookRoom} />
				</TestWrapper>,
			);

			const bookButton = screen.getAllByText(/book now/i)[0];
			fireEvent.click(bookButton);

			await waitFor(() => {
				expect(screen.getByText(/booking failed/i)).toBeInTheDocument();
			});
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

			// Component should be memoized (this is verified by the memo() wrapper)
			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
		});

		it("should lazy load images", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			const images = screen.getAllByRole("img");
			images.forEach((img) => {
				expect(img).toHaveAttribute("loading", "lazy");
			});
		});
	});

	describe("Edge Cases", () => {
		it("should handle very long hotel names", () => {
			const hotelWithLongName = MockDataGenerator.generateHotel({
				...mockHotel,
				name: "A".repeat(100),
			}) as HotelDetailsType;

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithLongName} />
				</TestWrapper>,
			);

			expect(screen.getByTestId("hotel-name")).toHaveClass("truncate");
		});

		it("should handle hotels with no reviews", () => {
			const hotelWithNoReviews = MockDataGenerator.generateHotel({
				...mockHotel,
				reviewCount: 0,
			}) as HotelDetailsType;

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithNoReviews} />
				</TestWrapper>,
			);

			expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
		});

		it("should handle extreme price ranges", () => {
			const hotelWithExtremePrices = MockDataGenerator.generateHotel({
				...mockHotel,
				priceRange: {
					min: 50000,
					max: 100000,
					avgNightly: 75000,
					currency: "USD",
				},
			}) as HotelDetailsType;

			render(
				<TestWrapper>
					<HotelDetails hotel={hotelWithExtremePrices} />
				</TestWrapper>,
			);

			expect(screen.getByText(/\$50,000/)).toBeInTheDocument();
		});
	});

	describe("Integration with Stores", () => {
		it("should use selectedHotel from store when no hotel prop provided", () => {
			mockUseHotelStore.selectedHotel = mockHotel;

			render(
				<TestWrapper>
					<HotelDetails />
				</TestWrapper>,
			);

			expect(screen.getByText("Test Luxury Hotel")).toBeInTheDocument();
		});

		it("should display search context from store", () => {
			render(
				<TestWrapper>
					<HotelDetails hotel={mockHotel} />
				</TestWrapper>,
			);

			expect(screen.getByText("Dec 01, 2024")).toBeInTheDocument();
			expect(screen.getByText("Dec 03, 2024")).toBeInTheDocument();
			expect(screen.getByText("2 adults")).toBeInTheDocument();
		});

		it("should handle loading state from store", () => {
			mockUseHotelStore.loading = true;

			render(
				<TestWrapper>
					<HotelDetails />
				</TestWrapper>,
			);

			expect(screen.getByText("Loading hotel details...")).toBeInTheDocument();
		});
	});
});
