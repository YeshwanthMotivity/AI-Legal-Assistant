import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react'

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

  // Load refresh token from localStorage on mount
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refreshToken')
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')

    if (storedRefreshToken && storedAccessToken && storedUser) {
      setRefreshToken(storedRefreshToken)
      setAccessToken(storedAccessToken)
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const login = async (username: string, password: string) => {
    // In production, call the actual API with username and password
    // For demo purposes, simulate a successful login
    if (!password) {
      throw new Error('Password is required')
    }

    const mockUser: User = {
      sub: '1',
      username,
      email: `${username}@example.com`,
      role: username.includes('admin') ? 'admin' : username.includes('judge') ? 'judge' : 'clerk',
    }
    
    const mockAccessToken = 'mock-access-token-' + Date.now()
    const mockRefreshToken = 'mock-refresh-token-' + Date.now()

    setAccessToken(mockAccessToken)
    setRefreshToken(mockRefreshToken)
    setUser(mockUser)

    localStorage.setItem('accessToken', mockAccessToken)
    localStorage.setItem('refreshToken', mockRefreshToken)
    localStorage.setItem('user', JSON.stringify(mockUser))
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

    // Stub implementation - in production, call the actual API
    const mockAccessToken = 'mock-access-token-refreshed-' + Date.now()
    setAccessToken(mockAccessToken)
    localStorage.setItem('accessToken', mockAccessToken)
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

