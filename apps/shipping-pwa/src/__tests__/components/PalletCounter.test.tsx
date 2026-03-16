import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PalletCounter from '@/components/pallets/PalletCounter';
import { usePalletEntries } from '@/hooks/usePalletEntries';
import { UserProvider } from '@/contexts/UserContext';

// Mock the usePalletEntries hook
vi.mock('@/hooks/usePalletEntries', () => ({
  usePalletEntries: vi.fn()
}));

describe('Pallet Counter', () => {
  const mockPalletEntries = [
    {
      id: '1',
      doorNumber: 342,
      count: 5,
      timestamp: new Date().toISOString(),
      isActive: false,
      elapsedTime: 0
    }
  ];

  const mockHookReturn = {
    palletEntries: mockPalletEntries,
    addPalletEntry: vi.fn(),
    updateCount: vi.fn(),
    deletePalletEntry: vi.fn(),
    updateDoorNumber: vi.fn(),
    toggleTimer: vi.fn(),
    formatElapsedTime: vi.fn()
  };

  const renderWithProviders = (ui: ReactElement) => {
    return render(
      <UserProvider>{ui}</UserProvider>
    );
  };

  beforeEach(() => {
    (usePalletEntries as jest.Mock).mockReturnValue(mockHookReturn);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the pallet counter title', () => {
      renderWithProviders(<PalletCounter />);
      expect(screen.getByText('Pallet Counter')).toBeInTheDocument();
    });

    it('renders the add counter button', () => {
      renderWithProviders(<PalletCounter />);
      const addButton = screen.getByRole('button', { name: /add counter/i });
      expect(addButton).toBeInTheDocument();
    });

    it('shows empty state when no entries exist', () => {
      (usePalletEntries as jest.Mock).mockReturnValue({
        ...mockHookReturn,
        palletEntries: []
      });

      renderWithProviders(<PalletCounter />);
      expect(screen.getByText('No pallet counters added yet')).toBeInTheDocument();
      expect(screen.getByText('Click "Add Counter" to get started with pallet counting.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add your first counter/i })).toBeInTheDocument();
    });
  });

  describe('Pallet Entry Interactions', () => {
    it('renders pallet entries with correct count', () => {
      renderWithProviders(<PalletCounter />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('calls addPalletEntry when add counter button is clicked', () => {
      renderWithProviders(<PalletCounter />);
      const addButton = screen.getByRole('button', { name: /add counter/i });
      fireEvent.click(addButton);
      expect(mockHookReturn.addPalletEntry).toHaveBeenCalled();
    });

    it('calls updateCount when increment/decrement buttons are clicked', () => {
      renderWithProviders(<PalletCounter />);
      
      // Find buttons by their accessible names
      const incrementButton = screen.getByRole('button', { name: /increment pallet count/i });
      const decrementButton = screen.getByRole('button', { name: /decrement pallet count/i });

      fireEvent.click(incrementButton);
      expect(mockHookReturn.updateCount).toHaveBeenCalledWith('1', true);

      fireEvent.click(decrementButton);
      expect(mockHookReturn.updateCount).toHaveBeenCalledWith('1', false);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on interactive elements', () => {
      renderWithProviders(<PalletCounter />);
      
      // Check for ARIA labels on buttons
      const addButton = screen.getByRole('button', { name: /add counter/i });
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveClass('bg-walmart-yellow', 'text-walmart-blue');
      
      // Check for proper heading structure
      const title = screen.getByRole('heading', { name: /pallet counter/i });
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-2xl', 'font-bold', 'text-walmart-blue');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PalletCounter />);

      const addButton = screen.getByRole('button', { name: /add counter/i });
      await user.tab();
      expect(addButton).toHaveFocus();
    });
  });

  describe('Layout and Structure', () => {
    it('renders the grid layout when entries exist', () => {
      renderWithProviders(<PalletCounter />);
      const gridContainer = screen.getByTestId('pallet-entry-list');
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
    });

    it('renders the empty state layout when no entries exist', () => {
      (usePalletEntries as jest.Mock).mockReturnValue({
        ...mockHookReturn,
        palletEntries: []
      });

      renderWithProviders(<PalletCounter />);
      const emptyState = screen.getByText('No pallet counters added yet').parentElement;
      expect(emptyState).toHaveClass('text-center', 'py-16', 'px-4', 'rounded-lg', 'bg-gray-50', 'border-2', 'border-dashed', 'border-gray-200');
    });
  });

  describe('Timer Functionality', () => {
    it('displays timer when active', () => {
      (usePalletEntries as jest.Mock).mockReturnValue({
        ...mockHookReturn,
        palletEntries: [{
          ...mockPalletEntries[0],
          isActive: true,
          startTime: new Date().toISOString()
        }]
      });

      renderWithProviders(<PalletCounter />);
      const timerElement = screen.getByRole('timer');
      expect(timerElement).toBeInTheDocument();
      expect(timerElement).toHaveTextContent(/active/i);
    });

    it('toggles timer when timer button is clicked', () => {
      renderWithProviders(<PalletCounter />);
      const timerButton = screen.getByRole('button', { name: /start timer/i });
      fireEvent.click(timerButton);
      expect(mockHookReturn.toggleTimer).toHaveBeenCalledWith('1');
    });
  });
}); 