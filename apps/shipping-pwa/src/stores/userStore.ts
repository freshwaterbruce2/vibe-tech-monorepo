import { UserSettings } from '@/types/shipping'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Enhanced user interface
export interface User {
  id: string
  username: string
  displayName: string
  email?: string
  role: 'manager' | 'operator' | 'supervisor' | 'admin'
  department: string
  shift?: 'day' | 'evening' | 'night'
  avatar?: string
  preferences: UserPreferences
  permissions: UserPermissions
  createdAt: string
  lastLoginAt?: string
  isActive: boolean
}

// User preferences interface
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: 'en' | 'es' | 'fr'
  timezone: string
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'
  notifications: {
    desktop: boolean
    sound: boolean
    vibration: boolean
    email: boolean
  }
  accessibility: {
    highContrast: boolean
    largeText: boolean
    reduceMotion: boolean
    screenReader: boolean
  }
  layout: {
    compactMode: boolean
    showHelpTips: boolean
    quickAccessPanel: boolean
  }
}

// User permissions interface
export interface UserPermissions {
  canCreateShipments: boolean
  canEditShipments: boolean
  canDeleteShipments: boolean
  canExportData: boolean
  canViewAnalytics: boolean
  canManageUsers: boolean
  canConfigureSystem: boolean
  canAccessAdminPanel: boolean
  maxShipmentsPerDay?: number
  allowedDCDestinations: string[]
  allowedFreightTypes: string[]
}

// User state interface
interface UserState {
  // Current user
  currentUser: User | null
  isAuthenticated: boolean

  // User settings (legacy support)
  settings: UserSettings

  // Session information
  sessionId: string | null
  loginTime: string | null
  lastActivityTime: string | null

  // Authentication state
  isLoading: boolean
  authError: string | null

  // User management (for admin users)
  allUsers: User[]
  selectedUser: User | null
}

// Actions interface
interface UserActions {
  // Authentication
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refreshAuth: () => Promise<boolean>

  // User management
  updateUser: (userId: string, updates: Partial<User>) => void
  updateCurrentUser: (updates: Partial<User>) => void
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void
  updateUserPermissions: (
    userId: string,
    permissions: Partial<UserPermissions>
  ) => void

  // Settings management (legacy support)
  updateSettings: (settings: Partial<UserSettings>) => void
  resetSettings: () => void

  // Session management
  updateLastActivity: () => void
  isSessionValid: () => boolean
  extendSession: () => void

  // User creation and management (admin only)
  createUser: (userData: Omit<User, 'id' | 'createdAt' | 'isActive'>) => string
  deleteUser: (userId: string) => void
  toggleUserStatus: (userId: string) => void
  setSelectedUser: (user: User | null) => void

  // Bulk operations
  importUsers: (users: Partial<User>[]) => void
  exportUsers: () => User[]

  // Utility functions
  getUsersByRole: (role: User['role']) => User[]
  getUsersByDepartment: (department: string) => User[]
  getActiveUsers: () => User[]
  hasPermission: (permission: keyof UserPermissions) => boolean
  canAccessFeature: (feature: string) => boolean

  // Error handling
  setAuthError: (error: string | null) => void
  clearAuthError: () => void
}

// Combined store type
type UserStore = UserState & UserActions

// Default user preferences
const defaultPreferences: UserPreferences = {
  theme: 'auto',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  notifications: {
    desktop: true,
    sound: true,
    vibration: true,
    email: false,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    screenReader: false,
  },
  layout: {
    compactMode: false,
    showHelpTips: true,
    quickAccessPanel: true,
  },
}

// Default user permissions
const defaultPermissions: UserPermissions = {
  canCreateShipments: true,
  canEditShipments: true,
  canDeleteShipments: false,
  canExportData: true,
  canViewAnalytics: false,
  canManageUsers: false,
  canConfigureSystem: false,
  canAccessAdminPanel: false,
  allowedDCDestinations: ['6024', '6070', '6039', '6040', '7045'],
  allowedFreightTypes: ['23/43', '28', 'XD'],
}

// Default user settings (legacy support)
const defaultSettings: UserSettings = {
  interactionMode: 'tap',
  enableActionButton: true,
  lastUsedDC: '6024',
  lastUsedFreightType: '23/43',
  autoExportOnShiftEnd: false,
  voiceRecognitionEnabled: true,
  voiceEngine: 'browser',
  noiseSuppression: true,
  confidenceThreshold: 0.7,
  commandTimeout: 5000,
  useGrammar: false,
  autoStop: true,
  speakBackCommands: false,
  voiceVolume: 1.0,
  voiceAcceptPartialResults: false,
  voiceActivationMode: 'button',
  voiceFeedback: true,
}

// Default user
const createDefaultUser = (): User => ({
  id: '1',
  username: 'user1',
  displayName: 'Warehouse Manager',
  email: 'manager@dc8980.com',
  role: 'manager',
  department: 'Shipping',
  shift: 'day',
  preferences: defaultPreferences,
  permissions: defaultPermissions,
  createdAt: new Date().toISOString(),
  isActive: true,
})

// Generate unique ID
const generateId = (): string => {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Generate session ID
const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create the user store with Immer middleware for safe mutations
export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        currentUser: createDefaultUser(),
        isAuthenticated: true, // Default to authenticated for demo
        settings: defaultSettings,
        sessionId: null,
        loginTime: null,
        lastActivityTime: null,
        isLoading: false,
        authError: null,
        allUsers: [createDefaultUser()],
        selectedUser: null,

        // Authentication
        login: async (username, _password) => {
          set(state => {
            state.isLoading = true
            state.authError = null
          })

          try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Find user (demo implementation)
            const user = get().allUsers.find(u => u.username === username)

            if (user?.isActive) {
              const sessionId = generateSessionId()
              const loginTime = new Date().toISOString()

              set(state => {
                state.currentUser = { ...user, lastLoginAt: loginTime }
                state.isAuthenticated = true
                state.sessionId = sessionId
                state.loginTime = loginTime
                state.lastActivityTime = loginTime
                state.isLoading = false
              })

              // Update user's last login
              get().updateUser(user.id, { lastLoginAt: loginTime })

              return true
            } else {
              set(state => {
                state.authError = 'Invalid username or password'
                state.isLoading = false
              })
              return false
            }
          } catch (_error) {
            set(state => {
              state.authError = 'Login failed. Please try again.'
              state.isLoading = false
            })
            return false
          }
        },

        logout: () => {
          set(state => {
            state.currentUser = null
            state.isAuthenticated = false
            state.sessionId = null
            state.loginTime = null
            state.lastActivityTime = null
            state.authError = null
          })
        },

        refreshAuth: async () => {
          // Simulate token refresh
          if (get().isSessionValid()) {
            get().updateLastActivity()
            return true
          }

          get().logout()
          return false
        },

        // User management
        updateUser: (userId, updates) => {
          set(state => {
            const userIndex = state.allUsers.findIndex(u => u.id === userId)
            if (userIndex !== -1) {
              const user = state.allUsers[userIndex]!
              Object.assign(user, updates)

              // Update current user if it's the one being updated
              if (state.currentUser?.id === userId) {
                Object.assign(state.currentUser, updates)
              }
            }
          })
        },

        updateCurrentUser: updates => {
          const currentUser = get().currentUser
          if (currentUser) {
            get().updateUser(currentUser.id, updates)
          }
        },

        updateUserPreferences: preferences => {
          const currentUser = get().currentUser
          if (currentUser) {
            get().updateUser(currentUser.id, {
              preferences: { ...currentUser.preferences, ...preferences },
            })
          }
        },

        updateUserPermissions: (userId, permissions) => {
          const user = get().allUsers.find(u => u.id === userId)
          if (user) {
            get().updateUser(userId, {
              permissions: { ...user.permissions, ...permissions },
            })
          }
        },

        // Settings management (legacy support)
        updateSettings: newSettings => {
          set(state => {
            state.settings = { ...state.settings, ...newSettings }
          })

          // Also update current user preferences for consistency
          const currentUser = get().currentUser
          if (currentUser) {
            // Map some settings to preferences
            const preferenceUpdates: Partial<UserPreferences> = {}

            if (newSettings.voiceRecognitionEnabled !== undefined) {
              preferenceUpdates.notifications = {
                ...currentUser.preferences.notifications,
                sound: newSettings.voiceRecognitionEnabled,
              }
            }

            if (Object.keys(preferenceUpdates).length > 0) {
              get().updateUserPreferences(preferenceUpdates)
            }
          }
        },

        resetSettings: () => {
          set(state => {
            state.settings = { ...defaultSettings }
          })
        },

        // Session management
        updateLastActivity: () => {
          set(state => {
            state.lastActivityTime = new Date().toISOString()
          })
        },

        isSessionValid: () => {
          const { sessionId, lastActivityTime } = get()
          if (!sessionId || !lastActivityTime) return false

          const now = Date.now()
          const lastActivity = new Date(lastActivityTime).getTime()
          const sessionTimeout = 30 * 60 * 1000 // 30 minutes

          return now - lastActivity < sessionTimeout
        },

        extendSession: () => {
          if (get().isSessionValid()) {
            get().updateLastActivity()
          }
        },

        // User creation and management (admin only)
        createUser: userData => {
          const id = generateId()
          const newUser: User = {
            ...userData,
            id,
            createdAt: new Date().toISOString(),
            isActive: true,
            preferences: { ...defaultPreferences, ...userData.preferences },
            permissions: { ...defaultPermissions, ...userData.permissions },
          }

          set(state => {
            state.allUsers.push(newUser)
          })

          return id
        },

        deleteUser: userId => {
          set(state => {
            state.allUsers = state.allUsers.filter(u => u.id !== userId)
            if (state.selectedUser?.id === userId) {
              state.selectedUser = null
            }
          })
        },

        toggleUserStatus: userId => {
          const user = get().allUsers.find(u => u.id === userId)
          if (user) {
            get().updateUser(userId, { isActive: !user.isActive })
          }
        },

        setSelectedUser: user => {
          set(state => {
            state.selectedUser = user
          })
        },

        // Bulk operations
        importUsers: users => {
          const newUsers = users.map(userData => {
            const id = generateId()
            return {
              id,
              username: userData.username ?? `user${id}`,
              displayName: userData.displayName ?? 'User',
              role: userData.role ?? 'operator',
              department: userData.department ?? 'Shipping',
              preferences: { ...defaultPreferences, ...userData.preferences },
              permissions: { ...defaultPermissions, ...userData.permissions },
              createdAt: new Date().toISOString(),
              isActive: true,
              ...userData,
            } as User
          })

          set(state => {
            state.allUsers.push(...newUsers)
          })
        },

        exportUsers: () => {
          return get().allUsers
        },

        // Utility functions
        getUsersByRole: role => {
          return get().allUsers.filter(
            user => user.role === role && user.isActive
          )
        },

        getUsersByDepartment: department => {
          return get().allUsers.filter(
            user => user.department === department && user.isActive
          )
        },

        getActiveUsers: () => {
          return get().allUsers.filter(user => user.isActive)
        },

        hasPermission: permission => {
          const currentUser = get().currentUser
          return !!(currentUser?.permissions?.[permission] ?? false)
        },

        canAccessFeature: feature => {
          const currentUser = get().currentUser
          if (!currentUser) return false

          // Define feature-permission mapping
          const featurePermissions: Record<string, keyof UserPermissions> = {
            'create-shipment': 'canCreateShipments',
            'edit-shipment': 'canEditShipments',
            'delete-shipment': 'canDeleteShipments',
            'export-data': 'canExportData',
            'view-analytics': 'canViewAnalytics',
            'manage-users': 'canManageUsers',
            'system-config': 'canConfigureSystem',
            'admin-panel': 'canAccessAdminPanel',
          }

          const requiredPermission = featurePermissions[feature]
          return requiredPermission
            ? get().hasPermission(requiredPermission)
            : false
        },

        // Error handling
        setAuthError: error => {
          set(state => {
            state.authError = error
          })
        },

        clearAuthError: () => {
          set(state => {
            state.authError = null
          })
        },
      })),
      {
        name: 'user-storage',
        partialize: state => ({
          currentUser: state.currentUser,
          isAuthenticated: state.isAuthenticated,
          settings: state.settings,
          allUsers: state.allUsers,
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
)

// Selector hooks for better performance
export const useCurrentUser = () => useUserStore(state => state.currentUser)
export const useIsAuthenticated = () =>
  useUserStore(state => state.isAuthenticated)
export const useUserSettings = () => useUserStore(state => state.settings)
export const useUserPreferences = () =>
  useUserStore(state => state.currentUser?.preferences)
export const useUserPermissions = () =>
  useUserStore(state => state.currentUser?.permissions)
export const useAuthLoading = () => useUserStore(state => state.isLoading)
export const useAuthError = () => useUserStore(state => state.authError)
export const useAllUsers = () => useUserStore(state => state.allUsers)
export const useSelectedUser = () => useUserStore(state => state.selectedUser)
