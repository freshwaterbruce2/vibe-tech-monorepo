// Using Jest instead of vitest
import {
  findNextAvailableDoorNumber,
  findNextSequentialDoorNumber,
  isValidDoorNumber,
  isDoorNumberInUse
} from '../doorUtils';
import { DoorSchedule } from '@/types/shipping';

// Mock door data for testing
const createMockDoor = (doorNumber: number): DoorSchedule => ({
  id: `door-${doorNumber}`,
  doorNumber,
  destinationDC: '6024',
  freightType: '23/43',
  trailerStatus: 'empty',
  palletCount: 0,
  timestamp: new Date().toISOString(),
  createdBy: 'test-user',
  tcrPresent: false,
});

describe('doorUtils', () => {
  describe('findNextAvailableDoorNumber', () => {
    it('should return 332 when no doors exist', () => {
      expect(findNextAvailableDoorNumber([])).toBe(332);
    });

    it('should find the first gap in door numbers', () => {
      const doors = [
        createMockDoor(332),
        createMockDoor(333),
        createMockDoor(335), // Gap at 334
      ];
      expect(findNextAvailableDoorNumber(doors)).toBe(334);
    });

    it('should return the next available number after existing doors', () => {
      const doors = [
        createMockDoor(332),
        createMockDoor(333),
        createMockDoor(334),
      ];
      expect(findNextAvailableDoorNumber(doors)).toBe(335);
    });
  });

  describe('findNextSequentialDoorNumber', () => {
    it('should return 332 when no doors exist', () => {
      expect(findNextSequentialDoorNumber([])).toBe(332);
    });

    it('should return highest door number + 1', () => {
      const doors = [
        createMockDoor(332),
        createMockDoor(335),
        createMockDoor(333),
      ];
      expect(findNextSequentialDoorNumber(doors)).toBe(336);
    });

    it('should find gap when highest number exceeds 454', () => {
      const doors = [
        createMockDoor(454),
        createMockDoor(333), // Gap at 332
      ];
      expect(findNextSequentialDoorNumber(doors)).toBe(332);
    });
  });

  describe('isValidDoorNumber', () => {
    it('should return true for valid door numbers', () => {
      expect(isValidDoorNumber(332)).toBe(true);
      expect(isValidDoorNumber(400)).toBe(true);
      expect(isValidDoorNumber(454)).toBe(true);
    });

    it('should return false for invalid door numbers', () => {
      expect(isValidDoorNumber(331)).toBe(false);
      expect(isValidDoorNumber(455)).toBe(false);
      expect(isValidDoorNumber(332.5)).toBe(false);
    });
  });

  describe('isDoorNumberInUse', () => {
    const doors = [
      createMockDoor(332),
      createMockDoor(335),
    ];

    it('should return true for used door numbers', () => {
      expect(isDoorNumberInUse(332, doors)).toBe(true);
      expect(isDoorNumberInUse(335, doors)).toBe(true);
    });

    it('should return false for unused door numbers', () => {
      expect(isDoorNumberInUse(333, doors)).toBe(false);
      expect(isDoorNumberInUse(400, doors)).toBe(false);
    });
  });
});
