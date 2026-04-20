import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { UserRole } from './AuthContext'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default PrivateRoute

