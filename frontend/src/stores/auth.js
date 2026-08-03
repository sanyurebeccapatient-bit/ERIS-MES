import { defineStore } from 'pinia'
import * as authService from '@/services/api/auth.service'
import { USER_ROLES } from '@/constants'

const TOKEN_KEY = 'ecd_auth_token'
const REFRESH_KEY = 'ecd_refresh_token'
const USER_KEY = 'ecd_user_data'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  }),
  getters: {
    isAdminRole: (state) =>
      state.user && [USER_ROLES.ADMIN, USER_ROLES.SUPERVISOR].includes(state.user.role),
  },
  actions: {
    /** Logs in with phone + PIN, persists tokens, and loads the user. */
    async login(phone, pin) {
      this.loading = true
      this.error = null
      try {
        const { user, accessToken, refreshToken } = await authService.login(phone, pin)
        localStorage.setItem(TOKEN_KEY, accessToken)
        localStorage.setItem(REFRESH_KEY, refreshToken)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
        this.user = user
        this.isAuthenticated = true
        // Trigger notification load + push init after login
        window.dispatchEvent(new CustomEvent('notification-refresh'))
        return true
      } catch (e) {
        this.error = e.message || 'Login failed. Please check your details and try again.'
        return false
      } finally {
        this.loading = false
      }
    },

    /** Restores a session from a previously stored token (called on app boot). */
    async restoreSession() {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) return false
      // Immediately restore cached user data so the UI never flashes login
      try {
        const cached = localStorage.getItem(USER_KEY)
        if (cached) {
          this.user = JSON.parse(cached)
          this.isAuthenticated = true
        }
      } catch { /* ignore parse errors */ }
      // Then verify the session is still valid in the background
      try {
        await this.fetchCurrentUser()
        return true
      } catch {
        // If we have cached user data and a refresh token, try refreshing
        const refreshToken = localStorage.getItem(REFRESH_KEY)
        if (refreshToken && this.user) {
          try {
            await this.refreshToken()
            await this.fetchCurrentUser()
            return true
          } catch {
            // Only clear session if we can't refresh either
            this.clearSession()
            return false
          }
        }
        // If no cached user, we must show login
        if (!this.user) {
          this.clearSession()
          return false
        }
        // Keep the user authenticated with cached data even if API is unreachable
        return true
      }
    },

    async fetchCurrentUser() {
      this.loading = true
      try {
        this.user = await authService.getMe()
        this.isAuthenticated = true
        localStorage.setItem(USER_KEY, JSON.stringify(this.user))
      } finally {
        this.loading = false
      }
    },

    /** Updates the current user's profile (name/phone/avatar) and syncs local state. */
    async updateProfile(payload) {
      this.loading = true
      this.error = null
      try {
        const updated = await authService.updateProfile(payload)
        this.user = { ...this.user, ...updated }
        localStorage.setItem(USER_KEY, JSON.stringify(this.user))
        return true
      } catch (e) {
        this.error = e.message || 'Could not update your profile. Please try again.'
        return false
      } finally {
        this.loading = false
      }
    },

    async refreshToken() {
      const refreshToken = localStorage.getItem(REFRESH_KEY)
      if (!refreshToken) throw new Error('No refresh token available')
      const { accessToken } = await authService.refreshAccessToken(refreshToken)
      localStorage.setItem(TOKEN_KEY, accessToken)
      return accessToken
    },

    async logout() {
      const refreshToken = localStorage.getItem(REFRESH_KEY)
      try {
        if (refreshToken) await authService.logout(refreshToken)
      } catch {
        // Best-effort — clear local session regardless of server response
      }
      this.clearSession()
    },

    clearSession() {
      this.user = null
      this.isAuthenticated = false
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
