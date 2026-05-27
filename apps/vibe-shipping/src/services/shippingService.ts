import {
  DestinationDC,
  DoorSchedule,
  FreightType,
  TrailerStatus,
} from '@/types/shipping'

/**
 * Service class for managing shipping door schedules and business logic
 */
export class ShippingService {
  private static readonly STORAGE_KEY = 'doorSchedules'
  private static readonly VALID_DOOR_RANGE = { min: 332, max: 454 }

  /**
   * Validates if a door number is within the valid range
   */
  static isValidDoorNumber(doorNumber: number): boolean {
    return (
      doorNumber >= this.VALID_DOOR_RANGE.min &&
      doorNumber <= this.VALID_DOOR_RANGE.max
    )
  }

  /**
   * Validates a complete door schedule object
   */
  static validateDoorSchedule(door: Partial<DoorSchedule>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!door.doorNumber || !this.isValidDoorNumber(door.doorNumber)) {
      errors.push(
        `Door number must be between ${this.VALID_DOOR_RANGE.min} and ${this.VALID_DOOR_RANGE.max}`
      )
    }

    if (!door.destinationDC) {
      errors.push('Destination DC is required')
    }

    if (!door.freightType) {
      errors.push('Freight type is required')
    }

    if (!door.trailerStatus) {
      errors.push('Trailer status is required')
    }

    if (door.palletCount !== undefined && door.palletCount < 0) {
      errors.push('Pallet count cannot be negative')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Creates a new door schedule with default values
   */
  static createDoorSchedule(
    doorNumber: number,
    destinationDC: DestinationDC,
    freightType: FreightType,
    trailerStatus: TrailerStatus,
    createdBy: string,
    options?: {
      palletCount?: number
      tcrPresent?: boolean
      notes?: string
    }
  ): DoorSchedule {
    const now = new Date().toISOString()

    return {
      id: this.generateId(),
      doorNumber,
      destinationDC,
      freightType,
      trailerStatus,
      palletCount: options?.palletCount ?? 0,
      timestamp: now,
      createdBy,
      tcrPresent: options?.tcrPresent ?? false,
      notes: options?.notes ?? '',
    }
  }

  /**
   * Generates a unique ID for door schedules
   */
  private static generateId(): string {
    return `door-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Loads all door schedules from storage
   */
  static async loadDoorSchedules(): Promise<DoorSchedule[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []

      const doors = JSON.parse(stored) as DoorSchedule[]
      return doors.filter(door => this.validateDoorSchedule(door).isValid)
    } catch (error) {
      console.error('Error loading door schedules:', error)
      return []
    }
  }

  /**
   * Saves door schedules to storage
   */
  static async saveDoorSchedules(doors: DoorSchedule[]): Promise<void> {
    try {
      // Validate all doors before saving
      const validDoors = doors.filter(
        door => this.validateDoorSchedule(door).isValid
      )

      if (validDoors.length !== doors.length) {
        console.warn(
          `${doors.length - validDoors.length} invalid doors were filtered out during save`
        )
      }

      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(validDoors)
      )
    } catch (error) {
      console.error('Error saving door schedules:', error)
      throw new Error('Failed to save door schedules')
    }
  }

  /**
   * Adds a new door schedule
   */
  static async addDoorSchedule(door: DoorSchedule): Promise<DoorSchedule[]> {
    const validation = this.validateDoorSchedule(door)
    if (!validation.isValid) {
      throw new Error(`Invalid door schedule: ${validation.errors.join(', ')}`)
    }

    const existingDoors = await this.loadDoorSchedules()

    // Check for duplicate door numbers
    const existingDoor = existingDoors.find(
      d => d.doorNumber === door.doorNumber
    )
    if (existingDoor) {
      throw new Error(`Door ${door.doorNumber} is already scheduled`)
    }

    const updatedDoors = [...existingDoors, door]
    await this.saveDoorSchedules(updatedDoors)

    return updatedDoors
  }

  /**
   * Updates an existing door schedule
   */
  static async updateDoorSchedule(
    doorId: string,
    updates: Partial<DoorSchedule>
  ): Promise<DoorSchedule[]> {
    const existingDoors = await this.loadDoorSchedules()
    const doorIndex = existingDoors.findIndex(d => d.id === doorId)

    if (doorIndex === -1) {
      throw new Error(`Door schedule with ID ${doorId} not found`)
    }

    const existing = existingDoors[doorIndex]!
    const updatedDoor: DoorSchedule = {
      ...existing,
      ...updates,
      id: existing.id,
      doorNumber: updates.doorNumber ?? existing.doorNumber,
      updatedAt: new Date().toISOString(),
    }

    const validation = this.validateDoorSchedule(updatedDoor)
    if (!validation.isValid) {
      throw new Error(
        `Invalid door schedule update: ${validation.errors.join(', ')}`
      )
    }

    // Check for duplicate door numbers (excluding current door)
    const duplicateDoor = existingDoors.find(
      (d, index) =>
        index !== doorIndex && d.doorNumber === updatedDoor.doorNumber
    )
    if (duplicateDoor) {
      throw new Error(`Door ${updatedDoor.doorNumber} is already scheduled`)
    }

    const updatedDoors = [...existingDoors]
    updatedDoors[doorIndex] = updatedDoor

    await this.saveDoorSchedules(updatedDoors)

    return updatedDoors
  }

  /**
   * Removes a door schedule
   */
  static async removeDoorSchedule(doorId: string): Promise<DoorSchedule[]> {
    const existingDoors = await this.loadDoorSchedules()
    const updatedDoors = existingDoors.filter(d => d.id !== doorId)

    if (updatedDoors.length === existingDoors.length) {
      throw new Error(`Door schedule with ID ${doorId} not found`)
    }

    await this.saveDoorSchedules(updatedDoors)

    return updatedDoors
  }

  /**
   * Gets door schedule by door number
   */
  static async getDoorByNumber(
    doorNumber: number
  ): Promise<DoorSchedule | null> {
    const doors = await this.loadDoorSchedules()
    return doors.find(d => d.doorNumber === doorNumber) ?? null
  }

  /**
   * Gets door schedule by ID
   */
  static async getDoorById(doorId: string): Promise<DoorSchedule | null> {
    const doors = await this.loadDoorSchedules()
    return doors.find(d => d.id === doorId) ?? null
  }

  /**
   * Updates pallet count for a specific door
   */
  static async updatePalletCount(
    doorId: string,
    newCount: number
  ): Promise<DoorSchedule[]> {
    if (newCount < 0) {
      throw new Error('Pallet count cannot be negative')
    }

    return this.updateDoorSchedule(doorId, { palletCount: newCount })
  }

  /**
   * Increments pallet count for a specific door
   */
  static async incrementPalletCount(
    doorId: string,
    increment = 1
  ): Promise<DoorSchedule[]> {
    const door = await this.getDoorById(doorId)
    if (!door) {
      throw new Error(`Door schedule with ID ${doorId} not found`)
    }

    const newCount = Math.max(0, door.palletCount + increment)
    return this.updatePalletCount(doorId, newCount)
  }

  /**
   * Gets summary statistics for all doors
   */
  static async getDoorSummary(): Promise<{
    totalDoors: number
    totalPallets: number
    doorsByStatus: Record<TrailerStatus, number>
    doorsByDC: Record<DestinationDC, number>
  }> {
    const doors = await this.loadDoorSchedules()

    const summary = {
      totalDoors: doors.length,
      totalPallets: doors.reduce((sum, door) => sum + door.palletCount, 0),
      doorsByStatus: {} as Record<TrailerStatus, number>,
      doorsByDC: {} as Record<DestinationDC, number>,
    }

    // Count by status
    doors.forEach(door => {
      summary.doorsByStatus[door.trailerStatus] =
        (summary.doorsByStatus[door.trailerStatus] || 0) + 1
    })

    // Count by DC
    doors.forEach(door => {
      summary.doorsByDC[door.destinationDC] =
        (summary.doorsByDC[door.destinationDC] || 0) + 1
    })

    return summary
  }

  /**
   * Exports door schedules to CSV format
   */
  static async exportToCSV(): Promise<string> {
    const doors = await this.loadDoorSchedules()

    if (doors.length === 0) {
      return 'No door schedules to export'
    }

    const headers = [
      'Door Number',
      'Destination DC',
      'Freight Type',
      'Trailer Status',
      'Pallet Count',
      'TCR Present',
      'Created By',
      'Created At',
      'Updated At',
      'Notes',
    ]

    const csvRows = [
      headers.join(','),
      ...doors.map(door =>
        [
          door.doorNumber,
          door.destinationDC,
          door.freightType,
          door.trailerStatus,
          door.palletCount,
          door.tcrPresent ? 'Yes' : 'No',
          door.createdBy,
          new Date(door.timestamp).toLocaleString(),
          door.updatedAt ? new Date(door.updatedAt).toLocaleString() : '',
          `"${door.notes ?? ''}"`, // Wrap notes in quotes to handle commas
        ].join(',')
      ),
    ]

    return csvRows.join('\n')
  }

  /**
   * Clears all door schedules (with confirmation)
   */
  static async clearAllDoors(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY)
  }
}
