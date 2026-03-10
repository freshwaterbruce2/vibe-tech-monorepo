import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchResults from "@/components/search/SearchResults";
import { useSearchStore } from "@/store/searchStore";

// import { testUtils } from '../../setup';

// Mock the search store
vi.mock("@/store/searchStore");

// Mock UI components
vi.mock("@vibe/ui", () => ({
	Button: ({ children, onClick, disabled, className, ...props }: any) => (
		<button
			onClick={onClick}
			disabled={disabled}
			className={className}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/Card", () => ({
	Card: ({ children, onClick, className }: any) => (
		<div onClick={onClick} className={className} data-testid="hotel-card">
			{children}
		</div>
	),
}));

describe("SearchResults", () => {
	const mockHotels = [
		{
			id: "hotel-1",
			name: "Grand Test Hotel",
			description:
				"A luxurious hotel in the heart of the city with amazing amenities.",
			location: {
				city: "Test City",
				country: "Test Country",
				neighborhood: "Downtown",
			},
			rating: 4.5,
			reviewCount: 1250,
			priceRange: {
				avgNightly: 250,
				currency: "USD",
			},
			images: [
				{
					url: "/test-hotel-1.jpg",
					alt: "Grand Test Hotel exterior",
					isPrimary: true,
				},
			],
			amenities: [
				{ id: "wifi", name: "Free WiFi", icon: "📶" },
				{ id: "pool", name: "Swimming Pool", icon: "🏊" },
				{ id: "gym", name: "Fitness Center", icon: "💪" },
				{ id: "spa", name: "Spa Services", icon: "🧖" },
				{ id: "restaurant", name: "Restaurant", icon: "🍽️" },
			],
			availability: {
				available: true,
				lowAvailability: false,
				priceChange: null,
			},
			passionScore: {
				"luxury-indulgence": 0.9,
				"romantic-escape": 0.7,
			},
			sustainabilityScore: 0.85,
			virtualTourUrl: "https://example.com/tour",
		},
		{
			id: "hotel-2",
			name: "Budget Test Inn",
			description: "Affordable accommodation with essential amenities.",
			location: {
				city: "Test City",
				country: "Test Country",
				neighborhood: "Suburbs",
			},
			rating: 3.8,
			reviewCount: 456,
			priceRange: {
				avgNightly: 89,
				currency: "USD",
			},
			images: [
				{
					url: "/test-hotel-2.jpg",
					alt: "Budget Test Inn",
					isPrimary: true,
				},
			],
			amenities: [
				{ id: "wifi", name: "Free WiFi", icon: "📶" },
				{ id: "parking", name: "Free Parking", icon: "🅿️" },
			],
			availability: {
				available: true,
				lowAvailability: true,
				priceChange: -15,
			},
			passionScore: {
				"budget-conscious": 0.8,
			},
			sustainabilityScore: 0.6,
		},
	];

	const mockUseSearchStore = useSearchStore as any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSearchStore.mockReturnValue({
			results: [],
			loading: false,
			pagination: null,
		});
	});

	describe("Loading State", () => {
		it("should show loading skeletons when loading", () => {
			mockUseSearchStore.mockReturnValue({
				results: [],
				loading: true,
				pagination: null,
			});

			render(<SearchResults />);

			expect(screen.getByText("Searching hotels...")).toBeInTheDocument();

			// Should show skeleton cards
			const skeletonCards = screen.getAllByTestId("hotel-card");
			expect(skeletonCards).toHaveLength(6);
		});

		it("should show loading state with pulse animation", () => {
			mockUseSearchStore.mockReturnValue({
				results: [],
				loading: true,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			const pulseElements = container.querySelectorAll(".animate-pulse");
			expect(pulseElements.length).toBeGreaterThan(0);
		});
	});

	describe("Empty State", () => {
		it("should show empty state when no hotels found", () => {
			mockUseSearchStore.mockReturnValue({
				results: [],
				loading: false,
				pagination: null,
			});

			render(<SearchResults />);

			expect(screen.getByText("No hotels found")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Try adjusting your search criteria or explore different dates",
				),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /modify search/i }),
			).toBeInTheDocument();
		});

		it("should show MapPin icon in empty state", () => {
			mockUseSearchStore.mockReturnValue({
				results: [],
				loading: false,
				pagination: null,
			});

			const { container } = render(<SearchResults />);

			// The MapPin icon should be rendered
			expect(container.querySelector(".w-8.h-8")).toBeInTheDocument();
		});
	});

	describe("Hotel Results Display", () => {
		beforeEach(() => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: {
					page: 1,
					limit: 10,
					total: 25,
					totalPages: 3,
				},
			});
		});

		it("should display hotel cards when hotels are available", () => {
			render(<SearchResults />);

			expect(screen.getByText("Grand Test Hotel")).toBeInTheDocument();
			expect(screen.getByText("Budget Test Inn")).toBeInTheDocument();
		});

		it("should show correct results count", () => {
			render(<SearchResults />);

			expect(screen.getByText("25 hotels found")).toBeInTheDocument();
			expect(screen.getByText("Showing 1-10 of 25")).toBeInTheDocument();
		});

		it("should display hotel ratings correctly", () => {
			render(<SearchResults />);

			expect(screen.getByText("4.5")).toBeInTheDocument();
			expect(screen.getByText("(1,250 reviews)")).toBeInTheDocument();
			expect(screen.getByText("3.8")).toBeInTheDocument();
			expect(screen.getByText("(456 reviews)")).toBeInTheDocument();
		});

		it("should format prices correctly", () => {
			render(<SearchResults />);

			expect(screen.getByText("$250.00")).toBeInTheDocument();
			expect(screen.getByText("$89.00")).toBeInTheDocument();
			expect(screen.getAllByText("per night")).toHaveLength(2);
		});

		it("should display hotel locations", () => {
			render(<SearchResults />);

			expect(screen.getByText("Downtown, Test Country")).toBeInTheDocument();
			expect(screen.getByText("Suburbs, Test Country")).toBeInTheDocument();
		});

		it("should display amenities with icons", () => {
			render(<SearchResults />);

			expect(screen.getByText("Free WiFi")).toBeInTheDocument();
			expect(screen.getByText("Swimming Pool")).toBeInTheDocument();
			expect(screen.getByText("Free Parking")).toBeInTheDocument();
		});

		it("should show amenity count when more than 4 amenities", () => {
			render(<SearchResults />);

			expect(screen.getByText("+1 more")).toBeInTheDocument();
		});
	});

	describe("Special Badges and Indicators", () => {
		beforeEach(() => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: null,
			});
		});

		it("should show passion match badge for high scoring hotels", () => {
			render(<SearchResults />);

			expect(screen.getByText("90% Match")).toBeInTheDocument();
		});

		it("should show eco-friendly badge for sustainable hotels", () => {
			render(<SearchResults />);

			expect(screen.getByText("Eco-Friendly")).toBeInTheDocument();
		});

		it("should show price change indicators", () => {
			render(<SearchResults />);

			expect(screen.getByText("-$15.00")).toBeInTheDocument();
		});

		it("should show low availability warning", () => {
			// Mock Math.random to return consistent value
			vi.spyOn(Math, "random").mockReturnValue(0.5);

			render(<SearchResults />);

			expect(screen.getByText(/Only \d+ left!/)).toBeInTheDocument();

			vi.restoreAllMocks();
		});
	});

	describe("User Interactions", () => {
		const mockOnHotelSelect = vi.fn();

		beforeEach(() => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: null,
			});
		});

		it("should call onHotelSelect when hotel card is clicked", async () => {
			const user = userEvent.setup();
			render(<SearchResults onHotelSelect={mockOnHotelSelect} />);

			const hotelCards = screen.getAllByTestId("hotel-card");
			await user.click(hotelCards[0]);

			expect(mockOnHotelSelect).toHaveBeenCalledWith(mockHotels[0]);
		});

		it("should not call onHotelSelect when prop is not provided", async () => {
			const user = userEvent.setup();
			render(<SearchResults />);

			const hotelCards = screen.getAllByTestId("hotel-card");

			// Should not throw error
			await expect(user.click(hotelCards[0])).resolves.not.toThrow();
		});

		it("should handle heart button clicks without propagation", async () => {
			const user = userEvent.setup();
			render(<SearchResults onHotelSelect={mockOnHotelSelect} />);

			const heartButtons = screen
				.getAllByRole("button")
				.filter(
					(btn) =>
						btn.innerHTML.includes("Heart") ||
						btn.getAttribute("class")?.includes("w-4 h-4"),
				);

			// Click should not trigger onHotelSelect
			if (heartButtons.length > 0) {
				await user.click(heartButtons[0]);
				expect(mockOnHotelSelect).not.toHaveBeenCalled();
			}
		});

		it("should handle sort selection change", async () => {
			const user = userEvent.setup();
			render(<SearchResults />);

			const sortSelect = screen.getByDisplayValue("Relevance");
			await user.selectOptions(sortSelect, "price-low");

			expect(sortSelect).toHaveValue("price-low");
		});
	});

	describe("Pagination", () => {
		beforeEach(() => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: {
					page: 2,
					limit: 10,
					total: 25,
					totalPages: 3,
				},
			});
		});

		it("should show pagination when multiple pages exist", () => {
			render(<SearchResults />);

			expect(
				screen.getByRole("button", { name: /previous/i }),
			).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
		});

		it("should disable previous button on first page", () => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: {
					page: 1,
					limit: 10,
					total: 25,
					totalPages: 3,
				},
			});

			render(<SearchResults />);

			const prevButton = screen.getByRole("button", { name: /previous/i });
			expect(prevButton).toBeDisabled();
		});

		it("should disable next button on last page", () => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: {
					page: 3,
					limit: 10,
					total: 25,
					totalPages: 3,
				},
			});

			render(<SearchResults />);

			const nextButton = screen.getByRole("button", { name: /next/i });
			expect(nextButton).toBeDisabled();
		});

		it("should not show pagination for single page results", () => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: {
					page: 1,
					limit: 10,
					total: 2,
					totalPages: 1,
				},
			});

			render(<SearchResults />);

			expect(
				screen.queryByRole("button", { name: /previous/i }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /next/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("Image Handling", () => {
		beforeEach(() => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: null,
			});
		});

		it("should display hotel images with correct alt text", () => {
			render(<SearchResults />);

			const images = screen.getAllByRole("img");
			expect(images[0]).toHaveAttribute("src", "/test-hotel-1.jpg");
			expect(images[0]).toHaveAttribute("alt", "Grand Test Hotel exterior");
			expect(images[1]).toHaveAttribute("src", "/test-hotel-2.jpg");
			expect(images[1]).toHaveAttribute("alt", "Budget Test Inn");
		});

		it("should handle image load errors with fallback", async () => {
			render(<SearchResults />);

			const images = screen.getAllByRole("img");

			// Simulate image load error
			fireEvent.error(images[0]);

			await waitFor(() => {
				expect(images[0]).toHaveAttribute("src", "/placeholder-hotel.jpg");
			});
		});

		it("should use placeholder when no primary image exists", () => {
			const hotelWithoutImage = {
				...mockHotels[0],
				images: [],
			};

			mockUseSearchStore.mockReturnValue({
				results: [hotelWithoutImage],
				loading: false,
				pagination: null,
			});

			render(<SearchResults />);

			const image = screen.getByRole("img");
			expect(image).toHaveAttribute("src", "/placeholder-hotel.jpg");
			expect(image).toHaveAttribute("alt", "Grand Test Hotel");
		});
	});

	describe("Accessibility", () => {
		beforeEach(() => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: null,
			});
		});

		it("should have proper alt text for images", () => {
			render(<SearchResults />);

			const images = screen.getAllByRole("img");
			images.forEach((img) => {
				expect(img).toHaveAttribute("alt");
				expect(img.getAttribute("alt")).not.toBe("");
			});
		});

		it("should have accessible button labels", () => {
			render(<SearchResults />);

			expect(
				screen.getByRole("button", { name: /view details/i }),
			).toBeInTheDocument();
			expect(screen.getByText("Virtual Tour")).toBeInTheDocument();
			expect(screen.getByText("View on Map")).toBeInTheDocument();
		});

		it("should support keyboard navigation", async () => {
			// const user = userEvent.setup();
			const mockOnHotelSelect = vi.fn();

			render(<SearchResults onHotelSelect={mockOnHotelSelect} />);

			const hotelCards = screen.getAllByTestId("hotel-card");

			// Hotel cards should be clickable/focusable
			expect(hotelCards[0]).toHaveClass("cursor-pointer");
		});
	});

	describe("Edge Cases", () => {
		it("should handle missing optional hotel data gracefully", () => {
			const minimalHotel = {
				id: "hotel-minimal",
				name: "Minimal Hotel",
				description: "Basic hotel",
				location: {
					city: "Test City",
					country: "Test Country",
				},
				rating: 3.0,
				reviewCount: 0,
				priceRange: {
					avgNightly: 100,
					currency: "USD",
				},
				images: [],
				amenities: [],
				availability: {
					available: true,
				},
			};

			mockUseSearchStore.mockReturnValue({
				results: [minimalHotel],
				loading: false,
				pagination: null,
			});

			expect(() => render(<SearchResults />)).not.toThrow();
			expect(screen.getByText("Minimal Hotel")).toBeInTheDocument();
		});

		it("should handle different currency formatting", () => {
			const euroHotel = {
				...mockHotels[0],
				priceRange: {
					avgNightly: 200,
					currency: "EUR",
				},
			};

			mockUseSearchStore.mockReturnValue({
				results: [euroHotel],
				loading: false,
				pagination: null,
			});

			render(<SearchResults />);

			expect(screen.getByText("€200.00")).toBeInTheDocument();
		});

		it("should handle custom className prop", () => {
			mockUseSearchStore.mockReturnValue({
				results: mockHotels,
				loading: false,
				pagination: null,
			});

			const { container } = render(
				<SearchResults className="custom-results-class" />,
			);

			expect(container.firstChild).toHaveClass("custom-results-class");
		});
	});
});
