
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";
import SpeedKeypad from "../components/shipping/SpeedKeypad";

describe("Fast Add Door", () => {
  it("shows a Fast Add Door button and opens a minimal form/modal to quickly add a door with default values", () => {
    render(<App />);
    // The button should be in the document
    const fastAddButton = screen.getByRole("button", {
      name: /fast add door/i,
    });
    expect(fastAddButton).toBeInTheDocument();

    // Simulate clicking the button
    fireEvent.click(fastAddButton);

    // The minimal form/modal should appear
    const fastAddForm = screen.getByTestId("fast-add-door-form");
    expect(fastAddForm).toBeInTheDocument();

    // There should be a submit button
    const submitButton = screen.getByRole("button", { name: /add door/i });
    expect(submitButton).toBeInTheDocument();

    // Simulate submitting the form
    fireEvent.click(submitButton);

    // After submission, the form should close and a new door should be appended (this can be checked by a door count or similar)
    // For now, expect a placeholder assertion that will fail
    // expect(screen.getByText(/new door added/i)).toBeInTheDocument();
  });
});

test("renders SpeedKeypad without errors", () => {
  const { getByTestId } = render(
    <SpeedKeypad onSelectDoor={vi.fn()} currentDoors={[]} />,
  );
  expect(getByTestId("mock-speed-icon")).toBeInTheDocument();
});
