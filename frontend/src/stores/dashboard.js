import { defineStore } from 'pinia'
import { getCaregiverDashboard, getAdminDashboard } from '@/services/api/dashboard.service'
import {
  getTodayAttendance,
  getUpcomingVisits,
  getHealthAlerts,
  getNotifications,
  markNotificationRead,
  clearNotifications,
} from '@/services/api/records.service'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    loading: false,
    error: null,
    summary: null,
    attendance: [],
    upcomingVisits: [],
    healthAlerts: [],
    notifications: [],
    adminSummary: null,
    _refreshListenerAttached: false,
  }),
  getters: {
    // Only admin-originated alerts are shown to the caregiver — internal
    // 'sync' entries (self-generated echoes of the caregiver's own actions,
    // like "attendance recorded") never appear here.
    caregiverAlerts: (state) => state.notifications.filter((n) => n.type !== 'sync'),
    unreadNotificationsCount: (state) =>
      state.notifications.filter((n) => n.type !== 'sync' && !n.read).length,
  },
  actions: {
    /** Prepend a new notification received via push (live update). */
    prependNotification(notif) {
      // Avoid duplicates if the same notification is fetched later
      const id = notif.id || notif._id
      if (id && this.notifications.some((n) => (n.id || n._id) === id)) return
      this.notifications.unshift({
        ...notif,
        read: false,
        time: 'Just now',
      })
    },

    /** Attach a one-time listener that refreshes notifications from server
     *  whenever a 'notification-refresh' event fires (from push or after
     *  login). Safe to call multiple times. */
    ensureRefreshListener() {
      if (this._refreshListenerAttached) return
      this._refreshListenerAttached = true
      if (typeof window === 'undefined') return
      window.addEventListener('notification-refresh', () => {
        this.loadNotifications().catch(() => {})
      })
    },
    async loadNotifications() {
      try {
        this.notifications = await getNotifications()
      } catch {
        // Non-fatal: leave existing notifications state untouched on failure.
      }
    },
    async markNotificationRead(id) {
      const notification = this.notifications.find((n) => n.id === id || n._id === id)
      if (notification) notification.read = true
      try {
        await markNotificationRead(id)
      } catch {
        // Optimistic update already applied; ignore network failure here.
      }
    },
    async clearAlerts() {
      const previous = this.notifications
      // Optimistic: keep only 'sync' entries locally (mirrors backend behavior)
      this.notifications = this.notifications.filter((n) => n.type === 'sync')
      try {
        await clearNotifications()
      } catch {
        this.notifications = previous
      }
    },
    async refreshAttendanceStats() {
      try {
        const [summary, attendance] = await Promise.all([getCaregiverDashboard(), getTodayAttendance()])
        this.summary = summary
        this.attendance = attendance
      } catch {
        // Non-fatal: keep previous stats if refresh fails.
      }
    },
    async loadCaregiverDashboard() {
      this.loading = true
      this.error = null
      try {
        const [summary, attendance, upcomingVisits, healthAlerts, notifications] =
          await Promise.all([
            getCaregiverDashboard(),
            getTodayAttendance(),
            getUpcomingVisits(),
            getHealthAlerts(),
            getNotifications(),
          ])
        this.summary = summary
        this.attendance = attendance
        this.upcomingVisits = upcomingVisits
        this.healthAlerts = healthAlerts
        this.notifications = notifications
      } catch (e) {
        this.error = e.message || 'Failed to load dashboard'
      } finally {
        this.loading = false
      }
    },
    async loadAdminDashboard(params = {}) {
      this.loading = true
      this.error = null
      try {
        this.adminSummary = await getAdminDashboard(params)
      } catch (e) {
        this.error = e.message || 'Failed to load dashboard'
      } finally {
        this.loading = false
      }
    },
  },
})
