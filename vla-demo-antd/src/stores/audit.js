import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import { useAuthStore } from './auth'

export const useAuditStore = defineStore('audit', {
  state: () => ({
    /** @type {{ id: string, at: string, actor: string, role: string, action: string, detail: string }[]} */
    entries: [],
  }),
  actions: {
    /**
     * @param {{ action: string, detail?: string }} payload
     */
    pushAudit({ action, detail = '' }) {
      const auth = useAuthStore()
      const entry = {
        id: `AUD-${Date.now()}-${this.entries.length + 1}`,
        at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        actor: auth.user?.name || auth.user?.account || 'unknown',
        role: auth.role,
        action,
        detail,
      }
      this.entries.unshift(entry)
      if (this.entries.length > 200) this.entries.length = 200
      return entry
    },
    clear() {
      this.entries = []
    },
  },
})

/** Convenience re-export for non-setup callers. */
export function pushAudit(payload) {
  return useAuditStore().pushAudit(payload)
}