/**
 * HTTP client for StarCompute Platform.
 * When VITE_API_BASE is empty, callers should fall back to local mock services.
 */
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export function apiEnabled() {
  return Boolean(BASE)
}

export function getToken() {
  return localStorage.getItem('sc_token') || ''
}

export function setToken(token) {
  if (token) localStorage.setItem('sc_token', token)
  else localStorage.removeItem('sc_token')
}

export async function api(path, options = {}) {
  if (!BASE) throw new Error('VITE_API_BASE 未配置')
  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = data.detail || JSON.stringify(data)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.blob()
}

export async function login(username, password) {
  const data = await api('/auth/login', { method: 'POST', body: { username, password } })
  setToken(data.access_token)
  return data.user
}
