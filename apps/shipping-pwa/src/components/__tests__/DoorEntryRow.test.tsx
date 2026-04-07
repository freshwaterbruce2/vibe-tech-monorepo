import { render, screen, fireEvent } from "@testing-library/react";
import type { DoorSchedule } from "@/types/shipping";

// Mock warehouse config
vi.mock("@/config/warehouse", () => ({
  useWarehouseConfig: () => ({
    config: {
      destinationDCs: ["6024", "6070", "6039", "6040", "7045"],
      freightTypes: ["23/43", "28", "XD"],
      doorNumberRange: { min: 332, max: 454 },
      features: {},
    },
    updateConfig: vi.fn(),
    resetConfig: vi.fn(),
    refreshFromApi: vi.fn(),
    isFeatureEnabled: vi.fn(() => false),
    isAuthenticated: vi.fn(() => false),
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the Select components from Radix UI (they cause infinite re-renders in jsdom)
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="mock-select" data-value={value}>
      {typeof children === "function" ? children({ value, onValueChange }) : children}
    </div>
  ),
  SelectTrigger: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

// Mock the Table components
vi.mock("@/components/ui/table", () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
}));

// Mock Checkbox
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: any) => <input type="checkbox" {...props} />,
}));

// Mock Label
vi.mock("@/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

// Mock Collapsible
vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: any) => <div>{children}</div>,
  CollapsibleContent: ({ children }: any) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock Textarea
vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

// Now import the component after all mocks are set up
import DoorEntryRow from "../DoorEntryRow";

describe("DoorEntryRow Validation", () => {
  const mockUpdate = vi.fn();
  const mockRemove = vi.fn();

  beforeEach(() => {
    mockUpdate.mockClear();
    mockRemove.mockClear();
  });

  it("shows an error message when door number is below allowed range", () => {
    const doorBelowRange: DoorSchedule = {
      id: "test-door",
      doorNumber: 300,
      destinationDC: "6024",
      freightType: "23/43",
      trailerStatus: "empty",
      palletCount: 0,
      timestamp: "",
      createdBy: "tester",
      tcrPresent: false,
    };

    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={doorBelowRange}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid door/i);
  });

  it("shows an error message when door number is above allowed range", () => {
    const doorAboveRange: DoorSchedule = {
      id: "test-door",
      doorNumber: 500,
      destinationDC: "6024",
      freightType: "23/43",
      trailerStatus: "empty",
      palletCount: 0,
      timestamp: "",
      createdBy: "tester",
      tcrPresent: false,
    };

    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={doorAboveRange}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid door/i);
  });
});

describe("DoorEntryRow Success Cases", () => {
  const mockUpdate = vi.fn();
  const mockRemove = vi.fn();

  const validDoor: DoorSchedule = {
    id: "test-door-success",
    doorNumber: 342,
    destinationDC: "6024",
    freightType: "23/43",
    trailerStatus: "empty",
    palletCount: 5,
    timestamp: new Date().toISOString(),
    createdBy: "tester",
    tcrPresent: false,
    notes: "Initial notes",
  };

  beforeEach(() => {
    mockUpdate.mockClear();
    mockRemove.mockClear();
  });

  it("renders initial data correctly", () => {
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={validDoor}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByText("342")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("provides pallet count status via aria-live", () => {
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={validDoor}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );

    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toHaveAttribute("aria-live", "polite");
  });

  it("has a remove button with correct aria-label", () => {
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={validDoor}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );

    const removeButton = screen.getByLabelText(/remove door 342/i);
    expect(removeButton).toBeInTheDocument();
  });

  it("calls removeDoor when remove button is clicked", () => {
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={validDoor}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );

    const removeButton = screen.getByLabelText(/remove door 342/i);
    fireEvent.click(removeButton);

    expect(mockRemove).toHaveBeenCalledWith(validDoor.id);
  });

  it("shows QuickPalletInput when pallet display is clicked", () => {
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={validDoor}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );

    const palletButton = screen.getByLabelText(/current pallet count/i);
    fireEvent.click(palletButton);

    expect(screen.getByRole("dialog", { name: /quick pallet input/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Increment pallet count")).toBeInTheDocument();
    expect(screen.getByLabelText("Decrement pallet count")).toBeInTheDocument();
  });

  it("increments pallet count via QuickPalletInput", () => {
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={validDoor}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );

    const palletButton = screen.getByLabelText(/current pallet count/i);
    fireEvent.click(palletButton);

    const incrementButton = screen.getByLabelText("Increment pallet count");
    fireEvent.click(incrementButton);

    expect(mockUpdate).toHaveBeenCalledWith(
      validDoor.id,
      "palletCount",
      6,
    );
  });

  it("decrements pallet count via QuickPalletInput", () => {
    const doorWithPallets: DoorSchedule = { ...validDoor, palletCount: 3 };
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={doorWithPallets}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );

    const palletButton = screen.getByLabelText(/current pallet count/i);
    fireEvent.click(palletButton);

    const decrementButton = screen.getByLabelText("Decrement pallet count");
    fireEvent.click(decrementButton);

    expect(mockUpdate).toHaveBeenCalledWith(
      validDoor.id,
      "palletCount",
      2,
    );
  });

  it("prevents negative pallet count on decrement", () => {
    const zeroPalletDoor: DoorSchedule = { ...validDoor, palletCount: 0 };
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={zeroPalletDoor}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>,
    );

    const palletButton = screen.getByLabelText(/current pallet count/i);
    fireEvent.click(palletButton);

    const decrementButton = screen.getByLabelText("Decrement pallet count");
    fireEvent.click(decrementButton);

    expect(mockUpdate).toHaveBeenCalledWith(zeroPalletDoor.id, "palletCount", 0);
  });
});
