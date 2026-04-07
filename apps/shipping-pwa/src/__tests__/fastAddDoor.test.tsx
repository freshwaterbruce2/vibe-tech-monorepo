
import { render, screen, fireEvent } from "@testing-library/react";
import SpeedKeypad from "../components/shipping/SpeedKeypad";

describe("Fast Add Door (SpeedKeypad)", () => {
  it("renders SpeedKeypad with Speed Add button", () => {
    render(
      <SpeedKeypad onSelectDoor={vi.fn()} currentDoors={[]} />,
    );
    // The button has aria-label "Fast Add Door" and visible text "Speed Add"
    expect(screen.getByLabelText("Fast Add Door")).toBeInTheDocument();
    expect(screen.getByText("Speed Add")).toBeInTheDocument();
  });

  it("opens the dialog when Speed Add is clicked", () => {
    render(
      <SpeedKeypad onSelectDoor={vi.fn()} currentDoors={[]} />,
    );
    const button = screen.getByLabelText("Fast Add Door");
    fireEvent.click(button);

    // The dialog should appear with test ID and an Add Door submit button
    expect(screen.getByTestId("fast-add-door-form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add door/i })).toBeInTheDocument();
  });

  it("renders the speed icon", () => {
    render(
      <SpeedKeypad onSelectDoor={vi.fn()} currentDoors={[]} />,
    );
    expect(screen.getByTestId("mock-speed-icon")).toBeInTheDocument();
  });
});
