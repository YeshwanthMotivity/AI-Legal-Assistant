import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

const API_BASE_URL = "/api/v1"

const KC_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'
const TOKEN_ENDPOINT = `${KC_URL}/realms/judicial/protocol/openid-connect/token`

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add access token from localStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('kc_access_token')
    if (accessToken && config.headers) {
      // Use the syntax suggested to ensure header is attached
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Track in-flight refresh to avoid duplicate calls
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('kc_refresh_token')
  if (!refreshToken) return null

  try {
    const params = new URLSearchParams({
      client_id: 'judicial-frontend',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    if (!res.ok) return null

    const data = await res.json() as { access_token: string; refresh_token?: string }
    localStorage.setItem('kc_access_token', data.access_token)
    if (data.refresh_token) localStorage.setItem('kc_refresh_token', data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

// Response interceptor: on 401, attempt silent refresh then retry once
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      // Coalesce concurrent refresh attempts into a single network call
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
      }
      const newToken = await refreshPromise

      if (newToken) {
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      // Refresh failed — redirect to login
      localStorage.removeItem('kc_access_token')
      localStorage.removeItem('kc_refresh_token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default apiClient
