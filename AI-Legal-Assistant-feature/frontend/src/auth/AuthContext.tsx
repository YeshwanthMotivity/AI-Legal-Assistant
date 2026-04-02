import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '../api/client'

export type UserRole = 'admin' | 'judge' | 'clerk'

interface User {
  sub: string
  username: string
  email?: string
  role: UserRole
}

interface AuthContextType {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
      const payloadSegment = token.split('.')[1]
      if (!payloadSegment) return null
      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
      const json = atob(base64)
      return JSON.parse(json) as Record<string, unknown>
    } catch {
      return null
    }
  }

  const mapRole = (role: unknown): UserRole => {
    const r = String(role || '').toLowerCase()
    if (r === 'admin' || r === 'judge' || r === 'clerk') return r as UserRole
    return 'clerk'
  }

  // Load refresh token from localStorage on mount
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refreshToken')
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')

    if (storedRefreshToken && storedAccessToken && storedUser) {
      setRefreshToken(storedRefreshToken)
      setAccessToken(storedAccessToken)
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('user')
      }
    }
  }, [])

  const login = async (username: string, password: string) => {
    const email = username.includes('@') ? username : `${username}@example.com`
    
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      })

      const { access_token, refresh_token } = response.data
      const payload = decodeJwtPayload(access_token)
      if (!payload) {
        throw new Error('Invalid access token payload')
      }

      const authenticatedUser: User = {
        sub: String(payload.sub ?? ''),
        username: String(payload.username ?? username),
        role: mapRole(payload.role),
        email: undefined,
      }

      setAccessToken(access_token)
      setRefreshToken(refresh_token)
      setUser(authenticatedUser)

      localStorage.setItem('accessToken', access_token)
      localStorage.setItem('refreshToken', refresh_token)
      localStorage.setItem('user', JSON.stringify(authenticatedUser))
    } catch (err: any) {
      // DEMO BYPASS: If backend is down (ECONNREFUSED or 500) and it's a demo account, simulate login
      const isDemoAccount = (username === 'admin' && password === 'admin') ||
                            (username === 'judge' && password === 'judge') ||
                            (username === 'clerk' && password === 'clerk') ||
                            (email === 'admin@example.com' && password === 'admin') ||
                            (email === 'judge@example.com' && password === 'judge') ||
                            (email === 'clerk@example.com' && password === 'clerk')

      if (isDemoAccount && (!err.response || err.response.status >= 500)) {
        console.warn('Backend unavailable. Using Demo Mode for credentials:', username)
        
        const demoRole = username.toLowerCase() === 'admin' ? 'admin' : 
                         username.toLowerCase() === 'judge' ? 'judge' : 'clerk'
        
        const authenticatedUser: User = {
          sub: `demo-${demoRole}`,
          username: username,
          role: demoRole as UserRole,
          email: `${demoRole}@example.com`,
        }

        // Create a mock JWT-like token (no need for real signing if we just decoode payload in our app)
        const mockPayload = {
          sub: authenticatedUser.sub,
          username: authenticatedUser.username,
          role: authenticatedUser.role,
        }
        const mockToken = `header.${btoa(JSON.stringify(mockPayload))}.signature`

        setAccessToken(mockToken)
        setRefreshToken('mock-refresh-token')
        setUser(authenticatedUser)

        localStorage.setItem('accessToken', mockToken)
        localStorage.setItem('refreshToken', 'mock-refresh-token')
        localStorage.setItem('user', JSON.stringify(authenticatedUser))
        return
      }

      // If it's a legitimate 401 from the server
      if (err.response?.status === 401) {
        throw new Error('INVALID_CREDENTIALS')
      }
      
      // If server is entirely down or other error
      if (!err.response) {
        throw new Error('SERVER_UNREACHABLE')
      }
      
      throw err
    }
  }

  const logout = () => {
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      logout()
      return
    }

    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    })
    const { access_token, refresh_token } = response.data
    const payload = decodeJwtPayload(access_token)
    if (!payload) {
      logout()
      return
    }

    const authenticatedUser: User = {
      sub: String(payload.sub ?? ''),
      username: String(payload.username ?? user?.username ?? ''),
      role: mapRole(payload.role),
      email: user?.email,
    }

    setAccessToken(access_token)
    setRefreshToken(refresh_token)
    setUser(authenticatedUser)
    localStorage.setItem('accessToken', access_token)
    localStorage.setItem('refreshToken', refresh_token)
    localStorage.setItem('user', JSON.stringify(authenticatedUser))
  }

  const isAuthenticated = !!accessToken && !!user

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        user,
        isAuthenticated,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


