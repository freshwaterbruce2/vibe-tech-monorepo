import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Performance metrics interface
export interface PerformanceMetrics {
  id: string
  timestamp: string
  metric: string
  value: number
  unit: string
  category:
    | 'user_action'
    | 'system_performance'
    | 'business_metric'
    | 'error_tracking'
  metadata?: Record<string, any>
}

// Analytics event interface
export interface AnalyticsEvent {
  id: string
  timestamp: string
  eventName: string
  eventType:
    | 'click'
    | 'navigation'
    | 'form_submit'
    | 'error'
    | 'performance'
    | 'custom'
  userId?: string
  sessionId: string
  properties: Record<string, any>
  duration?: number // for timed events
}

// User session interface
export interface UserSession {
  id: string
  startTime: string
  endTime?: string
  duration?: number // in seconds
  userId: string
  device: {
    type: 'mobile' | 'tablet' | 'desktop'
    os: string
    browser: string
    screenSize: string
  }
  events: string[] // event IDs
  metrics: string[] // metric IDs
}

// Analytics insights interface
export interface AnalyticsInsights {
  daily: {
    date: string
    totalEvents: number
    uniqueUsers: number
    averageSessionDuration: number
    topEvents: { name: string; count: number }[]
    errors: number
  }[]
  performance: {
    averageLoadTime: number
    averageResponseTime: number
    errorRate: number
    crashRate: number
  }
  userBehavior: {
    mostUsedFeatures: { feature: string; usage: number }[]
    commonUserPaths: { path: string[]; count: number }[]
    dropOffPoints: { step: string; dropOffRate: number }[]
  }
  business: {
    totalShipments: number
    averageShipmentsPerSession: number
    palletThroughput: number
    efficiencyScore: number
  }
}

// Analytics configuration
export interface AnalyticsConfig {
  enabled: boolean
  trackUserActions: boolean
  trackPerformance: boolean
  trackErrors: boolean
  trackBusinessMetrics: boolean
  sessionTimeout: number // minutes
  maxEventsStored: number
  maxMetricsStored: number
  autoCleanupDays: number
  reportingInterval: number // minutes
  enableRealTimeInsights: boolean
}

// Analytics state interface
interface AnalyticsState {
  // Data collections
  events: AnalyticsEvent[]
  metrics: PerformanceMetrics[]
  sessions: UserSession[]
  currentSession: UserSession | null

  // Insights and reports
  insights: AnalyticsInsights | null
  lastInsightsUpdate: string | null

  // Configuration
  config: AnalyticsConfig

  // State tracking
  isTracking: boolean
  isGeneratingInsights: boolean
  lastEventId: string | null
}

// Actions interface
interface AnalyticsActions {
  // Event tracking
  trackEvent: (
    eventName: string,
    eventType: AnalyticsEvent['eventType'],
    properties?: Record<string, any>
  ) => string
  trackClick: (element: string, properties?: Record<string, any>) => string
  trackNavigation: (
    from: string,
    to: string,
    properties?: Record<string, any>
  ) => string
  trackFormSubmit: (
    formName: string,
    success: boolean,
    properties?: Record<string, any>
  ) => string
  trackError: (error: Error | string, context?: Record<string, any>) => string
  trackCustomEvent: (
    eventName: string,
    properties?: Record<string, any>
  ) => string

  // Performance tracking
  trackMetric: (
    metric: string,
    value: number,
    unit: string,
    category: PerformanceMetrics['category'],
    metadata?: Record<string, any>
  ) => string
  trackLoadTime: (page: string, loadTime: number) => string
  trackResponseTime: (operation: string, responseTime: number) => string
  trackUserAction: (action: string, duration: number) => string

  // Session management
  startSession: (userId: string, deviceInfo: UserSession['device']) => string
  endSession: () => void
  updateSession: (updates: Partial<UserSession>) => void

  // Business metrics
  trackShipmentCreated: (
    shipmentId: string,
    doorNumber: number,
    destinationDC: string
  ) => string
  trackPalletCount: (
    doorNumber: number,
    count: number,
    operation: 'add' | 'update' | 'remove'
  ) => string
  trackVoiceCommand: (
    command: string,
    success: boolean,
    confidence?: number
  ) => string
  trackExportAction: (type: 'csv' | 'zip', recordCount: number) => string

  // Insights and reporting
  generateInsights: () => Promise<void>
  getEventsByTimeRange: (startDate: string, endDate: string) => AnalyticsEvent[]
  getMetricsByCategory: (
    category: PerformanceMetrics['category']
  ) => PerformanceMetrics[]
  getUserSessions: (userId: string) => UserSession[]

  // Data management
  clearOldData: (olderThanDays: number) => void
  exportAnalyticsData: () => {
    events: AnalyticsEvent[]
    metrics: PerformanceMetrics[]
    sessions: UserSession[]
  }
  importAnalyticsData: (data: {
    events: AnalyticsEvent[]
    metrics: PerformanceMetrics[]
    sessions: UserSession[]
  }) => void

  // Configuration
  updateConfig: (config: Partial<AnalyticsConfig>) => void
  resetConfig: () => void
  toggleTracking: () => void

  // Utilities
  getInsightsSummary: () => Partial<AnalyticsInsights>
  getPerformanceScore: () => number
  getTopEvents: (limit: number) => { name: string; count: number }[]
  getErrorRate: () => number
}

// Combined store type
type AnalyticsStore = AnalyticsState & AnalyticsActions

// Default configuration
const defaultConfig: AnalyticsConfig = {
  enabled: true,
  trackUserActions: true,
  trackPerformance: true,
  trackErrors: true,
  trackBusinessMetrics: true,
  sessionTimeout: 30, // 30 minutes
  maxEventsStored: 10000,
  maxMetricsStored: 5000,
  autoCleanupDays: 90,
  reportingInterval: 15, // 15 minutes
  enableRealTimeInsights: true,
}

// Generate unique ID
const generateId = (): string => {
  return `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Generate session ID
const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create the analytics store with Immer middleware for safe mutations
export const useAnalyticsStore = create<AnalyticsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        events: [],
        metrics: [],
        sessions: [],
        currentSession: null,
        insights: null,
        lastInsightsUpdate: null,
        config: defaultConfig,
        isTracking: true,
        isGeneratingInsights: false,
        lastEventId: null,

        // Event tracking
        trackEvent: (eventName, eventType, properties = {}) => {
          if (!get().config.enabled || !get().isTracking) return ''

          const id = generateId()
          const currentSession = get().currentSession

          const event: AnalyticsEvent = {
            id,
            timestamp: new Date().toISOString(),
            eventName,
            eventType,
            userId: currentSession?.userId,
            sessionId: currentSession?.id ?? 'no-session',
            properties,
          }

          set(state => {
            state.events.unshift(event)
            state.lastEventId = id

            // Limit events to max count
            if (state.events.length > state.config.maxEventsStored) {
              state.events = state.events.slice(0, state.config.maxEventsStored)
            }

            // Add event to current session
            if (state.currentSession) {
              state.currentSession.events.push(id)
            }
          })

          return id
        },

        trackClick: (element, properties = {}) => {
          return get().trackEvent(`click_${element}`, 'click', {
            element,
            ...properties,
          })
        },

        trackNavigation: (from, to, properties = {}) => {
          return get().trackEvent('navigation', 'navigation', {
            from,
            to,
            ...properties,
          })
        },

        trackFormSubmit: (formName, success, properties = {}) => {
          return get().trackEvent('form_submit', 'form_submit', {
            formName,
            success,
            ...properties,
          })
        },

        trackError: (error, context = {}) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          const stack = error instanceof Error ? error.stack : undefined

          return get().trackEvent('error', 'error', {
            message: errorMessage,
            stack,
            ...context,
          })
        },

        trackCustomEvent: (eventName, properties = {}) => {
          return get().trackEvent(eventName, 'custom', properties)
        },

        // Performance tracking
        trackMetric: (metric, value, unit, category, metadata = {}) => {
          if (!get().config.enabled || !get().config.trackPerformance) return ''

          const id = generateId()
          const performanceMetric: PerformanceMetrics = {
            id,
            timestamp: new Date().toISOString(),
            metric,
            value,
            unit,
            category,
            metadata,
          }

          set(state => {
            state.metrics.unshift(performanceMetric)

            // Limit metrics to max count
            if (state.metrics.length > state.config.maxMetricsStored) {
              state.metrics = state.metrics.slice(
                0,
                state.config.maxMetricsStored
              )
            }

            // Add metric to current session
            if (state.currentSession) {
              state.currentSession.metrics.push(id)
            }
          })

          return id
        },

        trackLoadTime: (page, loadTime) => {
          return get().trackMetric(
            'page_load_time',
            loadTime,
            'ms',
            'system_performance',
            { page }
          )
        },

        trackResponseTime: (operation, responseTime) => {
          return get().trackMetric(
            'response_time',
            responseTime,
            'ms',
            'system_performance',
            { operation }
          )
        },

        trackUserAction: (action, duration) => {
          return get().trackMetric(
            'user_action_duration',
            duration,
            'ms',
            'user_action',
            { action }
          )
        },

        // Session management
        startSession: (userId, deviceInfo) => {
          const sessionId = generateSessionId()
          const session: UserSession = {
            id: sessionId,
            startTime: new Date().toISOString(),
            userId,
            device: deviceInfo,
            events: [],
            metrics: [],
          }

          set(state => {
            // End current session if exists
            if (state.currentSession) {
              const currentSession = state.currentSession
              const startTime = new Date(currentSession.startTime).getTime()
              const endTime = Date.now()
              currentSession.endTime = new Date().toISOString()
              currentSession.duration = Math.floor((endTime - startTime) / 1000)
            }

            state.currentSession = session
            state.sessions.unshift(session)
          })

          return sessionId
        },

        endSession: () => {
          set(state => {
            if (state.currentSession) {
              const startTime = new Date(
                state.currentSession.startTime
              ).getTime()
              const endTime = Date.now()
              state.currentSession.endTime = new Date().toISOString()
              state.currentSession.duration = Math.floor(
                (endTime - startTime) / 1000
              )
              state.currentSession = null
            }
          })
        },

        updateSession: updates => {
          set(state => {
            if (state.currentSession) {
              Object.assign(state.currentSession, updates)
            }
          })
        },

        // Business metrics
        trackShipmentCreated: (shipmentId, doorNumber, destinationDC) => {
          get().trackMetric('shipment_created', 1, 'count', 'business_metric', {
            shipmentId,
            doorNumber,
            destinationDC,
          })
          return get().trackEvent('shipment_created', 'custom', {
            shipmentId,
            doorNumber,
            destinationDC,
          })
        },

        trackPalletCount: (doorNumber, count, operation) => {
          get().trackMetric('pallet_count', count, 'count', 'business_metric', {
            doorNumber,
            operation,
          })
          return get().trackEvent('pallet_count_updated', 'custom', {
            doorNumber,
            count,
            operation,
          })
        },

        trackVoiceCommand: (command, success, confidence) => {
          get().trackMetric(
            'voice_command_confidence',
            confidence ?? 0,
            'percentage',
            'user_action',
            {
              command,
              success,
            }
          )
          return get().trackEvent('voice_command', 'custom', {
            command,
            success,
            confidence,
          })
        },

        trackExportAction: (type, recordCount) => {
          get().trackMetric(
            'export_record_count',
            recordCount,
            'count',
            'business_metric',
            { type }
          )
          return get().trackEvent('data_export', 'custom', {
            type,
            recordCount,
          })
        },

        // Insights and reporting
        generateInsights: async () => {
          set(state => {
            state.isGeneratingInsights = true
          })

          try {
            const state = get()
            const now = new Date()
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

            // Calculate daily insights for the past week
            const daily = []
            for (let i = 6; i >= 0; i--) {
              const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
              const dateStr = date.toISOString().split('T')[0] ?? ''

              const dayEvents = state.events.filter(e =>
                (e.timestamp ?? '').startsWith(dateStr ?? '')
              )

              const uniqueUsers = new Set(
                dayEvents.map(e => e.userId).filter(Boolean)
              ).size
              const topEvents = dayEvents.reduce(
                (acc, event) => {
                  acc[event.eventName] = (acc[event.eventName] || 0) + 1
                  return acc
                },
                {} as Record<string, number>
              )

              // Calculate average session duration for this day
              const daySessions = state.sessions.filter(
                s =>
                  (s.startTime ?? '').startsWith(dateStr ?? '') &&
                  s.duration !== undefined
              )
              const avgSessionDuration =
                daySessions.length > 0
                  ? daySessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
                    daySessions.length
                  : 0

              daily.push({
                date: dateStr,
                totalEvents: dayEvents.length,
                uniqueUsers,
                averageSessionDuration: Math.round(avgSessionDuration),
                topEvents: Object.entries(topEvents)
                  .map(([name, count]) => ({ name, count }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5),
                errors: dayEvents.filter(e => e.eventType === 'error').length,
              })
            }

            // Calculate performance metrics
            const performanceMetrics = state.metrics.filter(
              m =>
                new Date(m.timestamp) > oneWeekAgo &&
                m.category === 'system_performance'
            )

            const loadTimes = performanceMetrics
              .filter(m => m.metric === 'page_load_time')
              .map(m => m.value)
            const responseTimes = performanceMetrics
              .filter(m => m.metric === 'response_time')
              .map(m => m.value)

            const errorEvents = state.events.filter(
              e => new Date(e.timestamp) > oneWeekAgo && e.eventType === 'error'
            )

            // Calculate crash rate - sessions with critical errors
            const recentSessions = state.sessions.filter(
              s => new Date(s.startTime) > oneWeekAgo
            )
            const crashedSessions = recentSessions.filter(session => {
              // A session "crashed" if it has error events and ended abruptly (no endTime or very short duration)
              const sessionErrors = state.events.filter(
                e => e.sessionId === session.id && e.eventType === 'error'
              )
              const abruptEnd =
                !session.endTime || (session.duration && session.duration < 5)
              return sessionErrors.length > 0 && abruptEnd
            })
            const crashRate =
              recentSessions.length > 0
                ? (crashedSessions.length / recentSessions.length) * 100
                : 0

            const performance = {
              averageLoadTime:
                loadTimes.length > 0
                  ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length
                  : 0,
              averageResponseTime:
                responseTimes.length > 0
                  ? responseTimes.reduce((a, b) => a + b, 0) /
                    responseTimes.length
                  : 0,
              errorRate:
                state.events.length > 0
                  ? (errorEvents.length / state.events.length) * 100
                  : 0,
              crashRate: Math.round(crashRate * 100) / 100,
            }

            // Calculate user behavior insights
            const recentEvents = state.events.filter(
              e => new Date(e.timestamp) > oneWeekAgo
            )
            const featureUsage = recentEvents.reduce(
              (acc, event) => {
                const feature = event.eventName.split('_')[0] ?? 'unknown'
                acc[feature] = (acc[feature] || 0) + 1
                return acc
              },
              {} as Record<string, number>
            )

            // Analyze common user paths from navigation events
            const navigationEvents = recentEvents.filter(
              e => e.eventType === 'navigation'
            )
            const sessionPaths = new Map<string, string[]>()

            // Group navigation events by session
            navigationEvents.forEach(event => {
              if (!sessionPaths.has(event.sessionId)) {
                sessionPaths.set(event.sessionId, [])
              }
              sessionPaths
                .get(event.sessionId)!
                .push(event.properties.to || 'unknown')
            })

            // Count path occurrences
            const pathCounts = new Map<string, number>()
            sessionPaths.forEach(path => {
              const pathKey = path.join(' → ')
              pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1)
            })

            const commonUserPaths = Array.from(pathCounts.entries())
              .map(([pathStr, count]) => ({
                path: pathStr.split(' → '),
                count,
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)

            // Analyze drop-off points (where users stop in common paths)
            const allSteps = new Set<string>()
            const stepContinuations = new Map<string, number>()
            const stepStarts = new Map<string, number>()

            sessionPaths.forEach(path => {
              path.forEach((step, index) => {
                allSteps.add(step)
                stepStarts.set(step, (stepStarts.get(step) || 0) + 1)

                // Count if user continued after this step
                if (index < path.length - 1) {
                  stepContinuations.set(
                    step,
                    (stepContinuations.get(step) || 0) + 1
                  )
                }
              })
            })

            const dropOffPoints = Array.from(allSteps)
              .map(step => {
                const starts = stepStarts.get(step) || 0
                const continuations = stepContinuations.get(step) || 0
                const dropOffRate =
                  starts > 0 ? ((starts - continuations) / starts) * 100 : 0
                return {
                  step,
                  dropOffRate: Math.round(dropOffRate * 100) / 100,
                }
              })
              .filter(point => point.dropOffRate > 10) // Only significant drop-offs
              .sort((a, b) => b.dropOffRate - a.dropOffRate)
              .slice(0, 5)

            const userBehavior = {
              mostUsedFeatures: Object.entries(featureUsage)
                .map(([feature, usage]) => ({ feature, usage }))
                .sort((a, b) => b.usage - a.usage)
                .slice(0, 10),
              commonUserPaths,
              dropOffPoints,
            }

            // Calculate business metrics
            const businessMetrics = state.metrics.filter(
              m =>
                new Date(m.timestamp) > oneWeekAgo &&
                m.category === 'business_metric'
            )

            const shipmentMetrics = businessMetrics.filter(
              m => m.metric === 'shipment_created'
            )
            const palletMetrics = businessMetrics.filter(
              m => m.metric === 'pallet_count'
            )

            // Calculate average shipments per session
            const sessionsWithShipments = recentSessions.map(session => {
              const sessionShipments = shipmentMetrics.filter(
                m =>
                  m.metadata?.sessionId === session.id ||
                  (m.timestamp >= session.startTime &&
                    (!session.endTime || m.timestamp <= session.endTime))
              )
              return sessionShipments.length
            })
            const avgShipmentsPerSession =
              sessionsWithShipments.length > 0
                ? sessionsWithShipments.reduce((sum, count) => sum + count, 0) /
                  sessionsWithShipments.length
                : 0

            // Calculate efficiency score (0-100) based on multiple factors
            const totalPallets = palletMetrics.reduce(
              (sum, m) => sum + m.value,
              0
            )
            const avgSessionTime =
              recentSessions.length > 0
                ? recentSessions.reduce(
                    (sum, s) => sum + (s.duration || 0),
                    0
                  ) / recentSessions.length
                : 0

            // Efficiency factors:
            // 1. Shipment rate (shipments per hour) - higher is better
            const shipmentsPerHour =
              avgSessionTime > 0
                ? avgShipmentsPerSession / (avgSessionTime / 3600)
                : 0
            const shipmentScore = Math.min(100, shipmentsPerHour * 20) // Max at 5 shipments/hour

            // 2. Pallet throughput (pallets per hour) - higher is better
            const palletsPerHour =
              avgSessionTime > 0
                ? totalPallets /
                  ((avgSessionTime * recentSessions.length) / 3600)
                : 0
            const palletScore = Math.min(100, palletsPerHour * 2) // Max at 50 pallets/hour

            // 3. Error rate - lower is better (inverse scoring)
            const errorScore = Math.max(0, 100 - performance.errorRate * 10)

            // 4. Response time - lower is better (inverse scoring)
            const responseScore =
              performance.averageResponseTime > 0
                ? Math.max(0, 100 - performance.averageResponseTime / 10)
                : 100

            // Combined weighted efficiency score
            const efficiencyScore = Math.round(
              shipmentScore * 0.3 + // 30% weight on shipments
                palletScore * 0.3 + // 30% weight on pallets
                errorScore * 0.2 + // 20% weight on low errors
                responseScore * 0.2 // 20% weight on fast responses
            )

            const business = {
              totalShipments: shipmentMetrics.length,
              averageShipmentsPerSession:
                Math.round(avgShipmentsPerSession * 100) / 100,
              palletThroughput: totalPallets,
              efficiencyScore: Math.min(100, Math.max(0, efficiencyScore)),
            }

            const insights: AnalyticsInsights = {
              daily,
              performance,
              userBehavior,
              business,
            }

            set(state => {
              state.insights = insights
              state.lastInsightsUpdate = new Date().toISOString()
              state.isGeneratingInsights = false
            })
          } catch (error) {
            console.error('Failed to generate insights:', error)
            set(state => {
              state.isGeneratingInsights = false
            })
          }
        },

        getEventsByTimeRange: (startDate, endDate) => {
          const start = new Date(startDate).getTime()
          const end = new Date(endDate).getTime()

          return get().events.filter(event => {
            const eventTime = new Date(event.timestamp).getTime()
            return eventTime >= start && eventTime <= end
          })
        },

        getMetricsByCategory: category => {
          return get().metrics.filter(metric => metric.category === category)
        },

        getUserSessions: userId => {
          return get().sessions.filter(session => session.userId === userId)
        },

        // Data management
        clearOldData: olderThanDays => {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

          set(state => {
            state.events = state.events.filter(
              event => new Date(event.timestamp) > cutoffDate
            )
            state.metrics = state.metrics.filter(
              metric => new Date(metric.timestamp) > cutoffDate
            )
            state.sessions = state.sessions.filter(
              session => new Date(session.startTime) > cutoffDate
            )
          })
        },

        exportAnalyticsData: () => {
          const state = get()
          return {
            events: state.events,
            metrics: state.metrics,
            sessions: state.sessions,
          }
        },

        importAnalyticsData: data => {
          set(state => {
            state.events = data.events || []
            state.metrics = data.metrics || []
            state.sessions = data.sessions || []
          })
        },

        // Configuration
        updateConfig: newConfig => {
          set(state => {
            state.config = { ...state.config, ...newConfig }
          })
        },

        resetConfig: () => {
          set(state => {
            state.config = { ...defaultConfig }
          })
        },

        toggleTracking: () => {
          set(state => {
            state.isTracking = !state.isTracking
          })
        },

        // Utilities
        getInsightsSummary: () => {
          const insights = get().insights
          if (!insights) return {}

          return {
            performance: insights.performance,
            business: insights.business,
          }
        },

        getPerformanceScore: () => {
          const insights = get().insights
          if (!insights) return 0

          // Simple scoring algorithm (0-100)
          const { performance } = insights
          let score = 100

          // Deduct points for high load times (target: <2000ms)
          if (performance.averageLoadTime > 2000) {
            score -= Math.min(30, (performance.averageLoadTime - 2000) / 100)
          }

          // Deduct points for high error rate (target: <1%)
          if (performance.errorRate > 1) {
            score -= Math.min(40, performance.errorRate * 4)
          }

          // Deduct points for high response times (target: <500ms)
          if (performance.averageResponseTime > 500) {
            score -= Math.min(20, (performance.averageResponseTime - 500) / 50)
          }

          return Math.max(0, Math.round(score))
        },

        getTopEvents: limit => {
          const events = get().events
          const eventCounts = events.reduce(
            (acc, event) => {
              acc[event.eventName] = (acc[event.eventName] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )

          return Object.entries(eventCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit)
        },

        getErrorRate: () => {
          const events = get().events
          if (events.length === 0) return 0

          const errorEvents = events.filter(e => e.eventType === 'error')
          return (errorEvents.length / events.length) * 100
        },
      })),
      {
        name: 'analytics-storage',
        partialize: state => ({
          events: state.events,
          metrics: state.metrics,
          sessions: state.sessions,
          config: state.config,
          insights: state.insights,
          lastInsightsUpdate: state.lastInsightsUpdate,
        }),
      }
    ),
    {
      name: 'analytics-store',
    }
  )
)

// Selector hooks for better performance
export const useAnalyticsEvents = () => useAnalyticsStore(state => state.events)
export const useAnalyticsMetrics = () =>
  useAnalyticsStore(state => state.metrics)
export const useAnalyticsInsights = () =>
  useAnalyticsStore(state => state.insights)
export const useAnalyticsConfig = () => useAnalyticsStore(state => state.config)
export const useCurrentSession = () =>
  useAnalyticsStore(state => state.currentSession)
export const useAnalyticsTracking = () =>
  useAnalyticsStore(state => state.isTracking)
