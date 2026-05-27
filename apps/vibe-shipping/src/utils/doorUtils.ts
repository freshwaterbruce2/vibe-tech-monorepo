import { DoorSchedule } from '@/types/shipping'

/**
 * Find the next available door number in sequence
 * @param currentDoors - Array of existing door schedules
 * @returns Next available door number (332-454)
 */
export const findNextAvailableDoorNumber = (
  currentDoors: DoorSchedule[]
): number => {
  // If no doors exist, start with 332
  if (currentDoors.length === 0) {
    return 332
  }

  // Create a set of used door numbers for O(1) lookup
  const usedDoorNumbers = new Set(currentDoors.map(door => door.doorNumber))

  // Find the first available door number starting from 332
  for (let doorNumber = 332; doorNumber <= 454; doorNumber++) {
    if (!usedDoorNumbers.has(doorNumber)) {
      return doorNumber
    }
  }

  // If all door numbers are used, return 332 (this should rarely happen with 10 door limit)
  console.warn('All door numbers 332-454 are in use, returning 332')
  return 332
}

/**
 * Find the next sequential door number (highest + 1, or first gap)
 * @param currentDoors - Array of existing door schedules
 * @returns Next sequential door number
 */
export const findNextSequentialDoorNumber = (
  currentDoors: DoorSchedule[]
): number => {
  // If no doors exist, start with 332
  if (currentDoors.length === 0) {
    return 332
  }

  // Sort doors by door number in ascending order
  const sortedDoors = [...currentDoors].sort(
    (a, b) => a.doorNumber - b.doorNumber
  )

  // Find the highest door number
  const highestDoorNumber = sortedDoors[sortedDoors.length - 1]!.doorNumber

  // If we can increment the highest number, do so
  if (highestDoorNumber < 454) {
    return highestDoorNumber + 1
  }

  // Otherwise, find the first gap in the sequence
  return findNextAvailableDoorNumber(currentDoors)
}

/**
 * Validate if a door number is within the valid range
 * @param doorNumber - Door number to validate
 * @returns True if valid, false otherwise
 */
export const isValidDoorNumber = (doorNumber: number): boolean => {
  return doorNumber >= 332 && doorNumber <= 454 && Number.isInteger(doorNumber)
}

/**
 * Check if a door number is already in use
 * @param doorNumber - Door number to check
 * @param currentDoors - Array of existing door schedules
 * @returns True if in use, false otherwise
 */
export const isDoorNumberInUse = (
  doorNumber: number,
  currentDoors: DoorSchedule[]
): boolean => {
  return currentDoors.some(door => door.doorNumber === doorNumber)
}
