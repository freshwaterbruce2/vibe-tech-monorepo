/**
 * Enhanced Push Notifications Service for 2025
 * Features: Rich notifications, action buttons, badge updates, silent push, batching
 */

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  actions?: NotificationAction[]
  timestamp?: number
  renotify?: boolean
  vibrate?: number[]
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface BatchedNotification {
  id: string
  notifications: NotificationPayload[]
  batchTitle: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  scheduledTime?: number
}

class EnhancedNotificationService {
  private pendingNotifications = new Map<string, NotificationPayload>()
  private batchQueue: BatchedNotification[] = []
  private vapidPublicKey: string
  private subscription: PushSubscription | null = null

  constructor() {
    this.vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''
    this.initializeService()
  }

  private async initializeService() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready
        this.subscription = await registration.pushManager.getSubscription()

        // Set up notification click handling
        navigator.serviceWorker.addEventListener(
          'message',
          this.handleServiceWorkerMessage.bind(this)
        )
      } catch (error) {
        console.error('Failed to initialize notification service:', error)
      }
    }
  }

  /**
   * Request notification permission with enhanced UX
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported')
    }

    // Check current permission
    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notifications denied by user')
    }

    // Show permission primer (recommended for 2025)
    const showPrimer = await this.showPermissionPrimer()
    if (!showPrimer) {
      throw new Error('User declined permission primer')
    }

    // Request permission
    const permission = await Notification.requestPermission()

    if (permission === 'granted') {
      await this.setupPushSubscription()
      await this.sendPermissionGrantedAnalytics()
    }

    return permission
  }

  /**
   * Subscribe to push notifications with VAPID
   */
  async setupPushSubscription(): Promise<PushSubscription | null> {
    try {
      const registration = await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          this.vapidPublicKey
        ) as unknown as BufferSource,
      })

      this.subscription = subscription

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)

      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  /**
   * Show enhanced notification with 2025 features
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    const options: NotificationOptions & {
      image?: string
      renotify?: boolean
      timestamp?: number
      vibrate?: number[]
      actions?: Array<{ action: string; title: string; icon?: string }>
    } = {
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192x192.png',
      badge: payload.badge ?? '/icons/badge-72x72.png',
      image: payload.image,
      data: {
        ...payload.data,
        timestamp: Date.now(),
        notificationId: this.generateNotificationId(),
      },
      tag: payload.tag ?? `shipping-${Date.now()}`,
      requireInteraction: payload.requireInteraction ?? false,
      silent: payload.silent ?? false,
      renotify: payload.renotify ?? true,
      timestamp: payload.timestamp ?? Date.now(),
      vibrate: payload.vibrate ?? [200, 100, 200],
      actions: payload.actions ?? [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-icon.png',
        },
      ],
    }

    // Update badge count
    await this.updateBadgeCount(1)

    // Show notification
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(payload.title, options)

    // Analytics
    await this.trackNotificationShown(payload)
  }

  /**
   * Batch multiple notifications for better UX
   */
  async batchNotifications(batch: BatchedNotification): Promise<void> {
    const { notifications, batchTitle, priority } = batch

    if (notifications.length <= 1) {
      const firstNotification = notifications[0]
      if (firstNotification) {
        await this.showNotification(firstNotification)
      }
      return
    }

    // Create summary notification
    const summaryPayload: NotificationPayload = {
      title: batchTitle,
      body: `${notifications.length} new updates`,
      tag: `batch-${batch.id}`,
      requireInteraction: priority === 'urgent',
      data: {
        type: 'batch',
        batchId: batch.id,
        notifications: notifications.map(n => ({
          title: n.title,
          body: n.body,
          data: n.data,
        })),
      },
      actions: [
        {
          action: 'view-all',
          title: 'View All',
          icon: '/icons/view-all-icon.png',
        },
        {
          action: 'dismiss-all',
          title: 'Dismiss All',
          icon: '/icons/dismiss-icon.png',
        },
      ],
    }

    await this.showNotification(summaryPayload)
  }

  /**
   * Schedule notifications for delivery
   */
  async scheduleNotification(
    payload: NotificationPayload,
    deliveryTime: Date
  ): Promise<string> {
    const notificationId = this.generateNotificationId()
    const scheduledPayload = {
      ...payload,
      data: {
        ...payload.data,
        scheduledTime: deliveryTime.getTime(),
        notificationId,
      },
    }

    // Store in service worker for scheduled delivery
    await this.storeScheduledNotification(
      notificationId,
      scheduledPayload,
      deliveryTime
    )

    return notificationId
  }

  /**
   * Silent push for background updates
   */
  async sendSilentPush(data: any): Promise<void> {
    if (!this.subscription) {
      throw new Error('No push subscription available')
    }

    try {
      await fetch('/api/push/silent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.subscription,
          data: {
            type: 'silent',
            payload: data,
            timestamp: Date.now(),
          },
        }),
      })
    } catch (error) {
      console.error('Failed to send silent push:', error)
      throw error
    }
  }

  /**
   * Update application badge count
   */
  async updateBadgeCount(increment = 1): Promise<void> {
    if ('navigator' in window && 'setAppBadge' in navigator) {
      try {
        const currentCount = await this.getBadgeCount()
        const newCount = Math.max(0, currentCount + increment)
        await (navigator as any).setAppBadge(newCount)
        await this.setBadgeCount(newCount)
      } catch (error) {
        console.warn('Failed to update badge count:', error)
      }
    }
  }

  /**
   * Clear application badge
   */
  async clearBadge(): Promise<void> {
    if ('navigator' in window && 'clearAppBadge' in navigator) {
      try {
        await (navigator as any).clearAppBadge()
        await this.setBadgeCount(0)
      } catch (error) {
        console.warn('Failed to clear badge:', error)
      }
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(): Promise<any> {
    try {
      const response = await fetch('/api/notifications/analytics')
      return await response.json()
    } catch (error) {
      console.error('Failed to get notification analytics:', error)
      return null
    }
  }

  // Private helper methods
  private async showPermissionPrimer(): Promise<boolean> {
    return new Promise(resolve => {
      // This would typically show a custom modal explaining the benefits
      // For now, return true to proceed
      resolve(true)
    })
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private async sendSubscriptionToServer(
    subscription: PushSubscription
  ): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      })
    } catch (error) {
      console.error('Failed to send subscription to server:', error)
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async storeScheduledNotification(
    id: string,
    payload: NotificationPayload,
    deliveryTime: Date
  ): Promise<void> {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      id,
      payload,
      deliveryTime: deliveryTime.getTime(),
    })
  }

  private async getBadgeCount(): Promise<number> {
    const stored = localStorage.getItem('notificationBadgeCount')
    return stored ? parseInt(stored, 10) : 0
  }

  private async setBadgeCount(count: number): Promise<void> {
    localStorage.setItem('notificationBadgeCount', count.toString())
  }

  private async sendPermissionGrantedAnalytics(): Promise<void> {
    try {
      await fetch('/api/analytics/notification-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'permission_granted',
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
        }),
      })
    } catch (error) {
      console.warn('Failed to send analytics:', error)
    }
  }

  private async trackNotificationShown(
    payload: NotificationPayload
  ): Promise<void> {
    try {
      await fetch('/api/analytics/notification-shown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: payload.title,
          tag: payload.tag,
          timestamp: Date.now(),
        }),
      })
    } catch (error) {
      console.warn('Failed to track notification:', error)
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data

    switch (type) {
      case 'NOTIFICATION_CLICKED':
        this.handleNotificationClick(data)
        break
      case 'NOTIFICATION_CLOSED':
        this.handleNotificationClose(data)
        break
      default:
        break
    }
  }

  private async handleNotificationClick(data: any): Promise<void> {
    // Track click analytics
    await this.trackNotificationClick(data)

    // Update badge count
    await this.updateBadgeCount(-1)
  }

  private async handleNotificationClose(data: any): Promise<void> {
    // Track close analytics
    await this.trackNotificationClose(data)
  }

  private async trackNotificationClick(data: any): Promise<void> {
    try {
      await fetch('/api/analytics/notification-clicked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: data.notificationId,
          action: data.action,
          timestamp: Date.now(),
        }),
      })
    } catch (error) {
      console.warn('Failed to track notification click:', error)
    }
  }

  private async trackNotificationClose(data: any): Promise<void> {
    try {
      await fetch('/api/analytics/notification-closed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId: data.notificationId,
          timestamp: Date.now(),
        }),
      })
    } catch (error) {
      console.warn('Failed to track notification close:', error)
    }
  }
}

// Export singleton instance
export const enhancedNotificationService = new EnhancedNotificationService()
export default enhancedNotificationService
