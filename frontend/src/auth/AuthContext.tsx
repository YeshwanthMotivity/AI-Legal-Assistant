import React, { createContext, useState, useEffect, ReactNode } from 'react'
import Keycloak from 'keycloak-js'

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
  login: () => void
  logout: () => void
  keycloak: Keycloak | null
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Keycloak instance initialization
const kc = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: 'judicial',
  clientId: 'judicial-frontend',
})

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    kc.init({ 
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256'
    })
      .then(authenticated => {
        if (authenticated) {
          const token = kc.token || null
          setAccessToken(token)
          if (token) localStorage.setItem('accessToken', token)
          
          // Realm roles extraction
          const roles = (kc.tokenParsed?.realm_access as any)?.roles || []
          let role: UserRole = 'clerk'
          if (roles.includes('admin')) role = 'admin'
          else if (roles.includes('judge')) role = 'judge'

          setUser({
            sub: kc.tokenParsed?.sub || '',
            username: (kc.tokenParsed as any)?.preferred_username || '',
            email: (kc.tokenParsed as any)?.email,
            role,
          })
        }
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Keycloak initialization failed:', err)
        setIsLoading(false)
      })

    // Handle token refresh
    kc.onTokenExpired = () => {
      kc.updateToken(70)
        .then(refreshed => {
          if (refreshed) {
            setAccessToken(kc.token || null)
          }
        })
        .catch(() => {
          console.error('Failed to refresh token')
          kc.clearToken()
          setAccessToken(null)
          setUser(null)
        })
    }
  }, [])

  const login = () => kc.login()
  const logout = () => kc.logout({ redirectUri: window.location.origin })

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout,
        keycloak: kc,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
