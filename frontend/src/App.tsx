import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import PrivateRoute from './auth/PrivateRoute'
import Login from './pages/Login'
import CaseList from './pages/judge/CaseList'
import CaseDetail from './pages/judge/CaseDetail'
import JudgmentDraft from './pages/judge/JudgmentDraft'
import ClerkCaseList from './pages/clerk/CaseList'
import DocumentUpload from './pages/clerk/DocumentUpload'
import UserManagement from './pages/admin/UserManagement'
import CaseAssignment from './pages/admin/CaseAssignment'
import MetricsDashboard from './pages/admin/MetricsDashboard'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin/metrics" replace />
  }
  if (user.role === 'judge') {
    return <Navigate to="/judge/cases" replace />
  }
  return <Navigate to="/clerk/cases" replace />
}

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      
      {/* Judge Routes */}
      <Route
        path="/judge/cases"
        element={
          <PrivateRoute allowedRoles={['judge']}>
            <CaseList />
          </PrivateRoute>
        }
      />
      <Route
        path="/judge/cases/:id"
        element={
          <PrivateRoute allowedRoles={['judge']}>
            <CaseDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/judge/cases/:id/draft"
        element={
          <PrivateRoute allowedRoles={['judge']}>
            <JudgmentDraft />
          </PrivateRoute>
        }
      />
      
      {/* Clerk Routes */}
      <Route
        path="/clerk/cases"
        element={
          <PrivateRoute allowedRoles={['clerk']}>
            <ClerkCaseList />
          </PrivateRoute>
        }
      />
      <Route
        path="/clerk/documents"
        element={
          <PrivateRoute allowedRoles={['clerk']}>
            <DocumentUpload />
          </PrivateRoute>
        }
      />
      
      {/* Admin Routes */}
      <Route
        path="/admin/users"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <UserManagement />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/assignments"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <CaseAssignment />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/metrics"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <MetricsDashboard />
          </PrivateRoute>
        }
      />
      
      {/* Default redirect */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App

