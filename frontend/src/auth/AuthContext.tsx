import React, { createContext, useState, useEffect, ReactNode } from 'react'

export type UserRole = 'admin' | 'judge' | 'clerk'

interface User {
  sub: string
  username: string
  email?: string
  role: UserRole
}

interface AuthContextType {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('kc_access_token')
    if (token) {
      try {
        const parsed = JSON.parse(atob(token.split('.')[1]))
        // check expiry
        if (parsed.exp * 1000 < Date.now()) {
          localStorage.removeItem('kc_access_token')
          setAccessToken(null)
          setUser(null)
        } else {
          setAccessToken(token)
          const roles = parsed.realm_access?.roles || []
          let role: UserRole = 'clerk'
          if (roles.includes('admin')) role = 'admin'
          else if (roles.includes('judge')) role = 'judge'
          setUser({
            sub: parsed.sub,
            username: parsed.preferred_username,
            email: parsed.email,
            role,
          })
        }
      } catch (err) {
        console.error('Failed to parse token from storage:', err)
        localStorage.removeItem('kc_access_token')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const params = new URLSearchParams({
      client_id: 'judicial-frontend',
      grant_type: 'password',
      username,
      password,
    })
    
    const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'
    const res = await fetch(
      `${keycloakUrl}/realms/judicial/protocol/openid-connect/token`,
      { 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params 
      }
    )

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error_description || 'Invalid credentials')
    }

    const data = await res.json()
    setAccessToken(data.access_token)
    localStorage.setItem('kc_access_token', data.access_token)
    
    const parsed = JSON.parse(atob(data.access_token.split('.')[1]))
    const roles = parsed.realm_access?.roles || []
    let role: UserRole = 'clerk'
    if (roles.includes('admin')) role = 'admin'
    else if (roles.includes('judge')) role = 'judge'
    
    setUser({ 
      sub: parsed.sub, 
      username: parsed.preferred_username, 
      email: parsed.email, 
      role 
    })
  }

  const logout = () => {
    setAccessToken(null)
    setUser(null)
    localStorage.removeItem('kc_access_token')
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
