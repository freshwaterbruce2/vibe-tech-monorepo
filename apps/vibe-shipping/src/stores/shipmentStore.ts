import { DestinationDC, DoorSchedule, PalletEntry } from '@/types/shipping'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Shipment state interface
interface ShipmentState {
  // Door schedules
  doorSchedules: DoorSchedule[]
  selectedDoorSchedule: DoorSchedule | null

  // Pallet entries
  palletEntries: PalletEntry[]
  activePalletEntry: PalletEntry | null

  // Loading states
  isLoading: boolean
  isSaving: boolean

  // Error handling
  error: string | null

  // Statistics
  stats: {
    totalShipments: number
    completedShipments: number
    totalPallets: number
    averagePalletsPerDoor: number
    lastUpdated: string | null
  }
}

// Actions interface
interface ShipmentActions {
  // Door schedule actions
  addDoorSchedule: (schedule: Omit<DoorSchedule, 'id' | 'timestamp'>) => void
  updateDoorSchedule: (id: string, updates: Partial<DoorSchedule>) => void
  deleteDoorSchedule: (id: string) => void
  setSelectedDoorSchedule: (schedule: DoorSchedule | null) => void
  getDoorSchedulesByDC: (dc: DestinationDC) => DoorSchedule[]

  // Pallet entry actions
  addPalletEntry: (entry: Omit<PalletEntry, 'id' | 'timestamp'>) => void
  updatePalletEntry: (id: string, updates: Partial<PalletEntry>) => void
  deletePalletEntry: (id: string) => void
  setActivePalletEntry: (entry: PalletEntry | null) => void

  // Data management
  clearAllData: () => void
  importData: (data: {
    doorSchedules: DoorSchedule[]
    palletEntries: PalletEntry[]
  }) => void
  exportData: () => {
    doorSchedules: DoorSchedule[]
    palletEntries: PalletEntry[]
  }

  // Loading and error states
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setError: (error: string | null) => void

  // Statistics
  updateStats: () => void
}

// Combined store type
type ShipmentStore = ShipmentState & ShipmentActions

// Generate unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create the shipment store with TypeScript, persistence, and devtools
export const useShipmentStore = create<ShipmentStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        doorSchedules: [],
        selectedDoorSchedule: null,
        palletEntries: [],
        activePalletEntry: null,
        isLoading: false,
        isSaving: false,
        error: null,
        stats: {
          totalShipments: 0,
          completedShipments: 0,
          totalPallets: 0,
          averagePalletsPerDoor: 0,
          lastUpdated: null,
        },

        // Door schedule actions
        addDoorSchedule: scheduleData => {
          const newSchedule: DoorSchedule = {
            ...scheduleData,
            id: generateId(),
            timestamp: new Date().toISOString(),
          }
          set(state => ({
            ...state,
            doorSchedules: [...state.doorSchedules, newSchedule],
            stats: {
              ...state.stats,
              totalShipments: state.stats.totalShipments + 1,
              lastUpdated: new Date().toISOString(),
            },
          }))
          get().updateStats()
        },

        updateDoorSchedule: (id, updates) => {
          set(state => {
            const scheduleIndex = state.doorSchedules.findIndex(
              s => s.id === id
            )
            if (scheduleIndex === -1) return state

            const updatedSchedules = [...state.doorSchedules]
            const existing = updatedSchedules[scheduleIndex]!
            updatedSchedules[scheduleIndex] = {
              ...existing,
              ...updates,
              id: existing.id,
              updatedAt: new Date().toISOString(),
            }

            return {
              ...state,
              doorSchedules: updatedSchedules,
              selectedDoorSchedule:
                state.selectedDoorSchedule?.id === id
                  ? { ...state.selectedDoorSchedule, ...updates }
                  : state.selectedDoorSchedule,
            }
          })
          get().updateStats()
        },

        deleteDoorSchedule: id => {
          set(state => ({
            ...state,
            doorSchedules: state.doorSchedules.filter(s => s.id !== id),
            selectedDoorSchedule:
              state.selectedDoorSchedule?.id === id
                ? null
                : state.selectedDoorSchedule,
            stats: {
              ...state.stats,
              totalShipments: Math.max(0, state.stats.totalShipments - 1),
            },
          }))
          get().updateStats()
        },

        setSelectedDoorSchedule: schedule => {
          set(state => ({ ...state, selectedDoorSchedule: schedule }))
        },

        getDoorSchedulesByDC: dc => {
          return get().doorSchedules.filter(
            schedule => schedule.destinationDC === dc
          )
        },

        // Pallet entry actions
        addPalletEntry: entryData => {
          const newEntry: PalletEntry = {
            ...entryData,
            id: generateId(),
            timestamp: new Date().toISOString(),
            isActive: false,
          }
          set(state => ({
            ...state,
            palletEntries: [...state.palletEntries, newEntry],
            stats: {
              ...state.stats,
              totalPallets: state.stats.totalPallets + entryData.count,
            },
          }))
          get().updateStats()
        },

        updatePalletEntry: (id, updates) => {
          set(state => {
            const entryIndex = state.palletEntries.findIndex(e => e.id === id)
            if (entryIndex === -1) return state

            const oldEntry = state.palletEntries[entryIndex]!
            const updatedEntries = [...state.palletEntries]
            updatedEntries[entryIndex] = {
              ...oldEntry,
              ...updates,
              id: oldEntry.id,
              updatedAt: new Date().toISOString(),
            }

            const countDiff =
              updates.count !== undefined ? updates.count - oldEntry.count : 0

            return {
              ...state,
              palletEntries: updatedEntries,
              activePalletEntry:
                state.activePalletEntry?.id === id
                  ? { ...state.activePalletEntry, ...updates }
                  : state.activePalletEntry,
              stats: {
                ...state.stats,
                totalPallets: state.stats.totalPallets + countDiff,
              },
            }
          })
          get().updateStats()
        },

        deletePalletEntry: id => {
          set(state => {
            const entry = state.palletEntries.find(e => e.id === id)
            const palletCountReduction = entry ? entry.count : 0

            return {
              ...state,
              palletEntries: state.palletEntries.filter(e => e.id !== id),
              activePalletEntry:
                state.activePalletEntry?.id === id
                  ? null
                  : state.activePalletEntry,
              stats: {
                ...state.stats,
                totalPallets: Math.max(
                  0,
                  state.stats.totalPallets - palletCountReduction
                ),
              },
            }
          })
          get().updateStats()
        },

        setActivePalletEntry: entry => {
          set(state => ({ ...state, activePalletEntry: entry }))
        },

        // Data management
        clearAllData: () => {
          set(state => ({
            ...state,
            doorSchedules: [],
            palletEntries: [],
            selectedDoorSchedule: null,
            activePalletEntry: null,
            error: null,
            stats: {
              totalShipments: 0,
              completedShipments: 0,
              totalPallets: 0,
              averagePalletsPerDoor: 0,
              lastUpdated: null,
            },
          }))
        },

        importData: data => {
          set(state => ({
            ...state,
            doorSchedules: data.doorSchedules || [],
            palletEntries: data.palletEntries || [],
            selectedDoorSchedule: null,
            activePalletEntry: null,
            error: null,
          }))
          get().updateStats()
        },

        exportData: () => {
          const state = get()
          return {
            doorSchedules: state.doorSchedules,
            palletEntries: state.palletEntries,
          }
        },

        // Loading and error states
        setLoading: loading => {
          set(state => ({ ...state, isLoading: loading }))
        },

        setSaving: saving => {
          set(state => ({ ...state, isSaving: saving }))
        },

        setError: error => {
          set(state => ({ ...state, error }))
        },

        // Statistics
        updateStats: () => {
          set(state => {
            const totalShipments = state.doorSchedules.length
            const completedShipments = state.doorSchedules.filter(
              s => s.trailerStatus === 'shipload'
            ).length
            const totalPallets = state.palletEntries.reduce(
              (sum, entry) => sum + entry.count,
              0
            )
            const averagePalletsPerDoor =
              totalShipments > 0 ? totalPallets / totalShipments : 0

            return {
              ...state,
              stats: {
                totalShipments,
                completedShipments,
                totalPallets,
                averagePalletsPerDoor: parseFloat(
                  averagePalletsPerDoor.toFixed(2)
                ),
                lastUpdated: new Date().toISOString(),
              },
            }
          })
        },
      }),
      {
        name: 'shipment-storage',
        partialize: state => ({
          doorSchedules: state.doorSchedules,
          palletEntries: state.palletEntries,
          stats: state.stats,
        }),
      }
    ),
    {
      name: 'shipment-store',
    }
  )
)

// Selector hooks for better performance
export const useShipmentStats = () => useShipmentStore(state => state.stats)
export const useDoorSchedules = () =>
  useShipmentStore(state => state.doorSchedules)
export const usePalletEntries = () =>
  useShipmentStore(state => state.palletEntries)
export const useSelectedDoorSchedule = () =>
  useShipmentStore(state => state.selectedDoorSchedule)
export const useActivePalletEntry = () =>
  useShipmentStore(state => state.activePalletEntry)
export const useShipmentLoading = () =>
  useShipmentStore(state => ({
    isLoading: state.isLoading,
    isSaving: state.isSaving,
  }))
export const useShipmentError = () => useShipmentStore(state => state.error)
