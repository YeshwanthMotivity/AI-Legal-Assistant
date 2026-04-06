import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import PrivateRoute from './auth/PrivateRoute'
import Login from './pages/Login'
import CaseList from './pages/judge/CaseList'
import CaseDetail from './pages/judge/CaseDetail'
import PrecedentDetailPage from './pages/judge/PrecedentDetailPage'
import ClerkCaseList from './pages/clerk/CaseList'
import DocumentUpload from './pages/clerk/DocumentUpload'
import UserManagement from './pages/admin/UserManagement'
import CaseAssignment from './pages/admin/CaseAssignment'
import MetricsDashboard from './pages/admin/MetricsDashboard'
import AuditLog from './pages/admin/AuditLog'
import GlobalConfig from './pages/admin/GlobalConfig'
import AdminDashboard from './pages/AdminDashboard'
import JudgeDashboard from './pages/JudgeDashboard'
import ClerkDashboard from './pages/ClerkDashboard'
import JudgmentDraft from './pages/judge/JudgmentDraft'
import AIActivityLogs from './pages/judge/AIActivityLogs'

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }
  if (user.role === 'judge') {
    return <Navigate to="/judge/dashboard" replace />
  }
  return <Navigate to="/clerk/dashboard" replace />
}

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />

      <Route
        path="/judge/cases"
        element={
          <PrivateRoute allowedRoles={['judge']}>
            <CaseList />
          </PrivateRoute>
        }
      />
      <Route
        path="/judge/cases/new"
        element={
          <PrivateRoute allowedRoles={['judge']}>
            <CaseList openCreateOnLoad />
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
        path="/judge/cases/:id/activity"
        element={
          <PrivateRoute allowedRoles={['judge']}>
            <AIActivityLogs />
          </PrivateRoute>
        }
      />
      <Route
        path="/judge/precedents/:id"
        element={
          <PrivateRoute allowedRoles={['judge']}>
            <PrecedentDetailPage />
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

      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/judge/dashboard"
        element={
          <PrivateRoute allowedRoles={['judge']}>
            <JudgeDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/clerk/dashboard"
        element={
          <PrivateRoute allowedRoles={['clerk']}>
            <ClerkDashboard />
          </PrivateRoute>
        }
      />

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
      <Route
        path="/admin/audit"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AuditLog />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/config"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <GlobalConfig />
          </PrivateRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="/unauthorized" element={<Navigate to="/" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App
