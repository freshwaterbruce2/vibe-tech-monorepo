import { render, screen } from '../utils/test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import DoorEntryRow from '@/components/DoorEntryRow';
import { createTestDoor } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  describe('DoorEntryRow Accessibility', () => {
    const mockUpdate = vi.fn();
    const mockRemove = vi.fn();
    const door = createTestDoor();

    beforeEach(() => {
      mockUpdate.mockClear();
      mockRemove.mockClear();
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
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
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels for interactive elements', () => {
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

      // Check buttons have proper aria-labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });

      // Check specific aria-labels
      expect(screen.getByRole('button', { name: /increment pallet count/i }))
        .toBeInTheDocument();
      expect(screen.getByRole('button', { name: /decrement pallet count/i }))
        .toBeInTheDocument();
      expect(screen.getByRole('button', { name: new RegExp(`remove door ${door.doorNumber}`, 'i') }))
        .toBeInTheDocument();
    });

    it('maintains proper focus management', () => {
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

      // Test focus management
      const incrementButton = screen.getByRole('button', { name: /increment pallet count/i });
      incrementButton.focus();
      expect(document.activeElement).toBe(incrementButton);

      // Simulate click and check focus remains
      incrementButton.click();
      expect(document.activeElement).toBe(incrementButton);
    });

    it('provides status updates via aria-live regions', () => {
      const { container } = render(
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

      // Check for aria-live regions
      const liveRegions = container.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);

      // Check specific live regions
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('ensures all interactive elements are keyboard accessible', async () => {
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

      // All interactive elements should be focusable
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex', '0');
      });

      // Test keyboard navigation
      const firstButton = interactiveElements[0];
      const secondButton = interactiveElements[1];

      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // Simulate tab navigation
      await userEvent.tab();
      expect(document.activeElement).toBe(secondButton);
    });
  });
}); 