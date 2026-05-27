import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Location coordinate interface
export interface Coordinates {
  latitude: number
  longitude: number
  accuracy?: number // in meters
  altitude?: number
  altitudeAccuracy?: number
  heading?: number // in degrees
  speed?: number // in m/s
}

// Map location interface
export interface MapLocation {
  id: string
  name: string
  type:
    | 'warehouse'
    | 'dock_door'
    | 'loading_bay'
    | 'parking'
    | 'checkpoint'
    | 'facility'
  coordinates: Coordinates
  address?: string
  description?: string
  metadata?: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

// Tracking point for shipment/vehicle tracking
export interface TrackingPoint {
  id: string
  timestamp: string
  coordinates: Coordinates
  shipmentId?: string
  vehicleId?: string
  driverName?: string
  status:
    | 'in_transit'
    | 'loading'
    | 'unloading'
    | 'idle'
    | 'delayed'
    | 'delivered'
  notes?: string
  estimatedArrival?: string
}

// Geofence interface for location-based alerts
export interface Geofence {
  id: string
  name: string
  type: 'circle' | 'polygon'
  center?: Coordinates // for circle type
  radius?: number // in meters, for circle type
  polygon?: Coordinates[] // for polygon type
  isActive: boolean
  triggers: GeofenceEvent[]
  createdAt: string
}

// Geofence event interface
export interface GeofenceEvent {
  id: string
  type: 'enter' | 'exit' | 'dwell'
  action: 'notify' | 'track' | 'alert' | 'log'
  threshold?: number // dwell time in minutes
  message?: string
}

// Route interface for delivery routes
export interface DeliveryRoute {
  id: string
  name: string
  origin: MapLocation
  destination: MapLocation
  waypoints: MapLocation[]
  distance: number // in meters
  estimatedDuration: number // in seconds
  actualDuration?: number
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  shipmentIds: string[]
  driverName?: string
  vehicleId?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

// Map state interface
interface MapState {
  // Current location and tracking
  currentLocation: Coordinates | null
  isLocationEnabled: boolean
  locationError: string | null
  lastLocationUpdate: string | null

  // Map view state
  mapCenter: Coordinates
  zoomLevel: number
  mapType: 'roadmap' | 'satellite' | 'hybrid' | 'terrain'

  // Locations and facilities
  locations: MapLocation[]
  selectedLocation: MapLocation | null

  // Tracking data
  trackingPoints: TrackingPoint[]
  activeTracking: TrackingPoint[]

  // Geofences
  geofences: Geofence[]
  activeGeofences: Geofence[]

  // Delivery routes
  routes: DeliveryRoute[]
  activeRoute: DeliveryRoute | null

  // Loading states
  isLoadingLocation: boolean
  isLoadingMap: boolean

  // Settings
  settings: {
    autoCenter: boolean
    showTrackingHistory: boolean
    trackingInterval: number // in seconds
    geofenceNotifications: boolean
    offlineMapCaching: boolean
    locationAccuracy: 'high' | 'medium' | 'low'
  }
}

// Actions interface
interface MapActions {
  // Location management
  requestLocation: () => Promise<Coordinates | null>
  updateCurrentLocation: (coordinates: Coordinates) => void
  startLocationTracking: () => void
  stopLocationTracking: () => void
  setLocationError: (error: string | null) => void

  // Map view controls
  setMapCenter: (coordinates: Coordinates) => void
  setZoomLevel: (zoom: number) => void
  setMapType: (mapType: MapState['mapType']) => void
  centerOnLocation: (locationId: string) => void
  fitBounds: (locations: MapLocation[]) => void

  // Location management
  addLocation: (location: Omit<MapLocation, 'id' | 'createdAt'>) => string
  updateLocation: (id: string, updates: Partial<MapLocation>) => void
  deleteLocation: (id: string) => void
  setSelectedLocation: (location: MapLocation | null) => void
  getLocationsByType: (type: MapLocation['type']) => MapLocation[]
  getNearbyLocations: (
    coordinates: Coordinates,
    radiusMeters: number
  ) => MapLocation[]

  // Tracking management
  addTrackingPoint: (point: Omit<TrackingPoint, 'id' | 'timestamp'>) => string
  updateTrackingPoint: (id: string, updates: Partial<TrackingPoint>) => void
  clearTrackingHistory: (olderThanHours: number) => void
  getTrackingByShipment: (shipmentId: string) => TrackingPoint[]
  getTrackingByVehicle: (vehicleId: string) => TrackingPoint[]

  // Geofence management
  addGeofence: (geofence: Omit<Geofence, 'id' | 'createdAt'>) => string
  updateGeofence: (id: string, updates: Partial<Geofence>) => void
  deleteGeofence: (id: string) => void
  toggleGeofence: (id: string) => void
  checkGeofenceEntry: (coordinates: Coordinates) => GeofenceEvent[]

  // Route management
  createRoute: (route: Omit<DeliveryRoute, 'id' | 'createdAt'>) => string
  updateRoute: (id: string, updates: Partial<DeliveryRoute>) => void
  deleteRoute: (id: string) => void
  setActiveRoute: (route: DeliveryRoute | null) => void
  startRoute: (routeId: string) => void
  completeRoute: (routeId: string) => void
  optimizeRoute: (routeId: string) => Promise<void>

  // Utilities
  calculateDistance: (from: Coordinates, to: Coordinates) => number
  calculateBearing: (from: Coordinates, to: Coordinates) => number
  isPointInCircle: (
    point: Coordinates,
    center: Coordinates,
    radius: number
  ) => boolean
  isPointInPolygon: (point: Coordinates, polygon: Coordinates[]) => boolean

  // Settings
  updateSettings: (settings: Partial<MapState['settings']>) => void
  resetSettings: () => void

  // Data management
  importLocations: (locations: MapLocation[]) => void
  exportMapData: () => {
    locations: MapLocation[]
    routes: DeliveryRoute[]
    geofences: Geofence[]
  }
  clearAllData: () => void
}

// Combined store type
type MapStore = MapState & MapActions

// Default settings
const defaultSettings: MapState['settings'] = {
  autoCenter: true,
  showTrackingHistory: true,
  trackingInterval: 30, // 30 seconds
  geofenceNotifications: true,
  offlineMapCaching: true,
  locationAccuracy: 'high',
}

// Default map center (Walmart DC 8980 - placeholder coordinates)
const defaultMapCenter: Coordinates = {
  latitude: 39.7392, // Columbus, OH area
  longitude: -104.9903,
}

// Generate unique ID
const generateId = (): string => {
  return `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Utility functions for geospatial calculations
const toRadians = (degrees: number): number => degrees * (Math.PI / 180)
const toDegrees = (radians: number): number => radians * (180 / Math.PI)

// Create the map store
export const useMapStore = create<MapStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        currentLocation: null,
        isLocationEnabled: false,
        locationError: null,
        lastLocationUpdate: null,
        mapCenter: defaultMapCenter,
        zoomLevel: 15,
        mapType: 'roadmap',
        locations: [],
        selectedLocation: null,
        trackingPoints: [],
        activeTracking: [],
        geofences: [],
        activeGeofences: [],
        routes: [],
        activeRoute: null,
        isLoadingLocation: false,
        isLoadingMap: false,
        settings: defaultSettings,

        // Location management
        requestLocation: async () => {
          if (!navigator.geolocation) {
            set(state => {
              state.locationError =
                'Geolocation is not supported by this browser'
            })
            return null
          }

          set(state => {
            state.isLoadingLocation = true
            state.locationError = null
          })

          try {
            const position = await new Promise<GeolocationPosition>(
              (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy:
                    get().settings.locationAccuracy === 'high',
                  timeout: 10000,
                  maximumAge: 60000,
                })
              }
            )

            const coordinates: Coordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude ?? undefined,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? undefined,
              heading: position.coords.heading ?? undefined,
              speed: position.coords.speed ?? undefined,
            }

            set(state => {
              state.currentLocation = coordinates
              state.isLocationEnabled = true
              state.lastLocationUpdate = new Date().toISOString()
              state.isLoadingLocation = false

              if (state.settings.autoCenter) {
                state.mapCenter = coordinates
              }
            })

            return coordinates
          } catch (error) {
            const errorMessage =
              error instanceof GeolocationPositionError
                ? `Location error: ${error.message}`
                : 'Failed to get location'

            set(state => {
              state.locationError = errorMessage
              state.isLoadingLocation = false
            })

            return null
          }
        },

        updateCurrentLocation: coordinates => {
          set(state => {
            state.currentLocation = coordinates
            state.lastLocationUpdate = new Date().toISOString()

            if (state.settings.autoCenter) {
              state.mapCenter = coordinates
            }
          })

          // Check geofences if tracking is active
          const geofenceEvents = get().checkGeofenceEntry(coordinates)
          if (
            geofenceEvents.length > 0 &&
            get().settings.geofenceNotifications
          ) {
            // Handle geofence events (could trigger notifications)
            console.warn('Geofence events:', geofenceEvents)
          }
        },

        startLocationTracking: () => {
          set(state => {
            state.isLocationEnabled = true
          })
        },

        stopLocationTracking: () => {
          set(state => {
            state.isLocationEnabled = false
          })
        },

        setLocationError: error => {
          set(state => {
            state.locationError = error
          })
        },

        // Map view controls
        setMapCenter: coordinates => {
          set(state => {
            state.mapCenter = coordinates
          })
        },

        setZoomLevel: zoom => {
          set(state => {
            state.zoomLevel = Math.max(1, Math.min(20, zoom))
          })
        },

        setMapType: mapType => {
          set(state => {
            state.mapType = mapType
          })
        },

        centerOnLocation: locationId => {
          const location = get().locations.find(l => l.id === locationId)
          if (location) {
            get().setMapCenter(location.coordinates)
            get().setSelectedLocation(location)
          }
        },

        fitBounds: locations => {
          if (locations.length === 0) return

          if (locations.length === 1) {
            get().setMapCenter(locations[0]!.coordinates)
            return
          }

          // Calculate bounding box
          const lats = locations.map(l => l.coordinates.latitude)
          const lngs = locations.map(l => l.coordinates.longitude)

          const center = {
            latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
            longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          }

          get().setMapCenter(center)
        },

        // Location management
        addLocation: locationData => {
          const id = generateId()
          const location: MapLocation = {
            ...locationData,
            id,
            createdAt: new Date().toISOString(),
          }

          set(state => {
            state.locations.push(location)
          })

          return id
        },

        updateLocation: (id, updates) => {
          set(state => {
            const locationIndex = state.locations.findIndex(l => l.id === id)
            if (locationIndex !== -1) {
              Object.assign(state.locations[locationIndex]!, {
                ...updates,
                updatedAt: new Date().toISOString(),
              })

              if (state.selectedLocation?.id === id) {
                Object.assign(state.selectedLocation!, updates)
              }
            }
          })
        },

        deleteLocation: id => {
          set(state => {
            state.locations = state.locations.filter(l => l.id !== id)
            if (state.selectedLocation?.id === id) {
              state.selectedLocation = null
            }
          })
        },

        setSelectedLocation: location => {
          set(state => {
            state.selectedLocation = location
          })
        },

        getLocationsByType: type => {
          return get().locations.filter(
            location => location.type === type && location.isActive
          )
        },

        getNearbyLocations: (coordinates, radiusMeters) => {
          return get().locations.filter(location => {
            const distance = get().calculateDistance(
              coordinates,
              location.coordinates
            )
            return distance <= radiusMeters && location.isActive
          })
        },

        // Tracking management
        addTrackingPoint: pointData => {
          const id = generateId()
          const point: TrackingPoint = {
            ...pointData,
            id,
            timestamp: new Date().toISOString(),
          }

          set(state => {
            state.trackingPoints.unshift(point)
            state.activeTracking.push(point)

            // Limit tracking points to prevent memory issues
            if (state.trackingPoints.length > 10000) {
              state.trackingPoints = state.trackingPoints.slice(0, 10000)
            }
          })

          return id
        },

        updateTrackingPoint: (id, updates) => {
          set(state => {
            const pointIndex = state.trackingPoints.findIndex(p => p.id === id)
            if (pointIndex !== -1) {
              Object.assign(state.trackingPoints[pointIndex]!, updates)
            }

            const activeIndex = state.activeTracking.findIndex(p => p.id === id)
            if (activeIndex !== -1) {
              Object.assign(state.activeTracking[activeIndex]!, updates)
            }
          })
        },

        clearTrackingHistory: olderThanHours => {
          const cutoffTime = new Date()
          cutoffTime.setHours(cutoffTime.getHours() - olderThanHours)

          set(state => {
            state.trackingPoints = state.trackingPoints.filter(
              point => new Date(point.timestamp) > cutoffTime
            )
          })
        },

        getTrackingByShipment: shipmentId => {
          return get().trackingPoints.filter(
            point => point.shipmentId === shipmentId
          )
        },

        getTrackingByVehicle: vehicleId => {
          return get().trackingPoints.filter(
            point => point.vehicleId === vehicleId
          )
        },

        // Geofence management
        addGeofence: geofenceData => {
          const id = generateId()
          const geofence: Geofence = {
            ...geofenceData,
            id,
            createdAt: new Date().toISOString(),
          }

          set(state => {
            state.geofences.push(geofence)
            if (geofence.isActive) {
              state.activeGeofences.push(geofence)
            }
          })

          return id
        },

        updateGeofence: (id, updates) => {
          set(state => {
            const geofenceIndex = state.geofences.findIndex(g => g.id === id)
            if (geofenceIndex !== -1) {
              Object.assign(state.geofences[geofenceIndex]!, updates)

              // Update active geofences
              const activeIndex = state.activeGeofences.findIndex(
                g => g.id === id
              )
              if (updates.isActive === false && activeIndex !== -1) {
                state.activeGeofences.splice(activeIndex, 1)
              } else if (updates.isActive === true && activeIndex === -1) {
                state.activeGeofences.push(state.geofences[geofenceIndex]!)
              }
            }
          })
        },

        deleteGeofence: id => {
          set(state => {
            state.geofences = state.geofences.filter(g => g.id !== id)
            state.activeGeofences = state.activeGeofences.filter(
              g => g.id !== id
            )
          })
        },

        toggleGeofence: id => {
          const geofence = get().geofences.find(g => g.id === id)
          if (geofence) {
            get().updateGeofence(id, { isActive: !geofence.isActive })
          }
        },

        checkGeofenceEntry: coordinates => {
          const events: GeofenceEvent[] = []
          const { activeGeofences, isPointInCircle, isPointInPolygon } = get()

          activeGeofences.forEach(geofence => {
            let isInside = false

            if (
              geofence.type === 'circle' &&
              geofence.center &&
              geofence.radius
            ) {
              isInside = isPointInCircle(
                coordinates,
                geofence.center,
                geofence.radius
              )
            } else if (geofence.type === 'polygon' && geofence.polygon) {
              isInside = isPointInPolygon(coordinates, geofence.polygon)
            }

            if (isInside) {
              geofence.triggers.forEach(trigger => {
                if (trigger.type === 'enter') {
                  events.push(trigger)
                }
              })
            }
          })

          return events
        },

        // Route management
        createRoute: routeData => {
          const id = generateId()
          const route: DeliveryRoute = {
            ...routeData,
            id,
            createdAt: new Date().toISOString(),
          }

          set(state => {
            state.routes.push(route)
          })

          return id
        },

        updateRoute: (id, updates) => {
          set(state => {
            const routeIndex = state.routes.findIndex(r => r.id === id)
            if (routeIndex !== -1) {
              Object.assign(state.routes[routeIndex]!, updates)

              if (state.activeRoute?.id === id) {
                Object.assign(state.activeRoute!, updates)
              }
            }
          })
        },

        deleteRoute: id => {
          set(state => {
            state.routes = state.routes.filter(r => r.id !== id)
            if (state.activeRoute?.id === id) {
              state.activeRoute = null
            }
          })
        },

        setActiveRoute: route => {
          set(state => {
            state.activeRoute = route
          })
        },

        startRoute: routeId => {
          get().updateRoute(routeId, {
            status: 'active',
            startedAt: new Date().toISOString(),
          })
        },

        completeRoute: routeId => {
          const route = get().routes.find(r => r.id === routeId)
          if (route?.startedAt) {
            const startTime = new Date(route.startedAt).getTime()
            const endTime = Date.now()
            const actualDuration = Math.floor((endTime - startTime) / 1000)

            get().updateRoute(routeId, {
              status: 'completed',
              completedAt: new Date().toISOString(),
              actualDuration,
            })
          }
        },

        optimizeRoute: async routeId => {
          // Placeholder for route optimization algorithm
          const route = get().routes.find(r => r.id === routeId)
          if (!route) return

          // Simple optimization: sort waypoints by distance from origin
          const optimizedWaypoints = [...route.waypoints].sort((a, b) => {
            const distanceA = get().calculateDistance(
              route.origin.coordinates,
              a.coordinates
            )
            const distanceB = get().calculateDistance(
              route.origin.coordinates,
              b.coordinates
            )
            return distanceA - distanceB
          })

          get().updateRoute(routeId, { waypoints: optimizedWaypoints })
        },

        // Utilities
        calculateDistance: (from, to) => {
          const R = 6371e3 // Earth's radius in meters
          const φ1 = toRadians(from.latitude)
          const φ2 = toRadians(to.latitude)
          const Δφ = toRadians(to.latitude - from.latitude)
          const Δλ = toRadians(to.longitude - from.longitude)

          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

          return R * c // Distance in meters
        },

        calculateBearing: (from, to) => {
          const φ1 = toRadians(from.latitude)
          const φ2 = toRadians(to.latitude)
          const Δλ = toRadians(to.longitude - from.longitude)

          const y = Math.sin(Δλ) * Math.cos(φ2)
          const x =
            Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)

          const θ = Math.atan2(y, x)
          return (toDegrees(θ) + 360) % 360 // Bearing in degrees
        },

        isPointInCircle: (point, center, radius) => {
          const distance = get().calculateDistance(point, center)
          return distance <= radius
        },

        isPointInPolygon: (point, polygon) => {
          let inside = false
          for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (
              polygon[i]!.latitude > point.latitude !==
                polygon[j]!.latitude > point.latitude &&
              point.longitude <
                ((polygon[j]!.longitude - polygon[i]!.longitude) *
                  (point.latitude - polygon[i]!.latitude)) /
                  (polygon[j]!.latitude - polygon[i]!.latitude) +
                  polygon[i]!.longitude
            ) {
              inside = !inside
            }
          }
          return inside
        },

        // Settings
        updateSettings: newSettings => {
          set(state => {
            state.settings = { ...state.settings, ...newSettings }
          })
        },

        resetSettings: () => {
          set(state => {
            state.settings = { ...defaultSettings }
          })
        },

        // Data management
        importLocations: locations => {
          set(state => {
            state.locations.push(...locations)
          })
        },

        exportMapData: () => {
          const state = get()
          return {
            locations: state.locations,
            routes: state.routes,
            geofences: state.geofences,
          }
        },

        clearAllData: () => {
          set(state => {
            state.locations = []
            state.trackingPoints = []
            state.activeTracking = []
            state.geofences = []
            state.activeGeofences = []
            state.routes = []
            state.activeRoute = null
            state.selectedLocation = null
          })
        },
      })),
      {
        name: 'map-storage',
        partialize: state => ({
          locations: state.locations,
          geofences: state.geofences,
          routes: state.routes,
          settings: state.settings,
          mapCenter: state.mapCenter,
          zoomLevel: state.zoomLevel,
          mapType: state.mapType,
        }),
      }
    ),
    {
      name: 'map-store',
    }
  )
)

// Selector hooks for better performance
export const useCurrentLocation = () =>
  useMapStore(state => state.currentLocation)
export const useMapView = () =>
  useMapStore(state => ({
    center: state.mapCenter,
    zoom: state.zoomLevel,
    mapType: state.mapType,
  }))
export const useLocations = () => useMapStore(state => state.locations)
export const useSelectedLocation = () =>
  useMapStore(state => state.selectedLocation)
export const useTrackingPoints = () =>
  useMapStore(state => state.trackingPoints)
export const useActiveRoute = () => useMapStore(state => state.activeRoute)
export const useGeofences = () => useMapStore(state => state.geofences)
export const useMapSettings = () => useMapStore(state => state.settings)
export const useLocationEnabled = () =>
  useMapStore(state => state.isLocationEnabled)
export const useLocationError = () => useMapStore(state => state.locationError)
