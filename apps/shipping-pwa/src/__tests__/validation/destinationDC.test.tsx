import { render, screen } from '../utils/test-utils';
import DoorEntryRow from '@/components/DoorEntryRow';
import { createTestDoor, validDestinationDCs } from '../utils/test-utils';
import { DoorSchedule, DestinationDC } from '@/types/shipping';

describe('Destination DC Validation', () => {
  const mockUpdate = vi.fn();
  const mockRemove = vi.fn();

  beforeEach(() => {
    mockUpdate.mockClear();
    mockRemove.mockClear();
  });

  describe('Valid Destination DCs', () => {
    // Assert that validDestinationDCs contains valid DestinationDC values
    const typedValidDCs = validDestinationDCs as unknown as DestinationDC[];
    
    test.each(typedValidDCs)('accepts valid destination DC %s', (destinationDC: DestinationDC) => {
      const door = createTestDoor({ destinationDC });
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
      
      // DC should be displayed
      expect(screen.getByText(destinationDC)).toBeInTheDocument();
    });
  });

  describe('Invalid Destination DCs', () => {
    const invalidDCs = ['1234', '12345', 'ABCD', '', null] as const;

    test.each(invalidDCs)('rejects invalid destination DC %s', (invalidDC) => {
      // Cast to unknown first then to DestinationDC to simulate runtime error
      const door = createTestDoor({ destinationDC: invalidDC as unknown as DestinationDC });
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
      expect(error).toHaveTextContent(/invalid destination dc/i);
    });
  });

  test('handles DC format validation', () => {
    // Test with numeric DC to ensure string type is enforced
    const door = createTestDoor({ destinationDC: 6024 as unknown as DestinationDC });
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

    // Should show validation error due to wrong type
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent(/invalid destination dc/i);
  });

  test('handles DC change via update', () => {
    const door = createTestDoor();
    const { rerender } = render(
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

    // Initial DC should be valid
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Update with invalid DC
    const updatedDoor: DoorSchedule = {
      ...door,
      destinationDC: 'invalid' as unknown as DestinationDC
    };
    rerender(
      <table>
        <tbody>
          <DoorEntryRow
            door={updatedDoor}
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
    expect(error).toHaveTextContent(/invalid destination dc/i);
  });
}); 