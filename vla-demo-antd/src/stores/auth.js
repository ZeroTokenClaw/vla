import { defineStore } from 'pinia'
import { users } from '@/mock/users'

/**
 * @typedef {'annotator'|'reviewer'|'admin'} Role
 */

export const useAuthStore = defineStore('auth', {
  state: () => ({
    /** @type {Role} */
    role: 'admin',
  }),
  getters: {
    user(state) {
      return (
        users.find((u) => u.role === state.role) ||
        users.find((u) => u.role === 'admin') ||
        users[0]
      )
    },
  },
  actions: {
    /** @param {Role} role */
    setRole(role) {
      this.role = role
    },
  },
})