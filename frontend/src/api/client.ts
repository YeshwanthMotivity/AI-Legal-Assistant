import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios'

const API_BASE_URL = "/api/v1"

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

// Simplified response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Session expired or unauthorized request')
    }
    return Promise.reject(error)
  }
)

export default apiClient
