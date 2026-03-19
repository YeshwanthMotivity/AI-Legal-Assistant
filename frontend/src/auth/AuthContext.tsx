import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react'
import axios from 'axios'

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

  const API_BASE_URL = "http://backend:8000"

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
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
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

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

