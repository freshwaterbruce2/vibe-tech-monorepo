import { render, screen } from '../utils/test-utils';
import DoorEntryRow from '@/components/DoorEntryRow';
import { createTestDoor, validDoorNumbers, invalidDoorNumbers } from '../utils/test-utils';
import { DoorSchedule } from '@/types/shipping';

describe('Door Number Validation', () => {
  const mockUpdate = vi.fn();
  const mockRemove = vi.fn();

  beforeEach(() => {
    mockUpdate.mockClear();
    mockRemove.mockClear();
  });

  describe('Valid Door Numbers', () => {
    test.each(validDoorNumbers)('accepts valid door number %i', (doorNumber) => {
      const door = createTestDoor({ doorNumber });
      render(
        <table>
          <tbody>
            <DoorEntryRow
              door={door}
              updateDoorSchedule={mockUpdate}
              removeDoor={mockRemove}
              isAnimated={false}
              isMobileView={false}
            />
          </tbody>
        </table>
      );

      // Should not show validation error
      const error = screen.queryByRole('alert');
      expect(error).not.toBeInTheDocument();
      
      // Door number should be displayed
      expect(screen.getByText(doorNumber.toString())).toBeInTheDocument();
    });
  });

  describe('Invalid Door Numbers', () => {
    test.each(invalidDoorNumbers)('rejects invalid door number %i', (doorNumber) => {
      const door = createTestDoor({ doorNumber });
      render(
        <table>
          <tbody>
            <DoorEntryRow
              door={door}
              updateDoorSchedule={mockUpdate}
              removeDoor={mockRemove}
              isAnimated={false}
              isMobileView={false}
            />
          </tbody>
        </table>
      );

      // Should show validation error
      const error = screen.getByRole('alert');
      expect(error).toHaveTextContent(/invalid door number/i);
    });
  });

  test('handles door number type conversion correctly', () => {
    // Test with string number to ensure type conversion works
    const door = createTestDoor({ doorNumber: 342 });
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={door}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>
    );

    // Should not show validation error
    const error = screen.queryByRole('alert');
    expect(error).not.toBeInTheDocument();
  });

  test('handles undefined/null door number', () => {
    // Create a door with an invalid door number for testing
    const door: DoorSchedule = {
      ...createTestDoor(),
      doorNumber: null as unknown as number
    };
    
    render(
      <table>
        <tbody>
          <DoorEntryRow
            door={door}
            updateDoorSchedule={mockUpdate}
            removeDoor={mockRemove}
            isAnimated={false}
            isMobileView={false}
          />
        </tbody>
      </table>
    );

    // Should show validation error
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent(/invalid door number/i);
  });
}); 