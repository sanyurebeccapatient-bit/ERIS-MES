import { defineStore } from 'pinia'
import { getPendingCount, flushQueue, startAutoSync } from '@/services/offline/syncEngine'
import { SYNC_STATUS } from '@/constants'

export const useSyncStore = defineStore('sync', {
  state: () => ({
    status: navigator.onLine ? SYNC_STATUS.SYNCED : SYNC_STATUS.OFFLINE,
    pendingCount: 0,
    lastSyncedAt: null,
  }),
  actions: {
    async init() {
      startAutoSync()
      await this.refreshPendingCount()
      window.addEventListener('online', () => this.handleOnline())
      window.addEventListener('offline', () => this.handleOffline())
      if (!navigator.onLine) this.status = SYNC_STATUS.OFFLINE
    },
    async refreshPendingCount() {
      this.pendingCount = await getPendingCount()
      if (this.pendingCount > 0 && navigator.onLine) {
        this.status = SYNC_STATUS.PENDING
      } else if (navigator.onLine) {
        this.status = SYNC_STATUS.SYNCED
      }
    },
    async handleOnline() {
      this.status = SYNC_STATUS.SYNCING
      await flushQueue()
      await this.refreshPendingCount()
      this.lastSyncedAt = new Date().toISOString()
      if (this.pendingCount === 0) this.status = SYNC_STATUS.SYNCED
    },
    handleOffline() {
      this.status = SYNC_STATUS.OFFLINE
    },
    async manualSync() {
      if (!navigator.onLine) return
      await this.handleOnline()
    },
  },
})
