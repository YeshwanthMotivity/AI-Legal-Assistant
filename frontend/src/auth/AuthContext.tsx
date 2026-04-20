import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react'

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

const KC_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'
const TOKEN_ENDPOINT = `${KC_URL}/realms/judicial/protocol/openid-connect/token`
// Refresh 60 s before the token actually expires.
const REFRESH_BUFFER_MS = 60_000

function parseToken(token: string): { parsed: Record<string, unknown>; role: UserRole; user: User } | null {
  try {
    const parsed = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>
    const roles = (parsed.realm_access as Record<string, string[]> | undefined)?.roles ?? []
    let role: UserRole = 'clerk'
    if (roles.includes('admin')) role = 'admin'
    else if (roles.includes('judge')) role = 'judge'
    const user: User = {
      sub: parsed.sub as string,
      username: parsed.preferred_username as string,
      email: parsed.email as string | undefined,
      role,
    }
    return { parsed, role, user }
  } catch {
    return null
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = (token: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    try {
      const parsed = JSON.parse(atob(token.split('.')[1])) as Record<string, number>
      const msUntilExpiry = parsed.exp * 1000 - Date.now()
      const delay = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, 0)
      refreshTimerRef.current = setTimeout(() => attemptSilentRefresh(), delay)
    } catch {
      // If we can't parse exp, fall through — the 401 interceptor will catch it.
    }
  }

  const attemptSilentRefresh = async () => {
    const refreshToken = localStorage.getItem('kc_refresh_token')
    if (!refreshToken) { doLogout(); return }
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
      if (!res.ok) { doLogout(); return }
      const data = await res.json() as { access_token: string; refresh_token?: string }
      applyTokens(data.access_token, data.refresh_token)
    } catch {
      doLogout()
    }
  }

  const applyTokens = (access: string, refresh?: string) => {
    const info = parseToken(access)
    if (!info) { doLogout(); return }
    setAccessToken(access)
    setUser(info.user)
    localStorage.setItem('kc_access_token', access)
    if (refresh) localStorage.setItem('kc_refresh_token', refresh)
    scheduleRefresh(access)
  }

  const doLogout = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    setAccessToken(null)
    setUser(null)
    localStorage.removeItem('kc_access_token')
    localStorage.removeItem('kc_refresh_token')
    window.location.href = '/login'
  }

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('kc_access_token')
    if (token) {
      const info = parseToken(token)
      if (!info) {
        localStorage.removeItem('kc_access_token')
      } else {
        const parsed = info.parsed as Record<string, number>
        if (parsed.exp * 1000 < Date.now()) {
          // Already expired — try silent refresh before giving up
          attemptSilentRefresh()
        } else {
          setAccessToken(token)
          setUser(info.user)
          scheduleRefresh(token)
        }
      }
    }
    setIsLoading(false)
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (username: string, password: string) => {
    const params = new URLSearchParams({
      client_id: 'judicial-frontend',
      grant_type: 'password',
      username,
      password,
    })
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({})) as Record<string, string>
      throw new Error(errorData.error_description || 'Invalid credentials')
    }
    const data = await res.json() as { access_token: string; refresh_token?: string }
    applyTokens(data.access_token, data.refresh_token)
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        logout: doLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
