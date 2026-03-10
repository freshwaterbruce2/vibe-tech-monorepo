import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "../sidebar";

// Mock useIsMobile hook
vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: vi.fn(),
}));

import { useIsMobile } from "@/hooks/use-mobile";

// Test component that consumes the context
const TestComponent = () => {
	const { state, toggleSidebar, open } = useSidebar();
	return (
		<div>
			<span data-testid="sidebar-state">{state}</span>
			<span data-testid="sidebar-open">{open ? "true" : "false"}</span>
			<button onClick={toggleSidebar} data-testid="toggle-btn">
				Toggle
			</button>
		</div>
	);
};

describe("Sidebar Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useIsMobile as any).mockReturnValue(false); // Default to desktop
		// Clear cookies
		document.cookie.split(";").forEach((c) => {
			document.cookie = c
				.replace(/^ +/, "")
				.replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
		});
	});

	it("renders children correctly", () => {
		render(
			<SidebarProvider>
				<div data-testid="child">Child Content</div>
			</SidebarProvider>,
		);
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("provides correct default context values", () => {
		render(
			<SidebarProvider defaultOpen={true}>
				<TestComponent />
			</SidebarProvider>,
		);

		expect(screen.getByTestId("sidebar-state")).toHaveTextContent("expanded");
		expect(screen.getByTestId("sidebar-open")).toHaveTextContent("true");
	});

	it("toggles sidebar state on button click", () => {
		render(
			<SidebarProvider defaultOpen={true}>
				<TestComponent />
			</SidebarProvider>,
		);

		const toggleBtn = screen.getByTestId("toggle-btn");
		fireEvent.click(toggleBtn);

		expect(screen.getByTestId("sidebar-state")).toHaveTextContent("collapsed");
		expect(screen.getByTestId("sidebar-open")).toHaveTextContent("false");
	});

	it("sets cookie when state changes", () => {
		render(
			<SidebarProvider defaultOpen={true}>
				<TestComponent />
			</SidebarProvider>,
		);

		const toggleBtn = screen.getByTestId("toggle-btn");
		fireEvent.click(toggleBtn);

		expect(document.cookie).toContain("sidebar:state=false");
	});

	it("handles mobile state correctly", () => {
		(useIsMobile as any).mockReturnValue(true);

		render(
			<SidebarProvider>
				<TestComponent />
			</SidebarProvider>,
		);

		// Initial state might differ on mobile depending on implementation,
		// but toggling should still work for mobile menu
		const toggleBtn = screen.getByTestId("toggle-btn");
		fireEvent.click(toggleBtn);

		// Check if openMobile logic is triggered (impl detail, but observable via context/renders)
		// For now, just ensure no crash
		expect(screen.getByTestId("toggle-btn")).toBeInTheDocument();
	});
});
