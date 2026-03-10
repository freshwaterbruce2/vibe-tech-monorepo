import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SearchSection from "@/components/search/SearchSection";

describe("SearchSection", () => {
	const defaultProps = {
		onSearch: vi.fn(),
		isLoading: false,
		className: "",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("should render search form with all fields", () => {
			render(<SearchSection {...defaultProps} />);

			expect(screen.getByText("Find Your Perfect Hotel")).toBeInTheDocument();
			expect(screen.getByLabelText("Destination")).toBeInTheDocument();
			expect(screen.getByLabelText("Check-in Date")).toBeInTheDocument();
			expect(screen.getByLabelText("Check-out Date")).toBeInTheDocument();
			expect(screen.getByLabelText("Guests")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /search hotels/i }),
			).toBeInTheDocument();
		});

		it("should render with custom className", () => {
			const { container } = render(
				<SearchSection {...defaultProps} className="custom-class" />,
			);

			expect(container.firstChild).toHaveClass("custom-class");
		});

		it("should show loading state when isLoading is true", () => {
			render(<SearchSection {...defaultProps} isLoading={true} />);

			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("Searching...");
			expect(button).toBeDisabled();
		});

		it("should show normal state when isLoading is false", () => {
			render(<SearchSection {...defaultProps} isLoading={false} />);

			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("Search Hotels");
			expect(button).not.toBeDisabled();
		});
	});

	describe("Form Fields", () => {
		it("should have correct placeholder text for destination input", () => {
			render(<SearchSection {...defaultProps} />);

			const destinationInput = screen.getByPlaceholderText(
				"Where are you going?",
			);
			expect(destinationInput).toBeInTheDocument();
		});

		it("should have date inputs with correct types", () => {
			render(<SearchSection {...defaultProps} />);

			const checkInInput = screen.getByLabelText("Check-in Date");
			const checkOutInput = screen.getByLabelText("Check-out Date");

			expect(checkInInput).toHaveAttribute("type", "date");
			expect(checkOutInput).toHaveAttribute("type", "date");
		});

		it("should have guest dropdown with correct options", () => {
			render(<SearchSection {...defaultProps} />);

			// const guestSelect = screen.getByLabelText('Guests');

			expect(screen.getByText("1 Guest")).toBeInTheDocument();
			expect(screen.getByText("2 Guests")).toBeInTheDocument();
			expect(screen.getByText("3 Guests")).toBeInTheDocument();
			expect(screen.getByText("4+ Guests")).toBeInTheDocument();
		});
	});

	describe("User Interactions", () => {
		it("should accept text input in destination field", async () => {
			const user = userEvent.setup();
			render(<SearchSection {...defaultProps} />);

			const destinationInput = screen.getByPlaceholderText(
				"Where are you going?",
			);
			await user.type(destinationInput, "Paris");

			expect(destinationInput).toHaveValue("Paris");
		});

		it("should accept date input in check-in field", async () => {
			const user = userEvent.setup();
			render(<SearchSection {...defaultProps} />);

			const checkInInput = screen.getByLabelText("Check-in Date");
			await user.type(checkInInput, "2024-12-01");

			expect(checkInInput).toHaveValue("2024-12-01");
		});

		it("should accept date input in check-out field", async () => {
			const user = userEvent.setup();
			render(<SearchSection {...defaultProps} />);

			const checkOutInput = screen.getByLabelText("Check-out Date");
			await user.type(checkOutInput, "2024-12-03");

			expect(checkOutInput).toHaveValue("2024-12-03");
		});

		it("should change guest selection", async () => {
			const user = userEvent.setup();
			render(<SearchSection {...defaultProps} />);

			const guestSelect = screen.getByLabelText("Guests");
			await user.selectOptions(guestSelect, "3 Guests");

			expect(guestSelect).toHaveValue("3 Guests");
		});
	});

	describe("Search Button Behavior", () => {
		it("should call onSearch when search button is clicked", async () => {
			const mockOnSearch = vi.fn();
			const user = userEvent.setup();

			render(<SearchSection {...defaultProps} onSearch={mockOnSearch} />);

			const searchButton = screen.getByRole("button", {
				name: /search hotels/i,
			});
			await user.click(searchButton);

			expect(mockOnSearch).toHaveBeenCalledTimes(1);
			expect(mockOnSearch).toHaveBeenCalledWith({});
		});

		it("should not call onSearch when button is disabled", async () => {
			const mockOnSearch = vi.fn();
			const user = userEvent.setup();

			render(
				<SearchSection
					{...defaultProps}
					onSearch={mockOnSearch}
					isLoading={true}
				/>,
			);

			const searchButton = screen.getByRole("button");
			await user.click(searchButton);

			expect(mockOnSearch).not.toHaveBeenCalled();
		});

		it("should not call onSearch when onSearch prop is not provided", async () => {
			const user = userEvent.setup();

			// Should not throw error when onSearch is undefined
			expect(() => {
				render(<SearchSection isLoading={false} />);
			}).not.toThrow();

			const searchButton = screen.getByRole("button", {
				name: /search hotels/i,
			});
			await user.click(searchButton);

			// Should not cause any errors
		});
	});

	describe("Accessibility", () => {
		it("should have proper form labels", () => {
			render(<SearchSection {...defaultProps} />);

			expect(screen.getByLabelText("Destination")).toBeInTheDocument();
			expect(screen.getByLabelText("Check-in Date")).toBeInTheDocument();
			expect(screen.getByLabelText("Check-out Date")).toBeInTheDocument();
			expect(screen.getByLabelText("Guests")).toBeInTheDocument();
		});

		it("should have accessible button text", () => {
			render(<SearchSection {...defaultProps} />);

			const button = screen.getByRole("button", { name: /search hotels/i });
			expect(button).toBeInTheDocument();
		});

		it("should show loading state accessibly", () => {
			render(<SearchSection {...defaultProps} isLoading={true} />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("disabled");
			expect(button).toHaveTextContent("Searching...");
		});

		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<SearchSection {...defaultProps} />);

			// Tab through form fields
			await user.tab();
			expect(screen.getByPlaceholderText("Where are you going?")).toHaveFocus();

			await user.tab();
			expect(screen.getByLabelText("Check-in Date")).toHaveFocus();

			await user.tab();
			expect(screen.getByLabelText("Check-out Date")).toHaveFocus();

			await user.tab();
			expect(screen.getByLabelText("Guests")).toHaveFocus();

			await user.tab();
			expect(
				screen.getByRole("button", { name: /search hotels/i }),
			).toHaveFocus();
		});
	});

	describe("Responsive Design", () => {
		it("should have responsive grid classes", () => {
			const { container } = render(<SearchSection {...defaultProps} />);

			const gridContainer = container.querySelector(".grid");
			expect(gridContainer).toHaveClass("grid-cols-1", "md:grid-cols-3");
		});

		it("should have responsive flex classes for button row", () => {
			const { container } = render(<SearchSection {...defaultProps} />);

			const buttonRow = container.querySelector(".flex-col");
			expect(buttonRow).toHaveClass("flex-col", "md:flex-row");
		});
	});

	describe("Edge Cases", () => {
		it("should handle undefined onSearch prop gracefully", async () => {
			const user = userEvent.setup();

			render(<SearchSection isLoading={false} />);

			const searchButton = screen.getByRole("button", {
				name: /search hotels/i,
			});

			// Should not throw error
			await expect(user.click(searchButton)).resolves.not.toThrow();
		});

		it("should handle empty className prop", () => {
			const { container } = render(
				<SearchSection {...defaultProps} className="" />,
			);

			expect(container.firstChild).toHaveClass(
				"bg-white",
				"rounded-lg",
				"shadow-lg",
			);
		});

		it("should handle missing isLoading prop", () => {
			render(<SearchSection onSearch={vi.fn()} />);

			const button = screen.getByRole("button", { name: /search hotels/i });
			expect(button).not.toBeDisabled();
			expect(button).toHaveTextContent("Search Hotels");
		});
	});

	describe("Form State Management", () => {
		it("should maintain form state during user interaction", async () => {
			const user = userEvent.setup();
			render(<SearchSection {...defaultProps} />);

			// Fill out form
			const destinationInput = screen.getByPlaceholderText(
				"Where are you going?",
			);
			const checkInInput = screen.getByLabelText("Check-in Date");
			const checkOutInput = screen.getByLabelText("Check-out Date");
			const guestSelect = screen.getByLabelText("Guests");

			await user.type(destinationInput, "Tokyo");
			await user.type(checkInInput, "2024-12-15");
			await user.type(checkOutInput, "2024-12-18");
			await user.selectOptions(guestSelect, "2 Guests");

			// Verify all fields maintain their values
			expect(destinationInput).toHaveValue("Tokyo");
			expect(checkInInput).toHaveValue("2024-12-15");
			expect(checkOutInput).toHaveValue("2024-12-18");
			expect(guestSelect).toHaveValue("2 Guests");
		});

		it("should clear form state when component unmounts and remounts", () => {
			const { unmount } = render(<SearchSection {...defaultProps} />);

			// Unmount and remount
			unmount();
			render(<SearchSection {...defaultProps} />);

			// Form should be reset
			const destinationInput = screen.getByPlaceholderText(
				"Where are you going?",
			);
			const checkInInput = screen.getByLabelText("Check-in Date");
			const checkOutInput = screen.getByLabelText("Check-out Date");

			expect(destinationInput).toHaveValue("");
			expect(checkInInput).toHaveValue("");
			expect(checkOutInput).toHaveValue("");
		});
	});
});
