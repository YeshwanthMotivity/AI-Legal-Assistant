import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, UserRole } from './AuthContext'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default PrivateRoute

