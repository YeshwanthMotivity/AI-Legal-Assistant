import axios from 'axios'

const API_BASE_URL = "/api/v1"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add access token from localStorage
// We sync the Keycloak token to localStorage in AuthContext
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Simplified response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401, it means the token is likely invalid or Keycloak refresh failed
    // Redirect to login will be handled by the next route change or AuthContext
    if (error.response?.status === 401) {
       console.error('Session expired or unauthorized request')
    }
    return Promise.reject(error)
  }
)

export default apiClient
